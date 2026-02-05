import { readFileSync, writeFileSync, existsSync } from 'fs';
import { PrismaClient } from '@prisma/client';
import { env } from './config.js';
// Prisma client (lazy init)
let prisma = null;
function getPrisma() {
    if (!prisma) {
        prisma = new PrismaClient();
    }
    return prisma;
}
// ============ Type converters ============
function dbRecordToRecord(db) {
    return {
        id: db.id,
        source: {
            url: db.url,
            title: db.title,
            domain: db.domain,
        },
        capturedAt: db.capturedAt.toISOString(),
        textHash: db.textHash ?? undefined,
        textPreview: db.textPreview ?? undefined,
        summary: db.summary ?? undefined,
        keyPoints: db.keyPoints ?? [],
        tags: db.tags ?? [],
        status: db.status,
    };
}
function dbCardToCard(db) {
    return {
        id: db.id,
        recordId: db.recordId,
        title: db.title,
        summary: db.summary,
        keyPoints: db.keyPoints ?? [],
        terms: db.terms ?? [],
        misconceptions: db.misconceptions ?? [],
        selfQuiz: db.selfQuiz ?? [],
        createdAt: db.createdAt.toISOString(),
        reviewStatus: db.reviewStatus ?? undefined,
    };
}
function dbPlanToPlan(db) {
    return {
        id: db.id,
        date: db.date,
        items: db.items ?? [],
        createdAt: db.createdAt.toISOString(),
    };
}
const defaultData = {
    records: [],
    cards: [],
    plans: [],
};
let memoryData = { ...defaultData, records: [], cards: [], plans: [] };
function loadFromFile() {
    if (!existsSync(env.DATA_PATH)) {
        return { ...defaultData, records: [], cards: [], plans: [] };
    }
    try {
        const raw = readFileSync(env.DATA_PATH, 'utf-8');
        return JSON.parse(raw);
    }
    catch {
        console.warn('Failed to load data file, using default');
        return { ...defaultData, records: [], cards: [], plans: [] };
    }
}
function saveToFile(data) {
    try {
        writeFileSync(env.DATA_PATH, JSON.stringify(data, null, 2), 'utf-8');
    }
    catch (err) {
        console.error('Failed to save data file:', err);
    }
}
// ============ Storage interface ============
export const storage = {
    // ============ Records ============
    async getRecords(limit) {
        if (env.STORAGE_MODE === 'postgres') {
            const db = getPrisma();
            const records = await db.learningRecord.findMany({
                orderBy: { capturedAt: 'desc' },
                take: limit ?? 100,
            });
            return records.map(dbRecordToRecord);
        }
        const data = env.STORAGE_MODE === 'json' ? loadFromFile() : memoryData;
        const sorted = [...data.records].sort((a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime());
        return limit ? sorted.slice(0, limit) : sorted;
    },
    async getRecordById(id) {
        if (env.STORAGE_MODE === 'postgres') {
            const db = getPrisma();
            const record = await db.learningRecord.findUnique({ where: { id } });
            if (!record)
                return undefined;
            return { ...dbRecordToRecord(record), fullText: record.fullText ?? undefined };
        }
        const data = env.STORAGE_MODE === 'json' ? loadFromFile() : memoryData;
        return data.records.find((r) => r.id === id);
    },
    // 根据 URL 查找记录（用于去重）
    async getRecordByUrl(url) {
        if (env.STORAGE_MODE === 'postgres') {
            const db = getPrisma();
            const record = await db.learningRecord.findFirst({ where: { url } });
            if (!record)
                return undefined;
            return { ...dbRecordToRecord(record), fullText: record.fullText ?? undefined };
        }
        const data = env.STORAGE_MODE === 'json' ? loadFromFile() : memoryData;
        return data.records.find((r) => r.source.url === url);
    },
    // 根据内容哈希查找记录（用于内容去重）
    async getRecordByHash(textHash) {
        if (env.STORAGE_MODE === 'postgres') {
            const db = getPrisma();
            const record = await db.learningRecord.findFirst({ where: { textHash } });
            if (!record)
                return undefined;
            return { ...dbRecordToRecord(record), fullText: record.fullText ?? undefined };
        }
        const data = env.STORAGE_MODE === 'json' ? loadFromFile() : memoryData;
        return data.records.find((r) => r.textHash === textHash);
    },
    async addRecord(record) {
        if (env.STORAGE_MODE === 'postgres') {
            const db = getPrisma();
            await db.learningRecord.create({
                data: {
                    id: record.id,
                    url: record.source.url,
                    title: record.source.title,
                    domain: record.source.domain,
                    capturedAt: new Date(record.capturedAt),
                    textHash: record.textHash,
                    textPreview: record.textPreview,
                    fullText: record.fullText,
                    summary: record.summary,
                    keyPoints: record.keyPoints ?? [],
                    tags: record.tags ?? [],
                    status: record.status,
                },
            });
            return;
        }
        if (env.STORAGE_MODE === 'json') {
            const data = loadFromFile();
            data.records.push(record);
            saveToFile(data);
        }
        else {
            memoryData.records.push(record);
        }
    },
    async updateRecord(id, updates) {
        if (env.STORAGE_MODE === 'postgres') {
            const db = getPrisma();
            const updated = await db.learningRecord.update({
                where: { id },
                data: {
                    summary: updates.summary,
                    keyPoints: updates.keyPoints,
                    tags: updates.tags,
                    status: updates.status,
                    textHash: updates.textHash,
                    textPreview: updates.textPreview,
                },
            });
            return dbRecordToRecord(updated);
        }
        if (env.STORAGE_MODE === 'json') {
            const data = loadFromFile();
            const idx = data.records.findIndex((r) => r.id === id);
            if (idx === -1)
                return undefined;
            data.records[idx] = { ...data.records[idx], ...updates };
            saveToFile(data);
            return data.records[idx];
        }
        else {
            const idx = memoryData.records.findIndex((r) => r.id === id);
            if (idx === -1)
                return undefined;
            memoryData.records[idx] = { ...memoryData.records[idx], ...updates };
            return memoryData.records[idx];
        }
    },
    // 更新记录的全文内容（增量更新用）
    async updateRecordFullText(id, fullText) {
        if (env.STORAGE_MODE === 'postgres') {
            const db = getPrisma();
            await db.learningRecord.update({
                where: { id },
                data: { fullText },
            });
            return;
        }
        if (env.STORAGE_MODE === 'json') {
            const data = loadFromFile();
            const idx = data.records.findIndex((r) => r.id === id);
            if (idx !== -1) {
                data.records[idx].fullText = fullText;
                saveToFile(data);
            }
        }
        else {
            const idx = memoryData.records.findIndex((r) => r.id === id);
            if (idx !== -1) {
                memoryData.records[idx].fullText = fullText;
            }
        }
    },
    // ============ Cards ============
    async getCards(limit) {
        if (env.STORAGE_MODE === 'postgres') {
            const db = getPrisma();
            const cards = await db.knowledgeCard.findMany({
                orderBy: { createdAt: 'desc' },
                take: limit ?? 100,
            });
            return cards.map(dbCardToCard);
        }
        const data = env.STORAGE_MODE === 'json' ? loadFromFile() : memoryData;
        const sorted = [...data.cards].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        return limit ? sorted.slice(0, limit) : sorted;
    },
    async getCardById(id) {
        if (env.STORAGE_MODE === 'postgres') {
            const db = getPrisma();
            const card = await db.knowledgeCard.findUnique({ where: { id } });
            if (!card)
                return undefined;
            return dbCardToCard(card);
        }
        const data = env.STORAGE_MODE === 'json' ? loadFromFile() : memoryData;
        return data.cards.find((c) => c.id === id);
    },
    async addCard(card) {
        if (env.STORAGE_MODE === 'postgres') {
            const db = getPrisma();
            await db.knowledgeCard.create({
                data: {
                    id: card.id,
                    recordId: card.recordId,
                    title: card.title,
                    summary: card.summary,
                    keyPoints: card.keyPoints,
                    terms: card.terms,
                    misconceptions: card.misconceptions,
                    selfQuiz: card.selfQuiz,
                    createdAt: new Date(card.createdAt),
                },
            });
            return;
        }
        if (env.STORAGE_MODE === 'json') {
            const data = loadFromFile();
            data.cards.push(card);
            saveToFile(data);
        }
        else {
            memoryData.cards.push(card);
        }
    },
    // 更新卡片
    async updateCard(id, updates) {
        if (env.STORAGE_MODE === 'postgres') {
            const db = getPrisma();
            const updated = await db.knowledgeCard.update({
                where: { id },
                data: {
                    title: updates.title,
                    summary: updates.summary,
                    keyPoints: updates.keyPoints,
                    terms: updates.terms,
                    misconceptions: updates.misconceptions,
                    selfQuiz: updates.selfQuiz,
                },
            });
            return dbCardToCard(updated);
        }
        if (env.STORAGE_MODE === 'json') {
            const data = loadFromFile();
            const idx = data.cards.findIndex((c) => c.id === id);
            if (idx === -1)
                return undefined;
            data.cards[idx] = { ...data.cards[idx], ...updates };
            saveToFile(data);
            return data.cards[idx];
        }
        else {
            const idx = memoryData.cards.findIndex((c) => c.id === id);
            if (idx === -1)
                return undefined;
            memoryData.cards[idx] = { ...memoryData.cards[idx], ...updates };
            return memoryData.cards[idx];
        }
    },
    // 删除卡片
    async deleteCard(id) {
        if (env.STORAGE_MODE === 'postgres') {
            const db = getPrisma();
            await db.knowledgeCard.delete({ where: { id } });
            return true;
        }
        if (env.STORAGE_MODE === 'json') {
            const data = loadFromFile();
            const idx = data.cards.findIndex((c) => c.id === id);
            if (idx === -1)
                return false;
            data.cards.splice(idx, 1);
            saveToFile(data);
            return true;
        }
        else {
            const idx = memoryData.cards.findIndex((c) => c.id === id);
            if (idx === -1)
                return false;
            memoryData.cards.splice(idx, 1);
            return true;
        }
    },
    // 基于标签获取相关卡片
    async getRelatedCards(cardId, limit = 5) {
        const card = await this.getCardById(cardId);
        if (!card)
            return [];
        // 获取关联的记录以获取标签
        const record = await this.getRecordById(card.recordId);
        const tags = record?.tags || [];
        if (tags.length === 0)
            return [];
        if (env.STORAGE_MODE === 'postgres') {
            const db = getPrisma();
            // 查找具有相同标签的其他记录的卡片
            const relatedRecords = await db.learningRecord.findMany({
                where: {
                    id: { not: card.recordId },
                    tags: { hasSome: tags },
                },
                select: { id: true },
            });
            const recordIds = relatedRecords.map((r) => r.id);
            const cards = await db.knowledgeCard.findMany({
                where: {
                    recordId: { in: recordIds },
                    id: { not: cardId },
                },
                take: limit,
                orderBy: { createdAt: 'desc' },
            });
            return cards.map(dbCardToCard);
        }
        // JSON/memory 模式
        const data = env.STORAGE_MODE === 'json' ? loadFromFile() : memoryData;
        // 找到有相同标签的其他记录
        const relatedRecordIds = data.records
            .filter((r) => r.id !== card.recordId && r.tags?.some((t) => tags.includes(t)))
            .map((r) => r.id);
        return data.cards
            .filter((c) => c.id !== cardId && relatedRecordIds.includes(c.recordId))
            .slice(0, limit);
    },
    // ============ Plans ============
    async getPlans(limit) {
        if (env.STORAGE_MODE === 'postgres') {
            const db = getPrisma();
            const plans = await db.reviewPlan.findMany({
                orderBy: { createdAt: 'desc' },
                take: limit ?? 100,
            });
            return plans.map(dbPlanToPlan);
        }
        const data = env.STORAGE_MODE === 'json' ? loadFromFile() : memoryData;
        const sorted = [...data.plans].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        return limit ? sorted.slice(0, limit) : sorted;
    },
    async addPlan(plan) {
        if (env.STORAGE_MODE === 'postgres') {
            const db = getPrisma();
            await db.reviewPlan.create({
                data: {
                    id: plan.id,
                    date: plan.date,
                    items: plan.items,
                    createdAt: new Date(plan.createdAt),
                },
            });
            return;
        }
        if (env.STORAGE_MODE === 'json') {
            const data = loadFromFile();
            data.plans.push(plan);
            saveToFile(data);
        }
        else {
            memoryData.plans.push(plan);
        }
    },
    // ============ Memory hints (P2) ============
    async getRelatedRecords(url, limit = 5) {
        let domain;
        try {
            domain = new URL(url).hostname;
        }
        catch {
            return [];
        }
        if (env.STORAGE_MODE === 'postgres') {
            const db = getPrisma();
            const records = await db.learningRecord.findMany({
                where: {
                    domain,
                    url: { not: url },
                },
                orderBy: { capturedAt: 'desc' },
                take: limit,
                select: { id: true, title: true },
            });
            return records.map((r) => ({
                recordId: r.id,
                title: r.title,
                reason: '你之前在这个网站学过相似内容',
            }));
        }
        const data = env.STORAGE_MODE === 'json' ? loadFromFile() : memoryData;
        return data.records
            .filter((r) => r.source.domain === domain && r.source.url !== url)
            .slice(0, limit)
            .map((r) => ({
            recordId: r.id,
            title: r.source.title,
            reason: '你之前在这个网站学过相似内容',
        }));
    },
};
