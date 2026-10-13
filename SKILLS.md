# 技能快照（skills/）

`skills/` 目录是本机 **DSH 技能库**的快照。

- 采集：`tools/sync.mjs`（由 `tools/sync.ps1` / `tools/sync.sh` 调用）从两个**机器级**技能根目录读取。
- 还原：`install.ps1` / `install.sh` 把 `skills/<name>` 复制回 `$DSH_AGENTS_HOME/skills`（默认 `~/.agents/skills`）。

DSH 的技能搜索路径（由 `@deepseek-ai/dsh-skill-filesystem` 决定，按顺序）：

| 顺序 | 路径 | 是否快照 | 说明 |
| --- | --- | --- | --- |
| 1 | `<project>/.dsh/skills` | 否 | 项目级，属于具体项目 |
| 2 | `<project>/.agents/skills` | 否 | 项目级，同上 |
| 3 | `config.customSkillDirs` | 否 | 本机未使用 |
| 4 | `$DSH_HOME/skills` | 是 | 机器级（本机不存在，会被采集） |
| 5 | `$DSH_AGENTS_HOME/skills`（默认 `~/.agents/skills`） | 是 | 机器级，主力位置 |
| 6 | `bundledSkillDir` | 否 | DSH 自带（见 C 节） |

只有 4、5 是"跟着这台机器走"的，所以只快照这两处。`tools/sync.mjs` 会跳过
`SKILL.md` 缺失的目录，并保留 `profile/manifest.json` 里手写的来源字段。

> 技能目录名必须和 `SKILL.md` front matter 里的 `name:` 完全一致，否则调用时会报 unknown。
> 新增技能不需要重启 DSH：技能目录被 chokidar 监视，落盘后目录会自动刷新。

---

## A. 外部来源技能（随仓库快照）

### A1. superpowers

- 上游：<https://github.com/obra/superpowers>
- 版本：`7.0.0`　commit：`bb92a77741419a4ab5f06e711a283343f1ada0c3`　许可：MIT
- 上游仓库同时提供 `.claude-plugin/`、`.codex-plugin/`、`.cursor-plugin/`、`hooks/` 等各家 harness 的适配，
  **本仓库只镜像 `skills/`**：DSH 不在其支持列表里，其"自动唤醒"依赖 SessionStart hook（DSH 没有该注入点），
  因此这些技能在本机是**按需调用**（`skill` 工具 / 技能管理页），不会自动触发。

| 技能 | 用途 | 大小 |
| --- | --- | --- |
| `brainstorming` | 任何创造性工作（新功能、新组件、改行为、新计划）之前先把想法问清楚 | 73.1 KB |
| `diagnosing-superpowers` | 复盘一次出问题的会话为什么慢/贵/翻车，并生成给上游的 bug 报告 | 39.9 KB |
| `dispatching-parallel-agents` | 有 2 个以上互不依赖的任务时并行派发 | 5.9 KB |
| `executing-plans` | 由你自己（而非子代理）在当前会话执行实现计划 | 22.6 KB |
| `finishing-a-development-branch` | 实现完成、测试通过后决定如何合并/收尾 | 7.6 KB |
| `receiving-code-review` | 收到 review 意见后先核实再改，不做表演式认同 | 6.1 KB |
| `requesting-code-review` | 完成任务、合并前请求 review | 9.2 KB |
| `subagent-driven-development` | 用子代理执行含独立任务的实现计划 | 58.5 KB |
| `systematic-debugging` | 遇到 bug / 测试失败时的系统化排查流程 | 39.9 KB |
| `test-driven-development` | 写实现代码之前先写测试 | 17.4 KB |
| `using-git-worktrees` | 需要隔离工作区时用 worktree | 6.7 KB |
| `using-superpowers` | 入口技能：如何查找、何时调用其它技能 | 20.1 KB |
| `verification-before-completion` | 宣称"完成/修好/通过"之前必须跑验证命令并贴证据 | 3.6 KB |
| `writing-plans` | 有规格/需求后先写实现计划再动代码 | 10.1 KB |
| `writing-skills` | 创建、修改、验证技能（含 references/、scripts/、templates/） | 105.3 KB |

