export declare const env: {
    PORT: number;
    CORS_ALLOW_ORIGIN: string;
    LLM_PROVIDER: "openai" | "deepseek" | "moonshot";
    LLM_API_KEY: string;
    LLM_MODEL: string;
    MAX_INPUT_CHARS: number;
    REQUEST_TIMEOUT_MS: number;
    STORAGE_MODE: "memory" | "json" | "postgres";
    DATA_PATH: string;
};
export declare const LLM_BASE_URLS: Record<string, string>;
//# sourceMappingURL=config.d.ts.map