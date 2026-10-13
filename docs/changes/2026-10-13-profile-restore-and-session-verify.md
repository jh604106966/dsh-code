# 变更记录：会话日志独立复核 + 插件层恢复（含 kur/bili 压缩冲突修复）

- **时间**：2026-10-13 16:10–16:35（本机时间，UTC+8）
- **操作用户**：Administrator（会话 `session-f5a6d795-1e71-4277-bc7a-04d47de6440f`，会话名「安装 dsh-market 插件」）
- **触发**：会话历史被上游修复后，用户要求「读修复文档 → 做验证 → 检查插件问题/冲突并修掉 → 把所有插件开起来，随后重启 DSH 验证」

## 一、会话日志独立复核（结论：PASS）

复核脚本：`D:\Documents\deepseek-harness\default-workspace\verify-session-f5a6d795.mjs`（自实现 zstd 多帧遍历 + 现场调用 DSH 官方校验器，不引用他人脚本结论）：

```
layout            frames=3401  tailClean=true
firstFrame        plainBytes=230  lines=1  endsWithNewline=true  contractOk=true  type=session  version=4
content           events=3426  seqContiguous=true  lastSeq=3425  plainBytes=21177608
surface           nodes=412  head=2037
compaction 违规    offenders=[]   （3251/3303/3322 三条现为 range.start=2424，firstSeqs=[2424,2167,2169]，headIncluded=false）
officialValidators v4=ok  persistence=ok  fold=ok(nodes=412,head=2037)
verdict           PASS
```

- 第 1 帧契约（`assertZstdHeaderFrame` 要求"恰好一行 header + \n"）满足 ✓；事件数已从修复时的 3365 增长到 **3426**（本会话持续追加），seq 仍连续。
- `firstFrameVsOriginal.byteEqual=false`（原始首帧 190 B / 当前 187 B）**不是问题**：header 行随会话增长被重写（含最新 seq/统计），压缩后字节自然不同；契约与内容校验才是判据。

## 二、插件层为什么被清空（恢复态现场）

复核时发现 profile 已退化成"原生恢复态"：

- `C:\Users\Administrator\.dsh\profiles\desktop\package.json`（15:40:39）→ `dsh.profile.bundles` 只剩 `@deepseek-ai/dsh-base, @deepseek-ai/dsh-web-app`（11 个插件 bundle 全被移除，deps 仍在）
- `C:\Users\Administrator\.dsh\profiles\desktop\cordis.patch.yml`（15:42:18）→ 只剩 **744 B / 26 行**默认行（并且 `ui-settings.enabled: false`、`developerTools: false`、`completion: skipped`），预设两行、MCP 行、agent-preset-registry 行全部丢失
- 同期证据：`C:\Users\Administrator\.dsh\super-injector\self-heal.log` 在 `2026-10-13T07:40:14Z` 与 `07:40:29Z` 各跑一次 `purge-stale-tools` + `client-meta-healed`；bili 日志显示 DSH 在 `07:40:13Z` 启动（pid 54160）
- 推断：**15:40 那次 DSH 启动触发了插件致命启动 → DSH 退化为原生/最小插件模式**（把 patch 与 bundles 重置为默认）。该次启动正是"加入 kur-compact-trigger 后的第一次冷启动"，故它是首要嫌疑（未完全确证）。

## 三、恢复动作

1. 备份恢复态：`D:\Documents\deepseek-harness\default-workspace\recovery-state-package-20261013-161834.json`、`recovery-state-cordis-20261013-161834.yml`
2. `cordis.patch.yml` ← 用 `cordis.patch.yml.bak-1791877239685`（40,509 B，8 个顶层条目：ui-chat / ui-settings / ui-settings-account / locale / agent-preset-registry / preset-router-standard / preset-router-spec / mcp-chrome-devtools），YAML 校验通过
3. `dsh.profile.bundles` ← 恢复为**13 项**：2 个基座 + 11 个插件（dshmarket、skill-explorer、billion-context、dsh-memory-evolve、only-memory、dsh-cost-meter、super-injector、graded、agent-teams、dsh-context、kur-compact-trigger）
4. 完整性检查（全部 OK）：10 个 bundle 包、3 个 link 插件、graded 自带的 `@deepseek-ai/schemastery`、only-memory 的 `profiles/node_modules` junction、三个预设模块（`router-bootstrap-v34.mjs` / `gitbash-executor.mjs` / `router-bootstrap-v10.mjs`）、chrome-devtools-mcp 的 bin、Edge 可执行文件、bili 的 `dist/index.js`
5. 回滚包：`D:\Documents\deepseek-harness\default-workspace\profile-rollback\`（含 kur 关闭态的 `package.json` + 完整 patch + `restore-profile.ps1`）——若重启后插件层又被清空，跑它再重启即可回到已知良好状态

## 四、插件冲突修复：kur-compact-trigger 不再与 bili 抢压缩

- 上游默认 `thresholdTokens: 200000` —— 远低于 bili 的 `compress.maxContextLimit = 700000`。若照默认跑，kur 会在 20 万 token 就折叠历史，**每次折叠都重写前缀 → bili 的前缀缓存必然 miss**（正是 bili #2658/#2596 那一类损耗）。
- 修法：在 `C:\Users\Administrator\.dsh\plugins\kur-compact-trigger\cordis.patch.yml` 的行配置里把触发点抬到 bili 预算之上：
  `config: { thresholdTokens: 900000, retainTokens: 32000, maxAttempts: 3 }` —— 它从"第二个压缩器"变成"bili 兜不住时的后手 + 手动按钮"，注释已写在文件里。

## 五、已知遗留

1. kur-compact-trigger 的**交互设置页/标题栏按钮**在本机不生效（其上游用 `ctx.settings.register`，而 0.2.0-rc.2 的 settings 服务只有 `configure()`；已在 `lib/index.js` 打本机兼容补丁，行配置仍生效）。
2. kur-compact-trigger 是这次"启动期致命"的**首要嫌疑**；本次按用户要求仍全量开启，并预置了一键回滚。
3. `firstFrameVsOriginal` 的字节差异属正常（header 随会话增长重写），见 §一。