### A2. GameDesignOS

- 上游：<https://github.com/DY-2026/GameDesignOS>
- 版本：`1.3.0.dev0`（`gamedesignos/_version.py:3` 的 `VERSION`；`pyproject.toml` 用 `dynamic = ["version"]` 引用它）
  commit：`ada4bf9e60c2c90a4c84866e4bfd191e3767d164`　许可：MIT
- 这个仓库把 7 个技能目录**放在仓库根**（没有 `skills/` 子目录），所以更新脚本用 `-SkillsSubdir ''`。
- 它同时是一个 Python 包（`gamedesignos`，`python -m gamedesignos ask/start …` 提供自然语言路由与 Project-Ready 工作区）。
  本仓库只快照 `SKILL.md` 技能包本身；运行时 CLI 需要 Python（可用 DSH 自带
  `…\resources\runtime\primary-runtime\dependencies\python\python.exe`，本机 PATH 上的 `python` 只是 Store 占位符）。
  `adapters/README.md` 明确支持 "Direct Skill Mode"：宿主直接加载技能目录即可，不需要 CLI 与 workspace。

| 技能 | 用途 | 大小 |
| --- | --- | --- |
| `game-concept-architect` | 一句话创意 → 可验证设计蓝图（concept seed、玩家动词、design nucleus、假设台账、核心循环、scope gate、验证计划） | 2.74 MB |
| `game-experience-analyzer` | 截图/录屏/PV/商店页 → 中文证据链诊断报告（样本范围门、证据索引、品类敏感建议） | 2.45 MB |
| `paranoia-ai-system-evolver` | 受控演化 AI 系统/workflow/prompt/schema/eval/router，用意图单 + VOI 决策门 + UL + OODA + Human Gate | 284 KB |
| `game-experience-density-optimizer` | 体验浓度/留存/首局节奏/D1-D7/认知负荷 → 可埋点可回滚的一周 ED 实验包 | 193 KB |
| `game-design-proposal-writer` | 收束成商业策划案 / 独立设计案 / pitch / vertical slice 文档 | 108 KB |
| `game-design-source-curator` | 文章/视频/作者/栏目 → 可增量维护的本地知识库（证据门 + HTML 归档） | 40 KB |
| `game-design-book-translator` | 英文游戏设计书籍/章节/术语表翻译与质检 | 33 KB |

> `game-concept-architect` 与 `game-experience-analyzer` 的体积主要是 `assets/`、`examples/` 里的
> 展示图（PNG/JPG，约 5 MB），技能本体（SKILL.md + references + templates）只有几百 KB。

### A3. UI/UX 与元技能（4 个上游、共 11 个技能）

| 技能 | 来源 | 用途 | 大小 |
| --- | --- | --- | --- |
| `ui-ux-pro-max` | nextlevelbuilder/ui-ux-pro-max-skill（`.claude/skills`，HEAD `7246805`） | Web/移动/桌面 UI/UX 设计智能（79 种风格、192 组产品色板、119 条 UX 指南、17 个 GSAP 预设、25 类图表、22 种技术栈） | 3.65 MB |
| `ui-styling` | 同上 | shadcn/ui + Radix + Tailwind 的可访问界面与设计系统实现 | 5.77 MB |
| `design-system` | 同上 | 三层 token（primitive→semantic→component）与组件规格、幻灯片生成 | 188 KB |
| `design` | 同上 | 综合设计技能：品牌识别、logo（55 风格）、CIP、HTML 演示、横幅、图标、社媒图 | 281 KB |
| `brand` | 同上 | 品牌语调、视觉识别、信息框架、资产与一致性 | 112 KB |
| `slides` | 同上 | Chart.js + 设计 token 的 HTML 演示文稿 | 20 KB |
| `banner-design` | 同上 | 社媒/广告/网站 hero/印刷横幅（22 种美术方向） | 12 KB |
| `interaction-design` | wshobson/agents（`plugins/ui-design/skills`，sparse，HEAD `46891e7`） | 微交互、动效、过渡与反馈模式 | 43 KB |
| `skill-creator` | anthropics/skills（`skills/`，sparse，HEAD `dbd4588`） | 创建/改进技能、跑 eval、度量技能表现与描述触发准确率 | 231 KB |
| `frontend-design` | 同上 | 有意图的视觉方向、排版，避免「模板味」默认样式 | 20 KB |
| `github-skill-forge` | YuJunZhiXue/github-skill-forge（技能在仓库根，HEAD `a4d9926`） | 「制造技能的技能」：把任意 GitHub 仓库转成标准化技能 | 76 KB |

