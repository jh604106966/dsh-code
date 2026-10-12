/**
 * SQLite 存储层 - 使用 sql.js（纯 JS SQLite）
 *
 * sql.js 将整个数据库加载到内存中操作，修改后需要保存回磁盘。
 * 本模块封装了自动保存逻辑，确保每次写操作后数据持久化。
 */
import type { Memory, SessionSummary, MemoryRelation } from '../models.js';
import { RelationType } from '../models.js';
export declare class SqliteStore {
    private db;
    private dbPath;
    private saveTimer;
    private needsSave;
    constructor(dbPath: string);
    /** 初始化数据库（异步，因为 sql.js 需要异步加载 WASM） */
    init(): Promise<void>;
    /** 保存数据库到磁盘 */
    private save;
    /** 标记需要保存（延迟批量写入） */
    private markDirty;
    /** 强制保存 */
    flush(): void;
    /** 关闭数据库 */
    close(): void;
    /** 插入记忆 */
    insertMemory(mem: Memory): void;
    /** 获取记忆 */
    getMemory(id: string): Memory | null;
    /** 更新记忆重要度 */
    updateImportance(id: string, importance: number): void;
    /** 更新记忆内容 */
    updateMemory(id: string, updates: {
        content?: string;
        importance?: number;
        type?: string;
    }): boolean;
    /** 置顶记忆 */
    pinMemory(id: string): boolean;
    /** 取消置顶 */
    unpinMemory(id: string): boolean;
    /** 获取所有置顶记忆 ID */
    getPinnedIds(): Set<string>;
    /** 增加访问计数 */
    incrementAccessCount(id: string): void;
    /** 删除记忆（设为 archived 状态） */
    archiveMemory(id: string): boolean;
    /** 删除记忆（真正删除） */
    deleteMemory(id: string): boolean;
    /** 获取所有活跃记忆（含 embedding） */
    getAllActive(): Memory[];
    /**
     * 按内容精确查找活跃记忆（用于写入去重）
     * 返回内容完全相同的第一条活跃记忆，没有则返回 null
     */
    findByContent(content: string): Memory | null;
    /** 按会话 ID 获取属于该会话的活跃记忆 */
    getBySession(sessionId: string): Memory[];
    /** 获取所有不同会话的 ID（用于展示历史会话列表） */
    getSessionIds(): string[];
    /** 获取活跃记忆数量 */
    getActiveCount(): number;
    /** 获取归档记忆数量 */
    getArchivedCount(): number;
    /** 获取置顶记忆数量 */
    getPinnedCount(): number;
    /** 获取记忆重要度分布统计 */
    getImportanceDistribution(): {
        high: number;
        medium: number;
        low: number;
        avg: number;
    };
    /** 获取最久未访问的记忆 */
    getLeastAccessedMemories(limit: number): Memory[];
    /** 获取关系总数 */
    getRelationCount(): number;
    /** 获取标签总数 */
    getTagCount(): number;
    /** 获取所有会话日志（含记忆数） */
    getSessionLogs(): Array<{
        sessionId: string;
        summary: string | null;
        endTime: string | null;
        memoryCount: number;
    }>;
    /** FTS 搜索（LIKE 降级，中文友好） */
    ftsSearch(query: string, limit?: number): Array<[string, number]>;
    /** 实体搜索 */
    entitySearch(entities: string[], limit?: number): string[];
    /** 按重要度获取低分记忆 */
    getLowImportanceMemories(threshold: number): Memory[];
    saveSessionLog(session: SessionSummary): void;
    /** 给记忆添加标签 */
    addTag(memoryId: string, tag: string): boolean;
    /** 移除标签 */
    removeTag(memoryId: string, tag: string): boolean;
    /** 获取一条记忆的所有标签 */
    getTagsForMemory(memoryId: string): string[];
    /** 按标签查找记忆 ID */
    findMemoryIdsByTag(tag: string): string[];
    /** 获取所有已使用的标签（去重排序） */
    getAllTags(): string[];
    /** 批量获取多条记忆的标签（返回 Map） */
    getTagsForMemories(ids: string[]): Map<string, string[]>;
    /** 删除记忆时同步清除其标签 */
    deleteTagsForMemory(memoryId: string): void;
    /** 建立两条记忆的关系 */
    linkMemories(fromId: string, toId: string, relationType: RelationType, note?: string, confidence?: number): MemoryRelation | null;
    /** 获取一条记忆的所有关联关系（双向） */
    getRelationsForMemory(memoryId: string): MemoryRelation[];
    /** 移除关系 */
    unlinkMemories(fromId: string, toId: string, relationType?: RelationType): number;
    /** 导出所有活跃记忆为 JSON 格式 */
    exportAll(): object[];
}
//# sourceMappingURL=sqlite-store.d.ts.map