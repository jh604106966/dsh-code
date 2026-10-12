/**
 * MemoryEngine - 记忆系统主引擎
 *
 * 整合所有子模块，提供完整的记忆管理能力。
 * 可独立使用，也可通过 Cordis 插件入口集成到 Harness。
 */
import type { Memory, RetrievalResult, MemoryRelation } from './models.js';
import { RelationType } from './models.js';
import type { MemoryPluginConfig } from './config.js';
export declare class MemoryEngine {
    private config;
    private store;
    private vectorStore;
    private sessionStore;
    private extractor;
    private scorer;
    private retriever;
    private decay;
    private merger;
    private cleaner;
    private embeddingProvider;
    private summarizerProvider;
    private currentSessionId;
    private sessionUserMsgs;
    private sessionAssistantMsgs;
    private initialized;
    private writeCounter;
    constructor(config?: Partial<MemoryPluginConfig>);
    /** 异步初始化（sql.js 需要异步加载 WASM） */
    init(): Promise<void>;
    /** 处理用户消息：检索相关记忆，返回注入到 system prompt 的记忆文本 */
    onUserMessage(msg: string): Promise<string>;
    /** 对话结束后处理：提取新信息、评分、入库 */
    onAssistantMessage(msg: string, userMsg?: string): Promise<void>;
    /** 显式指令：强制记住一条事实（内容完全相同时更新而非新增）*/
    remember(fact: string, importance?: number): Promise<Memory>;
    /** 按关键词删除相关记忆 */
    forget(query: string): number;
    /** 搜索记忆 */
    search(query: string): Promise<RetrievalResult[]>;
    /** 获取单条记忆详情 */
    getMemory(id: string): Memory | null;
    /** 更新记忆内容/重要度/类型 */
    updateMemory(id: string, updates: {
        content?: string;
        importance?: number;
        type?: string;
    }): boolean;
    /** 置顶记忆（防止衰减和清理） */
    pinMemory(id: string): boolean;
    /** 取消置顶 */
    unpinMemory(id: string): boolean;
    /** 按 ID 删除单条记忆 */
    deleteMemory(id: string): boolean;
    /** 获取所有活跃记忆 */
    getAllMemories(): Memory[];
    /** 按会话过滤记忆 */
    getMemoriesBySession(sessionId: string): Memory[];
    /** 获取所有会话 ID 列表 */
    getSessionIds(): string[];
    /** 获取当前活跃会话 ID（无会话时返回 null） */
    getCurrentSessionId(): string | null;
    /** 获取统计信息 */
    getStats(): {
        active: number;
        dbPath: string;
        projectId: string;
        currentSession: string | null;
    };
    startSession(sessionId?: string): string;
    endSession(summary?: string): void;
    /** 导出记忆到 JSON 文件 */
    exportToFile(filePath: string): number;
    /** 导出记忆为 JSON 对象（供 Web API 使用） */
    exportMemoriesData(): {
        version: string;
        projectId: string;
        exportedAt: string;
        count: number;
        memories: object[];
    };
    /** 从 JSON 文件导入记忆 */
    importFromFile(filePath: string): Promise<number>;
    /** 从数组导入记忆（供 Web API 使用） */
    importMemoriesData(list: object[]): Promise<number>;
    /** 导出记忆为 JSONL 文件（每行一条 JSON，适合大批量迁移） */
    exportToJsonl(filePath: string): number;
    /** 导出记忆为 JSONL 字符串（供 Web API 使用） */
    exportToJsonlString(): {
        content: string;
        count: number;
    };
    /** 从 JSONL 文件导入记忆 */
    importFromJsonl(filePath: string): Promise<number>;
    /** 从 JSONL 字符串导入记忆（供 Web API 使用） */
    importFromJsonlString(content: string): Promise<number>;
    /** 获取记忆库健康报告 */
    getHealthReport(): {
        active: number;
        archived: number;
        pinned: number;
        importance: {
            high: number;
            medium: number;
            low: number;
            avg: number;
        };
        tags: number;
        relations: number;
        sessions: number;
        leastAccessed: Array<{
            id: string;
            content: string;
            accessCount: number;
            importance: number;
        }>;
        config: {
            maxActiveMemories: number;
            maxContextTokens: number;
            summarizerEnabled: boolean;
            embeddingEnabled: boolean;
        };
    };
    close(): void;
    /** 给记忆添加标签 */
    addTag(memoryId: string, tag: string): boolean;
    /** 移除标签 */
    removeTag(memoryId: string, tag: string): boolean;
    /** 获取一条记忆的所有标签 */
    getTagsForMemory(memoryId: string): string[];
    /** 获取所有已使用的标签 */
    getAllTags(): string[];
    /** 按标签过滤记忆（带写入标签字段） */
    filterByTag(tag: string): Memory[];
    /** 获取所有记忆（带标签字段） */
    getAllMemoriesWithTags(): Memory[];
    /** 将一组记忆补充标签字段 */
    attachTagsToMemories(memories: Memory[]): Memory[];
    /** 建立两条记忆的关系 */
    linkMemories(fromId: string, toId: string, relationType: RelationType, note?: string, confidence?: number): MemoryRelation | null;
    /** 获取一条记忆的所有关联关系（带关联记忆内容） */
    getLinksForMemory(memoryId: string): Array<MemoryRelation & {
        fromContent: string;
        toContent: string;
    }>;
    /** 移除两条记忆间的关系 */
    unlinkMemories(fromId: string, toId: string, relationType?: RelationType): number;
    private ensureInitialized;
    private reloadVectors;
    private extractAndStore;
    private inferType;
    private runMaintenance;
    /** 写入计数器：每 MAINTENANCE_INTERVAL 次写入触发轻量维护 */
    private tickMaintenance;
    /** 公开接口：手动触发完整维护（衰减 + 合并 + 清理 + 容量淘汰），返回统计信息 */
    runMaintenanceNow(): {
        decayed: number;
        merged: number;
        cleaned: number;
        evicted: number;
        active: number;
    };
    /** 是否已配置摘要提供者 */
    hasSummarizer(): boolean;
    /** 获取当前配置（只读） */
    getConfig(): MemoryPluginConfig;
    /**
     * 摘要压缩记忆：按实体相似度分组，将每组记忆压缩为一条摘要，原始记忆归档。
     * @param maxGroups 最多处理几组（默认 3）
     * @returns 摘要统计
     */
    summarizeMemories(maxGroups?: number): Promise<{
        summarized: number;
        archived: number;
        groups: number;
    }>;
    /** 按实体聚类：两条记忆共享至少一个实体即归入同组 */
    private clusterByEntity;
    /** 容量淘汰：活跃记忆超限时归档最低分的非置顶记忆 */
    private enforceCapacity;
}
//# sourceMappingURL=engine.d.ts.map