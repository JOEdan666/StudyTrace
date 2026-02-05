# StudyTrace

把"网页上零散学习"变成"自动沉淀的知识卡片 + 次日复盘任务单"。

## 项目结构

```
StudyTrace/
├── apps/
│   ├── api/          # 后端 API (Express + TypeScript)
│   ├── web/          # Web 前端 (Next.js)
│   └── extension/    # Chrome 插件 (MV3)
├── packages/
│   └── shared/       # 共享类型定义
└── docs/
```

## 技术栈

- **后端**: Express + TypeScript + Prisma + PostgreSQL
- **前端**: Next.js 14 + React
- **插件**: Chrome Extension MV3 + Vite
- **LLM**: DeepSeek API (兼容 OpenAI)

## 前置要求

- Node.js 18+
- npm 或 pnpm
- PostgreSQL 数据库

## 环境变量配置

在 `apps/api/` 目录下创建 `.env` 文件：

```env
DATABASE_URL="postgresql://用户名:密码@数据库地址:5432/数据库名"
DEEPSEEK_API_KEY="你的DeepSeek API密钥"
```

---

## Mac 运行流程

### 1. 安装依赖（首次运行）

```bash
cd /path/to/StudyTrace
npm install
```

### 2. 启动 API 服务（终端1）

```bash
cd apps/api
npm run dev
```

### 3. 启动 Web 服务（终端2）

打开新终端窗口：

```bash
cd apps/web
npm run dev
```

### 4. 构建插件

```bash
cd apps/extension
npm run build
```

---

## Windows 运行流程

### 1. 安装依赖（首次运行）

```powershell
cd C:\path\to\StudyTrace
npm install
```

### 2. 启动 API 服务（CMD窗口1）

```powershell
cd apps\api
npm run dev
```

### 3. 启动 Web 服务（CMD窗口2）

打开新 CMD 窗口：

```powershell
cd apps\web
npm run dev
```

### 4. 构建插件

```powershell
cd apps\extension
npm run build
```

---

## 访问地址

| 服务 | 地址 |
|------|------|
| Web 前端 | http://localhost:3000 |
| API 后端 | http://localhost:3001 |

## 加载 Chrome 插件

1. 打开 Chrome 浏览器，访问 `chrome://extensions/`
2. 开启右上角「开发者模式」
3. 点击「加载已解压的扩展程序」
4. 选择 `apps/extension/dist` 文件夹（Mac）或 `apps\extension\dist` 文件夹（Windows）
5. 插件安装完成后，点击插件图标即可使用

---

## API 端点

### P0 核心功能

| 方法 | 端点 | 描述 |
|------|------|------|
| POST | `/v1/ingest` | 插件抓取网页内容 |
| POST | `/v1/summarize` | LLM 生成总结 |
| GET | `/v1/records` | 获取学习记录列表 |
| POST | `/v1/chat` | AI 对话 |

### P1 扩展功能

| 方法 | 端点 | 描述 |
|------|------|------|
| POST | `/v1/cards` | 生成知识卡片 |
| GET | `/v1/cards` | 获取卡片列表 |
| POST | `/v1/plans/generate` | 生成复盘计划 |

### P2 进阶功能

| 方法 | 端点 | 描述 |
|------|------|------|
| GET | `/v1/memory/hints?url=` | 获取关联提示 |

---

## 团队

- **方俊乔** - 后端 Owner（API、LLM、数据存储）
- **余翰玮** - 前端 Owner（Web UI、Chrome 插件）
