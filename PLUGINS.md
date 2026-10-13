# 插件功能一览

本文件逐个说明这套 DSH 环境里每个插件的**用途、提供的工具/界面、上游来源**。
分两部分：`A` 是随本仓库携带的本地插件（`plugins/`），`B` 是从 npm 安装的社区插件（只锁版本，见 `profile/manifest.json`）。
另有 `D`：写进 home patch 的**外部 MCP 服务**（非插件）。

> **两台机器共用本仓库**：快照源机（`C:\Users\Administrator`，插件按**套件**装配在 `plugins/dsh-routing-suite/{injector,graded,preset}`）
> 与本机（`C:\Users\60410`，插件按包名**平铺**在 `plugins/dsh-<名>`）。同步脚本只增不删，所以仓库里两套布局并存；
> 每节都标出目录归属，装配时取自己机器那一套即可。

> 版本号取自各插件 `package.json` 的实机安装值；描述基于各插件自身 README。
> 「AI 工具」= 会进入模型工具表（schema）因而可被模型调用的工具；「界面」= 只在 GUI 里可见的能力。

---

## A. 随仓库携带的本地插件（`plugins/`）

### A1. `@dsh-external/dsh-super-injector` — 运行时注入器（超级模组）

- **目录**：`plugins/dsh-super-injector`（本机 60410 平铺装配）／`plugins/dsh-routing-suite/injector`（源机套件装配，同源同版本）　**版本**：0.3.3　**许可**：BSD-3-Clause
- **上游**：`yjh051108/dsh-super-injector`（套件仓库 `yjh051108/dsh-routing-suite` 的 `injector/`）
- **一句话**：BepInEx 式的 DSH 插件运行时注入器——把任意本地插件包**免重启**挂进正在运行的 DSH，
  host 与 client（UI）同时生效，且可热重载、可自重载、卸载即净。

**核心能力**

| 能力 | 说明 |
|---|---|
| 运行时注入 | `junction` 链接 + `loader.create`，不碰 profile patch、不改 `package.json`、不重启 |
| 双端生效 | 一次注入同时装载 host 侧（工具/服务）与 client 侧（UI 面板/路由） |
| 热重载 | 清 ESM 缓存 → 重新 import → 重建 fiber；失败自动回滚保留旧代 |
| 卸载即净 | 卸 loader entry → 清注入清单 → 删 junction → 写 `disabled` 防被 `include.refresh` 加回 |
| 侧挂测试（staging） | 工具先挂「后侧」——不进 tools schema、不污染缓存前缀，验证后一键转正 |
| 自愈 | profile patch 重复 id 去重修复、`link:` 依赖 junction 悬空重建、webserver 路由残留清理 |
| 生产线 | 脚手架（四种形态）→ 构建打包 tgz → 发布 GitHub Release |
| 四种形态 | `toolkit` 工具包 / `daemon-loop` 守护循环（timer + LLM 自主 agent loop）/ `ui-panel` UI 面板 / `hybrid` 混合 |

**AI 工具（`dev_*` 全家桶）**

`dev_plugin_status`、`dev_inject_plugin`、`dev_uninject_plugin`、`dev_injected_list`、
`dev_reload_package`、`dev_install_package`、`dev_reload_preset`、
`dev_scaffold_plugin`、`dev_build_plugin`、`dev_release_plugin`、`dev_self_test`、
`dev_fix_patch`、`dev_heal_links`、`dev_clear_routes`、
`dev_stage_add` / `dev_stage_call` / `dev_stage_list` / `dev_stage_promote` / `dev_stage_demote`。

**典型用法**：`dev_plugin_status`（看现状）→ `dev_scaffold_plugin`（造骨架）→ `dev_build_plugin`（编译打包）
→ `dev_inject_plugin`（注入生效）→ `dev_self_test`（全链路回归）→ `dev_uninject_plugin`（卸载）。

---

### A2. `@dsh-external/dsh-graded-mode` — 分级模式

- **目录**：`plugins/dsh-graded-mode`（本机 60410 平铺装配）／`plugins/dsh-routing-suite/graded`（源机套件装配，同源同版本）　**版本**：0.0.1-rc1　**许可**：Apache-2.0
- **上游**：`yjh051108/dsh-routing-suite`（`graded/`）
- **依赖提醒**：本机这份需要 `@deepseek-ai/schemastery`（`package.json` 的 peerDependency）；快照**不含** `node_modules`，
  换机器后在该目录跑 `npm install --omit=dev --ignore-scripts` 才能 import（否则 `ERR_MODULE_NOT_FOUND`）。