> 两个 monorepo（`wshobson/agents`、`anthropics/skills`）用 **sparse checkout** 只取需要的目录：
> `git clone --depth 1 --filter=blob:none --sparse <url> <dir>` + `git -C <dir> sparse-checkout set <paths>`；
> 更新引擎用 `-SparsePath` 表达。`ui-ux-pro-max-skill` 的 `cli/assets/skills` 是同名技能的重复副本，**不安装**。
>
> ⚠️ 血案记录：`sparse-checkout set` 如果没有任何路径参数，会**清空工作树**（只剩 `.git`）。
> 本机 superpowers 检出曾因此被清空，报 `no skill directory at …\\superpowers\\skills`；修复：
> `git -C <dir> sparse-checkout disable`（或 `sparse-checkout set <正确路径>`）。引擎已修为「空数组不触发 sparse 调用」。

## B. 由仓库自带插件提供的技能（不快照，装插件即恢复）

这 5 个技能由 `plugins/dsh-memory-evolve/skills/` 携带，插件每次启动会自己同步到
`~/.agents/skills`（只在这 5 个目录缺失或 front matter `x-version` 更低时才覆盖）。
把它们再放进 `skills/` 只会产生第二份会漂移的副本，所以 `tools/sync.mjs` 只记录、
不复制（manifest 里带 `providedBy` 字段）。

| 技能 | 用途 | 大小 |
| --- | --- | --- |
| `codex-cli-calling` | 非交互地从命令行调用 Codex CLI（一次性任务、脚本/管道、JSON 输出） | 5.6 KB |
| `grok-cli-calling` | 非交互地调用 Grok CLI（`-p/--single`、`--output-format` 等） | 6.5 KB |
| `hermes-cli-calling` | 非交互地调用 Hermes Agent（`hermes chat -q` 等） | 3.8 KB |
| `kimi-cli-calling` | 非交互地调用 Kimi Code CLI（`kimi -p` 等） | 4.3 KB |
| `memory-consolidate` | 整理/合并/去重 dsh-memory-evolve 的长期记忆（含 scripts/scan_memory.mjs） | 9.8 KB |

## C. 官方内置技能（非本仓库内容，装 DSH 就有）

| 技能 | 来源 |
| --- | --- |
| `office-docx` / `office-xlsx` / `office-pptx` | DSH 内置技能目录（bundledSkillDir） |
| `diagnose-windows-sandbox-acl` | 同上，Windows 沙箱 ACL 排障 |
| `agent-experience`、`cordis-composition-reference`、`cordis-plugin-development`、`editing-cordis-compositions` | 随 `@deepseek-ai/dsh-agent-preset` 打包的 `skills/`，**不会出现在会话技能目录里** |

---

## 更新流程

### 1) 上游技能（以 superpowers 为例）

```powershell
# 拉取上游最新 commit -> 复制进 ~/.agents/skills -> 记录版本 -> 重新快照并推送
powershell -ExecutionPolicy Bypass -File tools\update-superpowers.ps1

# 只想看上游现在是什么版本，什么都不改
powershell -ExecutionPolicy Bypass -File tools\update-superpowers.ps1 -Check

# 只更新本机技能库，不快照/不推送
powershell -ExecutionPolicy Bypass -File tools\update-superpowers.ps1 -NoSync
```

