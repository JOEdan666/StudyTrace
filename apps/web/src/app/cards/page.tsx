'use client';

import { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';
import type { KnowledgeCard, CardsResponse } from '@studytrace/shared';

export default function CardsPage() {
  const [cards, setCards] = useState<KnowledgeCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  const loadCards = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchApi<CardsResponse>('/v1/cards?limit=20');
      setCards(data.cards);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load cards');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCards();
  }, []);

  const formatTime = (iso: string) => {
    const date = new Date(iso);
    return date.toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">知识卡片</h1>
        <p className="page-description">基于学习记录生成的结构化知识卡片</p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 className="section-title">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M3 9h18" />
            <path d="M9 21V9" />
          </svg>
          全部卡片 ({cards.length})
        </h2>
        <button className="btn btn-secondary" onClick={loadCards} disabled={loading}>
          {loading ? '加载中...' : '刷新'}
        </button>
      </div>

      {error && (
        <div className="card" style={{ borderColor: 'var(--error)', color: 'var(--error)' }}>
          {error}
        </div>
      )}

      {loading && cards.length === 0 ? (
        <div className="loading">
          <div className="spinner" />
        </div>
      ) : cards.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 9h18" />
            </svg>
          </div>
          <h3>暂无知识卡片</h3>
          <p>在学习记录页面生成你的第一张知识卡片！</p>
        </div>
      ) : (
        <div className="cards-grid">
          {cards.map((card) => (
            <div key={card.id} className="card">
              <div className="card-header">
                <div>
                  <h3 className="card-title">{card.title}</h3>
                  <div className="card-meta">{formatTime(card.createdAt)}</div>
                </div>
                <button
                  className="btn btn-ghost"
                  onClick={() => setExpandedCard(expandedCard === card.id ? null : card.id)}
                >
                  {expandedCard === card.id ? '收起' : '展开'}
                </button>
              </div>

              <div className="card-content">
                <p>{card.summary}</p>
              </div>

              {expandedCard === card.id && (
                <div style={{ marginTop: 20 }}>
                  {card.keyPoints.length > 0 && (
                    <div style={{ marginBottom: 20 }}>
                      <h4 style={{ fontSize: 14, marginBottom: 8, color: 'var(--text-primary)', fontWeight: 600 }}>要点</h4>
                      <ul className="key-points">
                        {card.keyPoints.map((point, i) => (
                          <li key={i}>{point}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {card.terms.length > 0 && (
                    <div style={{ marginBottom: 20 }}>
                      <h4 style={{ fontSize: 14, marginBottom: 8, color: 'var(--text-primary)', fontWeight: 600 }}>术语</h4>
                      {card.terms.map((term, i) => (
                        <div key={i} className="term-item">
                          <span className="term-name">{term.term}</span>
                          <span className="term-def">{term.definition}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {card.misconceptions.length > 0 && (
                    <div style={{ marginBottom: 20 }}>
                      <h4 style={{ fontSize: 14, marginBottom: 8, color: 'var(--warning)', fontWeight: 600 }}>常见误区</h4>
                      <ul className="key-points">
                        {card.misconceptions.map((m, i) => (
                          <li key={i}>{m}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {card.selfQuiz.length > 0 && (
                    <div>
                      <h4 style={{ fontSize: 14, marginBottom: 12, color: 'var(--text-primary)', fontWeight: 600 }}>自测题</h4>
                      {card.selfQuiz.map((quiz, i) => (
                        <div key={i} className="quiz-item">
                          <h4>Q: {quiz.q}</h4>
                          <p className="answer"><strong>A:</strong> {quiz.a}</p>
                          <p><em>解释:</em> {quiz.explain}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