- **一句话**：给会话装一套**两级任务协议 + 打卡制**的严肃工作流，用 `/graded <任务>` 启动，
  目标是「先对齐目的、再把大类/小类拆到可验收、然后逐项打卡、最后由冷视角红队裁决」。

**七步链路**

1. **脑暴选择题** → 2. `commit_star` **定稿北极星**（为谁 / 什么处境 / 什么价值 / 可观测结果，附需求、非目标、假设）
→ 3. `edit_plan` 写 **L1 大类**（含组级验收）→ 4. `lock_stage` 锁 L1 → 5. `edit_plan` 写 **L2 小类**（spec / accept / do / verify）
→ 6. `lock_stage` 锁 L2（自动弹出树状图审核）→ 7. 开发期 `mark_task` **逐项打卡** + `redteam_verdict` **冷视角终验**。

**AI 工具（6 个）**

| 工具 | 作用 |
|---|---|
| `commit_star` | 头脑风暴定稿：北极星目的宣言 / 需求 / 非目标 / 假设 / 验收模式；开发前可再次调用=修订 |
| `edit_plan` | 按层级编辑计划树：`level=L1` 大类（title/spec/accept）、`level=L2` 完整树（每小类 title/spec/accept/do/verify，concepts ≤3） |
| `lock_stage` | 锁定当前层级；锁 L2 后所有门关闭并弹树状图确认 |
| `mark_task` | 开发期逐个标定完成状态（小类 / 大类；大类仅当组内小类全 completed） |
| `redteam_verdict` | 对 `verify=redteam` 的项做冷视角裁决（pass / reject + 问题清单），打回后须再裁决 |
| `revise_do` | 开发期修订执行形态（self / subagent / workflow / daemon / mixed），verify 只读不打折 |

**其他**：三种验收模式 `correct`（可测量断言）/ `experience`（感受断言 + 可复现动作）/ `research`（可复核断言）；
审计端点 `/graded-mode/api/audit`；skill 与测试随包（`skills/`、`tests/`）。

---

### A3. `router-standard` / `router-spec` / `router-react` — 思维模式路由预设（agent preset，非插件）

- **目录**：`presets/router-{standard,spec,react}`（本机 60410 从 `~/.dsh/.agent-presets/` 采集的 legacy 快照）
  ／`plugins/dsh-routing-suite/preset`（源机套件版）
  ／`plugins/dsh-preset-router-{standard,spec,react}`（本机 60410 的 **bundle 声明版**，见下）　**版本**：0.3.0　**许可**：MIT
- **上游**：`yjh051108/dsh-router-standard`
- **一句话**：不是插件，而是**新会话可选的 agent 预设**——按任务分类自动切换到对应的 persona / 思维模式，
  并做「近距离引导」，让模型把力气花在正确的工作方式上。

**要点**

- 三个预设：`router-standard`、`router-spec`、`router-react`（本机 60410 三个都装了）。
- v0.3.0 变更：首轮路由真实生效；近距离引导改走 `agent/pre-step`；**每轮省 1 次 API 调用**。
- 兼容区间：`DSh Target >=0.1.0-rc.6 <0.2.0`——DSH 升级到 0.2.x 后需注意复核。
- **两种安装方式，本机 60410 两种都在**：
  1. **legacy 目录**：预设必须**平铺**到 `~/.dsh/.agent-presets/<预设名>`（DSH 只扫一层，不能整目录复制）。
     快照里对应 `presets/`，`install.ps1` / `install.sh` 会复制回去；生成脚本 `tools/build-preset-bundles.mjs` 的另一半工作即此。
  2. **bundle 声明**（0.2.0-rc.2 的正式形态）：官方技能 `editing-cordis-compositions` 明示预设由 bundle patch 里的
     `@deepseek-ai/dsh-agent-preset` 声明承载、loader 行 id 约定 `preset-<id>`，并直言 legacy 目录
     「Nothing reads that directory any more」；本机据此把每个预设包成一个 bundle
     （`package.json` + `cordis.patch.yml` 里 `- id: preset-<名>` / `name: '@deepseek-ai/dsh-agent-preset'` /
     `config{id,name,description,order,plugins}`，`plugins` 逐字取自原 `agent.cordis.yml`），装进 profile 的
     `dsh.profile.bundles`。
