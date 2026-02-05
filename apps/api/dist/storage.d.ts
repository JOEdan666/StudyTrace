import type { LearningRecord, KnowledgeCard, ReviewPlan } from '@studytrace/shared';
export interface StorageData {
    records: (LearningRecord & {
        fullText?: string;
    })[];
    cards: KnowledgeCard[];
    plans: ReviewPlan[];
}
export declare const storage: {
    getRecords(limit?: number): Promise<LearningRecord[]>;
    getRecordById(id: string): Promise<(LearningRecord & {
        fullText?: string;
    }) | undefined>;
    getRecordByUrl(url: string): Promise<(LearningRecord & {
        fullText?: string;
    }) | undefined>;
    getRecordByHash(textHash: string): Promise<(LearningRecord & {
        fullText?: string;
    }) | undefined>;
    addRecord(record: LearningRecord & {
        fullText?: string;
    }): Promise<void>;
    updateRecord(id: string, updates: Partial<LearningRecord>): Promise<LearningRecord | undefined>;
    updateRecordFullText(id: string, fullText: string): Promise<void>;
    getCards(limit?: number): Promise<KnowledgeCard[]>;
    getCardById(id: string): Promise<KnowledgeCard | undefined>;
    addCard(card: KnowledgeCard): Promise<void>;
    updateCard(id: string, updates: Partial<KnowledgeCard>): Promise<KnowledgeCard | undefined>;
    deleteCard(id: string): Promise<boolean>;
    getRelatedCards(cardId: string, limit?: number): Promise<KnowledgeCard[]>;
    getPlans(limit?: number): Promise<ReviewPlan[]>;
    addPlan(plan: ReviewPlan): Promise<void>;
    getRelatedRecords(url: string, limit?: number): Promise<{
        recordId: string;
        title: string;
        reason: string;
    }[]>;
};
//# sourceMappingURL=storage.d.ts.map