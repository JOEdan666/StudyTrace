import OpenAI from 'openai';
import { env, LLM_BASE_URLS } from './config.js';
// Initialize OpenAI client (compatible with DeepSeek/Moonshot)
const openai = new OpenAI({
    apiKey: env.LLM_API_KEY,
    baseURL: LLM_BASE_URLS[env.LLM_PROVIDER] || LLM_BASE_URLS.openai,
    timeout: env.REQUEST_TIMEOUT_MS,
});
const SUMMARIZE_SYSTEM_PROMPT = `你是"学习复盘助手"，帮助用户整理网页学习内容。
输出必须是有效的 JSON 格式，便于后续处理。
输出应该能用于复习，不要胡编。`;
const SUMMARIZE_USER_TEMPLATE = (title, url, text) => `
请对以下网页内容生成结构化总结。

网页标题: ${title}
网页链接: ${url}

网页内容:
${text}

请输出 JSON 格式（不要包含 markdown 代码块标记）:
{
  "summary": "一句话总结（30-50字）",
  "keyPoints": ["要点1", "要点2", "要点3"],
  "tags": ["标签1", "标签2"]
}

要求:
- summary: 一句话概括核心内容
- keyPoints: 3-7条关键要点，每条简洁明了
- tags: 1-3个主题标签
`;
export async function summarize(title, url, text) {
    // Truncate text if too long
    const truncatedText = text.slice(0, env.MAX_INPUT_CHARS);
    try {
        const response = await openai.chat.completions.create({
            model: env.LLM_MODEL,
            messages: [
                { role: 'system', content: SUMMARIZE_SYSTEM_PROMPT },
                { role: 'user', content: SUMMARIZE_USER_TEMPLATE(title, url, truncatedText) },
            ],
            temperature: 0.3,
        });
        const content = response.choices[0]?.message?.content || '';
        const parsed = JSON.parse(content);
        return {
            summary: parsed.summary || '无法生成总结',
            keyPoints: parsed.keyPoints || [],
            tags: parsed.tags || [],
        };
    }
    catch (err) {
        console.error('LLM summarize failed:', err);
        // Fallback: return truncated text as summary
        return {
            summary: truncatedText.slice(0, 400) + '...（LLM unavailable）',
            keyPoints: [],
            tags: [],
        };
    }
}
// ============ Summarize Stream (SSE) ============
export async function* summarizeStream(title, url, text) {
    const truncatedText = text.slice(0, env.MAX_INPUT_CHARS);
    try {
        const stream = await openai.chat.completions.create({
            model: env.LLM_MODEL,
            messages: [
                { role: 'system', content: SUMMARIZE_SYSTEM_PROMPT },
                { role: 'user', content: SUMMARIZE_USER_TEMPLATE(title, url, truncatedText) },
            ],
            temperature: 0.3,
            stream: true,
        });
        let fullContent = '';
        for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
                fullContent += content;
                yield { type: 'chunk', data: content };
            }
        }
        // 最后解析完整 JSON 返回结构化数据
        try {
            const parsed = JSON.parse(fullContent);
            yield { type: 'done', data: JSON.stringify(parsed) };
        }
        catch {
            yield { type: 'done', data: fullContent };
        }
    }
    catch (err) {
        console.error('LLM stream failed:', err);
        yield { type: 'error', data: err instanceof Error ? err.message : 'Stream failed' };
    }
}
const CARD_SYSTEM_PROMPT = `你是"知识卡片生成器"，帮助用户把学习内容转化为可复习的知识卡片。
输出必须是有效的 JSON 格式。
内容应结构化、具体，避免空泛。`;
const CARD_USER_TEMPLATE = (title, summary, text) => `
请基于以下学习记录生成知识卡片。

标题: ${title}
摘要: ${summary}

原文内容:
${text}

请输出 JSON 格式（不要包含 markdown 代码块标记）:
{
  "title": "卡片标题",
  "summary": "一句话核心总结",
  "keyPoints": ["要点1", "要点2", "要点3"],
  "terms": [
    {"term": "术语1", "definition": "定义1"},
    {"term": "术语2", "definition": "定义2"}
  ],
  "misconceptions": ["常见误区1", "常见误区2"],
  "selfQuiz": [
    {"q": "问题1", "a": "答案1", "explain": "解释1"},
    {"q": "问题2", "a": "答案2", "explain": "解释2"}
  ]
}

要求:
- terms: 2-5个关键术语及其定义
- misconceptions: 1-3个常见误区或易错点
- selfQuiz: 2-4道自测题，帮助巩固理解
`;
export async function generateCard(title, summary, text) {
    const truncatedText = text.slice(0, env.MAX_INPUT_CHARS);
    try {
        const response = await openai.chat.completions.create({
            model: env.LLM_MODEL,
            messages: [
                { role: 'system', content: CARD_SYSTEM_PROMPT },
                { role: 'user', content: CARD_USER_TEMPLATE(title, summary, truncatedText) },
            ],
            temperature: 0.3,
        });
        const content = response.choices[0]?.message?.content || '';
        return JSON.parse(content);
    }
    catch (err) {
        console.error('LLM generateCard failed:', err);
        // Fallback
        return {
            title,
            summary: summary || '无法生成卡片',
            keyPoints: [],
            terms: [],
            misconceptions: [],
            selfQuiz: [],
        };
    }
}
const PLAN_SYSTEM_PROMPT = `你是"复盘计划生成器"，帮助用户规划学习复习任务。
输出必须是有效的 JSON 格式。
任务应具体可执行。`;
const PLAN_USER_TEMPLATE = (date, records) => `
请基于用户最近的学习记录，生成明日（${date}）的复盘计划。

最近学习记录:
${records.map((r, i) => `${i + 1}. [${r.id}] ${r.title}\n   摘要: ${r.summary}\n   标签: ${r.tags.join(', ')}`).join('\n\n')}

请输出 JSON 格式（不要包含 markdown 代码块标记）:
{
  "items": [
    {"title": "任务标题", "action": "具体行动", "reason": "为什么要做", "recordId": "rec_xxx"},
    ...
  ]
}

要求:
- 生成 3-5 个具体可执行的复习任务
- 每个任务应该关联到具体的学习记录
- action 应该具体，如"回看卡片+做2题自测"
`;
export async function generatePlan(date, records) {
    try {
        const response = await openai.chat.completions.create({
            model: env.LLM_MODEL,
            messages: [
                { role: 'system', content: PLAN_SYSTEM_PROMPT },
                { role: 'user', content: PLAN_USER_TEMPLATE(date, records) },
            ],
            temperature: 0.5,
        });
        const content = response.choices[0]?.message?.content || '';
        return JSON.parse(content);
    }
    catch (err) {
        console.error('LLM generatePlan failed:', err);
        return { items: [] };
    }
}
