# 变更记录：上下文预算调整（billion-context 阈值把输出预留算进去）

- **时间**：2026-10-13 15:31–15:34（本机时间，UTC+8）
- **操作用户**：Administrator（会话 `session-f5a6d795-1e71-4277-bc7a-04d47de6440f`，会话名「安装 dsh-market 插件」）
- **触发**：用户提供截图，另一个会话连续两次 `CONTEXT_WINDOW_EXCEEDED`；用户选择「第二种」修法（让 bili 的阈值把输出预留算进去）

## 症状（上游返回的原始数字）

```
maximum context length is 1048576 tokens
requested 1115962 (859962 in the messages, 256000 in the completion)   ← 超 67386
requested 1056193 (800193 in the messages, 256000 in the completion)   ← 超 7617
```

bili 侧日志（同一会话 `session-0eabae46…`）显示它一直在压：

```
nudge INJECT T1: usage=77% (771100/1000000) … usage=78% (789423/1000000)
upstream context overflow (model=deepseek-flash) — wind…
context 1048576 tokens reached preflight target 1048576 / 1000000
[preflight] payload ~1048576 tok vs window 1000000 (~1.0x) — raising summarization budget 16 -> 17, rounds 16 -> 17
```

## 根因

1. **窗口算的是 messages + completion 预留**：模型窗口 1,048,576，输出预留 256,000（24.4%），
   所以**有效输入上限只有 792,576（75.6%）**；而 bili 的强制压缩阈值默认 `compress.maxContextLimit = "75%"`（≈786,432），
   只比硬上限低 **约 6K**，没有为输出预留留出余量。
2. **触发是增长区间而不是绝对位置**：`compress.nudgeGrowthTokens` 默认 50,000（日志 `interval=50000, floor=22500`），
   所以压缩是"按增长节奏"触发的，历史在两次触发之间可以冲过红线。
3. **anthropic 线不预留输出头部**：反编译可见 `shouldReserveOutputHeadroom(protocol){return protocol!=="anthropic"}`，
   本机上游是 `https://api.deepseek.com/anthropic/v1/messages`（anthropic 线）→ 输出预留不计入 bili 的余量计算。
4. **没有第二道防线**：bili 的配置状态为 `allowDshCompaction.enabled = false`（它主动关掉 DSH 原生压缩），
   本仓库两个预设里 `compaction-basic.auto` 也被显式钉为 `false`（避免双重压缩）——所以 bili 是唯一压缩器，晚一步就直撞上游。

## 改动内容

**文件**：`C:\Users\Administrator\.config\billion-context\billion-context.json`（bili 的规范配置路径，热加载）

改动前（出厂模板）：

```json
{
  "providers": {
  }
}
```

改动后：

```json
{
  "providers": {
    "https://api.deepseek.com/anthropic": {
      "models": {
        "deepseek-flash": { "context": 1048576, "output": 256000 }
      },
      "compress": {
        "maxContextLimit": 700000,
        "emergencyThresholdPercent": "75%",
        "nudgeGrowthTokens": 25000
      }
    }
  },
  "compress": {
    "maxContextLimit": 700000,
    "emergencyThresholdPercent": "75%",
    "nudgeGrowthTokens": 25000
  }
}
```

要点与理由：

- `models."deepseek-flash".{context:1048576, output:256000}`：把模型的真实窗口与输出上限**声明给 bili**（此前
  它用的是插件原生 1,000,000，日志 `[window] … source=plugin native=1000000 route=none`）。
- `compress.maxContextLimit: 700000`（绝对值，不是百分比）：一旦历史超过 70 万 token 就**立即**触发强压，
  绕开增长闸门。700,000 + 256,000 = 956,000，留在 1,048,576 之下约 **92K 余量**。
- `compress.emergencyThresholdPercent: "75%"`（≈786,432）：必须 ≥ maxContextLimit（上游要求），
  刚好压在有效输入上限 792,576 之下，用于超大工具输出的紧急截断。
- `compress.nudgeGrowthTokens: 25000`（默认 50,000 的一半）：折叠加倍频繁，历史不会在两次触发之间跑远。

> 过程记录：第一版把 `models` 写在**顶层**，bili 热加载时告警
> `[acp-config] ignoring unknown top-level config key(s): models` —— 顶层 `compress.*` 合法，
> 但模型声明必须放在 `providers.<url-prefix>.models` 下（url 前缀按最长前缀匹配）。

**附加动作（同一窗口内）**：bili 守护进程当时跑的是 **0.1.191**，磁盘上已是 **0.1.196**（`/__bili/status` → `stale:true`）。
0.1.192/0.1.193 两个 critical 更新正好修的就是本次症状的根源（#2791「dsh 切换模型/协议导致会话 fork、压缩状态失效、
上下文暴涨」、#2763「dsh 自动压缩拦截失效」、#2733「压缩后缓存泄露」），因此**重启了代理进程**：
`stop PID 16544` → `node <profile>\node_modules\billion-context\dist\index.js start --host 127.0.0.1 --port 18787`（PID 47072）。

## 验证证据

```
GET /__bili/config   → providers."https://api.deepseek.com/anthropic".compress =
                       {"maxContextLimit":700000,"emergencyThresholdPercent":"75%","nudgeGrowthTokens":25000}
GET /__bili/status   → {"version":"0.1.196","commit":"d64139f9","diskVersion":"0.1.196","stale":false}
日志 [window]        → model=deepseek-flash … configured=1048576 … route=api.deepseek.com   （此前 route=none）
日志 nudge           → usage=4% (39857/1000000), growth=0/20000 (… interval=25000) model=deepseek-flash
                       （此前 interval=50000 / floor=22500）→ nudgeGrowthTokens 已生效
进程                 → node …billion-context\dist\index.js start --host 127.0.0.1 --port 18787（PID 47072，15:34:16 启动）
```

## 回滚

- 恢复配置：`Copy-Item D:\Documents\deepseek-harness\default-workspace\pre-bili-budget-billion-context.json C:\Users\Administrator\.config\billion-context\billion-context.json -Force`（备份内容为 `{"providers":{}}`），bili 会热加载。
- 版本回退无需操作：磁盘上只有 0.1.196，重启即回到该版本。

## 本次未做（备选）

1. 降低该路由的 `max_tokens`（256K → 64K，输入预算可回到 ~984K）——需要改 DSH 侧的模型路由设置。
2. 改用 DSH 原生压缩（`compaction-basic: auto true + headroomTokens 262144`）——必须先停 bili，避免双重压缩。
3. 该会话若曾被 0.1.191 的已知缺陷污染（会话 fork / 压缩状态失效），建议**新开一个会话**继续长任务。
