/**
 * 插件配置
 *
 * 在 Harness 环境中通过 cordis.yml 配置；
 * 独立使用时通过构造参数配置。
 */
import * as path from 'node:path';
import * as fs from 'node:fs';
/** 默认配置 */
export const DEFAULT_CONFIG = {
    projectId: 'default',
    dataDir: path.join(process.env.HOME ?? process.env.USERPROFILE ?? '.', '.onlymem'),
    dbName: 'memory.db',
    topK: 10,
    maxContextTokens: 2000,
    importanceThreshold: 0.5,
    halfLifeDays: 30,
    embeddingBackend: 'none',
    embeddingModel: 'paraphrase-multilingual-MiniLM-L12-v2',
    embeddingDim: 384,
    summarizerBackend: 'none',
    maxActiveMemories: 500,
};
/** 合并配置 */
export function resolveConfig(overrides) {
    return { ...DEFAULT_CONFIG, ...overrides };
}
/** 获取项目目录 */
export function getProjectDir(config) {
    return path.join(config.dataDir, config.projectId);
}
/** 获取数据库路径 */
export function getDbPath(config) {
    return path.join(getProjectDir(config), config.dbName);
}
/** 获取会话目录 */
export function getSessionDir(config) {
    return path.join(getProjectDir(config), 'sessions');
}
/** 确保目录存在 */
export function ensureDirs(config) {
    fs.mkdirSync(getProjectDir(config), { recursive: true });
    fs.mkdirSync(getSessionDir(config), { recursive: true });
}
//# sourceMappingURL=config.js.map