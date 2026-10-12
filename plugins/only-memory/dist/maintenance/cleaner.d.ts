/**
 * 低分记忆清理器
 */
import type { SqliteStore } from '../storage/sqlite-store.js';
export declare class MemoryCleaner {
    private threshold;
    constructor(threshold?: number);
    /** 清理低分记忆（跳过置顶记忆） */
    clean(store: SqliteStore): number;
}
//# sourceMappingURL=cleaner.d.ts.map