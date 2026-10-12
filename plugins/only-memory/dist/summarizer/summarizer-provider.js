/**
 * LLM 摘要提供者
 *
 * 调用 LLM 将多条记忆压缩为精炼摘要，减少上下文占用。
 * 支持 OpenAI、DashScope、DeepSeek 三种后端，使用各自的 Chat Completions API。
 *
 * 默认 summarizerBackend='none'，不启用摘要功能。
 */
async function chatComplete(config, systemPrompt, userPrompt) {
    try {
        const res = await fetch(`${config.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.apiKey}`,
            },
            body: JSON.stringify({
                model: config.model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt },
                ],
                temperature: 0.3,
                max_tokens: 512,
            }),
        });
        if (!res.ok) {
            console.error(`[OnlyMemory] LLM API error: ${res.status} ${res.statusText}`);
            return null;
        }
        const data = (await res.json());
        return data.choices?.[0]?.message?.content?.trim() ?? null;
    }
    catch (err) {
        console.error('[OnlyMemory] LLM summarize failed:', err.message);
        return null;
    }
}
// ================================================================ //
// OpenAI
// ================================================================ //
class OpenAISummarizer {
    config;
    constructor(apiKey, model = 'gpt-4o-mini', baseUrl) {
        this.config = {
            baseUrl: baseUrl ?? 'https://api.openai.com/v1',
            apiKey,
            model,
        };
    }
    async summarize(texts) {
        const prompt = buildSummarizePrompt(texts);
        return chatComplete(this.config, SYSTEM_PROMPT, prompt);
    }
}
// ================================================================ //
// DashScope (阿里云通义)
// ================================================================ //
class DashScopeSummarizer {
    config;
    constructor(apiKey, model = 'qwen-turbo') {
        this.config = {
            baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
            apiKey,
            model,
        };
    }
    async summarize(texts) {
        const prompt = buildSummarizePrompt(texts);
        return chatComplete(this.config, SYSTEM_PROMPT, prompt);
    }
}
// ================================================================ //
// DeepSeek
// ================================================================ //
class DeepSeekSummarizer {
    config;
    constructor(apiKey, model = 'deepseek-chat') {
        this.config = {
            baseUrl: 'https://api.deepseek.com/v1',
            apiKey,
            model,
        };
    }
    async summarize(texts) {
        const prompt = buildSummarizePrompt(texts);
        return chatComplete(this.config, SYSTEM_PROMPT, prompt);
    }
}
// ================================================================ //
// 工厂函数
// ================================================================ //
/**
 * 根据配置创建摘要提供者
 *
 * @returns SummarizerProvider 实例，或 null（当 backend='none' 或未配置 API Key 时）
 */
export function createSummarizerProvider(config) {
    const backend = config.summarizerBackend;
    if (backend === 'none')
        return null;
    if (backend === 'openai') {
        const key = process.env.OPENAI_API_KEY;
        if (!key) {
            console.warn('[OnlyMemory] summarizerBackend=openai 但未设置 OPENAI_API_KEY，摘要功能已禁用');
            return null;
        }
        const baseUrl = process.env.OPENAI_BASE_URL;
        const model = process.env.OPENAI_SUMMARIZE_MODEL ?? 'gpt-4o-mini';
        return new OpenAISummarizer(key, model, baseUrl);
    }
    if (backend === 'dashscope') {
        const key = process.env.DASHSCOPE_API_KEY;
        if (!key) {
            console.warn('[OnlyMemory] summarizerBackend=dashscope 但未设置 DASHSCOPE_API_KEY，摘要功能已禁用');
            return null;
        }
        const model = process.env.DASHSCOPE_SUMMARIZE_MODEL ?? 'qwen-turbo';
        return new DashScopeSummarizer(key, model);
    }
    if (backend === 'deepseek') {
        const key = process.env.DEEPSEEK_API_KEY;
        if (!key) {
            console.warn('[OnlyMemory] summarizerBackend=deepseek 但未设置 DEEPSEEK_API_KEY，摘要功能已禁用');
            return null;
        }
        const model = process.env.DEEPSEEK_SUMMARIZE_MODEL ?? 'deepseek-chat';
        return new DeepSeekSummarizer(key, model);
    }
    return null;
}
// ================================================================ //
// 内部工具
// ================================================================ //
const SYSTEM_PROMPT = '你是一个记忆摘要助手。你的任务是将多条零碎的记忆压缩为一条精炼的摘要。\n' +
    '要求：\n' +
    '1. 保留所有关键事实和数据\n' +
    '2. 去除重复和冗余信息\n' +
    '3. 用简洁自然的语言输出\n' +
    '4. 直接输出摘要内容，不要加任何前缀或解释\n' +
    '5. 如果记忆之间有关联，请体现逻辑关系';
function buildSummarizePrompt(texts) {
    const numbered = texts.map((t, i) => `${i + 1}. ${t}`).join('\n');
    return `请将以下 ${texts.length} 条记忆压缩为一条精炼摘要：\n\n${numbered}`;
}
//# sourceMappingURL=summarizer-provider.js.map