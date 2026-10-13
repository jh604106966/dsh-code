# 变更记录：插件层启动致命 → 二分定位与最终可用态

- **时间**：2026-10-13 16:22–16:45（本机时间，UTC+8）
- **操作用户**：Administrator（会话 `session-f5a6d795-1e71-4277-bc7a-04d47de6440f`）
- **背景**：用户重启后 DSH 提示"请禁用所有插件"（**不点名**任何插件），同时 host 自身把 profile 复位成最小插件模式；前一轮已把 profile 恢复为 13 bundle + 40,509 B 全量 patch，仍然失败。

## 一、定位思路：找出"宿主启动之后才改动、从未冷启动验证过"的配置

用宿主进程 `StartTime` 对比各配置的 mtime：

- 16:21:40 之前那个宿主进程从约 12:13 起一直运行（见 `pnpm-lock.yaml.bak-20261009` 与 `.plugin-manager/logs/operation-n39l6V`）
- 在它运行期间**热改进去、从未冷启动验证过**的配置有三处：两个 Router 预设 insert 行（约 13:0x 移植）→ chrome_devtools MCP insert 行（约 14:05）→ kur-compact-trigger bundle（15:25）
- 两次失败启动（15:40:39、16:21:39）带的正是这三处；每次失败 host 都会在 profile 目录留下 `cordis.patch.yml.bak-<epoch>`（epoch 即失败时刻），据此可数出失败次数

另外**实测排除**了一个假设：kur 自带的第二份 `@deepseek-ai/cordis` 并不会导致启动致命 —— `probe-cordis-dup.mjs` 里宿主与插件两份 cordis 同时加载正常，cordis 自身注释也说明 brand 基于 global symbol、支持多副本。

## 二、二分与热加载验证（每一步都实测）

1. **退到最小可用态**：patch = `pre-presets-port/cordis.patch.yml`（881 B / 5 条核心行，唯一被成功启动证明过的版本）；bundles = 12（2 基座 + 10 插件，kur 不列入）
   → 用户重启：**"这回直接就打开了"** ✓ 宿主 16:28:54 启动，market/check `ok=true, 0 errors`，10 个插件全部 `live via its bundle patch`
2. **热加 MCP 行**（chrome_devtools）→ 子进程 `chrome-devtools-mcp.js --isolated --executablePath <Edge>` 立即拉起（PID 46120），market check 仍 `ok=true`，宿主未重启，系统提示的 MCP 服务器列表出现 `chrome_devtools` ✓
   （过程教训：第一次用字符串偏移切块时把 `# ── MCP servers` 注释行切坏 → patch 变成非法 YAML、market check 出现 1 error；改成**按行切块**后修复。切 patch 块必须按行提取。）
3. **热加两个预设行**（preset-router-standard / preset-router-spec）→ 宿主未重启，`dev_reload_package` 显示两者 `before: [active] after: [active]`，market check `ok=true, 0 errors, 2 warnings`（两条 warning 只是"bundled Desktop loader 无法从 app.asar 独立解析"，无害）✓
4. 至此 patch = 8 个顶层条目（5 核心 + MCP + 两个预设），bundles = 12；**没有产生任何新的 `cordis.patch.yml.bak-*`**（即没有新的启动失败）

## 三、结论与当前状态

- 与两次失败启动相比，当前可用态**只少了 kur-compact-trigger**：Router 预设行（含 `!!js` 与 `file:///` 模块）与 MCP 行都能干净地热应用、market 组合检查零错误。
- 因此 **kur-compact-trigger 是启动致命的首要嫌疑**（不排除"预设/MCP 行的冷启动顺序"这一残余变量，需一次重启确认）。
- 当前 profile：patch 41,159 B / 684 行 / 8 顶层条目；bundles 12 项（kur 仍为已安装依赖但未列入 bundle，market 显示 `disabled`）。
- 回滚包已更新：`D:\Documents\deepseek-harness\default-workspace\profile-rollback\`
  - `restore-profile.ps1` → 回到**冷启动验证过**的最小可用态（patch=5 核心行，bundles=12）
  - `restore-profile.ps1 -Full` → 额外套上 40,509 B 全量 patch（含预设 + MCP 行，未冷启动验证）
  - 另存三档 patch：`.core`（881 B）/`.good-core-mcp`/`.good-core-mcp-presets`（当前运行态）

## 四、下一步

1. 用户再重启一次：若直接打开 → 冷启动也证明"预设 + MCP 行"没问题，**kur 就是那两次失败的元凶**，保持它禁用（或改用 injector 热注入的方式按需加载）。
2. 若又失败 → 说明是预设行/MCP 行的冷启动顺序问题，再逐个剥离（先用 `.core` + MCP 行、再用 `.core` + 预设行分别重启一次）。
3. kur 若要启用，其行配置必须保持 `thresholdTokens: 900000`（高于 bili 的 700000 预算），否则会与 billion-context 抢压缩并弄脏前缀缓存。
