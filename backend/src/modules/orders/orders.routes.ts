import type { FastifyInstance } from "fastify";
import { OrderStatus, ProductStatus } from "@prisma/client";
import { z } from "zod";
import { requireActiveUser } from "../../common/auth.js";
import { badRequest, notFound } from "../../common/http-error.js";
import { money } from "../../common/serialize.js";
import { env } from "../../config/env.js";
import { prisma } from "../../db/prisma.js";
import {
  CRYPTO_PAYMENT_METHODS,
  createCryptoPayment,
  getCryptoPaymentMethod,
  serializeCryptoPayment,
  type CryptoPaymentCode,
} from "../payments/crypto-payments.service.js";
import { sendTelegramJson } from "../telegram/telegram.service.js";

const requiredText = (min: number, max: number) => z.string().trim().min(min).max(max);
const optionalText = (max: number) => z.preprocess(emptyToUndefined, z.string().trim().max(max).optional());
const optionalEmail = z.preprocess(emptyToUndefined, z.string().trim().email().optional());
const optionalPhone = z.preprocess(emptyToUndefined, z.string().trim().min(5).max(40).optional());

const createOrderBody = z.object({
  customerComment: optionalText(1000),
  customerEmail: optionalEmail,
  customerPhone: optionalPhone,
  paymentCurrency: z.enum(CRYPTO_PAYMENT_METHODS.map((method) => method.code) as [CryptoPaymentCode, ...CryptoPaymentCode[]]).default("btc"),
  shipping: z.object({
    methodId: z.string().uuid(),
    fullName: requiredText(2, 120),
    company: optionalText(120),
    addressLine1: requiredText(3, 180),
    addressLine2: optionalText(180),
    city: requiredText(2, 100),
    region: optionalText(100),
    postalCode: requiredText(2, 24),
    country: requiredText(2, 100),
    countryCode: z.preprocess(
      emptyToUndefined,
      z.string().trim().length(2).transform((value) => value.toUpperCase()).optional(),
    ),
    phone: requiredText(5, 40),
    email: optionalEmail,
    taxId: optionalText(80),
    pickupPoint: optionalText(180),
    instructions: optionalText(1000),
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

function emptyToUndefined(value: unknown) {
  return typeof value === "string" && value.trim() === "" ? undefined : value;
}

export async function registerOrderRoutes(app: FastifyInstance) {
  app.post("/api/v1/orders", async (request) => {
    const authUser = await requireActiveUser(request);
    const body = createOrderBody.safeParse(request.body);
    if (!body.success) throw badRequest("Invalid order payload", body.error.flatten());

    const user = await prisma.user.findUniqueOrThrow({ where: { id: authUser.id } });
    const shippingMethod = await prisma.shippingMethod.findFirst({
      where: { id: body.data.shipping.methodId, isActive: true },
    });
    if (!shippingMethod) throw badRequest("Invalid shipping method");

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
        thumbnailUrlSnapshot: getOrderThumbnailUrl(tier.product.media),
      };
    });

    const subtotal = orderItems.reduce((sum, item) => sum + item.lineTotal, 0);
    const shippingAmount = effectiveShippingPrice(shippingMethod);
    const total = subtotal + shippingAmount;
    const paymentMethod = getCryptoPaymentMethod(body.data.paymentCurrency);
    if (!paymentMethod) throw badRequest("Unsupported crypto payment currency");
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
          shippingMethodPreference: shippingMethod.label,
          shippingPickupPoint: cleanOptional(body.data.shipping.pickupPoint),
          shippingInstructions: cleanOptional(body.data.shipping.instructions),
          customerComment: body.data.customerComment,
          subtotalAmount: subtotal,
          shippingAmount,
          totalAmount: total,
          currency: "EUR",
          items: { create: orderItems },
          cryptoPayment: {
            create: {
              currencyCode: paymentMethod.code,
              currencyLabel: paymentMethod.label,
              providerCurrency: paymentMethod.providerCurrency,
              network: paymentMethod.network,
              priceAmount: total,
              priceCurrency: "EUR",
            },
          },
        },
        include: { items: true, cryptoPayment: true },
      });
    });

    try {
      await createCryptoPayment({
        orderId: order.id,
        publicId: order.publicId,
        amount: total,
        currency: order.currency,
        paymentCode: body.data.paymentCurrency,
      });
    } catch (error) {
      await prisma.cryptoPayment.update({
        where: { orderId: order.id },
        data: {
          providerStatus: "creation_failed",
          rawProviderPayload: { error: error instanceof Error ? error.message : "Payment creation failed" },
        },
      });
      throw error;
    }

    const orderWithPayment = await prisma.order.findUniqueOrThrow({
      where: { id: order.id },
      include: { items: true, cryptoPayment: true },
    });

    await notifyNewOrder(orderWithPayment);

    return { data: serializeOrder(orderWithPayment) };
  });
}

