# 结论：kur-compact-trigger 是插件层启动致命的元凶（判决实验完成）

- **时间**：2026-10-13 16:36–16:45（本机时间，UTC+8）
- **操作用户**：Administrator（会话 `session-f5a6d795-1e71-4277-bc7a-04d47de6440f`）
- **判决实验**：在上一步"热加载验证过的完整态"下**冷启动一次**（patch = 5 条核心行 + `mcp-chrome-devtools` insert 行 + `preset-router-standard` / `preset-router-spec` 两个 insert 行 = 41,159 B / 684 行；`dsh.profile.bundles` = 12 项 / 10 个插件）
  → **直接打开，无任何失败迹象**

## 判定依据（全部实测）

| 检查项 | 结果 |
| --- | --- |
| 宿主启动 | 16:36:34 正常启动 |
| 失败标记 `cordis.patch.yml.bak-*` | 仍只有 **15:40:39** 与 **16:21:39** 两份（= 仅有的两次启动失败），本次**没有新增** |
| `dsh-market/check` | `ok=true`、`errors=0`、`warnings=2`（两条只是"bundled Desktop loader 无法从 app.asar 独立解析"，无害） |
| 插件激活 | **10 个插件全部 `live via its bundle patch`**；`kur-compact-trigger` = `disabled`（未列入 bundles） |
| 预设行存活 | 冷启动后两个 Router 预设行仍在 patch 中；此前热加载时 `dev_reload_package` 实测两者 `[active]` |
| MCP | `chrome-devtools-mcp` 子进程随启动拉起（PID 15768） |
| bili | 0.1.196，`stale=false` |

与那两次失败启动（15:40:39、16:21:39）相比，**唯一差异就是 `kur-compact-trigger`**（15:25 被加入 `dsh.profile.bundles`，两次失败启动都带着它）→ 判定它使启动期致命。
本次判决同时**排除**了另外两个嫌疑：两个 Router 预设行（含 `!!js` 表达式与 `file:///` 模块 URL）与手写的 MCP insert 行**冷启动都是安全的**。

## 处置

- `kur-compact-trigger` 保持**已安装但不在 `dsh.profile.bundles`**（market 状态 `disabled`）。**不要**把它加回 bundles。
- 若将来仍想用它（<https://github.com/KumarZX/kur-compact-trigger>，会话级压缩触发器），先做隔离实验，每次只改一项并保留回滚包：
  1. 删掉它自带的 24 个 `@deepseek-ai/*` 副本（宿主运行时会向插件模块提供这些包，`dsh-app-boot` 文档明说"runtime resolution supplies packages carried by the installation … to Node's ESM and CommonJS resolvers"）——这是最可能消除启动致命的一步；
  2. 或只保留其 host 部分、改由 injector 热注入按需加载（不经 bundles，就没有启动期风险）；
  3. 无论哪条路径，行配置都必须保持 `thresholdTokens: 900000`（高于 bili 的 `compress.maxContextLimit=700000`），否则它会抢先折叠历史、弄脏 billion-context 的前缀缓存。
- 回滚：`D:\Documents\deepseek-harness\default-workspace\profile-rollback\restore-profile.ps1`（最小可用态）/ `-Full`（全量 patch）；当前运行态存档为 `cordis.patch.yml.good-core-mcp-presets`。

## 本机最终可用配置（本次判决实验后）

- `%USERPROFILE%\.dsh\profiles\desktop\cordis.patch.yml`：41,159 B / 684 行 / 8 个顶层条目
  （ui-chat、ui-settings、ui-settings-account、locale、agent-preset-registry、insert mcp-chrome-devtools、insert preset-router-standard、insert preset-router-spec）
- `%USERPROFILE%\.dsh\profiles\desktop\package.json`：`dsh.profile.bundles` = 12 项（2 基座 + dshmarket、skill-explorer、billion-context、dsh-memory-evolve、only-memory、dsh-cost-meter、super-injector、graded、agent-teams、dsh-context）
- 技能库 61 个技能、chrome_devtools / only_memory 两个 MCP 服务、bili 0.1.196 压缩预算（providers."https://api.deepseek.com/anthropic" + compress.maxContextLimit=700000）
