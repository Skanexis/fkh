# F.K.H Backend

Fastify + TypeScript + Prisma backend for the F.K.H mobile-first web app.

## Local Setup

```bash
cd backend
cp .env.example .env
docker compose up -d
npm install
npm run prisma:generate
npm run db:push
npm run db:seed
npm run dev
```

API runs on `http://localhost:4000`.

## Telegram Login

Create a Telegram bot through BotFather and fill:

```text
TELEGRAM_BOT_TOKEN=
TELEGRAM_BOT_USERNAME=
TELEGRAM_WEBHOOK_SECRET=
TELEGRAM_ADMIN_IDS=123456789,987654321
```

For production, configure Telegram webhook to:

```text
POST /api/v1/telegram/webhook
```

The webhook must send `X-Telegram-Bot-Api-Secret-Token`.
