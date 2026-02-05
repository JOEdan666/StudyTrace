import express from 'express';
import cors from 'cors';
import { env } from './config.js';
import routes from './routes.js';
const app = express();
// Middleware
app.use(cors({
    origin: env.CORS_ALLOW_ORIGIN,
    credentials: true,
}));
app.use(express.json({ limit: '5mb' }));
// Health check
app.get('/health', (_, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// API routes
app.use('/v1', routes);
// Start server
app.listen(env.PORT, () => {
    console.log(`
╔════════════════════════════════════════╗
║     StudyTrace API Server Started      ║
╠════════════════════════════════════════╣
║  Port: ${env.PORT}                            ║
║  Storage: ${env.STORAGE_MODE.padEnd(27)}║
║  LLM: ${env.LLM_PROVIDER.padEnd(31)}║
╚════════════════════════════════════════╝
  `);
    console.log(`Endpoints:`);
    console.log(`  POST /v1/ingest     - Capture page content`);
    console.log(`  POST /v1/summarize  - Generate summary`);
    console.log(`  GET  /v1/records    - List learning records`);
    console.log(`  POST /v1/cards      - Generate knowledge card`);
    console.log(`  GET  /v1/cards      - List knowledge cards`);
    console.log(`  POST /v1/plans/generate - Generate review plan`);
    console.log(`  GET  /v1/memory/hints   - Get memory hints`);
});
