import type { FastifyInstance } from "fastify";
import { OrderStatus } from "@prisma/client";
import { env } from "../../config/env.js";
import { forbidden } from "../../common/http-error.js";
import { money } from "../../common/serialize.js";
import { prisma } from "../../db/prisma.js";
import {
  answerTelegramCallback,
  confirmTelegramLogin,
  isTelegramAdminActionAllowed,
  sendTelegramDocument,
  sendTelegramMessage,
} from "./telegram.service.js";

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
  callback_query?: {
    id: string;
    data?: string;
    from?: {
      id: number | string;
      is_bot?: boolean;
      first_name?: string;
      last_name?: string;
      username?: string;
      language_code?: string;
    };
    message?: {
      message_id: number;
      chat: { id: number | string };
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
    if (update.callback_query) {
      await handleCallbackQuery(update.callback_query);
      return { data: { ok: true } };
    }

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

async function handleCallbackQuery(callbackQuery: NonNullable<TelegramUpdate["callback_query"]>) {
  const data = callbackQuery.data ?? "";
  const chatId = callbackQuery.message?.chat.id;
  const fromId = callbackQuery.from?.id;

  if (!isTelegramAdminActionAllowed({ fromId, chatId })) {
    await answerTelegramCallback(callbackQuery.id, "Нет доступа.", true);
    return;
  }

  const [action, publicId] = data.split(":");
  if (!publicId || !["order_accept", "order_csv"].includes(action)) {
    await answerTelegramCallback(callbackQuery.id, "Неизвестное действие.", true);
    return;
  }

  const order = await prisma.order.findUnique({
    where: { publicId },
    include: { items: true },
  });

  if (!order) {
    await answerTelegramCallback(callbackQuery.id, "Заказ не найден.", true);
    return;
  }

  if (action === "order_accept") {
    if (order.status !== OrderStatus.pending) {
      await answerTelegramCallback(callbackQuery.id, `Заказ уже ${order.status}.`, true);
      return;
    }

    const accepted = await prisma.order.update({
      where: { id: order.id },
      data: { status: OrderStatus.accepted, acceptedAt: new Date() },
      include: { items: true },
    });
    await answerTelegramCallback(callbackQuery.id, `Заказ ${accepted.publicId} принят.`);
    if (chatId) {
      await sendTelegramMessage(chatId, `✅ Заказ ${accepted.publicId} принят.`);
    }
    return;
  }

  if (!chatId) {
    await answerTelegramCallback(callbackQuery.id, "Не удалось определить чат.", true);
    return;
  }

  await sendTelegramDocument(
    chatId,
    `${order.publicId}-delivery.csv`,
    createDeliveryCsv(order),
    `CSV для доставки ${order.publicId}`,
  );
  await answerTelegramCallback(callbackQuery.id, "CSV отправлен.");
}

function createDeliveryCsv(order: any) {
  const rows = [
    ["Field", "Value"],
    ["Order ID", order.publicId],
    ["Status", order.status],
    ["Customer", order.customerName],
    ["Telegram", order.telegramUsernameSnapshot ? `@${order.telegramUsernameSnapshot}` : order.telegramIdSnapshot],
    ["Recipient", order.shippingFullName],
    ["Company", order.shippingCompany],
    ["Phone", order.shippingPhone ?? order.customerPhone],
    ["Email", order.shippingEmail ?? order.customerEmail],
    ["Address line 1", order.shippingAddressLine1],
    ["Address line 2", order.shippingAddressLine2],
    ["Postal code", order.shippingPostalCode],
    ["City", order.shippingCity],
    ["Region", order.shippingRegion],
    ["Country", order.shippingCountry],
    ["Shipping method", order.shippingMethodPreference],
    ["Pickup point", order.shippingPickupPoint],
    ["Instructions", order.shippingInstructions],
    ["Items", order.items.map((item: any) => `${item.productNameSnapshot} ${item.priceTierLabelSnapshot} x${item.quantity}`).join("; ")],
    ["Total", `${money(order.totalAmount)} ${order.currency}`],
  ];

  return rows.map((row) => row.map(csvCell).join(",")).join("\n");
}

function csvCell(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}
