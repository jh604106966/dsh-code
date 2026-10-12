/**
 * JSON 文件会话存储
 *
 * 每个会话摘要保存为独立的 JSON 文件。
 */
import type { SessionSummary } from '../models.js';
export declare class SessionStore {
    private dir;
    constructor(dir: string);
    /** 保存会话摘要 */
    save(session: SessionSummary): void;
    /** 获取会话摘要 */
    get(sessionId: string): SessionSummary | null;
    /** 列出所有会话 */
    list(): SessionSummary[];
}
//# sourceMappingURL=session-store.d.ts.map