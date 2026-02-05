export type ID = string;
export type RecordSource = {
    url: string;
    title: string;
    domain: string;
};
export type RecordStatus = "created" | "summarized" | "updated" | "failed";
export type ReviewStatus = {
    lastReviewedAt?: string;
    nextReviewAt?: string;
    reviewCount: number;
    easeFactor: number;
    interval: number;
};
export type LearningRecord = {
    id: ID;
    source: RecordSource;
    capturedAt: string;
    textHash?: string;
    textPreview?: string;
    summary?: string;
    keyPoints?: string[];
    tags?: string[];
    status: RecordStatus;
};
export type KnowledgeCard = {
    id: ID;
    recordId: ID;
    title: string;
    summary: string;
    keyPoints: string[];
    terms: {
        term: string;
        definition: string;
    }[];
    misconceptions: string[];
    selfQuiz: {
        q: string;
        a: string;
        explain: string;
    }[];
    createdAt: string;
    reviewStatus?: ReviewStatus;
};
export type ReviewPlan = {
    id: ID;
    date: string;
    items: ReviewPlanItem[];
    createdAt: string;
};
export type ReviewPlanItem = {
    title: string;
    action: string;
    reason: string;
    recordId?: ID;
};
export type IngestRequest = {
    url: string;
    title: string;
    domain: string;
    text: string;
};
export type IngestResponse = {
    recordId: ID;
};
export type SummarizeRequest = {
    recordId: ID;
} | {
    text: string;
    url: string;
    title: string;
};
export type SummarizeResponse = {
    summary: string;
    keyPoints?: string[];
    tags?: string[];
};
export type RecordsResponse = {
    records: LearningRecord[];
};
export type CreateCardRequest = {
    recordId: ID;
};
export type CreateCardResponse = {
    card: KnowledgeCard;
};
export type CardsResponse = {
    cards: KnowledgeCard[];
};
export type GeneratePlanRequest = {
    date: string;
    recentRecordIds: ID[];
};
export type GeneratePlanResponse = {
    plan: ReviewPlan;
};
export type MemoryHintsResponse = {
    related: {
        recordId: ID;
        title: string;
        reason: string;
    }[];
    suggestedActions: string[];
};
export type ErrorResponse = {
    error: string;
    message: string;
};
//# sourceMappingURL=types.d.ts.map