# 插件功能一览

本文件逐个说明这套 DSH 环境里每个插件的**用途、提供的工具/界面、上游来源**。
分两部分：`A` 是随本仓库携带的本地插件（`plugins/`），`B` 是从 npm 安装的社区插件（只锁版本，见 `profile/manifest.json`）。

> 版本号取自各插件 `package.json` 的实机安装值；描述基于各插件自身 README。
> 「AI 工具」= 会进入模型工具表（schema）因而可被模型调用的工具；「界面」= 只在 GUI 里可见的能力。

---

## A. 随仓库携带的本地插件（`plugins/`）

### A1. `@dsh-external/dsh-super-injector` — 运行时注入器（超级模组）

- **目录**：`plugins/dsh-routing-suite/injector`　**版本**：0.3.3　**许可**：BSD-3-Clause
- **上游**：`yjh051108/dsh-super-injector`
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

- **目录**：`plugins/dsh-routing-suite/graded`　**版本**：0.0.1-rc1　**许可**：Apache-2.0
- **上游**：`yjh051108/dsh-routing-suite`（`graded/`）
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

- **目录**：`plugins/dsh-routing-suite/preset`　**版本**：0.3.0　**许可**：MIT
- **上游**：`yjh051108/dsh-router-standard`
- **一句话**：不是插件，而是**新会话可选的 agent 预设**——按任务分类自动切换到对应的 persona / 思维模式，
  并做「近距离引导」，让模型把力气花在正确的工作方式上。

**要点**

- 三个预设：`router-standard`、`router-spec`、`router-react`（本机 `~/.dsh/.agent-presets` 装了前两个，
  `router-react` 只存在于此目录，需要可自行平铺复制）。
- v0.3.0 变更：首轮路由真实生效；近距离引导改走 `agent/pre-step`；**每轮省 1 次 API 调用**。
- 兼容区间：`DSh Target >=0.1.0-rc.6 <0.2.0`——DSH 升级到 0.2.x 后需注意复核。
- **安装特例**：预设目录必须**平铺**到 `~/.dsh/.agent-presets/<预设名>`（DSH 只扫一层，不能整目录复制）。

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

---

## B. 从 npm 安装的社区插件（版本锁定）

这 6 个插件**不随仓库携带代码**（体积大、npm 可复现），由 `install.ps1` / `install.sh` 按锁定版本安装。
以下描述基于各自 README（版本取自各自 `package.json`）。

### B1. `billion-context` v0.1.194

架在编程助手与模型 API 之间的上下文压缩插件：把已消耗的对话折叠成分层摘要，并注入上下文管理工具，
由模型自主决定何时压缩、压缩哪一段，从而实现超长会话与更少重发 token。压缩增量、可逆、对前缀缓存友好，
折叠后的范围在历史中保持摘要形态直到被恢复。DSH 走原生插件路径（`dsh plugin --profile <name> add billion-context`）。

- 关键能力：模型自主决策压缩、增量可逆压缩、前缀缓存友好、分层摘要与按需解压
- 工具/界面：`compress`、`decompress`、`search_context`、`acp_status`；另有 `/acp`、`/acp-cache` 命令

### B2. `dsh-context` v0.66.0

为 DSH 提供上下文洞察与管理：以 KPI 带、7 天用量图、活动热力图、构成环与可筛选会话卡片组成跨会话概览页；
会话内提供统计、构成、趋势、事件、文件活动与 Agent 网络卡片，并可逐请求查看上下文实际由什么组装而成。
占用与构成读取与输入框上下文环相同的官方 token-meter 投影，数值一致。

- 关键能力：跨会话用量/成本/缓存命中概览、逐请求上下文组装追溯、压缩与裁剪事件标记、偏好设置（视图位置、趋势粒度、文件活动排序）
- 工具/界面：侧边栏一级面板「Context Insights / 上下文洞察」、会话内「Context / 上下文」Tab、`/context` 命令、设置中的 Preferences 卡片

### B3. `dsh-cost-meter` v1.8.15

统计 DSH 会话费用的插件：输入/输出/缓存/推理费用按轮次、模型、搜索与压缩拆分，提供日/周/月与全部历史记录、
当日费用与预算进度。内置 170+ 模型价格目录与自动匹配，支持峰谷计价时段显示与切换前弹窗及系统通知。
可查询官方余额、自定义 Provider 余额和 11 家 Coding Plan 额度，订阅额度与按量金额双轨计费，界面中英双语。

- 关键能力：多厂商多模型价格计费、Coding Plan/订阅额度查询、预算与余额进度条、峰谷时段提醒与弹窗通知
- 工具/界面：侧边栏余额/额度卡片、预算图框、输入框上方额度横条；设置 → 费用（计费统计、价格表、拓展价格表、用量、Token 用量热图、历史记录）；**无新增 AI 工具**

### B4. `dshmarket` v1.66.9

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

### B6. `@linxin666/dsh-client-ui-skill-explorer` v0.4.5

DSH Web GUI 与官方桌面客户端的技能中心：按来源分级（内置、项目 `.dsh/skills` 与 `.agents/skills`、自定义目录、
用户 `~/.dsh/skills` 与 `~/.agents/skills`、运行时注册）浏览已加载 skill，支持搜索过滤、启用或禁用模型调用、
可视化创建、就地编辑 SKILL.md、删除并移入可恢复回收站。只列出官方 provider 会实际加载的技能，
同名技能按官方来源 rank 决胜；纯 GUI 管理层，不改变 skill 的加载与注入语义。

- 关键能力：按来源分级浏览与搜索、启停模型调用（改写 frontmatter 的 `disable-model-invocation`）、创建与就地编辑 SKILL.md、回收站删除与恢复
- 工具/界面：侧边栏「技能中心」原生中栏页面（技能 / 创建 / 编辑 三个 tab）；
  `/api/dsh-skill-explorer/*` 路由（list、read、set-enabled、create、update、delete、health）；**无新增 AI 工具**

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
