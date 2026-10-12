/**
 * 纯 JS 内存向量检索
 *
 * 将 embedding 加载到内存中，用余弦相似度做向量检索。
 * 适用于中小规模（< 10万条）记忆库。
 */
/** 余弦相似度 */
export declare function cosineSimilarity(a: Float32Array, b: Float32Array): number;
export interface VectorEntry {
    id: string;
    embedding: Float32Array;
}
export declare class LocalVectorStore {
    private entries;
    /** 加载向量集合 */
    load(entries: VectorEntry[]): void;
    /** 添加单条向量 */
    add(id: string, embedding: Float32Array): void;
    /** 删除向量 */
    remove(id: string): void;
    /** 获取向量数量 */
    get size(): number;
    /** 搜索最相似的 topK 条 */
    search(query: Float32Array, topK: number): Array<[string, number]>;
    /** 清空 */
    clear(): void;
}
//# sourceMappingURL=vector-store.d.ts.map