'use client';

import { useEffect, useState, useCallback } from 'react';
import { fetchApi } from '@/lib/api';
import type { LearningRecord, RecordsResponse, CreateCardResponse } from '@studytrace/shared';

// 骨架屏组件
function CardSkeleton() {
  return (
    <div className="card" style={{ opacity: 0.6 }}>
      <div style={{ height: 20, background: 'var(--bg-tertiary)', borderRadius: 4, width: '70%', marginBottom: 8 }} />
      <div style={{ height: 14, background: 'var(--bg-tertiary)', borderRadius: 4, width: '40%', marginBottom: 16 }} />
      <div style={{ height: 60, background: 'var(--bg-tertiary)', borderRadius: 8 }} />
    </div>
  );
}

export default function DashboardPage() {
  const [records, setRecords] = useState<LearningRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generatingCard, setGeneratingCard] = useState<string | null>(null);

  const loadRecords = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchApi<RecordsResponse>('/v1/records?limit=20');
      setRecords(data.records);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load records');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const handleGenerateCard = async (recordId: string) => {
    try {
      setGeneratingCard(recordId);
      await fetchApi<CreateCardResponse>('/v1/cards', {
        method: 'POST',
        body: JSON.stringify({ recordId }),
      });
      alert('知识卡片已生成！');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to generate card');
    } finally {
      setGeneratingCard(null);
    }
  };

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
        <h1 className="page-title">学习记录</h1>
        <p className="page-description">查看和管理你的网页学习记录</p>
      </div>

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-icon blue">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 8v4l3 3"/>
              <circle cx="12" cy="12" r="10"/>
            </svg>
          </div>
          <div>
            <div className="stat-value">{loading ? '-' : records.length}</div>
            <div className="stat-label">总记录数</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          </div>
          <div>
            <div className="stat-value">{loading ? '-' : records.filter(r => r.status === 'summarized').length}</div>
            <div className="stat-label">已总结</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon orange">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
          </div>
          <div>
            <div className="stat-value">{loading ? '-' : new Set(records.flatMap(r => r.tags || [])).size}</div>
            <div className="stat-label">标签数</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 className="section-title">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          最近记录
        </h2>
        <button className="btn btn-secondary" onClick={loadRecords} disabled={loading}>
          {loading ? '加载中...' : '刷新'}
        </button>
      </div>

      {error && (
        <div className="card" style={{ borderColor: 'var(--error)', color: 'var(--error)' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div className="cards-grid">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : records.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 8v4l3 3"/>
              <circle cx="12" cy="12" r="10"/>
            </svg>
          </div>
          <h3>暂无学习记录</h3>
          <p>使用 Chrome 插件抓取你的第一条学习内容吧！</p>
        </div>
      ) : (
        <div className="cards-grid">
          {records.map((record) => (
            <div key={record.id} className="card">
              <div className="card-header">
                <div>
                  <h3 className="card-title">{record.source.title}</h3>
                  <div className="card-meta">
                    {record.source.domain} · {formatTime(record.capturedAt)}
                  </div>
                </div>
                <span className={`status status-${record.status}`}>{record.status}</span>
              </div>

              {record.summary && (
                <div className="card-content">
                  <p>{record.summary}</p>
                </div>
              )}

              {record.keyPoints && record.keyPoints.length > 0 && (
                <ul className="key-points" style={{ marginTop: 12 }}>
                  {record.keyPoints.slice(0, 3).map((point, i) => (
                    <li key={i}>{point}</li>
                  ))}
                </ul>
              )}

              {record.tags && record.tags.length > 0 && (
                <div>
                  {record.tags.map((tag, i) => (
                    <span key={i} className="tag">{tag}</span>
                  ))}
                </div>
              )}

              <div className="card-actions">
                <a
                  href={record.source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary"
                >
                  打开原文
                </a>
                <button
                  className="btn btn-primary"
                  onClick={() => handleGenerateCard(record.id)}
                  disabled={generatingCard === record.id || record.status !== 'summarized'}
                >
                  {generatingCard === record.id ? '生成中...' : '生成卡片'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
