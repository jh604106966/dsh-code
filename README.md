# dsh-code — DeepSeek Harness 插件环境快照

> **一句话**：把本机这套 DeepSeek Harness（DSH）所用的插件、预设与装配清单打包成一个仓库，
> 换一台电脑 `git clone` + 跑一次安装脚本，就能得到**功能一致**的 Harness。

- **快照来源**：DSH 桌面版 `0.2.0-rc.2`（Electron 运行时 44.0.0 / Node 24.21.0 / pnpm 11.7.0），
  活动 profile = `desktop`，操作系统 Windows。**两台机器共用本仓库**：快照源机（`C:\Users\Administrator`，
  2026-10-12 采集，插件按**套件**装配在 `plugins/dsh-routing-suite/`）与本机 `60410`（`C:\Users\60410`，
  2026-10-13 采集，插件按包名**平铺**装配 + 注册了 REA MCP）；同步脚本只增不删，故两套布局并存、逐条标归属。
- **仓库内容**：本地插件源码（含预构建产物）+ agent preset（legacy 目录 `presets/` 与 bundle 声明两种形态）
  + `skills/` 技能快照 + 社区插件的版本锁定清单 + 安装脚本 + `mcp/`（外部 MCP 注册片段）。
- **不包含**：会话记录、API Key、`~/.dsh` 下的个人数据（记忆库 / 待办 / 附件 / 凭据）——这些属于个人数据，
  刻意不入库；只搬运「代码与装配关系」。

---

## 一、这套环境里装了什么

### 随仓库携带的本地插件（`plugins/`）

| 插件 | 版本 | 作用（详见 [PLUGINS.md](PLUGINS.md)） | 许可 |
|---|---|---|---|
| `@dsh-external/dsh-super-injector` | 0.3.3 | **运行时注入器**：任意本地插件包免重启注入、热重载、卸载、侧挂转正、路由与依赖自愈（`dev_*` 工具全家桶） | BSD-3-Clause |
| `@dsh-external/dsh-graded-mode` | 0.0.1-rc1 | **分级模式**：会话级两级任务协议（脑暴对齐 → 规格化计划 → 打卡制 → 红队裁决 → 终验） | Apache-2.0 |
| `dsh-memory-evolve` | 0.1.0 | **长期记忆 + 自我进化**：五轨记忆、待办、技能、无限画板、会话评审、内外 AI 协同与通知 | MIT |
| `only-memory` | 0.1.0 | **零依赖长期记忆（MCP）**：SQLite(WASM) + 纯 JS 向量检索，11 个记忆工具 + Web 管理界面 | MIT |
| `router-standard` / `router-spec` / `router-react` | 0.3.0 | **思维模式路由预设**（agent preset，非插件）：按任务分类切换 persona、近距离引导、单任务三锚 | MIT |
| `dsh-ua-skills` | 0.0.1 | **本地技能 provider**（本机 60410 自建）：零依赖重新注册 9 个 `understand*` 技能，绕开 `@deepseek-ai/dsh-skill` 解析失败 | MIT |
| `dsh-understand-anything` | 0.1.0 | **代码库理解技能包**：`understand` 总入口 + onboard / explain / diff / chat / dashboard / domain / knowledge / figma（本体由上面的 provider 注册） | MIT |
| `dsh-preset-router-{standard,spec,react}` | 1.0.0（本地） | **router 预设的 bundle 声明版**（本机 60410 新增形态）：`@deepseek-ai/dsh-agent-preset` 声明 + `preset-<id>` loader 行，替代已废弃的 `.agent-presets/` 目录 | MIT |

### 从 npm 安装的社区插件（版本锁定，不随仓库携带代码）

| 包名 | 版本 | 作用 |
|---|---|---|
| `billion-context` | 0.1.195 | 上下文压缩：模型自主决策的增量可逆压缩，超长会话 + 少重发 token |
| `dsh-context` | 0.66.1 | 上下文洞察面板：跨会话用量/成本概览、逐请求上下文构成追溯 |
| `dsh-cost-meter` | 1.8.17 | 会话费用统计：多厂商多模型计价、订阅额度、余额与峰谷提醒 |
| `dshmarket` | 1.66.14 | 可视化插件市场：社区目录浏览、一键安装/更新/卸载、主题与备份 |
| `@nanmicoder/dsh-agent-teams` | 0.1.22 | 多 Agent 团队协作：队长 + 成员 + 带依赖任务 + 质量门禁 + Web DAG 监控 |
| `@linxin666/dsh-client-ui-skill-explorer` 0.4.5（源机）／`@linxin666/dsh-web-all` 0.4.5（本机 60410） | 0.4.5 | 技能中心 UI：按来源浏览/搜索/启停/创建/编辑/删除 SKILL.md；本机装的是含它的**元包** `dsh-web-all` |

