---
name: self-improving-agent
description: BerriAI self-improving-agent —— 当用户批评的是 agent 自身（提示词、工具描述、技能、决策流程）并要求它自我修正时使用：一次只提一个最小 diff 提案，等用户明确批准后才落地（开分支 / draft PR）。Use when the user is critiquing the agent's own configuration and asking it to fix itself.
---

# Self-improving agent（feedback loop）

> 上游：<https://github.com/BerriAI/self-improving-agent>（`package.json` name `self-improving-agent` v0.5.0，MIT，commit `0da0a20`）
> 本目录的 `SKILL.md` 是**本机包装**（DSH 需要 `SKILL.md` + front matter，而上游的"技能"是裸的
> `skills/feedback.md`）；逐字原文见同目录 `upstream-feedback.md`。

## 适用场景

只在用户批评的是**你自己**（提示词、工具、技能、决策方式）并要求你修自己时使用，例如：

- "你老是跳过 setup 步骤"
- "你的复现计划太含糊"
- "把你的提示词改成也能处理 X"
- "feedback：你的工具描述让人看不懂"

正常的产品工作、代码问题、别人代码的 bug 报告 —— 都**不**走这套流程。

## 依赖的两个工具（由宿主 / 插件提供）

`write_improvement_proposal` 与 `apply_proposal`。DSH 目前**没有**官方适配器（上游只提供
Claude Agent SDK `self-improving-agent/claude`、pi-agent-core `self-improving-agent/pi`
和根导出三类接线），所以：

- 这两个工具**在**你的工具表里 → 按下面「工作流」走；
- **不在** → 用 `read` + `edit`（或在聊天里给出 diff）提供同样的提案与理由，**等用户明确批准**再改，
  并说明"self-improving-agent 未接线，所以用文件编辑代替 `apply_proposal` / PR"。
  绝不因为缺工具就跳过"先提案、后批准、一次一个文件"。

## 工作流

1. **先读文件**。用你能用的读文件工具把要改的文件读出来，不要盲改。
2. **提出一个文件、一个最小 diff 的提案**。提案本身**就是**工具调用
   （`write_improvement_proposal`）——不要在聊天里用 ```` ```diff ```` 代码块代替工具调用，
   那样没有 proposalId、没有记录、也没有开 PR 的路径。参数：
   - `file` —— 仓库相对路径
   - `originalSnippet` —— 必须**逐字**来自文件且在该文件里**唯一命中**，越小越好
   - `proposedSnippet` —— 替换内容
   - `reason` —— 1–3 句：失效模式 + 这个修法为什么对
   - `risk` —— `low`（措辞/文档）/ `medium`（行为）/ `high`（基础设施、鉴权、数据）
   工具返回后写一条简短回复说明你提了什么并请求批准；diff 由宿主渲染，不用再贴一遍。
3. **等明确批准**。只有用户**最新一条消息**里出现 `approve` / `yes apply` / `ship it` / `lgtm`
   之类无歧义批准才算数；含糊 = 继续问，不要落地。
4. **落地**。批准后调 `apply_proposal`（带 `proposalId` 与 `userConfirmedInThisMessage: true`）：
   开分支 → 提交 → 推送 → 开 draft PR，然后把 PR 链接回给用户。

## 硬规则

- 一个提案只动**一个文件**；要改多个文件就逐个提。
- 没有用户最新消息里的明确批准，**绝不**调 `apply_proposal`，也**绝不**把
  `userConfirmedInThisMessage` 设成 `true`。
- `originalSnippet` 命中多于一处时，扩大片段直到唯一；不要提交有歧义的 diff。
- 拿不准反馈是否在范围内 → 先问。

## 如果要真正接线（npm 包）

```bash
npm install self-improving-agent
```

需要两个环境变量（缺一不可）：

- `SELF_IMPROVING_AGENT_REPO=<owner>/<name>`（例如 `BerriAI/shin-builder-oss`）
- `SELF_IMPROVING_AGENT_GITHUB_TOKEN=<fine-grained PAT>`（对该仓库 `Contents: read/write`
  + `Pull requests: read/write`）

可选：`SELF_IMPROVING_AGENT_BASE_BRANCH`（默认 `main`）、`SELF_IMPROVING_AGENT_PROPOSALS_DIR`
（默认 `./runs/improvements`）、`SELF_IMPROVING_AGENT_CACHE_DIR`。

上游明确要求：**不要改用户的系统提示**（安全/流程规则都写在工具描述里），也不要自行添加审批回调，
除非用户要求。
