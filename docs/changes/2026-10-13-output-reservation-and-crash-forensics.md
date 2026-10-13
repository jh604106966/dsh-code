# 2026-10-13 — 输出预留的真实来源 与「主进程直接退出」取证

本篇记录两条互相独立、但都在同一天查清的结论：

1. **上下文超限的残留风险来自「输出预留」**，而 256,000 这个数字**本地配置改不动**；
   唯一真正有效的旋钮是让 DSH 发出的 `max_tokens` 变小，而不是去调 billion-context 的模型声明。
2. **主进程「直接退出」（不是插件 fatal、也不是启动恢复弹窗）的一个已确证原因**：
   某个 profile 的 `node_modules` 里存在**半提取/不完整的 `@deepseek-ai/*` 副本**。

---

## 一、窗口算术：有效输入上限不是窗口本身

上游的判定是 **`messages` + 输出预留 ≤ 窗口**，不是只看 messages。

| 项 | 本机值 |
| --- | --- |
| 路由窗口（deepseek-flash） | 1,048,576 |
| 输出预留（该模型最大输出） | 256,000（24.4%） |
| **有效输入上限** | **792,576** |
| bili 强制压缩阈值 `compress.maxContextLimit` | 700,000（余量 ≈ 92K） |

历史失败的两次请求分别是 `859,962 + 256,000` 与 `800,193 + 256,000`，都超过 1,048,576——
越线的从来不是「上下文太大」本身，而是**上下文 + 输出预留**。

## 二、被证伪的旋钮：bili 的 `models.<name>.output`

**实验**：把 `%USERPROFILE%\.config\billion-context\billion-context.json` 里

```json
"providers": { "https://api.deepseek.com/anthropic": {
  "models": { "deepseek-flash": { "context": 1048576, "output": 256000 } } } }
```

的 `output` 改成 `64000`，`/__bili/config` 确实热加载为 64000。

**结论：不行。** 读 bili 源码 `…\profiles\desktop\node_modules\billion-context\dist\index.js`：

- `outputBudgetField(parsed)` 只认 `max_tokens` / `max_completion_tokens` / `max_output_tokens`
  （或 `generationConfig.maxOutputTokens`）；
- `restoreOutputBudget(parsed, session, log, ceiling)` 的关键分支是
  `if (value > SIDE_REQUEST_MAX_TOKENS) { session.metadata.outputBudgetHighWater = value; return }`
  —— **主请求（大值）原样透传，从不往小改**；只有「小值 + 带 tools」时才抬回高水位/已知上限，
  并打日志 `output budget restored X -> Y (#546 …)`；
- `resolveKnownOutputCeiling(headers, parsed, routes, upstreamUrl, header)` 的取值链是
  `plugin 上报 → launcherMaxOutput(model) → bili 配置 → 注册表`，**只作为下限抬升的来源**；
- `DEFAULT_OUTPUT_HEADROOM_MAX_PCT = .25`；`reserveOutputHeadroom(window, maxOutput, capPct)`
  = `window - min(maxOutput, capPct * window)`，**只影响 bili 自己的预检/阈值算术**，不改请求体；
- 上述唯一调用点在转发前：`if (!demotedSide && !serverToolUtility) { restoreOutputBudget(...) }`；
- `bili.log` 全程 **没有** `output budget restored` / `high-water` / `no known output ceiling` / `#2904`
  命中 —— bili 从未改写 `max_tokens`。

**为什么必须回滚**：把 `output` 留在 64000，bili 的预检会以为可用输入 =
`1,048,576 − 64,000 = 984,576`，而上游真实上限仍是 **792,576**
→ 压缩会更晚触发，正好制造我们想避免的 CONTEXT_WINDOW_EXCEEDED。
已回滚为 `output: 256000`（配置文件备份 `.bak-20261013-165933`）。

## 三、那 256,000 到底在哪：本地搜不到

以下范围全部搜过，**没有** 256,000 这个配置值，也没有大型 `maxTokens` 字面量：

- 活动 profile 的 `cordis.patch.yml`（41,159 B / 8 顶层条目）——不含任何 `maxTokens` / `output` 行；
- `~/.dsh` 全树（排除 `node_modules`）——只有 `storages/cost-meter/ledger.json` 里
  `longContext.aboveInputTokens: 256000` 的**定价巧合**；
- `app.asar` 的 dsh 树（非 node_modules 部分）——唯一的 `256000` 是 `desktop-runtime.json` 里
  某个 sha256 的子串；
- `@deepseek-ai/*` 宿主包（llm / model / proxy / route / agent / api / acp / token 相关的 40+ 个）——
  无 256,000、无大型 maxTokens 字面量；
- 会话存档 `~/.dsh/storages/session_projcache/sessions/*.json`、`~/.dsh/llm-deepseek/files-v3.json`；
- `%APPDATA%\DeepSeek Harness` 与 `%LOCALAPPDATA%\DeepSeek Harness`（**不存在**）；
- DSH 桌面版的 user-data-dir `%APPDATA%\@deepseek-ai\dsh-desktop`（只有 Electron 自身数据）。