> 每个插件的功能详解（含工具名与界面位置）见 **[PLUGINS.md](PLUGINS.md)**。

### 外部 MCP 服务（写进 home patch，不是插件）

| 服务 | 作用 | 工具前缀 |
|---|---|---|
| `rea`（`morluto/rea`，npm 包 `rea-agents`） | **逆向工程 / 证据工作流**工具集（静态与动态观察、二进制与容器分析、证据包与 unknown 台账）；DSH 集成**只在 main 分支**（npm 6.4.0 没有），需 `npm ci && npm run build:cached` 后 `rea setup --client dsh` | `mcp__rea__` |

REA 还把一个技能装进 `~/.agents/skills/reverse-engineer-anything`（随本仓库 `skills/` 一起快照）。
写进 `$DSH_HOME/cordis.patch.yml` 的片段与注意事项见 **[mcp/README.md](mcp/README.md)**。

### 随仓库快照的技能（`skills/`）

| 来源 | 数量 | 说明 |
|---|---|---|
| `obra/superpowers` 7.0.0（MIT） | 15 | 头脑风暴、写计划、TDD、系统化调试、并行子代理、代码评审、技能编写等，入口技能为 `using-superpowers` |
| `DY-2026/GameDesignOS` 1.3.0.dev0（MIT） | 7 | 游戏设计 OS：概念架构、体验诊断、体验浓度实验包、策划案、资料策展、书籍翻译、AI 系统受控演化 |
| `nextlevelbuilder/ui-ux-pro-max-skill`（HEAD `7246805`） | 7 | UI/UX 设计智能：`ui-ux-pro-max`、`ui-styling`（shadcn/Tailwind）、`design-system`、`design`、`brand`、`slides`、`banner-design` |
| `wshobson/agents`（`plugins/ui-design`，sparse） | 1 | `interaction-design`：微交互/动效/过渡/反馈 |
| `anthropics/skills`（sparse） | 2 | `frontend-design`（视觉方向与排版）、`skill-creator`（造技能 + eval 度量） |
| `YuJunZhiXue/github-skill-forge` | 1 | `github-skill-forge`：把任意 GitHub 仓库转成标准化技能 |
| `vercel-labs/skills`（`skills/`，HEAD `13e4063`） | 1 | `find-skills`：帮用户搜索/挑选/安装技能（配套 `npx skills` 技能生态 CLI） |
| `OthmanAdi/planning-with-files`（`skills/`，HEAD `ff349eb`） | 1 | `planning-with-files`：落盘式持久规划（task_plan/findings/progress）+ 生命周期注入；上游另有**原生 DSH 插件**（默认未装，会开启完成门） |
| `BerriAI/self-improving-agent`（HEAD `0da0a20`，**包装**） | 1 | `self-improving-agent`：被用户批评"你自己"时提最小 diff、等明确批准再落地（上游技能是裸 `feedback.md`，本仓库包装成 `SKILL.md` + 原文镜像） |
| `anthropics/skills`（`skills/`，HEAD `dbd4588`） | 19 | Claude/Anthropic 官方技能全集：claude-api、docx、pptx、xlsx、pdf、canvas-design、mcp-builder、skill-creator、theme-factory、web-artifacts-builder、webapp-testing、algorithmic-art、brand-guidelines、slack-gif-creator、frontend-design、internal-comms、academy-guide、doc-coauthoring、discernment-nudge |
| `eze-is/web-access`（仓库根即技能，HEAD `2c8bf0e`） | 1 | `web-access`：所有联网操作（搜索/抓取/登录后操作/动态页面/社媒）统一入口；配合浏览器自动化使用 |
| `anthropics/claude-code` → `plugins/code-review`（HEAD `bf2323b`，**包装**） | 1 | `code-review`：高信噪比 PR 审查流程（上游是斜杠命令，本仓库包装成 SKILL.md + 原文镜像，含 DSH 适配） |
| ClawHub `@steipete/github`（v1.0.0，注册表） | 1 | `github`：用 `gh issue`/`gh pr`/`gh run`/`gh api` 操作 GitHub（ClawHub 装成命名空间目录，本仓库自动扁平化） |
| `dsh-memory-evolve` 插件自带 | 5 | `codex/grok/hermes/kimi-cli-calling` + `memory-consolidate`，装插件即恢复，**不**重复入库 |

