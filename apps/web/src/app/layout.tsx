import type { Metadata } from 'next';
import './globals.css';
import { Sidebar } from '@/components/Sidebar';
import { MainContent } from '@/components/MainContent';

export const metadata: Metadata = {
  title: 'StudyTrace - 学习追踪',
  description: '把网页上零散学习变成自动沉淀的知识卡片 + 次日复盘任务单',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>
        <div className="app-layout">
          <Sidebar />
          <MainContent>
            {children}
          </MainContent>
        </div>
      </body>
    </html>
  );
}
