# DSH 上下文压缩：核实报告（2026-10-13，针对 DSH 0.2.0-rc.2 desktop profile）

## 结论

网上那篇《在 settings.yaml 里加 dsh-compaction-basic 开启自动压缩》的教程，**对 DSH 0.2.0-rc.2 不成立**：
配置文件、四个键里的两个、日志行、插件版本全部对不上，照抄会被配置校验直接拒绝。
但你关心的那件事本身是真的 —— DSH 的自动压缩由 `@deepseek-ai/dsh-compaction-basic` 提供，
有阈值与保留比例的旋钮，只是位置、键名和开关都跟文章写的不一样。

## 逐条核实

| 文章说法 | 实测 | 证据 |
| --- | --- | --- |
| 在 `settings.yaml` 里加配置 | **本机没有 settings.yaml**；DSH 的配置面是每个 profile 的 `cordis.patch.yml`（加上各插件自带的 `*.patch.yml` bundle 层） | `%USERPROFILE%\.dsh` 下无 settings.yaml/yml；`dsh-settings` 源码只留一条兼容表注释 “Entry ids of the **removed** `settings.yaml` sections …” —— 该文件早已被移除 |
| `enabled: true` | 键**不存在**，会被 `validateKeys()` 拒绝并抛 `BasicCompactionConfig` 错误 | 合法键集合见下 |
| `autoCompact: true` | 键**不存在**（289 个 `@deepseek-ai` 宿主包里 0 命中） | 同上 |
| `preservePrefix: true` | 键**不存在** | 同上 |
| `thresholdRatio` / `retainRatio` | **是真键**；但默认值是 **0.8 / 0.16**，不是“默认关闭” | `DEFAULT_THRESHOLD_RATIO = .8`、`DEFAULT_RETAIN_RATIO = .16` |
| 开关名 | 真名是 **`auto`**（布尔）：`auto: config.auto ?? true`，构造器里 `if (this.config.auto) this._registerAutomaticCompaction()` | `dsh-compaction-basic/lib/index.js` |
| 重启后应看到 `[Compaction] plugin registered` | **没有这条日志**；真实标记是 `<compacted-summary>` 包裹与 `compaction/start` 事件 | 宿主包全量字符串扫描 |
| `dsh plugin add dsh-context@0.11.2` 装监控面板 | `dsh-context` **已经装了，而且是 0.66.0** | 本机 profile `node_modules` |

## 合法配置契约（`@deepseek-ai/dsh-compaction-basic` 0.2.0-rc.2）

- 顶层键：`auto`、`thresholdRatio`、`headroomTokens`、`retainRatio`、`retainTokens`、
  `summarizationProvider`、`summarizationModel`、`maxTokens`、`compactionRetries`、
  `maxOverflowRetries`、`modelPolicies`（`modelPolicies[].{provider,model,…}` 可逐模型覆盖）
- 默认值：`thresholdRatio` 0.8、`retainRatio` 0.16、`headroomTokens` 65536、
  `maxTokens = headroomTokens`、`compactionRetries` 1、`maxOverflowRetries` 1、**`auto` true**
- 约束：`retainRatio < thresholdRatio`；未知键直接报错；`summarizationProvider` 与
  `summarizationModel` 必须成对出现
- 写在哪里：**profile 的 `cordis.patch.yml`**（`%USERPROFILE%\.dsh\profiles\desktop\cordis.patch.yml`），
  按 id 覆盖 `compaction-basic` 行的 `config`；改动约 1 秒内热重排，**不需要重启 desktop**

## 本机现状（实测，不是推测）

- 本机装了 `billion-context 0.1.196`，它在自己的 `dsh.bundle.patch.yml` 里对 **host 面**的
  compaction-basic 行设 `auto: false`，注释写明：在 bundle 了 `@deepseek-ai/dsh-web-app` 的 profile 里，
  那行会被禁用、真正运行的那行在 `preset-standard` 条目里，而这个 bundle 层按 id 够不到它，
  需要 profile 级 full-snapshot 覆盖（issue #1772/#2474）。目的就是**避免它自己的压缩与原生自动压缩双重压缩**。
- 本会话实证：会话存档 `%USERPROFILE%\.dsh\storages\session_projcache\sessions\session-f5a6d795-….json` 里
  `compacted-summary` / `compaction/start` / `BasicCompaction` **0 命中**，而 ACP 标记 33 处 ——
  实际在压缩上下文的是 billion-context，DSH 原生自动压缩并没有跑。
- 本次修改：把 `auto: false` **显式钉进两个预设**（router-standard、router-spec）的 compaction-basic 行
  （router-standard 另保留 `thresholdRatio: 0.55` / `retainRatio: 0.2`），让“单一压缩器”的姿态在
  host 行与预设行两条路径上一致；行内注释写明了回退方法。

## 如果你确实想用 DSH 原生自动压缩

1. **先卸掉或停用 billion-context**（`dsh plugin --profile desktop remove billion-context`）。
   **不要两者同开**：billion-context 官方文档在 OpenCode/Claude 等宿主上都要求把原生压缩设成
   `auto: false`，否则双重压缩会伤质量。
2. 把两个预设行里的 `auto: false` 删掉或改成 `true`，并按需调 `thresholdRatio`
   （默认 0.8；想更早触发就调到 0.5–0.6）与 `retainRatio`（默认 0.16；发现质量下降再调低）。
3. 不需要重启 desktop；patch 保存后约 1 秒热重排。

## 怎么验证（可复现的三种）

1. **会话存档 grep**：`compacted-summary`、`compaction/start`
   （`%USERPROFILE%\.dsh\storages\session_projcache\sessions\*.json`，或
   `%USERPROFILE%\.dsh\sessions\**\session.v4.jsonl.zstd`）。
2. **dsh-context 0.66.0**（已装）的上下文面板 / `context` 命令。
3. **直接读宿主契约**（本报告的取证方式）：宿主包在 `resources\app.asar` 里，用
   `ELECTRON_RUN_AS_NODE=1 "<DeepSeek Harness.exe>" <script.mjs>` 即可读取/执行 asar 内的文件：

   ```js
   const F = '...\\app.asar\\dsh\\node_modules\\@deepseek-ai\\dsh-compaction-basic\\lib\\index.js';
   // 搜索 BASIC_COMPACT_CONFIG_KEYS / DEFAULT_THRESHOLD_RATIO / config.auto
   ```

> 一句话：文章教你在一个**已被移除**的配置文件里写**三个不存在的键**，去开关一个**默认就开着**的功能；
> 而本机真正负责压缩的是 billion-context，原生自动压缩已被（本次也显式地）关掉。
