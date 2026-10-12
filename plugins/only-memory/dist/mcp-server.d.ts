/**
 * MCP 记忆服务器
 *
 * 将 MemoryEngine 包装为 MCP stdio 服务器，
 * 供 DeepSeek Harness 通过 dsh-mcp-client 调用。
 *
 * 启动方式：
 *   node bin/only-memory.mjs
 *
 * Harness 配置 (cordis-patch.yml)：
 *   - insert:
 *       - id: memory-deepseek
 *         name: '@deepseek-ai/dsh-mcp-client'
 *         config:
 *           serverName: only_memory
 *           transport: stdio
 *           command: node
 *           args: [/absolute/path/to/bin/only-memory.mjs]
 */
import { MemoryEngine } from './engine.js';
import type { MemoryPluginConfig } from './config.js';
export declare function startMcpServer(configOverrides?: Partial<MemoryPluginConfig>, externalEngine?: MemoryEngine, webUrl?: string): Promise<void>;
//# sourceMappingURL=mcp-server.d.ts.map