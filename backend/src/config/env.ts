import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  HOST: z.string().default("0.0.0.0"),
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  ACCESS_TOKEN_TTL: z.string().default("15m"),
  REFRESH_TOKEN_DAYS: z.coerce.number().default(30),
  CORS_ORIGINS: z.string().default("http://localhost:5173"),
  PUBLIC_API_URL: z.string().url().default("http://localhost:4000"),
  PUBLIC_CDN_URL: z.string().optional().default(""),
  TELEGRAM_BOT_TOKEN: z.string().optional().default(""),
  TELEGRAM_BOT_USERNAME: z.string().optional().default(""),
  TELEGRAM_WEBHOOK_URL: z.string().optional().default(""),
  TELEGRAM_WEBHOOK_SECRET: z.string().optional().default(""),
  TELEGRAM_LOGIN_REQUEST_TTL_SECONDS: z.coerce.number().default(300),
  TELEGRAM_ADMIN_CHAT_ID: z.string().optional().default(""),
  TELEGRAM_ADMIN_IDS: z.string().optional().default(""),
  ORDER_NOTIFICATIONS_ENABLED: z.coerce.boolean().default(false),
  CRYPTO_BTC_ADDRESSES: z.string().optional().default(""),
  CRYPTO_USDT_ERC20_ADDRESSES: z.string().optional().default(""),
  CRYPTO_USDT_TRC20_ADDRESSES: z.string().optional().default(""),
  CRYPTO_USDC_ERC20_ADDRESSES: z.string().optional().default(""),
  CRYPTO_PAYMENT_TTL_MINUTES: z.coerce.number().int().positive().default(120),
  CRYPTO_BTC_PAYMENT_TTL_MINUTES: z.coerce.number().int().positive().optional(),
  CRYPTO_ETH_TOKEN_PAYMENT_TTL_MINUTES: z.coerce.number().int().positive().optional(),
  CRYPTO_TRON_PAYMENT_TTL_MINUTES: z.coerce.number().int().positive().optional(),
  CRYPTO_POLL_INTERVAL_SECONDS: z.coerce.number().int().positive().default(60),
  CRYPTO_BTC_CONFIRMATIONS: z.coerce.number().int().nonnegative().default(1),
  CRYPTO_ETH_CONFIRMATIONS: z.coerce.number().int().nonnegative().default(12),
  CRYPTO_TRON_CONFIRMATIONS: z.coerce.number().int().nonnegative().default(20),
  COINGECKO_API_URL: z.string().url().default("https://api.coingecko.com/api/v3"),
  MEMPOOL_API_URL: z.string().url().default("https://mempool.space/api"),
  ETHERSCAN_API_URL: z.string().url().default("https://api.etherscan.io/v2/api"),
  ETHERSCAN_API_KEY: z.string().optional().default(""),
  TRONGRID_API_URL: z.string().url().default("https://api.trongrid.io"),
  TRONGRID_API_KEY: z.string().optional().default(""),
  AGE_GATE_ENABLED: z.coerce.boolean().default(false),
  REGION_RESTRICTIONS_ENABLED: z.coerce.boolean().default(false),
});

export const env = envSchema.parse(process.env);

export const corsOrigins = env.CORS_ORIGINS.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

export const telegramAdminIds = new Set(
  env.TELEGRAM_ADMIN_IDS.split(",")
    .map((id) => id.trim())
    .filter(Boolean),
);
