'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  // 从 localStorage 读取状态
  useEffect(() => {
    const saved = localStorage.getItem('sidebar_collapsed');
    if (saved === 'true') {
      setCollapsed(true);
    }
  }, []);

  // 保存状态到 localStorage
  const toggleSidebar = () => {
    const newState = !collapsed;
    setCollapsed(newState);
    localStorage.setItem('sidebar_collapsed', String(newState));
    // 触发自定义事件通知布局更新
    window.dispatchEvent(new CustomEvent('sidebar-toggle', { detail: newState }));
  };

  return (
    <aside className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        </div>
        {!collapsed && <h1>StudyTrace</h1>}
      </div>

      <button className="sidebar-toggle" onClick={toggleSidebar} title={collapsed ? '展开侧边栏' : '收起侧边栏'}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          {collapsed ? (
            <polyline points="9 18 15 12 9 6" />
          ) : (
            <polyline points="15 18 9 12 15 6" />
          )}
        </svg>
      </button>

      <nav className="sidebar-nav">
        <Link href="/dashboard" className={pathname === '/dashboard' ? 'active' : ''} title="学习记录">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="9" rx="1"/>
            <rect x="14" y="3" width="7" height="5" rx="1"/>
            <rect x="14" y="12" width="7" height="9" rx="1"/>
            <rect x="3" y="16" width="7" height="5" rx="1"/>
          </svg>
          {!collapsed && <span>学习记录</span>}
        </Link>
        <Link href="/cards" className={pathname === '/cards' ? 'active' : ''} title="知识卡片">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <path d="M3 9h18"/>
            <path d="M9 21V9"/>
          </svg>
          {!collapsed && <span>知识卡片</span>}
        </Link>
        <Link href="/plan" className={pathname === '/plan' ? 'active' : ''} title="复盘计划">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M8 6h13"/>
            <path d="M8 12h13"/>
            <path d="M8 18h13"/>
            <circle cx="4" cy="6" r="1"/>
            <circle cx="4" cy="12" r="1"/>
            <circle cx="4" cy="18" r="1"/>
          </svg>
          {!collapsed && <span>复盘计划</span>}
        </Link>
      </nav>

      {!collapsed && (
        <div className="sidebar-footer">
          智能学习追踪助手
        </div>
      )}
    </aside>
  );
}
