'use client';

import { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';
import type { ReviewPlan, RecordsResponse, GeneratePlanResponse } from '@studytrace/shared';

export default function PlanPage() {
  const [plans, setPlans] = useState<ReviewPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPlans = async () => {
    try {
      setLoading(true);
      setError(null);
      const stored = localStorage.getItem('studytrace_plans');
      if (stored) {
        setPlans(JSON.parse(stored));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load plans');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const handleGeneratePlan = async () => {
    try {
      setGenerating(true);
      setError(null);

      const recordsData = await fetchApi<RecordsResponse>('/v1/records?limit=10');
      const summarizedRecords = recordsData.records.filter((r) => r.status === 'summarized');

      if (summarizedRecords.length === 0) {
        setError('暂无可用的学习记录。请先抓取并总结一些内容。');
        return;
      }

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toISOString().split('T')[0];

      const data = await fetchApi<GeneratePlanResponse>('/v1/plans/generate', {
        method: 'POST',
        body: JSON.stringify({
          date: dateStr,
          recentRecordIds: summarizedRecords.map((r) => r.id),
        }),
      });

      const newPlans = [data.plan, ...plans];
      setPlans(newPlans);
      localStorage.setItem('studytrace_plans', JSON.stringify(newPlans));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate plan');
    } finally {
      setGenerating(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">复盘计划</h1>
        <p className="page-description">AI 生成的每日学习复盘任务</p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 className="section-title">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 11l3 3L22 4" />
            <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
          </svg>
          我的计划
        </h2>
        <button className="btn btn-primary" onClick={handleGeneratePlan} disabled={generating}>
          {generating ? '生成中...' : '生成明日计划'}
        </button>
      </div>

      {error && (
        <div className="card" style={{ borderColor: 'var(--error)', color: 'var(--error)' }}>
          {error}
        </div>
      )}

      {loading && plans.length === 0 ? (
        <div className="loading">
          <div className="spinner" />
        </div>
      ) : plans.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
            </svg>
          </div>
          <h3>暂无复盘计划</h3>
          <p>点击「生成明日计划」创建你的第一个复盘计划！</p>
        </div>
      ) : (
        plans.map((plan) => (
          <div key={plan.id} className="card">
            <div className="card-header">
              <div>
                <h3 className="card-title">复盘计划: {formatDate(plan.date)}</h3>
                <div className="card-meta">
                  {plan.items.length} 项任务 · 创建于 {new Date(plan.createdAt).toLocaleString('zh-CN')}
                </div>
              </div>
            </div>

            <div style={{ marginTop: 16 }}>
              {plan.items.map((item, i) => (
                <div key={i} className="plan-item">
                  <div className="plan-item-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 11l3 3L22 4" />
                    </svg>
                  </div>
                  <div className="plan-item-content">
                    <h4>{item.title}</h4>
                    <p className="action">{item.action}</p>
                    <p className="reason">{item.reason}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </>
  );
}
