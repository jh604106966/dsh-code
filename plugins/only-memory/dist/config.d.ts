/**
 * 插件配置
 *
 * 在 Harness 环境中通过 cordis.yml 配置；
 * 独立使用时通过构造参数配置。
 */
/** 插件配置接口 */
export interface MemoryPluginConfig {
    /** 项目标识，不同项目记忆隔离 */
    projectId: string;
    /** 数据存储根目录 */
    dataDir: string;
    /** SQLite 数据库文件名 */
    dbName: string;
    /** 检索返回的最大记忆条数 */
    topK: number;
    /** 上下文注入的 token 预算上限（0 = 不限制） */
    maxContextTokens: number;
    /** 重要性阈值：高于此值的记忆直接入库 */
    importanceThreshold: number;
    /** 衰减半衰期（天） */
    halfLifeDays: number;
    /** Embedding 后端 */
    embeddingBackend: 'none' | 'openai' | 'dashscope' | 'local';
    /** Embedding 模型名称 */
    embeddingModel: string;
    /** Embedding 向量维度 */
    embeddingDim: number;
    /** LLM 摘要后端 */
    summarizerBackend: 'none' | 'openai' | 'dashscope' | 'deepseek';
    /** 活跃记忆上限（0 = 不限制），超限时自动归档低分记忆 */
    maxActiveMemories: number;
}
/** 默认配置 */
export declare const DEFAULT_CONFIG: MemoryPluginConfig;
/** 合并配置 */
export declare function resolveConfig(overrides?: Partial<MemoryPluginConfig>): MemoryPluginConfig;
/** 获取项目目录 */
export declare function getProjectDir(config: MemoryPluginConfig): string;
/** 获取数据库路径 */
export declare function getDbPath(config: MemoryPluginConfig): string;
/** 获取会话目录 */
export declare function getSessionDir(config: MemoryPluginConfig): string;
/** 确保目录存在 */
export declare function ensureDirs(config: MemoryPluginConfig): void;
//# sourceMappingURL=config.d.ts.map