- **实测观察（2026-10-13，DSH 0.2.0-rc.2）**：本机 legacy 目录存在时 `GET /api/preset-center/state` 的 `occupied`
  为 `["cordis","liangshen","minimal","ptc","standard"]`（**不含**三个 router 预设）；bundle 版是否出现在预设选择器里
  **需一次冷启动才能确认**（预设声明只在启动时读取）。在确认前**不要删** `~/.dsh/.agent-presets/`（留着当回滚）。

---

### A4. `dsh-memory-evolve` — 长期记忆与自我进化

- **目录**：`plugins/dsh-memory-evolve`　**版本**：0.1.0　**许可**：MIT
- **上游**：`csyangwen/dsh-memory-evolve`
- **一句话**：把「记忆 / 待办 / 技能 / 画板 / 会话评审 / 外部 AI 调度」做成一整套自我进化机制，
  让 DSH 跨会话记住项目事实、自己写技能、并能把活派给别的 AI。

**主要能力（十大场景）**

| 场景 | 说明 |
|---|---|
| 五轨记忆 | `memory`（全局事实）/ `user`（用户事实）/ `project`（当前项目日志）/ `key`（项目关键长期记忆，自动注入）/ `daily`（今日日志）；支持写入需确认队列、渐进式披露（`summary` + `expand`）、归档/移回、按 git 分支过滤 |
| 记忆同步 | 用一个独立 git 仓库在多台设备间同步记忆（**记忆不塞进代码仓库**） |
| 待办 + 项目日志 | `dtodo` 四轨待办（life / work / project / daily），四象限、截止日、智能视图；项目日志按工作目录隔离 |
| 内部会话团队 | 在自己的会话之间组建「内部团队」协作 |
| 外部 CLI 代理 / COI 调度 | 调度外部 CLI 代理（内外协同、编队调度） |
| 提示词注入 | 把记忆与约定注入系统提示词 |
| 书签与任意轮分支 | 会话书签、从任意一轮分叉重开 |
| 手机访问与通知 | 手机上访问会话；`de_notify` 发通知、`de_channel_send` 直发渠道（飞书 / QQ / 微信 / 企微 / Web 站内通知，支持图片与文件） |
| 会话评审 Advisor | 对会话做评审与建议（Advisor） |
| 无限画板 | `de_canvas` 无限画板（拖拽、分区、AI 生成可视化） |

**AI 工具（示例）**：`memory`、`dtodo`、`skill_manage`、`commit_star` 等记忆/技能/计划工具，
以及自有的 `de_canvas`（无限画板）、`de_notify`（通知）、`de_channel_send`（渠道直发）、`de_session_images`（会话图片引用）。

**其他**：前端资源含 `vendor/mermaid.min.js`（画板/图表渲染）；发布流程用 `git tag v<数字>`。

---

### A5. `only-memory` — 零依赖长期记忆（MCP）

- **目录**：`plugins/only-memory`　**版本**：0.1.0　**许可**：MIT
- **一句话**：不依赖任何外部服务的长期记忆插件——SQLite 编译成 WASM（`sql.js`）本地落盘，
  纯 JS 向量检索，通过 MCP 暴露 11 个记忆工具，另带一个 Web 管理界面。

**AI 工具（11 个，模型侧前缀 `mcp__only_memory__`）**

`remember`、`search`、`get_memory`、`update_memory`、`pin_memory`、`unpin_memory`、
`list_memories`、`forget`、`stats`、`export_memories`、`import_memories`
（另有 `filter_by_tag` / `add_tag` / `remove_tag` / `link_memories` / `get_links` /
`list_sessions` / `get_session_memories` / `run_maintenance` / `summarize_memories` 等扩展工具）。

**其他**

- Web 管理界面：`http://127.0.0.1:3456`（默认端口）。
- 环境变量：`ONLYMEM_PROJECT`（项目隔离）、`ONLYMEM_DATA_DIR`（数据目录）、`ONLYMEM_WEB_PORT`（端口）。
  **注意**：不同 `ONLYMEM_PROJECT` 会隔离出不同的记忆库，跨设备复原时保持一致才能看到同一份记忆。