技能由 `tools/sync.mjs` 从 `~/.agents/skills`（以及 `$DSH_HOME/skills`）采集，`install.ps1` / `install.sh`
复制回 `~/.agents/skills`（可用 `-AgentsHome` / `AGENTS_HOME` 覆盖）。技能落地即生效，**不需要重启** DSH。
每个技能的用途、上游版本与更新流程见 **[SKILLS.md](SKILLS.md)**。

---

## 二、在新电脑上复原（Windows）

```powershell
# 0. 前置：装好 DSH（桌面版或 CLI），版本尽量靠近 0.2.0-rc.2
# 1. 拉本仓库
git clone https://github.com/jh604106966/dsh-code.git
cd dsh-code

# 2. 一键安装（本地插件装配 + preset 复制 + 社区插件安装）
.\install.ps1                       # 默认 profile = desktop
# 参数化用法：
#   .\install.ps1 -Profile web                  # 装到 web profile
#   .\install.ps1 -SkipRegistry                 # 只装本地插件，不下载社区插件
#   .\install.ps1 -SkipSkills                   # 不还原技能快照
#   .\install.ps1 -DshExe 'C:\path\to\dsh.exe'  # 手动指定 dsh 可执行文件
#   .\install.ps1 -DryRun                       # 只打印将执行的命令，不做任何改动

# 3. 重启 DSH
```

macOS / Linux：

```bash
git clone https://github.com/jh604106966/dsh-code.git
cd dsh-code
./install.sh                  # PROFILE=web ./install.sh 可指定 profile；DRY_RUN=1 只打印
```

装完打开 DSH 应能看到：设置里的「插件市场」、侧边栏「上下文洞察」、侧边栏「技能中心」、
会话内「记忆 / 待办 / 画板 / 会话评审」等 Tab，以及新会话可选 **Router Standard / Router Spec** 预设。
技能目录里会立即出现 `brainstorming`、`writing-plans`、`test-driven-development`、`systematic-debugging`
等技能（技能是热加载的，不用重启）。

### 手动安装（等同安装脚本做的事）

```bash
# 本地插件：直接装目录（DSH 会建 link 依赖）
dsh plugin --profile desktop add ./plugins/dsh-routing-suite/injector
dsh plugin --profile desktop add ./plugins/dsh-routing-suite/graded
dsh plugin --profile desktop add ./plugins/dsh-memory-evolve
dsh plugin --profile desktop add ./plugins/only-memory

# agent preset：复制到 ~/.dsh/.agent-presets/（DSH 只扫一层子目录，别多套一层）
cp -r plugins/dsh-routing-suite/preset/router-standard ~/.dsh/.agent-presets/
cp -r plugins/dsh-routing-suite/preset/router-spec     ~/.dsh/.agent-presets/
cp -r plugins/dsh-routing-suite/preset/router-react    ~/.dsh/.agent-presets/

# 技能：复制回本机技能库（默认 ~/.agents/skills，或 $DSH_AGENTS_HOME/skills）
mkdir -p ~/.agents/skills
cp -r skills/* ~/.agents/skills/

# 社区插件：按锁定版本装
dsh plugin --profile desktop add billion-context@0.1.195
dsh plugin --profile desktop add dsh-context@0.66.0
dsh plugin --profile desktop add dsh-cost-meter@1.8.15
dsh plugin --profile desktop add dshmarket@1.66.9
dsh plugin --profile desktop add @nanmicoder/dsh-agent-teams@0.1.22
dsh plugin --profile desktop add @linxin666/dsh-client-ui-skill-explorer@0.4.5
```

> - `dsh` 不在 PATH 时用 `npx -y @deepseek-ai/dsh plugin ...`（安装脚本会自动探测）。
> - pnpm 报 `ERR_PNPM_ADDING_TO_ROOT` 时，在 profile 目录建 `.npmrc` 写入 `ignore-workspace-root-check=true`。
> - 本地插件目录**自带预构建产物**（`lib/` / `dist/`），正常情况下不需要 `npm install` / `npm run build`。

---

## 三、目录结构