Linux / macOS 用 `./tools/update-superpowers.sh`（等价参数：`CHECK=1`、`NO_SYNC=1`、
`AGENTS_HOME=…`、`SRC=…`）。

这台机器上上游检出位于 `~/.dsh/skill-sources/superpowers`（不在本仓库内）。

**自动化**：Windows 计划任务 `dsh-code-sync` 每天 12:00 跑 `tools\auto-sync.cmd` →
`tools\update-all-skills.ps1`（表驱动，逐个刷新 6 个源：superpowers、GameDesignOS、
ui-ux-pro-max-skill、agents/interaction-design、anthropics/skills、github-skill-forge），
每个源内部再调 `tools\sync.ps1`；日志在 `~/.dsh/dsh-code-sync.log`。上游 commit 与上次记录相同则跳过复制，
**没有任何变化就不会产生提交**。手工触发：`Start-ScheduledTask -TaskName dsh-code-sync`。

（`tools\update-superpowers.ps1` / `tools\update-gamedesignos.ps1` 是单源薄包装，仍可单独使用；
两者都调用通用引擎 `tools\update-skill-source.ps1`。新增上游时在 `update-all-skills.ps1` 的表里加一行即可。）

### 1b) GameDesignOS

```powershell
powershell -ExecutionPolicy Bypass -File tools\update-gamedesignos.ps1
powershell -ExecutionPolicy Bypass -File tools\update-gamedesignos.ps1 -Check
powershell -ExecutionPolicy Bypass -File tools\update-gamedesignos.ps1 -Force -NoSync   # 强制重抄，不推送
```

Linux / macOS 用 `./tools/update-gamedesignos.sh`（`CHECK=1` / `NO_SYNC=1` / `FORCE=1`）。

### 2) 手工新增/修改技能后

技能改完（或从别处复制进 `~/.agents/skills`）直接跑：

```powershell
powershell -ExecutionPolicy Bypass -File tools\sync.ps1
```

`sync.ps1` 会重新采集 `skills/`、更新 `profile/manifest.json`、提交并推送到 GitHub；
没有变化时会打印 `OK: snapshot already up to date` 并直接退出。

### 3) 手工补充来源信息

`profile/manifest.json` 里的 `skillSources` 是**手写**的溯源块（`sync.mjs` 原样保留、
`update-superpowers.ps1` 负责刷新 `version` / `commit` / `updatedAt`）：

```json
"skillSources": [
  {
    "id": "superpowers",
    "upstream": "https://github.com/obra/superpowers",
    "ref": "main",
    "checkout": "C:\\Users\\Administrator\\.dsh\\skill-sources\\superpowers",
    "license": "MIT",
    "version": "7.0.0",
    "commit": "bb92a77741419a4ab5f06e711a283343f1ada0c3",
    "updatedAt": "2026-10-12",
    "skills": ["brainstorming", "…"]
  }
]
```

`skills[].version` / `commit` / `source` / `upstream` / `license` 由 `sync.mjs` 从
这份 `skillSources`（或上一轮 manifest）里继承，因此**不要手改 `skills/` 目录本身**。

---

## 已知注意点

- `~/.agents/skills` 是唯一真源：`skills/` 只是它的快照，改快照不会影响本机运行。
- 新增技能后如果 `SKILLS.md` 里没有对应行，`tools/sync.mjs` 会打印
  `! missing a row in SKILLS.md (add one by hand)`——这是**提醒**，不是错误。
- 卸载技能：删掉 `~/.agents/skills/<name>`（或把整个目录移走），再跑一次 `sync.ps1`
  即可把快照同步成删除。仓库里遗留的 `skills/<name>` 会被报告为
  `in repo skills/ but not installed on this machine`，不会自动删除，需要人工决定。
- 插件自带的技能（B 节）不要复制进 `skills/`；`dsh-memory-evolve` 每次启动都会覆盖它们。
- `install.ps1` / `install.sh` 复制前会把本机已有的同名技能目录改名成
  `<name>.bak-yyyyMMdd-HHmmss`，不会直接删除。