- 数据默认落在 `~/.onlymem/`（属个人数据，不入本仓库）。
- 依赖 `@modelcontextprotocol/sdk` + `sql.js`；包内 `dist/` 已预构建。
- **装配特例（本机 60410 未接线）**：它的 patch 用 `!!js` 解析 `<DSH_HOME>/profiles/node_modules/only-memory`
  （回退 `<DSH_HOME>/profiles/<profile>/node_modules/only-memory`）。本机 `~/.dsh/profiles/node_modules` **不存在**，
  所以它只躺在 `~/.dsh/plugins/only-memory`（依赖已装）**没有进 profile**；要用先建那个 junction。

---

### A6. `dsh-ua-skills` — 本地技能 provider（零依赖，本机自建）

- **目录**：`plugins/dsh-ua-skills`　**版本**：0.0.1　**许可**：MIT（本机自建，非上游项目）
- **一句话**：把下面 A7 的 9 个 `understand*` 技能用**官方 skills provider 契约**重新注册的零依赖插件——
  `ctx.inject(['skills'], skillCtx => skillCtx.skills.registerProvider(() => provider))`，`rank = 600`
  （= 官方 `BUNDLED_SKILL_RANK` 同值，**内联常量、不 import 官方包**），`skills/` 以 junction 指向 A7 的技能目录。
- **为什么有它**：A7 自己用 `import { BUNDLED_SKILL_RANK } from '@deepseek-ai/dsh-skill'` 取 rank，在本机解析失败
  → 插件行 `failed to import`、9 个技能全部不可见；孪生插件把常量内联就绕开了这条解析。
- **工具/界面**：无新增 AI 工具、无界面；纯 provider。技能经官方 `skill` 工具加载（`skill understand-figma` 实测通过）。
- **日志**：模块求值 / apply / 注册候选数写在 `<workspace>/ua-skills-plugin.log`。

### A7. `dsh-understand-anything` — 代码库理解技能包（9 个技能）

- **目录**：`plugins/dsh-understand-anything`　**版本**：0.1.0　**许可**：MIT
- **一句话**：以 skills provider 形式提供 `/understand*` 系列技能（`understand` 总入口 + onboard / explain / diff /
  chat / dashboard / domain / knowledge / figma），把「读懂一个陌生代码库」做成可复用流程。
- **本机 60410 状态**：技能本体可用（由 A6 注册，`~/.dsh/super-injector/registry.json` 记录为运行时注入）；
  它自己的 provider 行仍在 `failed to import`（`@deepseek-ai/dsh-skill` 解析不到）。本机已把 `index.js` 的
  `import { BUNDLED_SKILL_RANK }` 一行改写成内联常量 `const BUNDLED_SKILL_RANK = 600;`，
  **改后需冷启动才能确认**（同一 URL 的 ESM 求值错误在本进程内被 realm 缓存，热重载看不到效果）。
- **工具/界面**：无独立 AI 工具；9 个技能经官方 `skill` 工具调用。

---

## B. 从 npm 安装的社区插件（版本锁定）

B1–B6 这 6 个插件**不随仓库携带代码**（体积大、npm 可复现），由 `install.ps1` / `install.sh` 按锁定版本安装。
B7 是特例：**不在 npm 上、当前有意不启用**（会让 DSH 启动期插件层致命），仅作记录。
以下描述基于各自 README（版本取自各自 `package.json`）。

### B1. `billion-context` v0.1.195

架在编程助手与模型 API 之间的上下文压缩插件：把已消耗的对话折叠成分层摘要，并注入上下文管理工具，
由模型自主决定何时压缩、压缩哪一段，从而实现超长会话与更少重发 token。压缩增量、可逆、对前缀缓存友好，
折叠后的范围在历史中保持摘要形态直到被恢复。DSH 走原生插件路径（`dsh plugin --profile <name> add billion-context`）。

- 关键能力：模型自主决策压缩、增量可逆压缩、前缀缓存友好、分层摘要与按需解压
- 工具/界面：`compress`、`decompress`、`search_context`、`acp_status`；另有 `/acp`、`/acp-cache` 命令

### B2. `dsh-context` v0.66.1

为 DSH 提供上下文洞察与管理：以 KPI 带、7 天用量图、活动热力图、构成环与可筛选会话卡片组成跨会话概览页；
会话内提供统计、构成、趋势、事件、文件活动与 Agent 网络卡片，并可逐请求查看上下文实际由什么组装而成。
占用与构成读取与输入框上下文环相同的官方 token-meter 投影，数值一致。

