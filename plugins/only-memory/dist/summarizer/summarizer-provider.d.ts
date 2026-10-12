/**
 * LLM 摘要提供者
 *
 * 调用 LLM 将多条记忆压缩为精炼摘要，减少上下文占用。
 * 支持 OpenAI、DashScope、DeepSeek 三种后端，使用各自的 Chat Completions API。
 *
 * 默认 summarizerBackend='none'，不启用摘要功能。
 */
import type { MemoryPluginConfig } from '../config.js';
export interface SummarizerProvider {
    /** 将多条文本压缩为一条摘要 */
    summarize(texts: string[]): Promise<string | null>;
}
/**
 * 根据配置创建摘要提供者
 *
 * @returns SummarizerProvider 实例，或 null（当 backend='none' 或未配置 API Key 时）
 */
export declare function createSummarizerProvider(config: MemoryPluginConfig): SummarizerProvider | null;
//# sourceMappingURL=summarizer-provider.d.ts.map