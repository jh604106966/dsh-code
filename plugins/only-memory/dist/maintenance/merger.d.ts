/**
 * 记忆去重合并器
 *
 * 基于文本相似度检测重复记忆，自动合并。
 */
import type { SqliteStore } from '../storage/sqlite-store.js';
export declare class MemoryMerger {
    private similarityThreshold;
    constructor(similarityThreshold?: number);
    /** 检测并合并重复记忆 */
    merge(store: SqliteStore): number;
    /** 计算两条记忆的文本相似度 */
    private isSimilar;
    /** 字符级 Jaccard 相似度（基于 bigram） */
    private jaccardSimilarity;
    private bigrams;
}
//# sourceMappingURL=merger.d.ts.map