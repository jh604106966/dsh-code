/**
 * Embedding 提供者
 *
 * 默认 embeddingBackend='none'，不生成向量，仅使用关键词检索。
 * 用户可通过配置切换为以下后端之一：
 *
 * - 'openai'    — 调用 OpenAI API（需 OPENAI_API_KEY）
 * - 'dashscope' — 调用阿里云 DashScope API（需 DASHSCOPE_API_KEY）
 * - 'local'     — 使用 transformers.js 本地推理（需安装 @xenova/transformers）
 */
import type { MemoryPluginConfig } from '../config.js';
export interface EmbeddingProvider {
    /** 将文本转换为向量 */
    embed(text: string): Promise<Float32Array | null>;
    /** 批量转换 */
    embedBatch(texts: string[]): Promise<Array<Float32Array | null>>;
}
/**
 * 根据配置创建 Embedding 提供者
 *
 * @returns EmbeddingProvider 实例，或 null（当 backend='none' 或未配置 API Key 时）
 */
export declare function createEmbeddingProvider(config: MemoryPluginConfig): Promise<EmbeddingProvider | null>;
//# sourceMappingURL=embedding-provider.d.ts.map