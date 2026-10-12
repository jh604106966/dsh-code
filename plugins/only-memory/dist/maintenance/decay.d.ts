/**
 * 时间衰减管理器
 *
 * 公式：decayed_importance = importance × exp(-days / halfLife)
 */
import type { SqliteStore } from '../storage/sqlite-store.js';
export declare class DecayManager {
    private halfLifeDays;
    constructor(halfLifeDays?: number);
    /** 计算衰减后的分数 */
    decayedScore(importance: number, createdAt: string): number;
    /** 对所有活跃记忆执行衰减（跳过置顶记忆） */
    applyDecay(store: SqliteStore): number;
}
//# sourceMappingURL=decay.d.ts.map