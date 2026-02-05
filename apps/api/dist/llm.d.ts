export interface SummarizeResult {
    summary: string;
    keyPoints: string[];
    tags: string[];
}
export declare function summarize(title: string, url: string, text: string): Promise<SummarizeResult>;
export declare function summarizeStream(title: string, url: string, text: string): AsyncGenerator<{
    type: 'chunk' | 'done' | 'error';
    data: string;
}>;
export interface CardContent {
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
}
export declare function generateCard(title: string, summary: string, text: string): Promise<CardContent>;
export interface PlanContent {
    items: {
        title: string;
        action: string;
        reason: string;
        recordId?: string;
    }[];
}
export declare function generatePlan(date: string, records: {
    id: string;
    title: string;
    summary: string;
    tags: string[];
}[]): Promise<PlanContent>;
//# sourceMappingURL=llm.d.ts.map