/**
 * 间隔重复算法（基于 SM-2 / 艾宾浩斯遗忘曲线）
 *
 * 艾宾浩斯遗忘曲线默认复习间隔：
 * - 第1次复习：1天后
 * - 第2次复习：2天后
 * - 第3次复习：4天后
 * - 第4次复习：7天后
 * - 第5次复习：15天后
 * - 之后按 EF 因子递增
 */
export interface ReviewStatus {
    lastReviewedAt?: string;
    nextReviewAt?: string;
    reviewCount: number;
    easeFactor: number;
    interval: number;
}
export declare function initReviewStatus(): ReviewStatus;
/**
 * 计算下次复习时间
 * @param status 当前复习状态
 * @param quality 复习质量评分 (0-5)
 *   - 0: 完全忘记
 *   - 1: 错误，看答案后想起来
 *   - 2: 错误，但感觉快想起来了
 *   - 3: 正确，但困难
 *   - 4: 正确，有点犹豫
 *   - 5: 完美记住
 */
export declare function calculateNextReview(status: ReviewStatus, quality: number): ReviewStatus;
/**
 * 获取今日待复习的卡片
 * @param cards 所有卡片
 * @returns 需要复习的卡片列表
 */
export declare function getDueCards<T extends {
    reviewStatus?: ReviewStatus;
}>(cards: T[]): T[];
/**
 * 计算复习优先级分数
 * 分数越高越紧急
 */
export declare function calculatePriority(status: ReviewStatus | undefined): number;
/**
 * 生成智能复盘建议
 */
export interface ReviewSuggestion {
    cardId: string;
    title: string;
    urgency: 'overdue' | 'due_today' | 'upcoming' | 'new';
    priority: number;
    message: string;
}
export declare function generateReviewSuggestions<T extends {
    id: string;
    title: string;
    reviewStatus?: ReviewStatus;
}>(cards: T[], limit?: number): ReviewSuggestion[];
//# sourceMappingURL=spaced-repetition.d.ts.map