/**
 * 低分记忆清理器
 */
export class MemoryCleaner {
    threshold;
    constructor(threshold = 0.1) {
        this.threshold = threshold;
    }
    /** 清理低分记忆（跳过置顶记忆） */
    clean(store) {
        const lowMemories = store.getLowImportanceMemories(this.threshold);
        const pinnedIds = store.getPinnedIds();
        let archived = 0;
        for (const mem of lowMemories) {
            if (pinnedIds.has(mem.id))
                continue; // 置顶记忆不清理
            if (store.archiveMemory(mem.id)) {
                archived++;
            }
        }
        return archived;
    }
}
//# sourceMappingURL=cleaner.js.map