- 关键能力：跨会话用量/成本/缓存命中概览、逐请求上下文组装追溯、压缩与裁剪事件标记、偏好设置（视图位置、趋势粒度、文件活动排序）
- 工具/界面：侧边栏一级面板「Context Insights / 上下文洞察」、会话内「Context / 上下文」Tab、`/context` 命令、设置中的 Preferences 卡片

### B3. `dsh-cost-meter` v1.8.17

统计 DSH 会话费用的插件：输入/输出/缓存/推理费用按轮次、模型、搜索与压缩拆分，提供日/周/月与全部历史记录、
当日费用与预算进度。内置 170+ 模型价格目录与自动匹配，支持峰谷计价时段显示与切换前弹窗及系统通知。
可查询官方余额、自定义 Provider 余额和 11 家 Coding Plan 额度，订阅额度与按量金额双轨计费，界面中英双语。

- 关键能力：多厂商多模型价格计费、Coding Plan/订阅额度查询、预算与余额进度条、峰谷时段提醒与弹窗通知
- 工具/界面：侧边栏余额/额度卡片、预算图框、输入框上方额度横条；设置 → 费用（计费统计、价格表、拓展价格表、用量、Token 用量热图、历史记录）；**无新增 AI 工具**

### B4. `dshmarket` v1.66.14

装在 DSH 里的可视化插件市场：在设置中浏览社区目录（4200+ 插件，分类筛选、star 与最热/最新排序），
一键安装、更新、卸载插件，并支持主题安装与即时切换。另有收藏、分组、备注、备份与恢复（WebDAV / GitHub Gist）、
热禁用与启用、插件诊断（加载顺序、重复条目、依赖冲突）、拖拽调整加载顺序、导出脱敏日志。

- 关键能力：社区目录浏览与搜索、一键安装/更新/卸载、主题管理与切换、备份恢复（WebDAV/Gist）、诊断与加载顺序、热禁用与按需重启
- 工具/界面：设置 → 插件市场（发现/主题/收藏等页面）；设置 → 插件 → 插件配置 中的 dshmarket 设置卡片；**无新增 AI 工具**

### B5. `@nanmicoder/dsh-agent-teams` v0.1.22

让当前 DSH 会话成为队长：用自然语言创建可续聊的子 Agent 团队，把目标拆成带依赖的任务，
成员通过持久化邮箱与队长或队友直达消息；调度器按 running/idle/ready 状态自动为空闲成员领取就绪任务。
默认质量门禁为需求→实现→验证→审查→集成，失败后自动修复与复审；
Web UI 以可交互 DAG 和成员树展示实时工作，团队状态持久化在 `<workspace>/.agent-teams/`。

- 关键能力：队长式委派、可续聊成员与持久化邮箱、带依赖任务与安全接管（转派前撤销旧 attempt）、质量门禁与自动修复复审
- 工具/界面：14 个业务工具，README 点名 `agent_teams_create`、`agent_teams_add_member`、`agent_teams_status`
  （完整列表见仓库 `docs/usage.md`，该文件未随 npm 包发布）；`/agent-teams` slash 命令；Web「团队协作」标签页与实时活动面板

### B6. `@linxin666/dsh-client-ui-skill-explorer` v0.4.5（源机）／`@linxin666/dsh-web-all` v0.4.5（本机 60410）

> 同一功能的两条安装路径：源机单独装 `@linxin666/dsh-client-ui-skill-explorer`；本机 60410 装的是它的**元包**
> `@linxin666/dsh-web-all@0.4.5`（含 `web-ui-skill-explorer` 等 20 个子包），技能中心同样可用。

DSH Web GUI 与官方桌面客户端的技能中心：按来源分级（内置、项目 `.dsh/skills` 与 `.agents/skills`、自定义目录、
用户 `~/.dsh/skills` 与 `~/.agents/skills`、运行时注册）浏览已加载 skill，支持搜索过滤、启用或禁用模型调用、
可视化创建、就地编辑 SKILL.md、删除并移入可恢复回收站。只列出官方 provider 会实际加载的技能，
同名技能按官方来源 rank 决胜；纯 GUI 管理层，不改变 skill 的加载与注入语义。

