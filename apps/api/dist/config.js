import { config } from 'dotenv';
config();
export const env = {
    PORT: parseInt(process.env.PORT || '3001', 10),
    CORS_ALLOW_ORIGIN: process.env.CORS_ALLOW_ORIGIN || '*',
    LLM_PROVIDER: (process.env.LLM_PROVIDER || 'openai'),
    LLM_API_KEY: process.env.LLM_API_KEY || '',
    LLM_MODEL: process.env.LLM_MODEL || 'gpt-3.5-turbo',
    MAX_INPUT_CHARS: parseInt(process.env.MAX_INPUT_CHARS || '12000', 10),
    REQUEST_TIMEOUT_MS: parseInt(process.env.REQUEST_TIMEOUT_MS || '20000', 10),
    STORAGE_MODE: (process.env.STORAGE_MODE || 'json'),
    DATA_PATH: process.env.DATA_PATH || './data.json',
};
// LLM Provider base URLs
export const LLM_BASE_URLS = {
    openai: 'https://api.openai.com/v1',
    deepseek: 'https://api.deepseek.com',
    moonshot: 'https://api.moonshot.cn/v1',
};