```
dsh-code/
├── README.md                  # 本文件：总览 + 复原步骤
├── PLUGINS.md                 # 每个插件的功能详解（工具名 / 界面位置 / 上游来源）
├── SKILLS.md                  # 技能快照说明（来源 / 版本 / 更新流程）
├── install.ps1                # Windows 一键安装
├── install.sh                 # macOS / Linux 一键安装
├── tools/
│   ├── sync.mjs               # 采集本机 DSH 插件环境 + 技能库并重写 profile/manifest.json（核心逻辑）
│   ├── sync.ps1               # 同步 + 提交 + 推送（Windows）
│   ├── sync.sh                # 同步 + 提交 + 推送（macOS / Linux）
│   ├── skill-source.mjs       # 维护 profile/manifest.json 里的 skillSources 溯源块
│   ├── update-skill-source.ps1 # 通用引擎：拉上游 -> 更新技能 -> 重新快照推送（Windows）
│   ├── update-skill-source.sh  # 同上（macOS / Linux）
│   ├── update-superpowers.ps1 # 薄包装：superpowers 源（Windows）
│   ├── update-superpowers.sh  # 薄包装：superpowers 源（macOS / Linux）
│   ├── update-gamedesignos.ps1 # 薄包装：GameDesignOS 源（Windows）
│   ├── update-gamedesignos.sh  # 薄包装：GameDesignOS 源（macOS / Linux）
│   ├── update-all-skills.ps1   # 表驱动：逐个刷新全部上游技能源
│   ├── update-self-improving-agent.ps1 # 包装型源：上游只有裸 feedback.md，需镜像 + 告警
│   ├── update-clawhub-github.ps1 # 注册表源：clawhub install + 命名空间扁平化 + 溯源
│   └── auto-sync.cmd          # 计划任务入口：调上面三个脚本并写日志
├── mcp/                       # 外部 MCP 服务注册片段（REA）与说明
├── presets/                   # agent preset 的 legacy 目录形态（本机 60410 采集；DSH 0.2.0 已改读 bundle 声明）
├── skills/                    # 技能库快照（源机 superpowers 等；插件自带的 5 个不入库）
├── profile/
│   ├── manifest.json          # 机器可读清单：本地插件 / 社区插件 / 预设 / 技能（含版本与来源）
│   └── package.snapshot.json  # 本机 profile package.json 原样快照（bundles + 依赖）
└── plugins/                   # 本地插件源码（含预构建 lib/ dist/，免编译可用）
    ├── dsh-routing-suite/     # 源机套件仓库：injector/（注入器）+ graded/（分级模式）+ preset/（路由预设）
    ├── dsh-memory-evolve/
    ├── only-memory/
    ├── dsh-super-injector/    # 本机 60410 平铺：注入器（与套件版同源）
    ├── dsh-graded-mode/       # 本机 60410 平铺：分级模式（需 `@deepseek-ai/schemastery`，快照不带 node_modules）
    ├── dsh-ua-skills/         # 本机 60410：技能 provider（自建，零依赖，注册 9 个 understand* 技能）
    ├── dsh-understand-anything/ # 本机 60410：代码库理解技能包
    └── dsh-preset-router-*/   # 本机 60410：三个 router 预设的 bundle 声明版（preset-<id>）
```

---

## 四、已知注意点（踩坑记录）

1. **不要手动改 profile 的 `cordis.patch.yml` 去 insert 这些插件**：几个插件包自带
   `dsh.bundle.patch`（`cordis.patch.yml`），`dsh plugin add` 后会自动注册；
   再手动 insert 同 id 会报 `duplicate loader entry id` 导致 DSH 起不来。
   真起不来时，在 profile 的 `cordis.patch.yml` 里用顶层写法临时禁用：`- id: <插件id>` + `disabled: true`。
2. **preset 不能整目录复制**：`preset/` 下每个子目录才是预设本体，必须平铺进
   `~/.dsh/.agent-presets/<预设名>`；复制 `preset/` 本身会多套一层，DSH 扫不到。
3. **代码公开、记忆私藏**：本仓库只有代码与装配清单，个人记忆/会话不在其中（见下一条）。
4. **`only-memory` 的 patch 用 `DSH_HOME` 定位自己**：换机器后如果 `DSH_HOME` 非默认
   （默认 `~/.dsh`），启动 DSH 时带上该环境变量即可，无需改文件。
5. **版本兼容**：DSH 仍处于 developer preview，官方明示会有破坏性变更。
   本快照对应 `0.2.0-rc.2`；DSH 升级后若某插件不兼容，先按第 1 条的 `disabled: true` 停用它。
6. **npm 版本漂移**：`profile/package.snapshot.json` 里 `dshmarket` 写的是 `^1.66.9`、`billion-context`
   写的是 `0.1.188`，但**实机安装到的是 1.66.9 / 0.1.195**；安装脚本已按实机版本锁定
   `billion-context@0.1.195`（`manifest.json` 里 `declared` 字段记录的是 profile 里的声明值，不是实机版本）。
