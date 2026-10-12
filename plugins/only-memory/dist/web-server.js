/**
 * OnlyMemory Web Server
 *
 * 提供 REST API 和静态前端页面，用于在浏览器中管理记忆。
 * 与 MCP stdio 服务器共享同一个 MemoryEngine 实例。
 */
import { createServer } from 'node:http';
import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SqliteStore } from './storage/sqlite-store.js';
const __dirname = fileURLToPath(new URL('.', import.meta.url));
const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.ico': 'image/x-icon',
};
export class WebServer {
    engine;
    port;
    host;
    server = null;
    constructor(options) {
        this.engine = options.engine;
        this.port = options.port ?? 3456;
        this.host = options.host ?? '127.0.0.1';
    }
    async start() {
        this.server = createServer((req, res) => {
            // 先设置 CORS 头，再处理请求
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
            this.handle(req, res).catch((err) => {
                this.json(res, { error: err.message }, 500);
            });
        });
        return new Promise((resolve, reject) => {
            this.server.on('error', reject);
            this.server.listen(this.port, this.host, () => resolve());
        });
    }
    async stop() {
        if (this.server) {
            return new Promise((resolve) => {
                this.server.close(() => resolve());
            });
        }
    }
    getUrl() {
        return `http://${this.host}:${this.port}`;
    }
    // ──────────── Request Router ────────────
    async handle(req, res) {
        const method = req.method ?? 'GET';
        const rawUrl = req.url ?? '/';
        const parsedUrl = new URL(rawUrl, `http://${this.host}:${this.port}`);
        const url = parsedUrl.pathname;
        if (method === 'OPTIONS') {
            res.writeHead(204);
            res.end();
            return;
        }
        // --- API ---
        if (url.startsWith('/api/')) {
            const path = url.slice(4);
            // GET routes
            if (method === 'GET') {
                if (path === '/memories')
                    return this.getMemories(req, res);
                if (path.startsWith('/memories/'))
                    return this.getMemory(path.slice(10), res);
                if (path === '/stats')
                    return this.getStats(res);
                if (path === '/scope')
                    return this.getScope(res);
                if (path === '/sessions')
                    return this.getSessions(res);
                if (path === '/export')
                    return this.exportMemories(res);
                if (path === '/tags')
                    return this.getAllTags(res);
                if (path.startsWith('/tags/'))
                    return this.filterByTag(decodeURIComponent(path.slice(6)), res);
                if (path.startsWith('/links/'))
                    return this.getLinks(path.slice(7), res);
                if (path === '/config')
                    return this.getConfig(res);
                if (path === '/health')
                    return this.getHealth(res);
                if (path === '/export-jsonl')
                    return this.exportJsonl(res);
            }
            // POST routes
            if (method === 'POST') {
                const body = await this.readBody(req);
                if (path === '/memories')
                    return this.createMemory(body, res);
                if (path.startsWith('/memories/')) {
                    const id = path.slice(10);
                    return this.updateMemory(id, body, res);
                }
                if (path.startsWith('/pin/'))
                    return this.pinMemory(path.slice(5), res);
                if (path.startsWith('/unpin/'))
                    return this.unpinMemory(path.slice(7), res);
                if (path.startsWith('/delete/'))
                    return this.deleteMemory(path.slice(8), res);
                if (path === '/forget')
                    return this.forgetMemory(body, res);
                if (path.startsWith('/tag/'))
                    return this.addTag(path.slice(5), body, res);
                if (path.startsWith('/untag/'))
                    return this.removeTag(path.slice(7), body, res);
                if (path === '/link')
                    return this.linkMemories(body, res);
                if (path.startsWith('/unlink/'))
                    return this.unlinkMemories(path.slice(8), body, res);
                if (path === '/maintenance')
                    return this.runMaintenance(res);
                if (path === '/import')
                    return this.importMemories(body, res);
                if (path === '/summarize')
                    return this.summarizeMemories(body, res);
                if (path === '/batch')
                    return this.batchOperation(body, res);
                if (path === '/import-jsonl')
                    return this.importJsonl(body, res);
            }
            return this.json(res, { error: 'Not Found' }, 404);
        }
        // --- Static files ---
        await this.serveStatic(url, res);
    }
    // ──────────── API Handlers ────────────
    async getMemories(req, res) {
        const rawUrl = req.url ?? '/';
        const params = new URL(rawUrl, `http://${this.host}:${this.port}`).searchParams;
        const type = params.get('type');
        const search = params.get('search');
        const scope = (params.get('scope') ?? 'workspace');
        const sessionId = params.get('sessionId') ?? undefined;
        const sort = (params.get('sort') ?? 'importance');
        const order = (params.get('order') ?? 'desc');
        const dateFrom = params.get('dateFrom');
        const dateTo = params.get('dateTo');
        const limit = parseInt(params.get('limit') ?? '100', 10);
        let memories;
        if (scope === 'all') {
            // 跨工作区：扫描所有 projectId 目录，合并记忆（只读，不支持 search）
            memories = await this.getAllWorkspacesMemories();
        }
        else if (scope === 'session') {
            const sid = sessionId ?? this.engine.getCurrentSessionId() ?? '';
            if (!sid) {
                return this.json(res, { memories: [], total: 0, scope, note: 'No active session' });
            }
            memories = this.engine.attachTagsToMemories(this.engine.getMemoriesBySession(sid));
        }
        else {
            // workspace（默认）
            if (search) {
                const results = await this.engine.search(search);
                memories = this.engine.attachTagsToMemories(results.map((r) => r.memory));
            }
            else {
                memories = this.engine.getAllMemoriesWithTags();
            }
        }
        if (type && type !== 'all') {
            memories = memories.filter((m) => m.type === type);
        }
        // 日期范围过滤
        if (dateFrom) {
            const from = new Date(dateFrom).getTime();
            memories = memories.filter((m) => new Date(m.createdAt).getTime() >= from);
        }
        if (dateTo) {
            const to = new Date(dateTo).getTime();
            memories = memories.filter((m) => new Date(m.createdAt).getTime() <= to);
        }
        // 排序：先 pinned first，再按指定字段
        memories.sort((a, b) => {
            if (a.pinned !== b.pinned)
                return a.pinned ? -1 : 1;
            let cmp = 0;
            switch (sort) {
                case 'created':
                    cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                    break;
                case 'updated':
                    cmp = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
                    break;
                case 'accessCount':
                    cmp = (a.accessCount ?? 0) - (b.accessCount ?? 0);
                    break;
                default: cmp = a.importance - b.importance;
            }
            return order === 'desc' ? -cmp : cmp;
        });
        memories = memories.slice(0, limit);
        this.json(res, { memories, total: memories.length, scope });
    }
    getMemory(id, res) {
        const mem = this.engine.getMemory(id);
        if (!mem)
            return this.json(res, { error: 'Not found' }, 404);
        this.json(res, mem);
    }
    getStats(res) {
        this.json(res, this.engine.getStats());
    }
    /** GET /api/scope — 返回范围元信息：当前工作区、当前会话、所有工作区列表 */
    async getScope(res) {
        const stats = this.engine.getStats();
        const workspaces = await this.listWorkspaces(stats.dbPath);
        this.json(res, {
            currentWorkspace: stats.projectId,
            currentSession: stats.currentSession,
            workspaces,
        });
    }
    /** GET /api/sessions — 返回当前工作区的所有会话 ID 列表 */
    getSessions(res) {
        const sessionIds = this.engine.getSessionIds();
        const currentSession = this.engine.getCurrentSessionId();
        this.json(res, { sessionIds, currentSession, total: sessionIds.length });
    }
    async createMemory(body, res) {
        const content = body.content;
        if (!content)
            return this.json(res, { error: 'content is required' }, 400);
        const mem = await this.engine.remember(content, body.importance ?? 1.0);
        this.json(res, mem, 201);
    }
    updateMemory(id, body, res) {
        const updates = {};
        if (body.content !== undefined)
            updates.content = body.content;
        if (body.importance !== undefined)
            updates.importance = body.importance;
        if (body.type !== undefined)
            updates.type = body.type;
        const ok = this.engine.updateMemory(id, updates);
        if (!ok)
            return this.json(res, { error: 'Not found' }, 404);
        this.json(res, { ok: true });
    }
    pinMemory(id, res) {
        const ok = this.engine.pinMemory(id);
        if (!ok)
            return this.json(res, { error: 'Not found' }, 404);
        this.json(res, { ok: true });
    }
    unpinMemory(id, res) {
        const ok = this.engine.unpinMemory(id);
        if (!ok)
            return this.json(res, { error: 'Not found' }, 404);
        this.json(res, { ok: true });
    }
    deleteMemory(id, res) {
        const ok = this.engine.deleteMemory(id);
        if (!ok)
            return this.json(res, { error: 'Not found' }, 404);
        this.json(res, { ok: true });
    }
    async forgetMemory(body, res) {
        const query = body.query;
        if (!query)
            return this.json(res, { error: 'query is required' }, 400);
        const count = await this.engine.forget(query);
        this.json(res, { deleted: count });
    }
    // ──────────── 标签 API Handlers ────────────
    getAllTags(res) {
        this.json(res, { tags: this.engine.getAllTags() });
    }
    filterByTag(tag, res) {
        if (!tag)
            return this.json(res, { error: 'tag is required' }, 400);
        const memories = this.engine.filterByTag(tag);
        this.json(res, { tag, memories, total: memories.length });
    }
    addTag(memoryId, body, res) {
        const tag = body.tag;
        if (!tag)
            return this.json(res, { error: 'tag is required' }, 400);
        const mem = this.engine.getMemory(memoryId);
        if (!mem)
            return this.json(res, { error: 'Memory not found' }, 404);
        const ok = this.engine.addTag(memoryId, tag);
        this.json(res, { ok, tag: tag.trim().toLowerCase() });
    }
    removeTag(memoryId, body, res) {
        const tag = body.tag;
        if (!tag)
            return this.json(res, { error: 'tag is required' }, 400);
        const ok = this.engine.removeTag(memoryId, tag);
        if (!ok)
            return this.json(res, { error: 'Tag not found' }, 404);
        this.json(res, { ok: true });
    }
    // ──────────── 关系 API Handlers ────────────
    getLinks(memoryId, res) {
        const mem = this.engine.getMemory(memoryId);
        if (!mem)
            return this.json(res, { error: 'Memory not found' }, 404);
        const links = this.engine.getLinksForMemory(memoryId);
        this.json(res, { memoryId, links, total: links.length });
    }
    runMaintenance(res) {
        const result = this.engine.runMaintenanceNow();
        this.json(res, { ok: true, ...result });
    }
    async summarizeMemories(body, res) {
        if (!this.engine.hasSummarizer()) {
            return this.json(res, { error: '摘要功能未启用' }, 400);
        }
        try {
            const maxGroups = body.maxGroups ?? 3;
            const result = await this.engine.summarizeMemories(maxGroups);
            this.json(res, { ok: true, ...result });
        }
        catch (err) {
            this.json(res, { error: err.message }, 500);
        }
    }
    async batchOperation(body, res) {
        const action = body.action;
        const ids = body.ids;
        if (!action || !ids || !Array.isArray(ids) || ids.length === 0) {
            return this.json(res, { error: 'action and ids[] are required' }, 400);
        }
        let affected = 0;
        switch (action) {
            case 'delete':
                for (const id of ids) {
                    if (this.engine.deleteMemory(id))
                        affected++;
                }
                break;
            case 'pin':
                for (const id of ids) {
                    if (this.engine.pinMemory(id))
                        affected++;
                }
                break;
            case 'unpin':
                for (const id of ids) {
                    if (this.engine.unpinMemory(id))
                        affected++;
                }
                break;
            case 'tag': {
                const tag = body.tag;
                if (!tag)
                    return this.json(res, { error: 'tag is required for batch tag operation' }, 400);
                for (const id of ids) {
                    if (this.engine.addTag(id, tag))
                        affected++;
                }
                break;
            }
            default:
                return this.json(res, { error: `Unknown action: ${action}. Use: delete, pin, unpin, tag` }, 400);
        }
        this.json(res, { ok: true, action, affected, total: ids.length });
    }
    getConfig(res) {
        const config = this.engine.getConfig();
        const stats = this.engine.getStats();
        this.json(res, {
            hasSummarizer: this.engine.hasSummarizer(),
            maxActiveMemories: config.maxActiveMemories,
            maxContextTokens: config.maxContextTokens,
            summarizerBackend: config.summarizerBackend,
            embeddingBackend: config.embeddingBackend,
            ...stats,
        });
    }
    getHealth(res) {
        this.json(res, this.engine.getHealthReport());
    }
    exportJsonl(res) {
        const result = this.engine.exportToJsonlString();
        res.writeHead(200, {
            'Content-Type': 'application/x-ndjson; charset=utf-8',
            'Content-Disposition': `attachment; filename="memories_${Date.now()}.jsonl"`,
        });
        res.end(result.content);
    }
    async importJsonl(body, res) {
        const content = body.content;
        if (!content)
            return this.json(res, { error: 'content is required' }, 400);
        const imported = await this.engine.importFromJsonlString(content);
        this.json(res, { ok: true, imported });
    }
    exportMemories(res) {
        const data = this.engine.exportMemoriesData();
        this.json(res, data);
    }
    async importMemories(body, res) {
        const list = body.memories ?? (Array.isArray(body) ? body : null);
        if (!list || !Array.isArray(list)) {
            return this.json(res, { error: 'Request body must contain a "memories" array or be an array' }, 400);
        }
        const imported = await this.engine.importMemoriesData(list);
        this.json(res, { ok: true, imported, total: list.length });
    }
    linkMemories(body, res) {
        const { from_id, to_id, relation_type, note, confidence } = body;
        if (!from_id || !to_id || !relation_type) {
            return this.json(res, { error: 'from_id, to_id, relation_type are required' }, 400);
        }
        const rel = this.engine.linkMemories(from_id, to_id, relation_type, note ?? '', confidence ?? 1.0);
        if (!rel)
            return this.json(res, { error: 'One or both memories not found' }, 404);
        this.json(res, rel, 201);
    }
    unlinkMemories(fromId, body, res) {
        const { to_id, relation_type } = body;
        if (!to_id)
            return this.json(res, { error: 'to_id is required' }, 400);
        const count = this.engine.unlinkMemories(fromId, to_id, relation_type);
        this.json(res, { deleted: count });
    }
    // ──────────── 跨工作区 Helpers ────────────
    /** 列出 dataDir 下所有 projectId（子目录名） */
    async listWorkspaces(currentDbPath) {
        try {
            // dataDir = currentDbPath 的上两级（dbPath = dataDir/projectId/memory.db）
            const projectDir = join(currentDbPath, '..', '..');
            const entries = await readdir(projectDir, { withFileTypes: true });
            return entries
                .filter((e) => e.isDirectory())
                .map((e) => e.name)
                .sort();
        }
        catch {
            return [];
        }
    }
    /**
     * 扫描所有工作区的 db 文件，只读方式合并返回记忆列表。
     * 为每条记忆附加 _workspace 字段以便 UI 区分来源。
     */
    async getAllWorkspacesMemories() {
        const stats = this.engine.getStats();
        const workspaces = await this.listWorkspaces(stats.dbPath);
        // dataDir = dbPath 的上两级
        const dataDir = join(stats.dbPath, '..', '..');
        const dbName = stats.dbPath.split(/[\/\\]/).pop() ?? 'memory.db';
        const allMemories = [];
        for (const ws of workspaces) {
            const dbPath = join(dataDir, ws, dbName);
            if (!existsSync(dbPath))
                continue;
            // 当前工作区直接用已有 engine，避免重复加载 WASM
            if (ws === stats.projectId) {
                const mems = this.engine.getAllMemoriesWithTags().map((m) => ({ ...m, _workspace: ws }));
                allMemories.push(...mems);
                continue;
            }
            // 其他工作区：临时 SqliteStore 只读
            try {
                const tmpStore = new SqliteStore(dbPath);
                try {
                    await tmpStore.init();
                    const mems = tmpStore.getAllActive().map((m) => ({ ...m, _workspace: ws }));
                    allMemories.push(...mems);
                }
                finally {
                    tmpStore.close();
                }
            }
            catch {
                // 忽略加载失败的工作区
            }
        }
        return allMemories;
    }
    // ──────────── Helpers ────────────
    readBody(req) {
        return new Promise((resolve, reject) => {
            let data = '';
            req.on('data', (c) => (data += c));
            req.on('end', () => {
                try {
                    resolve(data ? JSON.parse(data) : {});
                }
                catch {
                    reject(new Error('Invalid JSON'));
                }
            });
            req.on('error', reject);
        });
    }
    json(res, data, status = 200) {
        res.writeHead(status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
    }
    async serveStatic(urlPath, res) {
        let filePath = urlPath === '/' ? '/index.html' : urlPath;
        filePath = filePath.replace(/\.\./g, '');
        const fullPath = join(__dirname, '..', 'web', filePath);
        try {
            const content = await readFile(fullPath);
            const ext = extname(fullPath);
            res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
            res.end(content);
        }
        catch {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Not Found');
        }
    }
}
//# sourceMappingURL=web-server.js.map