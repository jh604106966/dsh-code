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
export class MultiRecallRetriever {
    config;
    store;
    vectorStore;
    extractor;
    embeddingProvider;
    constructor(config, store, vectorStore, extractor, embeddingProvider = null) {
        this.config = config;
        this.store = store;
        this.vectorStore = vectorStore;
        this.extractor = extractor;
        this.embeddingProvider = embeddingProvider;
    }
    /** 检索相关记忆并返回格式化的上下文文本（受 token 预算约束） */
    async retrieveContextText(query) {
        const results = await this.retrieve(query);
        if (results.length === 0)
            return '';
        const budget = this.config.maxContextTokens;
        const header = '## 相关记忆\n';
        let usedTokens = estimateTokens(header);
        const lines = [];
        for (const r of results) {
            const line = `- [${r.memory.type}] ${r.memory.content}`;
            const lineTokens = estimateTokens(line);
            if (budget > 0 && usedTokens + lineTokens > budget)
                break;
            lines.push(line);
            usedTokens += lineTokens;
        }
        if (lines.length === 0)
            return '';
        return `${header}${lines.join('\n')}`;
    }
    /** 多路召回检索 */
    async retrieve(query) {
        const topK = this.config.topK;
        const allResults = new Map();
        const scoreAccum = new Map();
        // 1. 语义检索（如果有 embedding 提供者）
        if (this.embeddingProvider) {
            const queryEmbedding = await this.embeddingProvider.embed(query);
            if (queryEmbedding) {
                const vectorResults = this.recallVector(queryEmbedding, topK * 2);
                for (const r of vectorResults) {
                    const key = r.memory.id;
                    scoreAccum.set(key, (scoreAccum.get(key) ?? 0) + r.score * 0.50);
                    allResults.set(key, r);
                }
            }
        }
        // 2. FTS 全文检索
        const ftsWeight = this.embeddingProvider ? 0.20 : 0.35;
        const ftsResults = this.recallFts(query, topK * 2);
        for (const r of ftsResults) {
            const key = r.memory.id;
            scoreAccum.set(key, (scoreAccum.get(key) ?? 0) + r.score * ftsWeight);
            allResults.set(key, r);
        }
        // 3. 实体匹配检索
        const entities = this.extractor.extract(query);
        if (entities.length > 0) {
            const entityResults = this.recallEntity(entities, topK * 2);
            for (const r of entityResults) {
                const key = r.memory.id;
                scoreAccum.set(key, (scoreAccum.get(key) ?? 0) + r.score * 0.15);
                if (!allResults.has(key))
                    allResults.set(key, r);
            }
        }
        // 4. 重要度排序
        const importanceResults = this.recallImportance(topK * 2);
        for (const r of importanceResults) {
            const key = r.memory.id;
            scoreAccum.set(key, (scoreAccum.get(key) ?? 0) + r.score * 0.10);
            if (!allResults.has(key))
                allResults.set(key, r);
        }
        // 5. 时效性排序
        const timeResults = this.recallTimeliness(topK * 2);
        for (const r of timeResults) {
            const key = r.memory.id;
            scoreAccum.set(key, (scoreAccum.get(key) ?? 0) + r.score * 0.05);
            if (!allResults.has(key))
                allResults.set(key, r);
        }
        // 综合排序
        const sorted = [...allResults.entries()]
            .map(([id, r]) => ({ ...r, score: scoreAccum.get(id) ?? 0 }))
            .sort((a, b) => b.score - a.score)
            .slice(0, topK);
        // 更新访问计数
        for (const r of sorted) {
            this.store.incrementAccessCount(r.memory.id);
        }
        return sorted;
    }
    // ================================================================ //
    // 各路召回实现
    // ================================================================ //
    recallVector(queryEmbedding, limit) {
        const hits = this.vectorStore.search(queryEmbedding, limit);
        const results = [];
        for (const [id, score] of hits) {
            const mem = this.store.getMemory(id);
            if (!mem)
                continue;
            results.push({ memory: mem, score, source: 'semantic' });
        }
        return results;
    }
    recallFts(query, limit) {
        const hits = this.store.ftsSearch(query, limit);
        if (hits.length === 0)
            return [];
        // 归一化 FTS 分数（importance 越高越好）
        const maxScore = Math.max(...hits.map(([, s]) => s));
        const minScore = Math.min(...hits.map(([, s]) => s));
        const range = maxScore - minScore || 1;
        const results = [];
        for (const [id, rawScore] of hits) {
            const mem = this.store.getMemory(id);
            if (!mem)
                continue;
            const normScore = (rawScore - minScore) / range;
            results.push({ memory: mem, score: normScore, source: 'fts' });
        }
        return results;
    }
    recallEntity(entities, limit) {
        const ids = this.store.entitySearch(entities, limit);
        const results = [];
        for (const id of ids) {
            const mem = this.store.getMemory(id);
            if (!mem)
                continue;
            results.push({ memory: mem, score: 0.8, source: 'entity' });
        }
        return results;
    }
    recallImportance(limit) {
        const all = this.store.getAllActive();
        return all.slice(0, limit).map((mem) => ({
            memory: mem,
            score: mem.importance,
            source: 'importance',
        }));
    }
    recallTimeliness(limit) {
        const all = this.store.getAllActive();
        const now = Date.now();
        return all
            .map((mem) => {
            const age = now - new Date(mem.updatedAt).getTime();
            const daysAgo = age / (1000 * 60 * 60 * 24);
            // 越新分数越高，指数衰减
            const score = Math.exp(-daysAgo / 30);
            return { memory: mem, score, source: 'time' };
        })
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);
    }
}
/**
 * 估算文本的 token 数量。
 * 中文字符按 1.5 token/字，ASCII 单词按 1 token/词。
 */
function estimateTokens(text) {
    let tokens = 0;
    // 匹配中文字符和其他非 ASCII 字符
    const cjk = text.match(/[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]/g);
    if (cjk)
        tokens += Math.ceil(cjk.length * 1.5);
    // ASCII 部分按单词估算
    const ascii = text.replace(/[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]/g, ' ').trim();
    if (ascii)
        tokens += ascii.split(/\s+/).filter(Boolean).length;
    return tokens;
}
//# sourceMappingURL=multi-recall.js.map