# dsh-code — DeepSeek Harness 插件环境快照

> **一句话**：把本机这套 DeepSeek Harness（DSH）所用的插件、预设与装配清单打包成一个仓库，
> 换一台电脑 `git clone` + 跑一次安装脚本，就能得到**功能一致**的 Harness。

- **快照来源**：DSH 桌面版 `0.2.0-rc.2`（Electron 运行时 44.0.0 / Node 24.21.0 / pnpm 11.7.0），
  活动 profile = `desktop`，采集日期 2026-10-12，操作系统 Windows。
- **仓库内容**：4 个本地插件源码（含预构建产物）+ 3 个 agent preset + 6 个社区插件的版本锁定清单 + 安装脚本。
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

### 从 npm 安装的社区插件（版本锁定，不随仓库携带代码）

| 包名 | 版本 | 作用 |
|---|---|---|
| `billion-context` | 0.1.194 | 上下文压缩：模型自主决策的增量可逆压缩，超长会话 + 少重发 token |
| `dsh-context` | 0.66.0 | 上下文洞察面板：跨会话用量/成本概览、逐请求上下文构成追溯 |
| `dsh-cost-meter` | 1.8.15 | 会话费用统计：多厂商多模型计价、订阅额度、余额与峰谷提醒 |
| `dshmarket` | 1.66.9 | 可视化插件市场：社区目录浏览、一键安装/更新/卸载、主题与备份 |
| `@nanmicoder/dsh-agent-teams` | 0.1.22 | 多 Agent 团队协作：队长 + 成员 + 带依赖任务 + 质量门禁 + Web DAG 监控 |
| `@linxin666/dsh-client-ui-skill-explorer` | 0.4.5 | 技能中心 UI：按来源浏览/搜索/启停/创建/编辑/删除 SKILL.md |

> 每个插件的功能详解（含工具名与界面位置）见 **[PLUGINS.md](PLUGINS.md)**。

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

# 社区插件：按锁定版本装
dsh plugin --profile desktop add billion-context@0.1.194
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
├── install.ps1                # Windows 一键安装
├── install.sh                 # macOS / Linux 一键安装
├── profile/
│   ├── manifest.json          # 机器可读清单：本地插件 / 社区插件 / 预设（含版本与安装方式）
│   └── package.snapshot.json  # 本机 profile package.json 原样快照（bundles + 依赖）
└── plugins/                   # 本地插件源码（含预构建 lib/ dist/，免编译可用）
    ├── dsh-routing-suite/     # 套装仓库：injector/（注入器）+ graded/（分级模式）+ preset/（路由预设）
    ├── dsh-memory-evolve/
    └── only-memory/
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
   写的是 `0.1.188`，但**实机安装到的是 1.66.9 / 0.1.194**；本仓库以实机版本为准（见 `manifest.json`）。

### 这份快照**不**包含（有意为之）

- `~/.dsh/sessions/`、`~/.dsh/memories/`、`~/.dsh/storages/`、`~/.dsh/attachments/`——会话与记忆属个人数据；
- `~/.dsh/.credentials.yaml`、API Key、`.npmrc`——凭据不入库；
- 各插件的运行期数据库（如 `only-memory` 的 `~/.onlymem/`、记忆同步用的 git 分支）。

需要跨设备同步记忆，用 `dsh-memory-evolve` 自带的「记忆同步」功能（可指定独立仓库），别把记忆塞进本仓库。

---

## 五、来源与许可

本仓库是本机 DSH 环境的**再分发打包**：`plugins/` 下的代码来自各自上游项目（见下表），
许可证随包附在各自目录。上游仓库保留全部著作权，本仓库只做打包与版本锁定；各插件详细说明见其目录内 `README` / `LICENSE`。

| 目录 | 上游 | 许可 |
|---|---|---|
| `plugins/dsh-routing-suite/injector` | `yjh051108/dsh-super-injector` | BSD-3-Clause |
| `plugins/dsh-routing-suite/graded` | `yjh051108/dsh-routing-suite`（`graded/`） | Apache-2.0 |
| `plugins/dsh-routing-suite/preset` | `yjh051108/dsh-router-standard` | MIT |
| `plugins/dsh-memory-evolve` | `csyangwen/dsh-memory-evolve` | MIT |
| `plugins/only-memory` | onlyMemory（DSH 记忆插件） | MIT |

本仓库自身的脚本与文档：MIT。
