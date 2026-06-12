declare namespace NodeJS {
  interface ProcessEnv {
    NEXT_PUBLIC_SUPABASE_URL: string;
    NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
    R2_ACCOUNT_ID: string;
    R2_ACCESS_KEY_ID: string;
    R2_SECRET_ACCESS_KEY: string;
    R2_S3_ENDPOINT: string;
    // Optional browser-facing S3 endpoint used ONLY when signing upload URLs. With local
    // MinIO the server reaches it at http://minio:9000 (R2_S3_ENDPOINT) but the browser must
    // PUT to http://localhost:9000, so presigned URLs are signed for this host. Unset on R2.
    R2_S3_PUBLIC_ENDPOINT?: string;
    // Set to 'true' for path-style S3 addressing (required by MinIO). Unset/false for R2.
    R2_FORCE_PATH_STYLE?: string;
    R2_REGION: string;
    SMTP_HOST: string;
    SMTP_PORT: string;
    SMTP_USER: string;
    SMTP_PASS: string;
    SMTP_FROM_EMAIL: string;
    SMTP_FROM_NAME: string;
    FREEMIUS_STORE_ID: string;
    FREEMIUS_DEVELOPER_ID?: string;
    FREEMIUS_PRODUCT_ID?: string;
    FREEMIUS_PUBLIC_KEY: string;
    FREEMIUS_SECRET_KEY: string;
    FREEMIUS_API_KEY?: string;
    FREEMIUS_CHECKOUT_PRODUCTS_JSON?: string;
    FREEMIUS_ECOMMERCE_SANDBOX_PUBLIC_KEY?: string;
    FREEMIUS_ECOMMERCE_SANDBOX_SECRET_KEY?: string;
    FREEMIUS_AI_SANDBOX_KEY?: string;
    FREEMIUS_SANDBOX_ENABLED?: string;
    OPENROUTER_API_KEY?: string;
    CORTEX_AI_ENCRYPTION_KEY?: string;
  }
}
