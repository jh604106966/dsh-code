/**
 * OnlyMemory Web Server
 *
 * 提供 REST API 和静态前端页面，用于在浏览器中管理记忆。
 * 与 MCP stdio 服务器共享同一个 MemoryEngine 实例。
 */
import type { MemoryEngine } from './engine.js';
export interface WebServerOptions {
    engine: MemoryEngine;
    port?: number;
    host?: string;
}
export declare class WebServer {
    private engine;
    private port;
    private host;
    private server;
    constructor(options: WebServerOptions);
    start(): Promise<void>;
    stop(): Promise<void>;
    getUrl(): string;
    private handle;
    private getMemories;
    private getMemory;
    private getStats;
    /** GET /api/scope — 返回范围元信息：当前工作区、当前会话、所有工作区列表 */
    private getScope;
    /** GET /api/sessions — 返回当前工作区的所有会话 ID 列表 */
    private getSessions;
    private createMemory;
    private updateMemory;
    private pinMemory;
    private unpinMemory;
    private deleteMemory;
    private forgetMemory;
    private getAllTags;
    private filterByTag;
    private addTag;
    private removeTag;
    private getLinks;
    private runMaintenance;
    private summarizeMemories;
    private batchOperation;
    private getConfig;
    private getHealth;
    private exportJsonl;
    private importJsonl;
    private exportMemories;
    private importMemories;
    private linkMemories;
    private unlinkMemories;
    /** 列出 dataDir 下所有 projectId（子目录名） */
    private listWorkspaces;
    /**
     * 扫描所有工作区的 db 文件，只读方式合并返回记忆列表。
     * 为每条记忆附加 _workspace 字段以便 UI 区分来源。
     */
    private getAllWorkspacesMemories;
    private readBody;
    private json;
    private serveStatic;
}
//# sourceMappingURL=web-server.d.ts.map