import crypto from "node:crypto";
import type { FastifyInstance } from "fastify";
import { OrderStatus, ProductStatus } from "@prisma/client";
import { z } from "zod";
import { requireActiveUser } from "../../common/auth.js";
import { badRequest, notFound } from "../../common/http-error.js";
import { money } from "../../common/serialize.js";
import { env } from "../../config/env.js";
import { prisma } from "../../db/prisma.js";
import { sendTelegramMessage } from "../telegram/telegram.service.js";

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
    countryCode: z.string().min(2).max(2).transform((value) => value.toUpperCase()),
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
    const publicId = await createPublicOrderId();

    const order = await prisma.order.create({
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
        shippingCountryCode: body.data.shipping.countryCode,
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

    await notifyNewOrder(order.publicId, user.name, total);

    return { data: serializeOrder(order) };
  });
}

function cleanOptional(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

async function createPublicOrderId() {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const suffix = crypto.randomInt(100000, 999999);
    const publicId = `ORD-${suffix}`;
    const exists = await prisma.order.findUnique({ where: { publicId } });
    if (!exists) return publicId;
  }
  return `ORD-${Date.now()}`;
}

async function notifyNewOrder(publicId: string, customerName: string, total: number) {
  if (!env.ORDER_NOTIFICATIONS_ENABLED || !env.TELEGRAM_ADMIN_CHAT_ID) return;
  await sendTelegramMessage(env.TELEGRAM_ADMIN_CHAT_ID, `New order ${publicId}\n${customerName}\nTotal: EUR ${total}`);
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
