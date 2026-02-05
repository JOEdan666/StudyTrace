import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { storage } from './storage.js';
import { summarize, summarizeStream, generateCard, generatePlan } from './llm.js';
import { env } from './config.js';
import { initReviewStatus, calculateNextReview, getDueCards, generateReviewSuggestions, } from './spaced-repetition.js';
const router = Router();
// Helper: create text hash (simple)
function simpleHash(text) {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
        const char = text.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
}
// ============ P0: /v1/ingest ============
router.post('/ingest', async (req, res) => {
    try {
        const body = req.body;
        if (!body.url || !body.title || !body.text) {
            res.status(400).json({ error: 'bad_request', message: 'Missing required fields' });
            return;
        }
        const truncatedText = body.text.slice(0, env.MAX_INPUT_CHARS);
        const textHash = simpleHash(truncatedText);
        const domain = body.domain || new URL(body.url).hostname;
        // 1. URL 去重检测
        const existingByUrl = await storage.getRecordByUrl(body.url);
        if (existingByUrl) {
            // 检查内容是否有变化
            if (existingByUrl.textHash === textHash) {
                // 内容完全相同，返回已有记录
                res.json({
                    recordId: existingByUrl.id,
                    duplicate: true,
                    message: '该页面已抓取，内容无变化'
                });
                return;
            }
            // 内容有更新，执行增量更新
            await storage.updateRecord(existingByUrl.id, {
                textHash,
                textPreview: truncatedText.slice(0, 500),
                status: 'updated',
            });
            // 更新 fullText（需要扩展 updateRecord）
            await storage.updateRecordFullText(existingByUrl.id, truncatedText);
            res.json({
                recordId: existingByUrl.id,
                updated: true,
                message: '页面内容已更新'
            });
            return;
        }
        // 2. 内容哈希去重（相同内容不同 URL）
        const existingByHash = await storage.getRecordByHash(textHash);
        if (existingByHash) {
            res.json({
                recordId: existingByHash.id,
                duplicate: true,
                similarUrl: existingByHash.source.url,
                message: '检测到相似内容已存在'
            });
            return;
        }
        // 3. 新建记录
        const recordId = `rec_${uuidv4().slice(0, 8)}`;
        const record = {
            id: recordId,
            source: {
                url: body.url,
                title: body.title,
                domain,
            },
            capturedAt: new Date().toISOString(),
            textHash,
            textPreview: truncatedText.slice(0, 500),
            fullText: truncatedText,
            status: 'created',
        };
        await storage.addRecord(record);
        const response = { recordId };
        res.json(response);
    }
    catch (err) {
        console.error('Ingest error:', err);
        res.status(500).json({ error: 'internal_error', message: 'Failed to ingest' });
    }
});
// ============ P0: /v1/summarize ============
router.post('/summarize', async (req, res) => {
    try {
        const body = req.body;
        let title;
        let url;
        let text;
        let recordId;
        if ('recordId' in body && body.recordId) {
            // Summarize by recordId
            recordId = body.recordId;
            const record = await storage.getRecordById(recordId);
            if (!record) {
                res.status(404).json({ error: 'not_found', message: 'Record not found' });
                return;
            }
            title = record.source.title;
            url = record.source.url;
            text = record.fullText || record.textPreview || '';
        }
        else if ('text' in body && body.text) {
            // Summarize directly
            title = body.title || 'Untitled';
            url = body.url || '';
            text = body.text;
        }
        else {
            res.status(400).json({ error: 'bad_request', message: 'Missing recordId or text' });
            return;
        }
        const result = await summarize(title, url, text);
        // Update record if exists
        if (recordId) {
            await storage.updateRecord(recordId, {
                summary: result.summary,
                keyPoints: result.keyPoints,
                tags: result.tags,
                status: 'summarized',
            });
        }
        const response = result;
        res.json(response);
    }
    catch (err) {
        console.error('Summarize error:', err);
        res.status(500).json({ error: 'internal_error', message: 'Failed to summarize' });
    }
});
// ============ P0: /v1/summarize/stream (SSE 流式输出) ============
router.post('/summarize/stream', async (req, res) => {
    try {
        const body = req.body;
        let title;
        let url;
        let text;
        let recordId;
        if ('recordId' in body && body.recordId) {
            recordId = body.recordId;
            const record = await storage.getRecordById(recordId);
            if (!record) {
                res.status(404).json({ error: 'not_found', message: 'Record not found' });
                return;
            }
            title = record.source.title;
            url = record.source.url;
            text = record.fullText || record.textPreview || '';
        }
        else if ('text' in body && body.text) {
            title = body.title || 'Untitled';
            url = body.url || '';
            text = body.text;
        }
        else {
            res.status(400).json({ error: 'bad_request', message: 'Missing recordId or text' });
            return;
        }
        // 设置 SSE 响应头
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('Access-Control-Allow-Origin', '*');
        let fullContent = '';
        for await (const event of summarizeStream(title, url, text)) {
            if (event.type === 'chunk') {
                fullContent += event.data;
                res.write(`data: ${JSON.stringify({ type: 'chunk', content: event.data })}\n\n`);
            }
            else if (event.type === 'done') {
                // 解析并更新记录
                try {
                    const parsed = JSON.parse(event.data);
                    if (recordId) {
                        await storage.updateRecord(recordId, {
                            summary: parsed.summary,
                            keyPoints: parsed.keyPoints,
                            tags: parsed.tags,
                            status: 'summarized',
                        });
                    }
                    res.write(`data: ${JSON.stringify({ type: 'done', result: parsed })}\n\n`);
                }
                catch {
                    res.write(`data: ${JSON.stringify({ type: 'done', content: event.data })}\n\n`);
                }
            }
            else if (event.type === 'error') {
                res.write(`data: ${JSON.stringify({ type: 'error', message: event.data })}\n\n`);
            }
        }
        res.write('data: [DONE]\n\n');
        res.end();
    }
    catch (err) {
        console.error('Stream error:', err);
        res.status(500).json({ error: 'internal_error', message: 'Failed to stream' });
    }
});
// ============ P0: /v1/records ============
router.get('/records', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        const records = await storage.getRecords(limit);
        const response = { records };
        res.json(response);
    }
    catch (err) {
        console.error('Records error:', err);
        res.status(500).json({ error: 'internal_error', message: 'Failed to get records' });
    }
});
// ============ P1: /v1/cards (POST) ============
router.post('/cards', async (req, res) => {
    try {
        const body = req.body;
        if (!body.recordId) {
            res.status(400).json({ error: 'bad_request', message: 'Missing recordId' });
            return;
        }
        const record = await storage.getRecordById(body.recordId);
        if (!record) {
            res.status(404).json({ error: 'not_found', message: 'Record not found' });
            return;
        }
        const text = record.fullText || record.textPreview || '';
        const cardContent = await generateCard(record.source.title, record.summary || '', text);
        const card = {
            id: `card_${uuidv4().slice(0, 8)}`,
            recordId: body.recordId,
            ...cardContent,
            createdAt: new Date().toISOString(),
            reviewStatus: initReviewStatus(), // 初始化遗忘曲线追踪
        };
        await storage.addCard(card);
        const response = { card };
        res.json(response);
    }
    catch (err) {
        console.error('Create card error:', err);
        res.status(500).json({ error: 'internal_error', message: 'Failed to create card' });
    }
});
// ============ P1: /v1/cards (GET) ============
router.get('/cards', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        const cards = await storage.getCards(limit);
        const response = { cards };
        res.json(response);
    }
    catch (err) {
        console.error('Cards error:', err);
        res.status(500).json({ error: 'internal_error', message: 'Failed to get cards' });
    }
});
// ============ P1: /v1/cards/:id (GET 单个卡片) ============
router.get('/cards/:id', async (req, res) => {
    try {
        const card = await storage.getCardById(req.params.id);
        if (!card) {
            res.status(404).json({ error: 'not_found', message: 'Card not found' });
            return;
        }
        res.json({ card });
    }
    catch (err) {
        console.error('Get card error:', err);
        res.status(500).json({ error: 'internal_error', message: 'Failed to get card' });
    }
});
// ============ P1: /v1/cards/:id (PUT 编辑卡片) ============
router.put('/cards/:id', async (req, res) => {
    try {
        const updates = req.body;
        const card = await storage.updateCard(req.params.id, updates);
        if (!card) {
            res.status(404).json({ error: 'not_found', message: 'Card not found' });
            return;
        }
        res.json({ card });
    }
    catch (err) {
        console.error('Update card error:', err);
        res.status(500).json({ error: 'internal_error', message: 'Failed to update card' });
    }
});
// ============ P1: /v1/cards/:id (DELETE 删除卡片) ============
router.delete('/cards/:id', async (req, res) => {
    try {
        const deleted = await storage.deleteCard(req.params.id);
        if (!deleted) {
            res.status(404).json({ error: 'not_found', message: 'Card not found' });
            return;
        }
        res.json({ success: true });
    }
    catch (err) {
        console.error('Delete card error:', err);
        res.status(500).json({ error: 'internal_error', message: 'Failed to delete card' });
    }
});
// ============ P1: /v1/cards/:id/related (GET 关联推荐) ============
router.get('/cards/:id/related', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 5;
        const relatedCards = await storage.getRelatedCards(req.params.id, limit);
        res.json({ cards: relatedCards });
    }
    catch (err) {
        console.error('Related cards error:', err);
        res.status(500).json({ error: 'internal_error', message: 'Failed to get related cards' });
    }
});
// ============ 遗忘曲线复习系统 ============
// POST /v1/cards/:id/review - 记录复习结果
router.post('/cards/:id/review', async (req, res) => {
    try {
        const { quality } = req.body;
        if (quality === undefined || quality < 0 || quality > 5) {
            res.status(400).json({
                error: 'bad_request',
                message: 'Quality must be between 0-5 (0=forgot, 5=perfect)',
            });
            return;
        }
        const card = await storage.getCardById(req.params.id);
        if (!card) {
            res.status(404).json({ error: 'not_found', message: 'Card not found' });
            return;
        }
        // 计算新的复习状态
        const currentStatus = card.reviewStatus || initReviewStatus();
        const newStatus = calculateNextReview(currentStatus, quality);
        // 更新卡片
        const updated = await storage.updateCard(req.params.id, {
            reviewStatus: newStatus,
        });
        res.json({
            card: updated,
            nextReview: newStatus.nextReviewAt,
            interval: newStatus.interval,
            message: quality >= 3
                ? `下次复习: ${newStatus.interval}天后`
                : '需要重新学习，明天再复习',
        });
    }
    catch (err) {
        console.error('Review card error:', err);
        res.status(500).json({ error: 'internal_error', message: 'Failed to record review' });
    }
});
// GET /v1/review/due - 获取今日待复习卡片
router.get('/review/due', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        const allCards = await storage.getCards(1000); // 获取所有卡片
        const dueCards = getDueCards(allCards).slice(0, limit);
        res.json({
            count: dueCards.length,
            cards: dueCards,
        });
    }
    catch (err) {
        console.error('Due cards error:', err);
        res.status(500).json({ error: 'internal_error', message: 'Failed to get due cards' });
    }
});
// GET /v1/review/suggestions - 获取智能复习建议
router.get('/review/suggestions', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const allCards = await storage.getCards(1000);
        const suggestions = generateReviewSuggestions(allCards, limit);
        // 统计
        const stats = {
            total: allCards.length,
            overdue: suggestions.filter((s) => s.urgency === 'overdue').length,
            dueToday: suggestions.filter((s) => s.urgency === 'due_today').length,
            newCards: suggestions.filter((s) => s.urgency === 'new').length,
        };
        res.json({
            suggestions,
            stats,
            message: stats.overdue > 0
                ? `有 ${stats.overdue} 张卡片已逾期，建议优先复习`
                : stats.dueToday > 0
                    ? `今日需复习 ${stats.dueToday} 张卡片`
                    : '暂无紧急复习任务',
        });
    }
    catch (err) {
        console.error('Review suggestions error:', err);
        res.status(500).json({ error: 'internal_error', message: 'Failed to get suggestions' });
    }
});
// POST /v1/plans/generate/smart - 智能生成复盘计划（基于遗忘曲线）
router.post('/plans/generate/smart', async (req, res) => {
    try {
        const { date } = req.body;
        const targetDate = date || new Date().toISOString().split('T')[0];
        // 获取所有卡片的复习建议
        const allCards = await storage.getCards(1000);
        const suggestions = generateReviewSuggestions(allCards, 20);
        // 筛选需要复习的（overdue + due_today + new）
        const toReview = suggestions.filter((s) => s.urgency === 'overdue' || s.urgency === 'due_today' || s.urgency === 'new');
        // 获取关联的记录信息
        const recordPromises = toReview.map(async (s) => {
            const card = await storage.getCardById(s.cardId);
            if (!card)
                return null;
            const record = await storage.getRecordById(card.recordId);
            return record ? { ...s, record } : null;
        });
        const reviewItems = (await Promise.all(recordPromises)).filter(Boolean);
        // 生成计划
        const plan = {
            id: `plan_${uuidv4().slice(0, 8)}`,
            date: targetDate,
            items: reviewItems.slice(0, 10).map((item) => ({
                title: item.title,
                action: item.urgency === 'overdue'
                    ? '紧急复习：回看卡片 + 完成自测题'
                    : item.urgency === 'new'
                        ? '首次复习：阅读卡片 + 理解要点'
                        : '常规复习：快速回顾 + 自测验证',
                reason: item.message,
                recordId: item.record?.id,
                cardId: item.cardId,
            })),
            createdAt: new Date().toISOString(),
        };
        await storage.addPlan(plan);
        res.json({
            plan,
            stats: {
                overdue: toReview.filter((s) => s.urgency === 'overdue').length,
                dueToday: toReview.filter((s) => s.urgency === 'due_today').length,
                newCards: toReview.filter((s) => s.urgency === 'new').length,
            },
        });
    }
    catch (err) {
        console.error('Smart plan error:', err);
        res.status(500).json({ error: 'internal_error', message: 'Failed to generate smart plan' });
    }
});
// ============ P1: /v1/plans/generate ============
router.post('/plans/generate', async (req, res) => {
    try {
        const body = req.body;
        if (!body.date || !body.recentRecordIds) {
            res.status(400).json({ error: 'bad_request', message: 'Missing date or recentRecordIds' });
            return;
        }
        // Get records for plan generation
        const recordPromises = body.recentRecordIds.map((id) => storage.getRecordById(id));
        const recordResults = await Promise.all(recordPromises);
        const records = recordResults
            .filter((r) => r !== undefined)
            .map((r) => ({
            id: r.id,
            title: r.source.title,
            summary: r.summary || '',
            tags: r.tags || [],
        }));
        if (records.length === 0) {
            res.status(400).json({ error: 'bad_request', message: 'No valid records found' });
            return;
        }
        const planContent = await generatePlan(body.date, records);
        const plan = {
            id: `plan_${uuidv4().slice(0, 8)}`,
            date: body.date,
            items: planContent.items,
            createdAt: new Date().toISOString(),
        };
        await storage.addPlan(plan);
        const response = { plan };
        res.json(response);
    }
    catch (err) {
        console.error('Generate plan error:', err);
        res.status(500).json({ error: 'internal_error', message: 'Failed to generate plan' });
    }
});
// ============ P2: /v1/memory/hints (GET) ============
router.get('/memory/hints', async (req, res) => {
    try {
        const url = req.query.url;
        if (!url) {
            res.status(400).json({ error: 'bad_request', message: 'Missing url parameter' });
            return;
        }
        const related = await storage.getRelatedRecords(url, 5);
        res.json({
            related,
            suggestedActions: related.length > 0 ? ['回顾之前的学习记录', '做一下自测题'] : [],
        });
    }
    catch (err) {
        console.error('Memory hints error:', err);
        res.status(500).json({ error: 'internal_error', message: 'Failed to get hints' });
    }
});
export default router;