function cleanOptional(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function inferShippingPrice(label: string) {
  const match = label.match(/(\d+(?:[.,]\d+)?)\s*(?:EUR|€)/i);
  return match ? Number(match[1].replace(",", ".")) : 0;
}

function effectiveShippingPrice(method: any) {
  const price = money(method.priceAmount ?? 0);
  return price > 0 ? price : inferShippingPrice(method.label);
}

function getOrderThumbnailUrl(media: any[]) {
  const preview = media.find((item) => !isDemoProductMediaUrl(item.thumbnailUrl) && !isDemoProductMediaUrl(item.url));
  return preview?.thumbnailUrl ?? preview?.url ?? null;
}

function isDemoProductMediaUrl(value?: string | null) {
  if (!value) return false;
  try {
    return new URL(value).hostname === "images.unsplash.com";
  } catch {
    return false;
  }
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
    const publicId = `Order#${counter.value}`;
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
          { text: "✅ Accept order", callback_data: `order_accept:${order.publicId}` },
          { text: "📦 Delivery CSV", callback_data: `order_csv:${order.publicId}` },
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
    `🆕 <b>New order ${escapeHtml(order.publicId)}</b>`,
    "",
    `<b>Customer:</b> ${escapeHtml(order.customerName)}`,
    `<b>Telegram:</b> ${escapeHtml(telegram)}`,
    `<b>Phone:</b> ${escapeHtml(order.shippingPhone ?? order.customerPhone ?? "-")}`,
    `<b>Email:</b> ${escapeHtml(order.shippingEmail ?? order.customerEmail ?? "-")}`,
    "",
    "<b>Items:</b>",
    items,
    "",
    `<b>Total:</b> ${money(order.totalAmount)} ${order.currency}`,
    order.cryptoPayment
      ? `<b>Payment:</b> ${escapeHtml(order.cryptoPayment.currencyLabel)} (${escapeHtml(order.cryptoPayment.network)})`
      : null,
    order.cryptoPayment?.payAmount && order.cryptoPayment?.payAddress
      ? `<b>Send:</b> <code>${escapeHtml(order.cryptoPayment.payAmount)}</code> ${escapeHtml(order.cryptoPayment.providerCurrency.toUpperCase())}\n<b>To:</b> <code>${escapeHtml(order.cryptoPayment.payAddress)}</code>`
      : null,
    `<b>Shipping:</b> ${escapeHtml(order.shippingMethodPreference ?? "-")} (${money(order.shippingAmount ?? 0)} ${order.currency})`,
    order.shippingPickupPoint ? `<b>Pickup point:</b> ${escapeHtml(order.shippingPickupPoint)}` : null,
    "",
    "<b>Address:</b>",
    escapeHtml(address || "-"),
    order.shippingInstructions ? `\n<b>Delivery notes:</b>\n${escapeHtml(order.shippingInstructions)}` : null,
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
    shippingAmount: money(order.shippingAmount ?? 0),
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
    payment: serializeCryptoPayment(order.cryptoPayment),
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
