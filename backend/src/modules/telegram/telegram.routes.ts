import type { FastifyInstance } from "fastify";
import { env } from "../../config/env.js";
import { forbidden } from "../../common/http-error.js";
import { confirmTelegramLogin, sendTelegramMessage } from "./telegram.service.js";

interface TelegramUpdate {
  message?: {
    text?: string;
    chat: { id: number | string };
    from?: {
      id: number | string;
      is_bot?: boolean;
      first_name?: string;
      last_name?: string;
      username?: string;
      language_code?: string;
    };
  };
}

export async function registerTelegramRoutes(app: FastifyInstance) {
  app.post("/api/v1/telegram/webhook", async (request) => {
    const secret = request.headers["x-telegram-bot-api-secret-token"];
    if (env.TELEGRAM_WEBHOOK_SECRET && secret !== env.TELEGRAM_WEBHOOK_SECRET) {
      throw forbidden("Invalid Telegram webhook secret");
    }

    const update = request.body as TelegramUpdate;
    const message = update.message;
    const text = message?.text?.trim() ?? "";
    const from = message?.from;

    if (!message || !from || !text.startsWith("/start")) {
      return { data: { ok: true } };
    }

    const nonce = text.split(/\s+/)[1];
    if (!nonce) {
      await sendTelegramMessage(message.chat.id, "Apri il login dal sito e riprova.");
      return { data: { ok: true } };
    }

    const result = await confirmTelegramLogin(nonce, from);
    await sendTelegramMessage(message.chat.id, result.message);

    return { data: { ok: true } };
  });
}