7. **主进程「直接退出」先查 profile 的 `node_modules`**：若某个 profile 的 `node_modules` 里存在
   **半提取 / 不完整的 `@deepseek-ai/*` 副本**（从 `app.asar` 抽包只抽了一半、`link:` 残留、拷贝中断等），
   Electron 会在 `@deepseek-ai/cordis` → `@deepseek-ai/schemastery` 的解析上抛 ERR_MODULE_NOT_FOUND
   并让**主进程直接退出**——这既不是插件 fatal，也不是「禁用所有插件」弹窗。
   排查：在 `~/.dsh` 下按 `node_modules\@deepseek-ai\{cordis,schemastery}` 逐个数（每个命中都要能
   `ConvertFrom-Json` 出 `version`）；`~/.dsh/profiles/node_modules` 只应有 `only-memory` 这一个 junction，
   不该出现 `@deepseek-ai` 子树。修复 = 删掉/补齐那个不完整副本。详见
   [docs/changes/2026-10-13-output-reservation-and-crash-forensics.md](docs/changes/2026-10-13-output-reservation-and-crash-forensics.md) 第四节。
8. **有效输入上限 = 窗口 − 输出预留**（本机 1,048,576 − 256,000 = **792,576**）：256,000 来自上游模型定义，
   **改不动**——billion-context 的 `models.<name>.output` 只会把「小值」抬回上限，改小它只会让 bili 的
   预检误判可用窗口（反而推迟压缩）。要真正抬高上限，只能让 DSH 发出的 `max_tokens` 变小
   （自定义模型项的 `maxTokens`）；否则保持 `compress.maxContextLimit` 明显低于 792,576。详见同篇第一～三节。

9. **`plugin_manager install_bundle` 在本机必超时（600 s）**：pnpm 其实已经装完
   （`Done in 1.3s using pnpm v11.7.0`），但 DSH 的 pnpm 包装器读不到它的输出 →
   `dsh: pnpm printed nothing for 600000ms and was terminated`（`kind:"timeout"`），并**回滚** manifest 写入。
   绕法 = **手工接线三处**：profile `package.json` 的 `dependencies` 加 `link:C:/.../plugins/<pkg>`、
   `dsh.profile.bundles` 加包名、`pnpm-lock.yaml` 的 importer 条目加 `version: link:../../plugins/<pkg>`
   （该 lockfile 的 `settings.excludeLinksFromLockfile: false`，link 依赖必须入锁），再在
   `<profile>/node_modules` 建指向插件目录的 junction。注：安装包超时/失败后**先体检 profile**——
   `.pnpm` 里只有 `lock.yaml` 是正常的（本机 `nodeLinker: hoisted`）。
10. **本地插件缺 `@deepseek-ai/*` 或第三方依赖时**：快照**不含** `node_modules`。`dsh-graded-mode` 需要
    `@deepseek-ai/schemastery`，`only-memory` 需要 `sql.js` 等——在插件目录跑
    `npm install --omit=dev --ignore-scripts`，再用 `node -e "import('<插件>/lib/index.js')"` 探针确认。
11. **`only-memory` 的 `!!js` 解析路径**：它用 `!!js` 解析 `<DSH_HOME>/profiles/node_modules/only-memory`
    （回退到 `<DSH_HOME>/profiles/<profile>/node_modules/only-memory`）。本机 60410 的
    `~/.dsh/profiles/node_modules` **不存在**，所以它只躺在 `~/.dsh/plugins/only-memory`、**没有进 profile**；
    要用先建那个 junction（本机为 `dsh-graded-mode` / `dsh-memory-evolve` 建的是 profile 级 junction）。
12. **预设两种形态别混用**：legacy 目录 `~/.dsh/.agent-presets/<名>/` 在 0.2.0-rc.2 **已不再被读取**
    （官方技能原文：*Nothing reads that directory any more*），正式形态是 bundle 里的
    `@deepseek-ai/dsh-agent-preset` 声明（loader 行 id `preset-<id>`）。本机两种并存：bundle 版待冷启动确认，
    legacy 目录先留着当回滚（确认后可删）。见 [PLUGINS.md](PLUGINS.md) A3。

### 这份快照**不**包含（有意为之）

- `~/.dsh/sessions/`、`~/.dsh/memories/`、`~/.dsh/storages/`、`~/.dsh/attachments/`——会话与记忆属个人数据；
- `~/.dsh/.credentials.yaml`、API Key、`.npmrc`——凭据不入库；
- 各插件的运行期数据库（如 `only-memory` 的 `~/.onlymem/`、记忆同步用的 git 分支）。

需要跨设备同步记忆，用 `dsh-memory-evolve` 自带的「记忆同步」功能（可指定独立仓库），别把记忆塞进本仓库。

---

## 五、维护：本机导入新插件后怎么同步（自动上传）

