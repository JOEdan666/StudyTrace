// ============ 基础类型 ============
export type ID = string;

export type RecordSource = {
  url: string;
  title: string;
  domain: string;
};

export type RecordStatus = "created" | "summarized" | "updated" | "failed";

// ============ 复习追踪（遗忘曲线） ============
export type ReviewStatus = {
  lastReviewedAt?: string;     // 上次复习时间
  nextReviewAt?: string;       // 下次应复习时间
  reviewCount: number;         // 复习次数
  easeFactor: number;          // 难度因子（SM-2 算法）
  interval: number;            // 当前间隔（天）
};

// ============ 核心数据对象 ============
export type LearningRecord = {
  id: ID;
  source: RecordSource;
  capturedAt: string;        // ISO
  textHash?: string;         // 可选：去重用
  textPreview?: string;      // 可选：截断保存
  summary?: string;          // P0
  keyPoints?: string[];      // P1
  tags?: string[];           // P1: 主题标签
  status: RecordStatus;
};

export type KnowledgeCard = {
  id: ID;
  recordId: ID;
  title: string;
  summary: string;           // 一句话
  keyPoints: string[];
  terms: { term: string; definition: string }[];
  misconceptions: string[];
  selfQuiz: { q: string; a: string; explain: string }[];
  createdAt: string;
  // 遗忘曲线追踪
  reviewStatus?: ReviewStatus;
};

export type ReviewPlan = {
  id: ID;
  date: string;              // YYYY-MM-DD
  items: ReviewPlanItem[];
  createdAt: string;
};

export type ReviewPlanItem = {
  title: string;
  action: string;
  reason: string;
  recordId?: ID;
};

// ============ API 请求/响应类型 ============

// POST /v1/ingest
export type IngestRequest = {
  url: string;
  title: string;
  domain: string;
  text: string;
};

export type IngestResponse = {
  recordId: ID;
};

// POST /v1/summarize
export type SummarizeRequest =
  | { recordId: ID }
  | { text: string; url: string; title: string };

export type SummarizeResponse = {
  summary: string;
  keyPoints?: string[];
  tags?: string[];
};

// GET /v1/records
export type RecordsResponse = {
  records: LearningRecord[];
};

// POST /v1/cards
export type CreateCardRequest = {
  recordId: ID;
};

export type CreateCardResponse = {
  card: KnowledgeCard;
};

// GET /v1/cards
export type CardsResponse = {
  cards: KnowledgeCard[];
};

// POST /v1/plans/generate
export type GeneratePlanRequest = {
  date: string;
  recentRecordIds: ID[];
};

export type GeneratePlanResponse = {
  plan: ReviewPlan;
};

// GET /v1/memory/hints
export type MemoryHintsResponse = {
  related: {
    recordId: ID;
    title: string;
    reason: string;
  }[];
  suggestedActions: string[];
};

// ============ 错误响应 ============
export type ErrorResponse = {
  error: string;
  message: string;
};
