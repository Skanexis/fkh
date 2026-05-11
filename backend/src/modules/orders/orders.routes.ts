import type { FastifyInstance } from "fastify";
import { OrderStatus, ProductStatus } from "@prisma/client";
import { z } from "zod";
import { requireActiveUser } from "../../common/auth.js";
import { badRequest, notFound } from "../../common/http-error.js";
import { money } from "../../common/serialize.js";
import { env } from "../../config/env.js";
import { prisma } from "../../db/prisma.js";
import { sendTelegramJson } from "../telegram/telegram.service.js";

const createOrderBody = z.object({
  customerComment: z.string().max(1000).optional(),
  customerEmail: z.string().email().optional(),
  customerPhone: z.string().min(5).max(40).optional(),
  shipping: z.object({
    fullName: z.string().min(2).max(120),
    company: z.string().max(120).optional(),
    addressLine1: z.string().min(3).max(180),
    addressLine2: z.string().max(180).optional(),
    city: z.string().min(2).max(100),
    region: z.string().max(100).optional(),
    postalCode: z.string().min(2).max(24),
    country: z.string().min(2).max(100),
    countryCode: z.string().min(2).max(2).transform((value) => value.toUpperCase()).optional(),
    phone: z.string().min(5).max(40),
    email: z.string().email().optional(),
    taxId: z.string().max(80).optional(),
    methodPreference: z.string().max(80).optional(),
    pickupPoint: z.string().max(180).optional(),
    instructions: z.string().max(1000).optional(),
  }),
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        priceTierId: z.string().uuid(),
        quantity: z.number().int().min(1).max(99),
      }),
    )
    .min(1)
    .max(50),
});

export async function registerOrderRoutes(app: FastifyInstance) {
  app.post("/api/v1/orders", async (request) => {
    const authUser = await requireActiveUser(request);
    const body = createOrderBody.safeParse(request.body);
    if (!body.success) throw badRequest("Invalid order payload", body.error.flatten());

    const user = await prisma.user.findUniqueOrThrow({ where: { id: authUser.id } });

    const tierIds = body.data.items.map((item) => item.priceTierId);
    const tiers = await prisma.productPriceTier.findMany({
      where: { id: { in: tierIds }, isActive: true, product: { status: ProductStatus.active } },
      include: {
        product: {
          include: {
            media: { orderBy: { sortOrder: "asc" }, take: 1 },
          },
        },
      },
    });

    const tierById = new Map(tiers.map((tier) => [tier.id, tier]));
    const orderItems = body.data.items.map((item) => {
      const tier = tierById.get(item.priceTierId);
      if (!tier || tier.productId !== item.productId) {
        throw badRequest("Invalid product or price tier in order");
      }
      const unitPrice = money(tier.amount);
      const lineTotal = unitPrice * item.quantity;
      return {
        productId: tier.productId,
        productNameSnapshot: tier.product.name,
        productBrandSnapshot: tier.product.brand,
        priceTierId: tier.id,
        priceTierLabelSnapshot: tier.label,
        unitPriceSnapshot: unitPrice,
        quantity: item.quantity,
        lineTotal,
        thumbnailUrlSnapshot: tier.product.media[0]?.thumbnailUrl ?? tier.product.media[0]?.url ?? null,
      };
    });

    const total = orderItems.reduce((sum, item) => sum + item.lineTotal, 0);
    const order = await prisma.$transaction(async (tx) => {
      const publicId = await createPublicOrderId(tx);
      return tx.order.create({
        data: {
          publicId,
          userId: user.id,
          telegramIdSnapshot: user.telegramId,
          telegramUsernameSnapshot: user.telegramUsername,
          customerName: user.name,
          customerEmail: body.data.customerEmail ?? body.data.shipping.email ?? user.email,
          customerPhone: body.data.customerPhone ?? body.data.shipping.phone ?? user.phone,
          shippingFullName: body.data.shipping.fullName,
          shippingCompany: cleanOptional(body.data.shipping.company),
          shippingAddressLine1: body.data.shipping.addressLine1,
          shippingAddressLine2: cleanOptional(body.data.shipping.addressLine2),
          shippingCity: body.data.shipping.city,
          shippingRegion: cleanOptional(body.data.shipping.region),
          shippingPostalCode: body.data.shipping.postalCode,
          shippingCountry: body.data.shipping.country,
          shippingCountryCode: cleanOptional(body.data.shipping.countryCode),
          shippingPhone: body.data.shipping.phone,
          shippingEmail: cleanOptional(body.data.shipping.email),
          shippingTaxId: cleanOptional(body.data.shipping.taxId),
          shippingMethodPreference: cleanOptional(body.data.shipping.methodPreference),
          shippingPickupPoint: cleanOptional(body.data.shipping.pickupPoint),
          shippingInstructions: cleanOptional(body.data.shipping.instructions),
          customerComment: body.data.customerComment,
          subtotalAmount: total,
          totalAmount: total,
          currency: "EUR",
          items: { create: orderItems },
        },
        include: { items: true },
      });
    });

    await notifyNewOrder(order);

    return { data: serializeOrder(order) };
  });
}

