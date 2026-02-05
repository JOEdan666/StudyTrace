'use client';

import { useState, useEffect } from 'react';

export function MainContent({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    // 初始化时从 localStorage 读取状态
    const saved = localStorage.getItem('sidebar_collapsed');
    if (saved === 'true') {
      setCollapsed(true);
    }

    // 监听侧边栏切换事件
    const handleToggle = (e: CustomEvent<boolean>) => {
      setCollapsed(e.detail);
    };

    window.addEventListener('sidebar-toggle', handleToggle as EventListener);
    return () => {
      window.removeEventListener('sidebar-toggle', handleToggle as EventListener);
    };
  }, []);

  return (
    <main className={`main-content ${collapsed ? 'sidebar-collapsed' : ''}`}>
      {children}
    </main>
  );
}