**结论**：256,000 是**上游模型定义**（deepseek-flash 最大输出）在运行时被采用的值，
不是本地配置项。

### 因此要真正抬高输入上限，只有一条路

让 **DSH 发出的 `max_tokens` 变小**（bili 警告里的原话：*"Declare an output limit in bili config or
set maxTokens on the host model item"*）：在「设置 → 模型」里建一个**自定义模型项**
（`context: 1048576` / `maxTokens: 64000`）并把路由指过去 → 输入上限可升到 ≈ 984,576，
代价是单轮回复输出上限 64K。想更稳而不动模型，则降低
`compress.maxContextLimit`（例：700000 → 650000，用 50K 可用上下文换更大余量）。

## 四、主进程「直接退出」取证（npx 复现）

**症状**：启动 DSH 主进程立即退出（**不是**「禁用所有插件」弹窗，也不是插件 fatal），
错误链是 Electron 在解析插件/宿主依赖时依次失败：

```
@deepseek-ai/cordis → @deepseek-ai/schemastery   (ERR_MODULE_NOT_FOUND)
Electron 拒绝该 profile 的 node_modules
```

**根因**：某个 profile 的 `node_modules` 里存在**半提取 / 不完整的 `@deepseek-ai/*` 副本**
（典型来源：从 `app.asar` 抽包只抽了一半、pnpm `link:` 残留、手动拷贝中断）。

**排查命令**（PowerShell）：

```powershell
Get-ChildItem "$env:USERPROFILE\.dsh" -Recurse -Depth 6 -Directory -Filter cordis |
  Where-Object { $_.FullName -match 'node_modules\\@deepseek-ai\\cordis$' } |
  ForEach-Object { $p = Join-Path $_.FullName 'package.json'
                   "{0}  pkgjson={1}" -f $_.FullName, (Test-Path $p) }
```

同法查 `schemastery`；每个命中都要能 `ConvertFrom-Json` 出 `version`。

**本机核对结果（清理后）**：

- `~/.dsh/profiles/node_modules/` 只应有 `only-memory` 这一个 junction（2026-10-08 建立），
  **不应**出现 `@deepseek-ai` 子树；
- 现存副本都完整：`cordis` 4.0.4（`plugins/kur-compact-trigger`）、4.0.1（`plugins/only-memory`）；
  `schemastery` 3.18.4（`kur-compact-trigger`、`dsh-routing-suite/injector`、`dsh-routing-suite/graded`）、
  3.18.1（`only-memory`）；
- 宿主自身的包只存在于
  `…\DeepSeek Harness\resources\app.asar\dsh\node_modules\@deepseek-ai\`（289 个）。

**修复**：删掉/补齐那个不完整副本；重启即可。重复的 `@deepseek-ai/cordis` 本身**不会**致命
（brand 基于 global symbol，多副本可共存，已实测）。

## 五、当日已验证的现行状态（16:36 冷启动那套）

| 项 | 值 |
| --- | --- |
| `profiles/desktop/cordis.patch.yml` | 41,159 B / 684 行 / 8 顶层条目（5 核心 + chrome_devtools MCP insert + 两个 Router 预设 insert），**无** kur 行 |
| `dsh.profile.bundles` | 12 项（2 基座 + dshmarket、skill-explorer、billion-context、dsh-memory-evolve、only-memory、dsh-cost-meter、super-injector、graded、agent-teams、dsh-context）；`kur-compact-trigger` 只在 dependencies |
| 启动恢复痕迹 | `cordis.patch.yml.bak-1791877239685` / `.bak-1791879699811`（均 40,509 B，15:25:00），此后**无新增** |
| billion-context | 0.1.196，`stale=false`，`output=256000`、`context=1048576`、`compress{maxContextLimit 700000, emergencyThresholdPercent "75%", nudgeGrowthTokens 25000}`，`allowDshCompaction.enabled=false`；ACP 折叠正常（日志有 `[acp-compress-obs] shrink …%`） |
| 插件进程 | bili、only-memory、chrome-devtools-mcp（`--isolated`，Edge 可执行文件）均在跑 |

## 六、复现用的一次性探针（工作区，不入库）

- `who-sets-maxtokens.mjs`：在 `app.asar` 的宿主包与 bili bundle 里搜 `max_tokens` / `maxTokens` /
  `outputHeadroomMaxPct` 的实现位置；
- `asar-read-boot.mjs`：dump `dsh-app-boot/lib/index.js` 的解析补丁段落
  （`Module._resolveFilename`、`defaultResolve`、`packageDirFromAnchor` 等）；
- `mcp-probe.mjs`：MCP stdio 握手探针（`initialize` → `tools/list`）。

跑法（不改动安装）：

```powershell
$env:ELECTRON_RUN_AS_NODE='1'
& 'C:\Users\Administrator\AppData\Local\Programs\DeepSeek Harness\DeepSeek Harness.exe' who-sets-maxtokens.mjs
```
