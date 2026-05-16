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
  sendTelegramJson,
  sendTelegramMessage,
} from "./telegram.service.js";

interface TelegramUpdate {
  message?: {
    message_id?: number;
    text?: string;
    caption?: string;
    chat: { id: number | string };
    from?: {
      id: number | string;
      is_bot?: boolean;
      first_name?: string;
      last_name?: string;
      username?: string;
      language_code?: string;
    };
    reply_to_message?: {
      message_id?: number;
      text?: string;
      caption?: string;
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

    if (message && from && text && await handleAdminTrackingReply(message)) {
      return { data: { ok: true } };
    }

    if (!message || !from || !text.startsWith("/start")) {
      return { data: { ok: true } };
    }

    const nonce = text.split(/\s+/)[1];
    if (!nonce) {
      await sendTelegramMessage(message.chat.id, "Open the login flow from the site and try again.");
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
    await answerTelegramCallback(callbackQuery.id, "Access denied.", true);
    return;
  }

  const [action, publicId] = data.split(":");
  if (!publicId || !["order_accept", "order_csv"].includes(action)) {
    await answerTelegramCallback(callbackQuery.id, "Unknown action.", true);
    return;
  }

  const order = await prisma.order.findUnique({
    where: { publicId },
    include: { items: true },
  });

  if (!order) {
    await answerTelegramCallback(callbackQuery.id, "Order not found.", true);
    return;
  }

  if (action === "order_accept") {
    if (order.status !== OrderStatus.pending) {
      await answerTelegramCallback(callbackQuery.id, `Order is already ${order.status}.`, true);
      return;
    }

    const accepted = await prisma.$transaction(async (tx) => {
      await tx.cryptoPayment.updateMany({
        where: { orderId: order.id, provider: "manual" },
        data: {
          providerStatus: "manual_accepted",
          paidAt: new Date(),
        },
      });
      return tx.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.accepted, acceptedAt: new Date() },
        include: { items: true },
      });
    });
    await answerTelegramCallback(callbackQuery.id, `Order ${accepted.publicId} accepted.`);
    if (chatId) {
      await sendTelegramJson("sendMessage", {
        chat_id: chatId,
        text: `✅ Order ${accepted.publicId} accepted.\nReply to this message with the tracking code to send it to the customer.`,
      });
    }
    return;
  }

  if (!chatId) {
    await answerTelegramCallback(callbackQuery.id, "Could not determine the chat.", true);
    return;
  }

  await sendTelegramDocument(
    chatId,
    `${order.publicId}-delivery.csv`,
    createDeliveryCsv(order),
    `Delivery CSV for ${order.publicId}`,
  );
  await answerTelegramCallback(callbackQuery.id, "CSV sent.");
}

async function handleAdminTrackingReply(message: NonNullable<TelegramUpdate["message"]>) {
  const fromId = message.from?.id;
  const chatId = message.chat.id;
  if (!message.reply_to_message || !isTelegramAdminActionAllowed({ fromId, chatId })) return false;

  const repliedText = message.reply_to_message.text ?? message.reply_to_message.caption ?? "";
  const publicId = extractPublicOrderId(repliedText);
  if (!publicId) return false;

  const parsed = parseTrackingReply(message.text ?? "");
  if (!parsed) {
    await sendTelegramJson("sendMessage", {
      chat_id: chatId,
      reply_to_message_id: message.message_id,
      text: "Tracking code was not recognized. Send the tracking code as the first line.",
    });
    return true;
  }

  const order = await prisma.order.findUnique({ where: { publicId } });
  if (!order) {
    await sendTelegramJson("sendMessage", {
      chat_id: chatId,
      reply_to_message_id: message.message_id,
      text: `Order ${publicId} was not found.`,
    });
    return true;
  }
  if (order.status === OrderStatus.cancelled) {
    await sendTelegramJson("sendMessage", {
      chat_id: chatId,
      reply_to_message_id: message.message_id,
      text: `Order ${publicId} is cancelled.`,
    });
    return true;
  }
  if (order.status === OrderStatus.pending) {
    await sendTelegramJson("sendMessage", {
      chat_id: chatId,
      reply_to_message_id: message.message_id,
      text: `Accept ${publicId} before sending tracking.`,
    });
    return true;
  }
  if (!order.telegramIdSnapshot) {
    await sendTelegramJson("sendMessage", {
      chat_id: chatId,
      reply_to_message_id: message.message_id,
      text: `Order ${publicId} has no Telegram recipient.`,
    });
    return true;
  }

  const sent = await sendTelegramJson("sendMessage", {
    chat_id: order.telegramIdSnapshot,
    parse_mode: "HTML",
    disable_web_page_preview: false,
    text: formatTrackingTelegramMessage({
      publicId,
      trackingCode: parsed.trackingCode,
      message: parsed.message,
    }),
  }) as { ok?: boolean; description?: string } | null;

  if (!sent?.ok) {
    await sendTelegramJson("sendMessage", {
      chat_id: chatId,
      reply_to_message_id: message.message_id,
      text: sent?.description ?? "Telegram message was not sent.",
    });
    return true;
  }

  const now = new Date();
  await prisma.order.update({
    where: { id: order.id },
    data: {
      status: OrderStatus.completed,
      acceptedAt: order.acceptedAt ?? now,
      completedAt: now,
      trackingCode: parsed.trackingCode,
      trackingUrl: null,
      trackingMessage: parsed.message ?? null,
      trackingSentAt: now,
    },
  });

  await sendTelegramJson("sendMessage", {
    chat_id: chatId,
    reply_to_message_id: message.message_id,
    text: `✅ Tracking sent to customer. ${publicId} completed.`,
  });
  return true;
}

function extractPublicOrderId(text: string) {
  return text.match(/\bOrder#\d+\b/i)?.[0] ?? null;
}

function parseTrackingReply(text: string) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const trackingCode = lines[0]?.replace(/^track(?:ing)?(?:\s*code)?\s*[:#-]\s*/i, "").trim();
  if (!trackingCode || trackingCode.length < 2 || trackingCode.length > 120) return null;
  return {
    trackingCode,
    message: lines.slice(1).join("\n").trim() || undefined,
  };
}

function formatTrackingTelegramMessage(input: {
  publicId: string;
  trackingCode: string;
  message?: string;
}) {
  return [
    `✅ <b>Order ${escapeHtml(input.publicId)} shipped</b>`,
    "",
    `Tracking: <code>${escapeHtml(input.trackingCode)}</code>`,
    input.message ? `\n${escapeHtml(input.message)}` : null,
  ].filter(Boolean).join("\n");
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

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