**约定**：往 DSH 里装/导入新插件之后（`dsh plugin add`、`dev_install_package`、`dev_inject_plugin`、
手工丢进 `~/.dsh/plugins/`、新增 `.agent-presets/<名>`），跑一次同步即可，不需要手改仓库里任何文件。

```powershell
# Windows（PowerShell 5.1 也能跑，脚本是纯 ASCII）
powershell -ExecutionPolicy Bypass -File tools\sync.ps1
```

```bash
# macOS / Linux
bash tools/sync.sh
```

它依次做这些事：

1. **采集插件**：读活动 profile 的 `link:` 依赖 + `~/.dsh/plugins/*` + 注入器清单 `~/.dsh/super-injector/registry.json`
   （运行时注入的插件也算），把它们复制进 `plugins/<名字>`（排除 `node_modules/`、`.git/`、日志、`.bak-*`、`.tgz`）；
2. **采集技能**：把 `~/.agents/skills`（以及 `$DSH_HOME/skills`）里的技能复制进 `skills/<名字>`；
   由仓库自带插件自己同步的那 5 个技能（`dsh-memory-evolve`）只登记进清单、不复制，避免两份会漂移的副本；
3. **保护预构建产物**：上游 `.gitignore` 里忽略 `lib/` `dist/` 的规则会被注释掉（本仓库**有意跟踪**这两类目录，
   少了它们到新机器上插件等于没装）；
4. **重写清单**：`profile/manifest.json`（本地插件 / 预设 / 社区插件版本锁定 / 技能 / 来源映射）与
   `profile/package.snapshot.json`；手写在里面的 `summary`、`upstream`、`skillSources` 字段会被保留；
5. **提交 + 推送**：`git add -A` → 只有真的有变化才 commit → push。**没变化就什么都不做**（幂等，可随便重跑）。

**只更新技能（上游技能）**：以 superpowers 为例，

```powershell
# 拉上游最新 commit -> 复制进 ~/.agents/skills -> 更新版本溯源 -> 重新快照并推送
powershell -ExecutionPolicy Bypass -File tools\update-superpowers.ps1

powershell -ExecutionPolicy Bypass -File tools\update-superpowers.ps1 -Check     # 只报上游版本，不改任何东西
powershell -ExecutionPolicy Bypass -File tools\update-superpowers.ps1 -NoSync    # 只更新本机技能库
```

macOS / Linux 用 `bash tools/update-superpowers.sh`（`CHECK=1` / `NO_SYNC=1`）。手工新增或修改的技能
不用这个脚本，直接跑一次 `tools\sync.ps1` 就会重新快照并推送。技能清单与来源见 [SKILLS.md](SKILLS.md)。

**外部技能源不止一个**：GameDesignOS 用 `tools\update-gamedesignos.ps1`（/`.sh`）——两者都只是
`tools\update-skill-source.ps1`（/`.sh`）的薄包装；新增一个上游时照着包装脚本加几行即可
（参数：`-Id -Upstream -Ref -Src -SkillsSubdir -License`）。

**自动化（本机已配置）**：Windows 计划任务 `dsh-code-sync` 每天 12:00 执行 `tools\auto-sync.cmd`
（依次 = superpowers 刷新 + GameDesignOS 刷新 + 两次同步推送；上游 commit 未变则跳过复制），
日志写在 `~/.dsh/dsh-code-sync.log`。无变化时不会产生 commit，也不会推送。手工触发：

```powershell
Start-ScheduledTask -TaskName dsh-code-sync
Get-ScheduledTaskInfo -TaskName dsh-code-sync     # 看上次运行结果
Get-Content "$env:USERPROFILE\.dsh\dsh-code-sync.log" -Tail 40
```

换机器后重新注册这个任务：

```powershell
$repo = (Get-Location).Path
$action = New-ScheduledTaskAction -Execute 'cmd.exe' -Argument ('/c "{0}"' -f "$repo\tools\auto-sync.cmd") -WorkingDirectory $repo
Register-ScheduledTask -TaskName dsh-code-sync -Action $action -Trigger (New-ScheduledTaskTrigger -Daily -At 12:00) `
  -Settings (New-ScheduledTaskSettingsSet -StartWhenAvailable -MultipleInstances IgnoreNew) `
  -Principal (New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Limited) `
  -Description 'DSH plugin + skill snapshot: refresh upstream skills and push if changed' -Force
