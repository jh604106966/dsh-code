/**
 * 记忆去重合并器
 *
 * 基于文本相似度检测重复记忆，自动合并。
 */
import { cosineSimilarity } from '../storage/vector-store.js';
export class MemoryMerger {
    similarityThreshold;
    constructor(similarityThreshold = 0.9) {
        this.similarityThreshold = similarityThreshold;
    }
    /** 检测并合并重复记忆 */
    merge(store) {
        const memories = store.getAllActive();
        const toArchive = new Set();
        let merged = 0;
        for (let i = 0; i < memories.length; i++) {
            if (toArchive.has(memories[i].id))
                continue;
            for (let j = i + 1; j < memories.length; j++) {
                if (toArchive.has(memories[j].id))
                    continue;
                if (this.isSimilar(memories[i], memories[j])) {
                    // 保留重要度更高的，归档另一条
                    const keep = memories[i].importance >= memories[j].importance
                        ? memories[i]
                        : memories[j];
                    const discard = keep === memories[i] ? memories[j] : memories[i];
                    toArchive.add(discard.id);
                    merged++;
                }
            }
        }
        for (const id of toArchive) {
            store.archiveMemory(id);
        }
        return merged;
    }
    /** 计算两条记忆的文本相似度 */
    isSimilar(a, b) {
        // 如果有 embedding，优先用向量相似度
        if (a.embedding && b.embedding) {
            const sim = cosineSimilarity(a.embedding, b.embedding);
            return sim >= this.similarityThreshold;
        }
        // 降级：基于字符级 Jaccard 相似度
        const jaccard = this.jaccardSimilarity(a.content, b.content);
        return jaccard >= this.similarityThreshold;
    }
    /** 字符级 Jaccard 相似度（基于 bigram） */
    jaccardSimilarity(a, b) {
        const setA = this.bigrams(a);
        const setB = this.bigrams(b);
        if (setA.size === 0 && setB.size === 0)
            return 1;
        if (setA.size === 0 || setB.size === 0)
            return 0;
        let intersection = 0;
        for (const bi of setA) {
            if (setB.has(bi))
                intersection++;
        }
        const union = setA.size + setB.size - intersection;
        return intersection / union;
    }
    bigrams(text) {
        const result = new Set();
        for (let i = 0; i < text.length - 1; i++) {
            result.add(text.substring(i, i + 2));
        }
        return result;
    }
}
//# sourceMappingURL=merger.js.map