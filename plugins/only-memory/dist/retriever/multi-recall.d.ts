/**
 * 多路召回 + 综合排序检索器
 *
 * 三路召回：
 * 1. 语义检索（向量余弦相似度）    权重 0.5
 * 2. FTS 全文检索（LIKE 搜索）     权重 0.2
 * 3. 实体匹配检索                  权重 0.15
 * 4. 重要度排序                    权重 0.10
 * 5. 时效性排序                    权重 0.05
 */
import type { RetrievalResult } from '../models.js';
import type { MemoryPluginConfig } from '../config.js';
import type { SqliteStore } from '../storage/sqlite-store.js';
import type { LocalVectorStore } from '../storage/vector-store.js';
import type { EntityExtractor } from '../encoder/entity-extractor.js';
import type { EmbeddingProvider } from '../embedding/embedding-provider.js';
export declare class MultiRecallRetriever {
    private config;
    private store;
    private vectorStore;
    private extractor;
    private embeddingProvider;
    constructor(config: MemoryPluginConfig, store: SqliteStore, vectorStore: LocalVectorStore, extractor: EntityExtractor, embeddingProvider?: EmbeddingProvider | null);
    /** 检索相关记忆并返回格式化的上下文文本（受 token 预算约束） */
    retrieveContextText(query: string): Promise<string>;
    /** 多路召回检索 */
    retrieve(query: string): Promise<RetrievalResult[]>;
    private recallVector;
    private recallFts;
    private recallEntity;
    private recallImportance;
    private recallTimeliness;
}
//# sourceMappingURL=multi-recall.d.ts.map