```

常用参数：

| 用途 | PowerShell | bash |
|---|---|---|
| 只看会采到什么，不写不改 | `-Check` | `--check` |
| 只提交到本地，不推送 | `-NoPush` | `--no-push` |
| 不用代理直连 | `-NoProxy` | `--no-proxy` |
| 换 profile | `-Profile web` | `--profile web` |
| 自定义提交信息 | `-Message "..."` | `-m "..."` |

> - **代理**：默认先走 `http://127.0.0.1:7897`（本机 Clash 混合端口），失败自动回退直连；
>   直连 github.com 不通的机器上，代理参数就是靠这个默认值生效的。
> - **新插件记得补文档**：同步脚本最后会列出「出现在 `plugins/` 但 `PLUGINS.md` 里没有」的插件，
>   照着提示给 `PLUGINS.md` 补一节功能说明（工具名 / 界面位置 / 上游来源）。
> - **仓库里有、本机已删**的插件目录**不会被自动删除**，脚本只提示，人工决定。

---

## 六、来源与许可

本仓库是本机 DSH 环境的**再分发打包**：`plugins/` 下的代码来自各自上游项目（见下表），
许可证随包附在各自目录。上游仓库保留全部著作权，本仓库只做打包与版本锁定；各插件详细说明见其目录内 `README` / `LICENSE`。

| 目录 | 上游 | 许可 |
|---|---|---|
| `plugins/dsh-routing-suite/injector` | `yjh051108/dsh-super-injector` | BSD-3-Clause |
| `plugins/dsh-routing-suite/graded` | `yjh051108/dsh-routing-suite`（`graded/`） | Apache-2.0 |
| `plugins/dsh-routing-suite/preset` | `yjh051108/dsh-router-standard` | MIT |
| `plugins/dsh-memory-evolve` | `csyangwen/dsh-memory-evolve` | MIT |
| `plugins/only-memory` | onlyMemory（DSH 记忆插件） | MIT |
| `plugins/dsh-super-injector`、`plugins/dsh-graded-mode`、`plugins/dsh-preset-router-{standard,spec,react}` | 同套件版上游（本机 60410 按包名平铺；预设为 bundle 声明版） | BSD-3-Clause / Apache-2.0 / MIT |
| `plugins/dsh-ua-skills`、`plugins/dsh-understand-anything` | 本机 60410 自建/采集（无公开上游；技能内容为 `understand*` 系列） | MIT |
| `skills/reverse-engineer-anything` | `morluto/rea`（随 DSH 集成一起安装） | 见上游 |
| `skills/`（15 个） | `obra/superpowers` 7.0.0（commit `bb92a77`） | MIT |
| `skills/`（7 个） | `DY-2026/GameDesignOS` 1.3.0.dev0（commit `ada4bf9`） | MIT |
| `skills/`（11 个） | `nextlevelbuilder/ui-ux-pro-max-skill`（`7246805`）、`wshobson/agents`（`46891e7`）、`anthropics/skills`（`dbd4588`）、`YuJunZhiXue/github-skill-forge`（`a4d9926`） | 各自上游（见 [SKILLS.md](SKILLS.md) A3） |

本仓库自身的脚本与文档：MIT。

## 可选工具：黄叔 Skill Hub（不随快照安装）

`Backtthefuture/huangshu` 的 `tools/skill-hub`（包名 `claude-skill-hub`，v0.3.0，MIT）是一个**独立的本机 Web UI**：
扫描全盘技能目录、聚合展示、可视化编辑、自动版本快照、回收站、相似度/冲突检测、同步与健康检查。

- ⚠️ **它不是 DSH 插件**（没有 `cordis.patch.yml`，`package.json` 里也没有 `dsh` 字段），所以**不参与**
  profile 装配，也不在快照恢复范围内；本仓库只放启动脚本与说明。
- 安装（官方给的是预构建 tarball，绕开 `npm i -g github:...` 的软链 bug）：

  ```bash
  npm install -g https://github.com/Backtthefuture/huangshu/raw/main/tools/skill-hub/release/claude-skill-hub.tgz
  ```

- 启动：`tools\start-skill-hub.cmd`（默认 `http://127.0.0.1:3457`，不自动开浏览器）
- 关键环境变量：`PORT`（默认 3456，占用时自动向上试到 3460 —— 本机 3456 被 only-memory 的 Web UI 占着，
  所以脚本用 3457）、`SKILL_HUB_NO_OPEN=1`、**`SKILL_HUB_EXTRA_PATHS`（本脚本指向
  `%USERPROFILE%\.agents\skills`，让它能管理 DSH 的技能库；不加它只会扫 `~/.claude/**`）**
- 排查：`http://127.0.0.1:3457/api/debug` 返回扫到的路径与命中数；`/api/skills` 是技能清单
  （实测：61 个技能全部识别）。

