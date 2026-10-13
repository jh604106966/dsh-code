# `mcp/` —— home patch 类集成（不是插件）

这里的文件不是插件包，而是 **home patch 片段**：追加到 `$DSH_HOME/cordis.patch.yml`
（默认 `~/.dsh/cordis.patch.yml`）后重启 DSH 即可生效。

home patch 与 profile 的区别：

| | profile `cordis.patch.yml` | home `cordis.patch.yml` |
|---|---|---|
| 作用范围 | 单个 profile（`desktop` / `web` …） | **所有 profile** |
| `tools/sync.mjs` 是否采集 | 是（`plugins/<包名>` + `profile/*.json`） | 否（本目录只手工留片段） |
| 典型内容 | 插件装配（bundle / link 依赖） | MCP server、指向外部 bundle 的 entry |

## 现有片段

- [`rea.cordis.patch.yml`](rea.cordis.patch.yml) —— REA（`morluto/rea`，npm 包 `rea-agents`）的 MCP server。
  完整安装步骤见 [../PLUGINS.md](../PLUGINS.md) 的 **D 节**（含「DSH 支持只在 main、必须先
  `npm ci && npm run build:cached`」这个前提）。
- 本机同文件里还有一条 Hindsight 的 entry（`id: hindsight`，指向 `~/.hindsight/coding-agents/dist/dsh.js`），
  由 Hindsight 自己维护、带 `HINDSIGHT_CODING_AGENTS_DSH_START/END` 围栏，不放进本仓库（装在仓库外）。

## 改这个文件的注意事项

1. **必须是字面量 YAML**：REA 的 `doctor` 会拒绝 `!!js` 表达式与 group-targeted 插入；
   手工改也别写表达式。
2. **只动自己那一条**：同一文件可能被多个工具写入（各带围栏/条目），改动前先读一遍全文。
3. **重启才生效**：entry 在启动时装配；重启后用 `rea doctor --client dsh`（REA）
   或 `GET /api/plugin-status` 之类的只读接口确认。