- 关键能力：按来源分级浏览与搜索、启停模型调用（改写 frontmatter 的 `disable-model-invocation`）、创建与就地编辑 SKILL.md、回收站删除与恢复
- 工具/界面：侧边栏「技能中心」原生中栏页面（技能 / 创建 / 编辑 三个 tab）；
  `/api/dsh-skill-explorer/*` 路由（list、read、set-enabled、create、update、delete、health）；**无新增 AI 工具**

### B7. `kur-compact-trigger` v1.2.0（KumarZX）— 已安装，**有意不启用** ⛔

基于官方 `token-meter` 的第三方压缩触发器：会话 token 达到阈值时主动触发压缩，本意是在
billion-context 之前拦住超长上下文。**当前状态：包已装在 `~/.dsh/plugins/kur-compact-trigger`
（`package.json` 里 `dsh.bundle.patch = ./cordis.patch.yml`、`dsh.client.platform = web`），
但不在 `dsh.profile.bundles` 里，启动时不会被加载**——`dependencies` 里仍留着它的 `link:`，
属于「装着不用」。

- **未启用的原因（已确证，2026-10-13）**：把它放进 `dsh.profile.bundles` 后两次冷启动都触发
  **启动期插件层致命**——启动后弹窗要求禁用所有插件，同时宿主把 `dsh.profile.bundles` 重置为
  `@deepseek-ai/dsh-base` + `@deepseek-ai/dsh-web-app` 两个基座、`cordis.patch.yml` 重置为默认核心行，
  每次留下 `cordis.patch.yml.bak-<epoch>`。带两个 Router 预设行（含 `!!js` 与 `file:///` 模块）+
  `mcp-chrome-devtools` insert 行、去掉它之后冷启动正常（无新增 `.bak`、`/dsh-market/check` ok=true、
  10 插件全 live）→ 二分锁定为它。详见
  [判决实验](docs/changes/2026-10-13-plugin-startup-fatality-verdict.md) 与
  [二分与最终可用态](docs/changes/2026-10-13-plugin-bisect-and-final-state.md)。
- **它自身已完成的三处适配**（若要重新启用，这些都是前提）：
  1. 上游包不自带 `dsh.bundle.patch`（会被 loader 对账标 `disabled`）→ 已补 `cordis.patch.yml` 成为真正的 bundle 层；
  2. DSH `0.2.0-rc.2` 的 `settings` 服务只有 `configure()`、没有 `register()`，上游调用会抛
     `ctx.settings.register is not a function` 使 fiber 加载失败 → `lib/index.js:36-51` 已打**本机兼容补丁**：
     `const settings = typeof ctx.settings?.register === "function" ? ctx.settings.register(SETTINGS_NS, SettingsSchema, { base: baseSettings }) : { get: () => baseSettings, set: async () => {} }`
     （回落时设置面板与标题栏按钮inert，但按行 config 的每会话触发仍可用）；
  3. 自带 **24 个** `@deepseek-ai/*` 宿主包副本（从 `app.asar` 抽出；`cordis 4.0.4` / `schemastery 3.18.4`），
     版本须与宿主一致。
- **阈值约束（重要）**：行配置必须保持 `thresholdTokens: 900000`（上游默认 200000）。本机
  bili 的 `compress.maxContextLimit = 700000`，任何早于它的第三方折叠都会重写前缀、造成 bili 前缀缓存 miss
  （`#2658`/`#2596` 一类问题）；而本机**有效输入上限只有 792,576**（= 1,048,576 − 256,000 输出预留，
  见 [输出预留取证](docs/changes/2026-10-13-output-reservation-and-crash-forensics.md)），
  所以 900000 实际永不触发 —— 启用它现阶段的收益只是「一个永不生效的保险 + 标题栏手动按钮」。
  真要让它起作用，得先解决输出预留（缩小 DSH 发出的 `max_tokens`）。
- **两条备选启用路径（都未冷启动验证）**：① 删掉它自带的 24 个 `@deepseek-ai/*` 副本，赌宿主运行时
  为插件模块解析安装包（`dsh-app-boot` 里确实有 profile resolution 层：`node-addon-require-builtin` →
  `esm/resolve.defaultResolve`、`Module._resolveFilename`、`packageDirFromAnchor`「installation anchor
  first, then the profile directory」，但纯 Node 侧 `import` 仍报
  `Cannot find package '@deepseek-ai/schemastery'`，必须冷启动才能判定）；
  ② 不进 bundles，改用注入器 `dev_inject_plugin` 运行时热注入 host 部分。
