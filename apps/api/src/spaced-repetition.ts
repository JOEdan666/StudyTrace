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
  lastReviewedAt?: string;     // 上次复习时间 ISO
  nextReviewAt?: string;       // 下次应复习时间 ISO
  reviewCount: number;         // 复习次数
  easeFactor: number;          // 难度因子 (1.3 - 2.5)
  interval: number;            // 当前间隔（天）
}

// 艾宾浩斯默认间隔（天）
const EBBINGHAUS_INTERVALS = [1, 2, 4, 7, 15, 30];

// 初始化复习状态
export function initReviewStatus(): ReviewStatus {
  const now = new Date();
  const nextReview = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 明天

  return {
    lastReviewedAt: undefined,
    nextReviewAt: nextReview.toISOString(),
    reviewCount: 0,
    easeFactor: 2.5,  // 初始难度因子
    interval: 1,       // 初始间隔1天
  };
}

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
export function calculateNextReview(
  status: ReviewStatus,
  quality: number
): ReviewStatus {
  const now = new Date();
  const newStatus = { ...status };

  // 限制 quality 范围
  quality = Math.max(0, Math.min(5, quality));

  newStatus.lastReviewedAt = now.toISOString();
  newStatus.reviewCount += 1;

  if (quality < 3) {
    // 答错了，重置间隔
    newStatus.interval = 1;
    newStatus.reviewCount = 0; // 可选：重置计数
  } else {
    // 答对了，增加间隔
    if (newStatus.reviewCount <= EBBINGHAUS_INTERVALS.length) {
      // 使用艾宾浩斯默认间隔
      newStatus.interval = EBBINGHAUS_INTERVALS[newStatus.reviewCount - 1];
    } else {
      // 超过默认间隔后，使用 SM-2 公式
      newStatus.interval = Math.round(newStatus.interval * newStatus.easeFactor);
    }
  }

  // 更新难度因子 (SM-2 公式)
  // EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  const efDelta = 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02);
  newStatus.easeFactor = Math.max(1.3, newStatus.easeFactor + efDelta);

  // 计算下次复习日期
  const nextDate = new Date(now.getTime() + newStatus.interval * 24 * 60 * 60 * 1000);
  newStatus.nextReviewAt = nextDate.toISOString();

  return newStatus;
}

/**
 * 获取今日待复习的卡片
 * @param cards 所有卡片
 * @returns 需要复习的卡片列表
 */
export function getDueCards<T extends { reviewStatus?: ReviewStatus }>(
  cards: T[]
): T[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  return cards.filter((card) => {
    if (!card.reviewStatus?.nextReviewAt) {
      // 新卡片，需要首次复习
      return true;
    }

    const nextReview = new Date(card.reviewStatus.nextReviewAt);
    return nextReview <= now;
  });
}

/**
 * 计算复习优先级分数
 * 分数越高越紧急
 */
export function calculatePriority(status: ReviewStatus | undefined): number {
  if (!status?.nextReviewAt) {
    return 100; // 新卡片最高优先级
  }

  const now = new Date();
  const nextReview = new Date(status.nextReviewAt);
  const overdueDays = (now.getTime() - nextReview.getTime()) / (24 * 60 * 60 * 1000);

  if (overdueDays > 0) {
    // 逾期：每逾期一天加10分
    return 50 + overdueDays * 10;
  }

  // 未到期：根据剩余天数降低优先级
  return Math.max(0, 50 + overdueDays * 5);
}

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

export function generateReviewSuggestions<T extends {
  id: string;
  title: string;
  reviewStatus?: ReviewStatus
}>(
  cards: T[],
  limit: number = 10
): ReviewSuggestion[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

  const suggestions: ReviewSuggestion[] = cards.map((card) => {
    const priority = calculatePriority(card.reviewStatus);
    let urgency: ReviewSuggestion['urgency'];
    let message: string;

    if (!card.reviewStatus?.nextReviewAt) {
      urgency = 'new';
      message = '新卡片，建议今天首次复习';
    } else {
      const nextReview = new Date(card.reviewStatus.nextReviewAt);

      if (nextReview < today) {
        const overdueDays = Math.ceil((today.getTime() - nextReview.getTime()) / (24 * 60 * 60 * 1000));
        urgency = 'overdue';
        message = `已逾期 ${overdueDays} 天，记忆可能衰退`;
      } else if (nextReview < tomorrow) {
        urgency = 'due_today';
        message = '今日待复习';
      } else {
        const daysUntil = Math.ceil((nextReview.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
        urgency = 'upcoming';
        message = `${daysUntil} 天后复习`;
      }
    }

    return {
      cardId: card.id,
      title: card.title,
      urgency,
      priority,
      message,
    };
  });

  // 按优先级排序
  return suggestions
    .sort((a, b) => b.priority - a.priority)
    .slice(0, limit);
}