function cleanOptional(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

async function createPublicOrderId(tx: any) {
  const db = tx as typeof tx & {
    sequenceCounter: {
      upsert: (args: any) => Promise<{ value: number }>;
      update: (args: any) => Promise<{ value: number }>;
    };
  };
  let counter = await db.sequenceCounter.upsert({
    where: { name: "order" },
    update: { value: { increment: 1 } },
    create: { name: "order", value: 1 },
  });

  for (let attempt = 0; attempt < 25; attempt += 1) {
    const publicId = `Ordine#${counter.value}`;
    const existing = await tx.order.findUnique({
      where: { publicId },
      select: { id: true },
    });
    if (!existing) return publicId;

    counter = await db.sequenceCounter.update({
      where: { name: "order" },
      data: { value: { increment: 1 } },
    });
  }

  throw badRequest("Could not allocate order number");
}

async function notifyNewOrder(order: any) {
  if (!env.ORDER_NOTIFICATIONS_ENABLED || !env.TELEGRAM_ADMIN_CHAT_ID) return;
  await sendTelegramJson("sendMessage", {
    chat_id: env.TELEGRAM_ADMIN_CHAT_ID,
    parse_mode: "HTML",
    text: formatAdminOrderMessage(order),
    reply_markup: {
      inline_keyboard: [
        [
          { text: "✅ Принять заказ", callback_data: `order_accept:${order.publicId}` },
          { text: "📦 CSV для доставки", callback_data: `order_csv:${order.publicId}` },
        ],
      ],
    },
  });
}

function formatAdminOrderMessage(order: any) {
  const telegram = order.telegramUsernameSnapshot
    ? `@${order.telegramUsernameSnapshot}`
    : `ID ${order.telegramIdSnapshot}`;
  const items = order.items
    .map((item: any) => {
      const lineTotal = money(item.lineTotal);
      return `• ${escapeHtml(item.productNameSnapshot)} ${escapeHtml(item.priceTierLabelSnapshot)} x${item.quantity} = ${lineTotal} ${order.currency}`;
    })
    .join("\n");
  const address = [
    order.shippingFullName,
    order.shippingCompany,
    order.shippingAddressLine1,
    order.shippingAddressLine2,
    [order.shippingPostalCode, order.shippingCity, order.shippingRegion].filter(Boolean).join(" "),
    order.shippingCountry,
  ].filter(Boolean).join("\n");

  return [
    `🆕 <b>Новый заказ ${escapeHtml(order.publicId)}</b>`,
    "",
    `<b>Клиент:</b> ${escapeHtml(order.customerName)}`,
    `<b>Telegram:</b> ${escapeHtml(telegram)}`,
    `<b>Телефон:</b> ${escapeHtml(order.shippingPhone ?? order.customerPhone ?? "-")}`,
    `<b>Email:</b> ${escapeHtml(order.shippingEmail ?? order.customerEmail ?? "-")}`,
    "",
    "<b>Товары:</b>",
    items,
    "",
    `<b>Сумма:</b> ${money(order.totalAmount)} ${order.currency}`,
    `<b>Доставка:</b> ${escapeHtml(order.shippingMethodPreference ?? "-")}`,
    order.shippingPickupPoint ? `<b>Pickup point:</b> ${escapeHtml(order.shippingPickupPoint)}` : null,
    "",
    "<b>Адрес:</b>",
    escapeHtml(address || "-"),
    order.shippingInstructions ? `\n<b>Комментарий доставки:</b>\n${escapeHtml(order.shippingInstructions)}` : null,
  ].filter(Boolean).join("\n");
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export function assertOrderTransition(from: OrderStatus, to: OrderStatus) {
  const allowed: Record<OrderStatus, OrderStatus[]> = {
    pending: ["accepted", "cancelled"],
    accepted: ["completed", "cancelled"],
    completed: [],
    cancelled: [],
  };

  if (!allowed[from].includes(to)) {
    throw badRequest(`Order status cannot change from ${from} to ${to}`);
  }
}

export function serializeOrder(order: any) {
  return {
    id: order.id,
    publicId: order.publicId,
    userId: order.userId,
    telegramIdSnapshot: order.telegramIdSnapshot,
    telegramUsernameSnapshot: order.telegramUsernameSnapshot,
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    customerPhone: order.customerPhone,
    shipping: {
      fullName: order.shippingFullName,
      company: order.shippingCompany,
      addressLine1: order.shippingAddressLine1,
      addressLine2: order.shippingAddressLine2,
      city: order.shippingCity,
      region: order.shippingRegion,
      postalCode: order.shippingPostalCode,
      country: order.shippingCountry,
      countryCode: order.shippingCountryCode,
      phone: order.shippingPhone,
      email: order.shippingEmail,
      taxId: order.shippingTaxId,
      methodPreference: order.shippingMethodPreference,
      pickupPoint: order.shippingPickupPoint,
      instructions: order.shippingInstructions,
    },
    status: order.status,
    subtotalAmount: money(order.subtotalAmount),
    totalAmount: money(order.totalAmount),
    currency: order.currency,
    customerComment: order.customerComment,
    adminComment: order.adminComment,
    tracking: {
      code: order.trackingCode,
      url: order.trackingUrl,
      message: order.trackingMessage,
      sentAt: order.trackingSentAt?.toISOString() ?? null,
    },
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    acceptedAt: order.acceptedAt?.toISOString() ?? null,
    completedAt: order.completedAt?.toISOString() ?? null,
    cancelledAt: order.cancelledAt?.toISOString() ?? null,
    items: order.items.map((item: any) => ({
      id: item.id,
      productId: item.productId,
      productName: item.productNameSnapshot,
      productBrand: item.productBrandSnapshot,
      priceTierId: item.priceTierId,
      priceTierLabel: item.priceTierLabelSnapshot,
      unitPrice: money(item.unitPriceSnapshot),
      quantity: item.quantity,
      lineTotal: money(item.lineTotal),
      thumbnailUrl: item.thumbnailUrlSnapshot,
    })),
  };
}