- **回滚**：`profile-rollback\undo-kur-option1.ps1`（把 profile 的 `cordis.patch.yml` / `package.json`
  还原成 16:36 冷启动那套，并把 24 个包放回插件 `node_modules`）。
- **来源**：`KumarZX/kur-compact-trigger`（npm 上没有这个包，`npm view` / `npx` 均 404，只能本地 vendored 装配）。
- 关键能力：按 token 阈值主动压缩、标题栏手动触发按钮、按会话覆盖阈值
- 工具/界面：host 行 `inject: ['tokenMeter','settings','agentPresets']`（`compaction` 服务经
  `ctx.agentPresets.serviceFor(agent, 'compaction')` 取活实例，故意不注入）；Web 客户端部分持有 7 个
  `dsh-client-*` 注入；监听 `agent/pre-step`

---

## C. 官方内置能力（非本仓库内容）

以下不属于本仓库的插件，但常被和上面的插件一起使用，列出来避免混淆：

- **DSH 本体**：会话、工具、权限、文件沙箱、`dsh plugin` 装配 CLI；
- **官方基础插件**：`dsh-base`、`dsh-web-app`（Web GUI 外壳）——随 DSH 自带，`profile/package.snapshot.json` 的 `bundles` 里可见；
- **token-meter**：输入框上下文环的官方投影（`dsh-context` 读的就是它）；
- **官方内置技能**：`office-docx` / `office-xlsx` / `office-pptx`、`diagnose-windows-sandbox-acl` 由 DSH 的
  bundled skill 目录提供；另有 `agent-experience`、`cordis-composition-reference`、
  `cordis-plugin-development`、`editing-cordis-compositions` 随 `@deepseek-ai/dsh-agent-preset` 打包，
  **不会**出现在会话技能目录里。本仓库快照的技能（superpowers 等）见 [SKILLS.md](SKILLS.md)。

---

## D. 写进 home patch 的外部 MCP 服务（非插件）

`<DSH_HOME>/cordis.patch.yml`（**home patch**，对所有 profile 生效）里可以直接 insert 官方
`@deepseek-ai/dsh-mcp-client` 行，把外部 MCP 服务挂进 DSH；工具在会话里暴露为 `mcp__<serverName>__<tool>`。
本机 60410 注册了 **REA**：

### D1. REA — 逆向工程 / 证据工作流（`morluto/rea`，npm `rea-agents`）

- **服务名**：`rea`　**工具前缀**：`mcp__rea__`　**技能**：`reverse-engineer-anything`（装进 `~/.agents/skills`）
- **一句话**：把「取证式逆向工程」做成 agent 工具集（证据链、静态/动态观察、二进制与容器分析等），
  通过 stdio MCP 服务暴露；DSH 侧只是一个 `dsh-mcp-client` 行，不需要插件。
- **安装（要点）**：DSH 集成**只在 `main` 分支**（npm 6.4.0 里没有，`docs/installation.md:210-211`）⇒
  必须从源码构建：`npm ci --no-audit --no-fund` → `npm run build:cached`（产出 `dist/mcp/main.js`），
  再 `node scripts/rea.mjs setup --client dsh --yes`。它会写 **home patch**（保留其他 patch 与注释）、
  并可 `--skill --yes` 装技能；`rea doctor --client dsh` 校验同一 entry id。
- **写进去的行**（literal config + root-level insert，`!!js` 与 group-targeted 插入会被拒绝）：

  ```yaml
  - insert:
      - id: rea-mcp
        name: "@deepseek-ai/dsh-mcp-client"
        config:
          serverName: rea
          transport: stdio
          command: <node 绝对路径>
          args: ["<rea 仓库>/scripts/rea.mjs", mcp]
  ```

- **本机实测（2026-10-13）**：`rea doctor --client dsh` → 注册对齐、技能对齐（v41 / 191 tools）；
  会话内 MCP 调用可达（serverName `rea`，`list_mcp_resources` 返回 `[]`）。
- 片段与说明另见 [mcp/README.md](mcp/README.md)、[mcp/rea.cordis.patch.yml](mcp/rea.cordis.patch.yml)。
