/**
 * 重要性评分器 - 6因子加权评分
 *
 * 因子权重：
 * - 显式指令 0.30
 * - 新颖性   0.20
 * - 情感强度 0.10
 * - 实体密度 0.15
 * - 行为信息 0.15
 * - 时效性   0.10
 */
import { MemoryType } from '../models.js';
import type { EntityExtractor } from '../encoder/entity-extractor.js';
/** 评分结果 */
export interface ScoreResult {
    score: number;
    factors: Record<string, number>;
}
export declare class ImportanceScorer {
    private extractor;
    constructor(extractor: EntityExtractor);
    /** 计算重要性分数（0~1） */
    score(text: string, type: MemoryType): ScoreResult;
    private scoreExplicit;
    private scoreNovelty;
    private scoreEmotion;
    private scoreEntityDensity;
    private scoreBehavior;
    private scoreTimeliness;
}
//# sourceMappingURL=importance.d.ts.map