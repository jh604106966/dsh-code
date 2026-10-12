/**
 * 数据模型 - 记忆系统核心类型定义
 */
/** 记忆类型 */
export declare enum MemoryType {
    /** 事实性记忆 */
    Fact = "fact",
    /** 偏好性记忆 */
    Preference = "preference",
    /** 事件性记忆 */
    Event = "event",
    /** 行为模式记忆 */
    Behavior = "behavior"
}
/** 记忆状态 */
export declare enum MemoryStatus {
    Active = "active",
    Archived = "archived",
    Deleted = "deleted"
}
/** 关系类型 */
export declare enum RelationType {
    Contradicts = "contradicts",
    Supports = "supports",
    Updates = "updates",
    Relates = "relates"
}
/** 记忆条目 */
export interface Memory {
    id: string;
    content: string;
    type: MemoryType;
    entities: string[];
    importance: number;
    embedding: Float32Array | null;
    status: MemoryStatus;
    pinned: boolean;
    accessCount: number;
    lastAccessed: string;
    createdAt: string;
    updatedAt: string;
    sourceSession: string | null;
    tags?: string[];
}
/** 标签条目 */
export interface MemoryTag {
    memoryId: string;
    tag: string;
    createdAt: string;
}
/** 记忆关系条目 */
export interface MemoryRelation {
    id: string;
    fromId: string;
    toId: string;
    relationType: RelationType;
    note: string;
    confidence: number;
    createdAt: string;
}
/** 会话摘要 */
export interface SessionSummary {
    sessionId: string;
    summary: string;
    endTime: string;
    memoryCount: number;
}
/** 检索结果 */
export interface RetrievalResult {
    memory: Memory;
    score: number;
    source: 'semantic' | 'fts' | 'entity' | 'importance' | 'time';
}
/** 创建记忆的参数 */
export interface CreateMemoryInput {
    content: string;
    type: MemoryType;
    entities: string[];
    importance: number;
    embedding: Float32Array | null;
    sourceSession?: string | null;
}
/** 生成唯一 ID */
export declare function generateId(): string;
/** 创建新记忆对象 */
export declare function createMemory(input: CreateMemoryInput): Memory;
//# sourceMappingURL=models.d.ts.map