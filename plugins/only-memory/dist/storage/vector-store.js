/**
 * 纯 JS 内存向量检索
 *
 * 将 embedding 加载到内存中，用余弦相似度做向量检索。
 * 适用于中小规模（< 10万条）记忆库。
 */
/** 余弦相似度 */
export function cosineSimilarity(a, b) {
    if (a.length !== b.length)
        return 0;
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom === 0 ? 0 : dot / denom;
}
export class LocalVectorStore {
    entries = new Map();
    /** 加载向量集合 */
    load(entries) {
        this.entries.clear();
        for (const e of entries) {
            this.entries.set(e.id, e.embedding);
        }
    }
    /** 添加单条向量 */
    add(id, embedding) {
        this.entries.set(id, embedding);
    }
    /** 删除向量 */
    remove(id) {
        this.entries.delete(id);
    }
    /** 获取向量数量 */
    get size() {
        return this.entries.size;
    }
    /** 搜索最相似的 topK 条 */
    search(query, topK) {
        if (this.entries.size === 0)
            return [];
        const scores = [];
        for (const [id, vec] of this.entries) {
            const sim = cosineSimilarity(query, vec);
            scores.push([id, sim]);
        }
        scores.sort((a, b) => b[1] - a[1]);
        return scores.slice(0, topK);
    }
    /** 清空 */
    clear() {
        this.entries.clear();
    }
}
//# sourceMappingURL=vector-store.js.map