## 文档

- [PLUGINS.md](PLUGINS.md) —— 插件清单与装配说明
- [SKILLS.md](SKILLS.md) —— 技能来源、快照与更新流程
- [docs/context-compaction.md](docs/context-compaction.md) —— **上下文压缩核实报告**：DSH 原生自动压缩的真实
  键名/默认值/write-where，`settings.yaml` 已废弃，以及本机为什么由 billion-context 负责压缩
  （并把 `auto: false` 钉进两个预设的 compaction-basic 行）

## 插件：kur-compact-trigger（会话级压缩触发器，含本机兼容补丁）

上游 <https://github.com/KumarZX/kur-compact-trigger>（v1.2.0，MIT，HEAD `58fefad`）**不在 npm 上**，
所以本仓库把它 vendored 到 `%USERPROFILE%\.dsh\plugins\kur-compact-trigger` 并以 `link:` 装配。

它在 host 平面给**每个会话**单独设压缩阈值（默认 `thresholdTokens` 200000 / `retainTokens` 32000 /
`maxAttempts` 3），到点调用 `compaction.compactRegion()`——只决定**何时**与**压哪一段**，摘要仍由官方做；
`compaction` 在 preset realm 内，所以它**不 inject compaction**，而是在 `agent/pre-step` 里用
`ctx.agentPresets.serviceFor(agent, 'compaction')` 取当前实例。

本机为了让它真的跑起来做了三处工程改动（都随快照一起保存）：

1. **补 `dsh.bundle` 层**：上游 `package.json` 只有 `dsh.client`、没有 `dsh.bundle`，`dsh plugin add`
   只会把它装成普通依赖（CLI 会警告 `declares no dsh.bundle`），loader 会把手写的顶层 insert 行
   对账成 `disabled`。本机给它加了 `cordis.patch.yml`（insert：`id/name: kur-compact-trigger`、
   `inject: ['tokenMeter','settings','agentPresets']`）与 `dsh.bundle.patch`，并把它加进 profile 的
   `dsh.profile.bundles`——之后市场状态是 `live via its bundle patch`，loader entry 为 active。
2. **补齐 `@deepseek-ai/*` 依赖**：上游不声明任何依赖，而宿主**没有** `@deepseek-ai/*` 的全局解析映射；
   本机用 `extract-host-deps.mjs` 从 `app.asar` 抽出 24 个宿主包（`@deepseek-ai/schemastery@3.18.4`、
   `@deepseek-ai/dsh-compaction@0.2.0-rc.2`、`@deepseek-ai/cordis@4.0.4`、cosmokit 1.8.5 等）放进该插件的
   `node_modules`（npm 上 `@deepseek-ai/dsh-compaction` 只有 `0.0.1-rc.5`，版本不匹配）。
   注意：`node_modules` **不入快照**（与其他插件一致），恢复时要重跑抽取。
3. **本机兼容补丁**（`lib/index.js`，已在文件里注明）：DSH 0.2.0-rc.2 的 settings 服务只有
   `configure()`、**没有** `register()`，上游的 `ctx.settings.register(...)` 会抛
   `ctx.settings.register is not a function` → fiber 卡在 `[failed]`。补丁保留"宿主有 register 就用上游调用"
   的分支，否则退回用行配置；代价是它的**交互式设置页与会话标题栏按钮在本机不生效**（其 README 让你写的
   `~/.dsh/settings.yaml` 也是同一个**已被移除**的旧配置面，阈值请写在该行的 `config:` 里）。

验证：loader entry `include:kur-compact-trigger` → `fiberState=2`（active）、`disabled=false`；
市场 `/dsh-market/installed` → `{"state":"live","reasons":["已热加载(bundle patch)"],"bundle":true,"hot":true}`。

变更记录（含时间/操作用户/改动内容/验证证据/回滚）见 [docs/changes/](docs/changes/)，最新一篇：
[2026-10-13 输出预留的真实来源与「主进程直接退出」取证](docs/changes/2026-10-13-output-reservation-and-crash-forensics.md)。

- [2026-10-13 bili 上下文预算调整](docs/changes/2026-10-13-bili-context-budget.md)

- [2026-10-13 会话日志独立复核 + 插件层恢复](docs/changes/2026-10-13-profile-restore-and-session-verify.md)

- [2026-10-13 插件层启动致命 → 二分定位与最终可用态](docs/changes/2026-10-13-plugin-bisect-and-final-state.md)

- [2026-10-13 结论：kur-compact-trigger 是启动致命元凶（判决实验）](docs/changes/2026-10-13-plugin-startup-fatality-verdict.md)
