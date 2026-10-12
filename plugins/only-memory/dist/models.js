/**
 * 数据模型 - 记忆系统核心类型定义
 */
/** 记忆类型 */
export var MemoryType;
(function (MemoryType) {
    /** 事实性记忆 */
    MemoryType["Fact"] = "fact";
    /** 偏好性记忆 */
    MemoryType["Preference"] = "preference";
    /** 事件性记忆 */
    MemoryType["Event"] = "event";
    /** 行为模式记忆 */
    MemoryType["Behavior"] = "behavior";
})(MemoryType || (MemoryType = {}));
/** 记忆状态 */
export var MemoryStatus;
(function (MemoryStatus) {
    MemoryStatus["Active"] = "active";
    MemoryStatus["Archived"] = "archived";
    MemoryStatus["Deleted"] = "deleted";
})(MemoryStatus || (MemoryStatus = {}));
/** 关系类型 */
export var RelationType;
(function (RelationType) {
    RelationType["Contradicts"] = "contradicts";
    RelationType["Supports"] = "supports";
    RelationType["Updates"] = "updates";
    RelationType["Relates"] = "relates";
})(RelationType || (RelationType = {}));
/** 生成唯一 ID */
export function generateId() {
    const ts = Date.now().toString(36);
    const rand = Math.random().toString(36).substring(2, 8);
    return `${ts}-${rand}`;
}
/** 创建新记忆对象 */
export function createMemory(input) {
    const now = new Date().toISOString();
    return {
        id: generateId(),
        content: input.content,
        type: input.type,
        entities: input.entities,
        importance: Math.min(1.0, Math.max(0.0, input.importance)),
        embedding: input.embedding,
        status: MemoryStatus.Active,
        pinned: false,
        accessCount: 0,
        lastAccessed: now,
        createdAt: now,
        updatedAt: now,
        sourceSession: input.sourceSession ?? null,
    };
}
//# sourceMappingURL=models.js.map