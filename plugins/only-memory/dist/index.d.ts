/**
 * DeepSeek Harness 记忆插件 - Cordis 插件入口
 *
 * 本文件是 Harness 加载的入口点。它遵循 Cordis 插件规范：
 * - 导出 name, Config, inject, apply
 * - 通过 ctx 注册记忆能力到 Harness
 *
 * 在 cordis.yml 中配置：
 * ```yaml
 * - id: memory
 *   name: only-memory
 *   config:
 *     projectId: my-project
 *     topK: 10
 * ```
 *
 * 独立使用（不依赖 Harness）：
 * ```typescript
 * import { MemoryEngine } from 'only-memory';
 *
 * const engine = new MemoryEngine({ projectId: 'test' });
 * await engine.init();
 * engine.remember('用户叫张三');
 * ```
 */
export { MemoryEngine } from './engine.js';
export type { MemoryPluginConfig } from './config.js';
export { DEFAULT_CONFIG } from './config.js';
export type { Memory, SessionSummary, RetrievalResult } from './models.js';
export { MemoryType, MemoryStatus } from './models.js';
/** Cordis Context 类型（使用声明合并，避免硬依赖） */
interface CordisContext {
    on(event: string, handler: (...args: unknown[]) => void): void;
    emit(event: string, ...args: unknown[]): void;
    effect(cleanup: () => void | (() => void)): void;
    [key: string]: unknown;
}
/** 插件名称 */
export declare const name = "only-memory";
/** 声明依赖服务 */
export declare const inject: string[];
/** 插件配置 schema（Schemastery 格式） */
export interface Config {
    projectId: string;
    dataDir: string;
    topK: number;
    importanceThreshold: number;
    halfLifeDays: number;
    embeddingBackend: 'none' | 'openai' | 'dashscope' | 'local';
    summarizerBackend: 'none' | 'openai' | 'dashscope' | 'deepseek';
}
/** Schemastery Schema（动态导入，避免硬依赖） */
export declare function getConfigSchema(): Promise<unknown>;
/**
 * Cordis 插件 apply 函数
 *
 * 在 Harness 中被自动调用，将记忆能力注册到 Harness 上下文。
 *
 * 集成方式：
 * 1. 监听 Harness 的对话事件（before/after message）
 * 2. 在对话前检索相关记忆，注入到 system prompt
 * 3. 在对话后提取新信息，存入记忆库
 * 4. 注册记忆管理工具（remember / forget / search）
 */
export declare function apply(ctx: CordisContext, config: Partial<Config>): Promise<void>;
//# sourceMappingURL=index.d.ts.map