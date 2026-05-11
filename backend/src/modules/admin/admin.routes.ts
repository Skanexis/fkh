import type { FastifyInstance, FastifyRequest } from "fastify";
import { ContactType, MediaType, OrderStatus, ProductStatus, UserStatus } from "@prisma/client";
import { z } from "zod";
import { requireAdmin } from "../../common/auth.js";
import { badRequest, notFound } from "../../common/http-error.js";
import { money, pageMeta } from "../../common/serialize.js";
import { env } from "../../config/env.js";
import { prisma } from "../../db/prisma.js";
import { serializeProduct, serializeShippingMethod, serializeSiteSettings } from "../catalog/catalog.routes.js";
import { assertOrderTransition, serializeOrder } from "../orders/orders.routes.js";
import { serializeAuthUser } from "../auth/auth.service.js";
import { sendTelegramJson } from "../telegram/telegram.service.js";

const db = prisma as typeof prisma & {
  siteSettings: {
    upsert: (args: any) => Promise<any>;
    update: (args: any) => Promise<any>;
  };
  shippingMethod: {
    findMany: (args: any) => Promise<any[]>;
    create: (args: any) => Promise<any>;
    update: (args: any) => Promise<any>;
  };
};

const pagingQuery = z.object({
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

const productPayload = z.object({
  name: z.string().min(2).max(120),
  slug: z.string().min(2).max(140).optional(),
  brand: z.string().min(2).max(80),
  categoryId: z.string().uuid(),
  description: z.string().min(5).max(240),
  longDescription: z.string().min(10).max(5000),
  badge: z.string().max(80).nullable().optional(),
  featured: z.boolean().default(false),
  status: z.nativeEnum(ProductStatus).default(ProductStatus.active),
  sortOrder: z.number().int().default(0),
  priceTiers: z
    .array(
      z.object({
        id: z.string().uuid().optional(),
        label: z.string().min(1).max(20),
        amount: z.number().positive(),
        currency: z.string().default("EUR"),
        sortOrder: z.number().int().default(0),
        isActive: z.boolean().default(true),
      }),
    )
    .min(1),
  media: z
    .array(
      z.object({
        mediaId: z.string().uuid().optional(),
        type: z.nativeEnum(MediaType).optional(),
        url: z.string().url().optional(),
        thumbnailUrl: z.string().url().nullable().optional(),
        mimeType: z.string().optional(),
        sizeBytes: z.number().int().nonnegative().optional(),
        sortOrder: z.number().int().default(0),
        alt: z.string().nullable().optional(),
      }),
    )
    .default([]),
});

const orderQuery = pagingQuery.extend({
  status: z.nativeEnum(OrderStatus).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
});

const siteSettingsPayload = z.object({
  brandName: z.string().min(1).max(80).optional(),
  logoUrl: z.string().url().nullable().optional(),
});

const shippingMethodPayload = z.object({
  code: z.string().min(2).max(80).optional(),
  label: z.string().min(2).max(120),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

const orderTrackingPayload = z.object({
  trackingCode: z.string().trim().min(2).max(120),
  trackingUrl: z.preprocess(
    (value) => typeof value === "string" && value.trim() === "" ? undefined : value,
    z.string().trim().url().max(1000).optional(),
  ),
  message: z.preprocess(
    (value) => typeof value === "string" && value.trim() === "" ? undefined : value,
    z.string().trim().max(1000).optional(),
  ),
});

export async function registerAdminRoutes(app: FastifyInstance) {
  app.get("/api/v1/admin/dashboard", async (request) => {
    await requireAdmin(request);

    const [totalOrders, totalUsers, pendingOrders, completedOrders, ordersByStatus, recentOrders] = await prisma.$transaction([
      prisma.order.count(),
      prisma.user.count(),
      prisma.order.count({ where: { status: "pending" } }),
      prisma.order.findMany({ where: { status: "completed" }, select: { totalAmount: true } }),
      prisma.order.groupBy({ by: ["status"], _count: true, orderBy: { status: "asc" } }),
      prisma.order.findMany({ orderBy: { createdAt: "desc" }, take: 8, include: { items: true } }),
    ]);

    const grouped = Object.fromEntries(ordersByStatus.map((item) => [item.status, item._count]));

    return {
      data: {
        totalRevenue: completedOrders.reduce((sum, order) => sum + money(order.totalAmount), 0),
        totalOrders,
        totalUsers,
        pendingOrders,
        ordersByStatus: {
          pending: grouped.pending ?? 0,
          accepted: grouped.accepted ?? 0,
          completed: grouped.completed ?? 0,
          cancelled: grouped.cancelled ?? 0,
        },
        recentOrders: recentOrders.map(serializeOrder),
      },
    };
  });

  app.get("/api/v1/admin/products", async (request) => {
    await requireAdmin(request);
    const query = pagingQuery.safeParse(request.query);
    if (!query.success) throw badRequest("Invalid product query", query.error.flatten());

    const where = query.data.search
      ? {
          OR: [
            { name: { contains: query.data.search, mode: "insensitive" as const } },
            { brand: { contains: query.data.search, mode: "insensitive" as const } },
            { category: { name: { contains: query.data.search, mode: "insensitive" as const } } },
          ],
        }
      : {};

    const [total, products] = await prisma.$transaction([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        orderBy: [{ createdAt: "desc" }],
        skip: (query.data.page - 1) * query.data.limit,
        take: query.data.limit,
        include: productInclude,
      }),
    ]);

    return { data: products.map(serializeProduct), meta: pageMeta(query.data.page, query.data.limit, total) };
  });

  app.post("/api/v1/admin/products", async (request) => {
    const admin = await requireAdmin(request);
    const body = productPayload.safeParse(request.body);
    if (!body.success) throw badRequest("Invalid product payload", body.error.flatten());

    const product = await upsertProduct(null, body.data);
    await audit(request, admin.id, "product.create", "Product", product.id, null, product);

    return { data: serializeProduct(product) };
  });

  app.get("/api/v1/admin/products/:id", async (request) => {
    await requireAdmin(request);
    const id = parseId(request);
    const product = await prisma.product.findUnique({ where: { id }, include: productInclude });
    if (!product) throw notFound("Product not found");
    return { data: serializeProduct(product) };
  });

  app.patch("/api/v1/admin/products/:id", async (request) => {
    const admin = await requireAdmin(request);
    const id = parseId(request);
    const body = productPayload.partial({ priceTiers: true, media: true }).safeParse(request.body);
    if (!body.success) throw badRequest("Invalid product payload", body.error.flatten());

    const before = await prisma.product.findUnique({ where: { id }, include: productInclude });
    if (!before) throw notFound("Product not found");

    const product = await upsertProduct(id, body.data);
    await audit(request, admin.id, "product.update", "Product", id, before, product);

    return { data: serializeProduct(product) };
  });

  app.delete("/api/v1/admin/products/:id", async (request) => {
    const admin = await requireAdmin(request);
    const id = parseId(request);
    const product = await prisma.product.update({
      where: { id },
      data: { status: ProductStatus.archived },
      include: productInclude,
    });
    await audit(request, admin.id, "product.archive", "Product", id, null, product);
    return { data: serializeProduct(product) };
  });

  app.get("/api/v1/admin/orders", async (request) => {
    await requireAdmin(request);
    const query = orderQuery.safeParse(request.query);
    if (!query.success) throw badRequest("Invalid order query", query.error.flatten());

    const where = {
      status: query.data.status,
      createdAt: {
        gte: query.data.dateFrom,
        lte: query.data.dateTo,
      },
      OR: query.data.search
        ? [
            { publicId: { contains: query.data.search, mode: "insensitive" as const } },
            { customerName: { contains: query.data.search, mode: "insensitive" as const } },
            { telegramIdSnapshot: { contains: query.data.search, mode: "insensitive" as const } },
            { telegramUsernameSnapshot: { contains: query.data.search, mode: "insensitive" as const } },
          ]
        : undefined,
    };

    const [total, orders] = await prisma.$transaction([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (query.data.page - 1) * query.data.limit,
        take: query.data.limit,
        include: { items: true },
      }),
    ]);

    return { data: orders.map(serializeOrder), meta: pageMeta(query.data.page, query.data.limit, total) };
  });

  app.get("/api/v1/admin/orders/:id", async (request) => {
    await requireAdmin(request);
    const id = parseId(request);
    const order = await prisma.order.findUnique({ where: { id }, include: { items: true } });
    if (!order) throw notFound("Order not found");
    return { data: serializeOrder(order) };
  });

  app.patch("/api/v1/admin/orders/:id/status", async (request) => {
    const admin = await requireAdmin(request);
    const id = parseId(request);
    const body = z.object({ status: z.nativeEnum(OrderStatus) }).safeParse(request.body);
    if (!body.success) throw badRequest("Invalid status payload", body.error.flatten());

    const before = await prisma.order.findUnique({ where: { id } });
    if (!before) throw notFound("Order not found");
    assertOrderTransition(before.status, body.data.status);

    const now = new Date();
    const order = await prisma.order.update({
      where: { id },
      data: {
        status: body.data.status,
        acceptedAt: body.data.status === "accepted" ? now : before.acceptedAt,
        completedAt: body.data.status === "completed" ? now : before.completedAt,
        cancelledAt: body.data.status === "cancelled" ? now : before.cancelledAt,
      },
      include: { items: true },
    });
    await audit(request, admin.id, "order.status_update", "Order", id, before, order);

    return { data: serializeOrder(order) };
  });

  app.patch("/api/v1/admin/orders/:id/tracking", async (request) => {
    const admin = await requireAdmin(request);
    const id = parseId(request);
    const body = orderTrackingPayload.safeParse(request.body);
    if (!body.success) throw badRequest("Invalid tracking payload", body.error.flatten());
    if (!env.TELEGRAM_BOT_TOKEN) throw badRequest("Telegram bot is not configured");

    const before = await prisma.order.findUnique({ where: { id } });
    if (!before) throw notFound("Order not found");
    if (before.status === OrderStatus.cancelled) throw badRequest("Cancelled orders cannot be completed");
    if (!before.telegramIdSnapshot) throw badRequest("Order has no Telegram recipient");

    const text = formatTrackingTelegramMessage({
      publicId: before.publicId,
      trackingCode: body.data.trackingCode,
      trackingUrl: body.data.trackingUrl,
      message: body.data.message,
    });
    const sent = await sendTelegramJson("sendMessage", {
      chat_id: before.telegramIdSnapshot,
      parse_mode: "HTML",
      disable_web_page_preview: false,
      text,
    }) as { ok?: boolean; description?: string } | null;
    if (!sent?.ok) {
      throw badRequest(sent?.description ?? "Telegram message was not sent");
    }

    const now = new Date();
    const order = await prisma.order.update({
      where: { id },
      data: {
        status: OrderStatus.completed,
        acceptedAt: before.acceptedAt ?? now,
        completedAt: now,
        trackingCode: body.data.trackingCode,
        trackingUrl: body.data.trackingUrl ?? null,
        trackingMessage: body.data.message ?? null,
        trackingSentAt: now,
      },
      include: { items: true },
    });
    await audit(request, admin.id, "order.tracking_sent", "Order", id, before, order);

    return { data: serializeOrder(order) };
  });

  app.patch("/api/v1/admin/orders/:id/comment", async (request) => {
    const admin = await requireAdmin(request);
    const id = parseId(request);
    const body = z.object({ adminComment: z.string().max(2000).nullable() }).safeParse(request.body);
    if (!body.success) throw badRequest("Invalid comment payload", body.error.flatten());

    const order = await prisma.order.update({
      where: { id },
      data: { adminComment: body.data.adminComment },
      include: { items: true },
    });
    await audit(request, admin.id, "order.comment_update", "Order", id, null, order);
    return { data: serializeOrder(order) };
  });

  app.get("/api/v1/admin/users", async (request) => {
    await requireAdmin(request);
    const query = pagingQuery.safeParse(request.query);
    if (!query.success) throw badRequest("Invalid user query", query.error.flatten());

    const where = query.data.search
      ? {
          OR: [
            { name: { contains: query.data.search, mode: "insensitive" as const } },
            { telegramId: { contains: query.data.search, mode: "insensitive" as const } },
            { telegramUsername: { contains: query.data.search, mode: "insensitive" as const } },
          ],
        }
      : {};

    const [total, users] = await prisma.$transaction([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (query.data.page - 1) * query.data.limit,
        take: query.data.limit,
        include: { orders: { select: { totalAmount: true, status: true } } },
      }),
    ]);

    return {
      data: users.map((user) => ({
        ...serializeAuthUser(user),
        email: user.email,
        phone: user.phone,
        createdAt: user.createdAt.toISOString(),
        orderCount: user.orders.length,
        spent: user.orders
          .filter((order) => order.status === "completed")
          .reduce((sum, order) => sum + money(order.totalAmount), 0),
      })),
      meta: pageMeta(query.data.page, query.data.limit, total),
    };
  });

  app.patch("/api/v1/admin/users/:id/status", async (request) => {
    const admin = await requireAdmin(request);
    const id = parseId(request);
    const body = z.object({ status: z.nativeEnum(UserStatus) }).safeParse(request.body);
    if (!body.success) throw badRequest("Invalid user status payload", body.error.flatten());

    const user = await prisma.user.update({ where: { id }, data: { status: body.data.status } });
    await audit(request, admin.id, "user.status_update", "User", id, null, user);
    return { data: serializeAuthUser(user) };
  });

  app.get("/api/v1/admin/contacts", async (request) => {
    await requireAdmin(request);
    const contacts = await prisma.contact.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });
    return { data: contacts };
  });

  app.post("/api/v1/admin/contacts", async (request) => {
    const admin = await requireAdmin(request);
    const body = contactPayload.safeParse(request.body);
    if (!body.success) throw badRequest("Invalid contact payload", body.error.flatten());
    const contact = await prisma.contact.create({ data: body.data });
    await audit(request, admin.id, "contact.create", "Contact", contact.id, null, contact);
    return { data: contact };
  });

  app.patch("/api/v1/admin/contacts/:id", async (request) => {
    const admin = await requireAdmin(request);
    const id = parseId(request);
    const body = contactPayload.partial().safeParse(request.body);
    if (!body.success) throw badRequest("Invalid contact payload", body.error.flatten());
    const contact = await prisma.contact.update({ where: { id }, data: body.data });
    await audit(request, admin.id, "contact.update", "Contact", id, null, contact);
    return { data: contact };
  });

  app.delete("/api/v1/admin/contacts/:id", async (request) => {
    const admin = await requireAdmin(request);
    const id = parseId(request);
    const contact = await prisma.contact.update({ where: { id }, data: { isActive: false } });
    await audit(request, admin.id, "contact.disable", "Contact", id, null, contact);
    return { data: contact };
  });

  app.get("/api/v1/admin/site-settings", async (request) => {
    await requireAdmin(request);
    const settings = await db.siteSettings.upsert({
      where: { id: "site" },
      update: {},
      create: { id: "site" },
    });
    return { data: serializeSiteSettings(settings) };
  });

  app.patch("/api/v1/admin/site-settings", async (request) => {
    const admin = await requireAdmin(request);
    const body = siteSettingsPayload.safeParse(request.body);
    if (!body.success) throw badRequest("Invalid site settings payload", body.error.flatten());

    const before = await db.siteSettings.upsert({
      where: { id: "site" },
      update: {},
      create: { id: "site" },
    });
    const settings = await db.siteSettings.update({
      where: { id: "site" },
      data: body.data,
    });
    await audit(request, admin.id, "site_settings.update", "SiteSettings", "site", before, settings);
    return { data: serializeSiteSettings(settings) };
  });

  app.get("/api/v1/admin/shipping-methods", async (request) => {
    await requireAdmin(request);
    const methods = await db.shippingMethod.findMany({ orderBy: [{ sortOrder: "asc" }, { label: "asc" }] });
    return { data: methods.map(serializeShippingMethod) };
  });

  app.post("/api/v1/admin/shipping-methods", async (request) => {
    const admin = await requireAdmin(request);
    const body = shippingMethodPayload.safeParse(request.body);
    if (!body.success) throw badRequest("Invalid shipping method payload", body.error.flatten());

    const method = await db.shippingMethod.create({
      data: {
        code: body.data.code?.trim() || slugify(body.data.label),
        label: body.data.label,
        isActive: body.data.isActive,
        sortOrder: body.data.sortOrder,
      },
    });
    await audit(request, admin.id, "shipping_method.create", "ShippingMethod", method.id, null, method);
    return { data: serializeShippingMethod(method) };
  });

  app.patch("/api/v1/admin/shipping-methods/:id", async (request) => {
    const admin = await requireAdmin(request);
    const id = parseId(request);
    const body = shippingMethodPayload.partial().safeParse(request.body);
    if (!body.success) throw badRequest("Invalid shipping method payload", body.error.flatten());

    const method = await db.shippingMethod.update({
      where: { id },
      data: {
        ...(body.data.code !== undefined ? { code: body.data.code.trim() || slugify(body.data.label ?? id) } : {}),
        ...(body.data.label !== undefined ? { label: body.data.label } : {}),
        ...(body.data.isActive !== undefined ? { isActive: body.data.isActive } : {}),
        ...(body.data.sortOrder !== undefined ? { sortOrder: body.data.sortOrder } : {}),
      },
    });
    await audit(request, admin.id, "shipping_method.update", "ShippingMethod", id, null, method);
    return { data: serializeShippingMethod(method) };
  });

  app.delete("/api/v1/admin/shipping-methods/:id", async (request) => {
    const admin = await requireAdmin(request);
    const id = parseId(request);
    const method = await db.shippingMethod.update({
      where: { id },
      data: { isActive: false },
    });
    await audit(request, admin.id, "shipping_method.disable", "ShippingMethod", id, null, method);
    return { data: serializeShippingMethod(method) };
  });
}

const contactPayload = z.object({
  type: z.nativeEnum(ContactType),
  label: z.string().min(2).max(120),
  value: z.string().min(1).max(500),
  href: z.string().min(1).max(1000),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

const productInclude = {
  category: { select: { id: true, slug: true, name: true } },
  media: { orderBy: { sortOrder: "asc" as const } },
  priceTiers: { orderBy: { sortOrder: "asc" as const } },
};

async function upsertProduct(productId: string | null, payload: Partial<z.infer<typeof productPayload>>) {
  const slug = payload.slug ?? (payload.name ? slugify(payload.name) : undefined);

  return prisma.$transaction(async (tx) => {
    const product = productId
      ? await tx.product.update({
          where: { id: productId },
          data: {
            ...pickProductFields(payload),
            ...(slug ? { slug } : {}),
          },
        })
      : await tx.product.create({
          data: {
            name: payload.name!,
            slug: slug!,
            brand: payload.brand!,
            categoryId: payload.categoryId!,
            description: payload.description!,
            longDescription: payload.longDescription!,
            badge: payload.badge,
            featured: payload.featured ?? false,
            status: payload.status ?? ProductStatus.active,
            sortOrder: payload.sortOrder ?? 0,
          },
        });

    if (payload.priceTiers) {
      await tx.productPriceTier.deleteMany({ where: { productId: product.id } });
      await tx.productPriceTier.createMany({
        data: payload.priceTiers.map((tier, index) => ({
          productId: product.id,
          label: tier.label,
          amount: tier.amount,
          currency: tier.currency ?? "EUR",
          sortOrder: tier.sortOrder ?? (index + 1) * 10,
          isActive: tier.isActive ?? true,
        })),
      });
    }

    if (payload.media) {
      await tx.productMedia.deleteMany({ where: { productId: product.id } });
      for (const [index, media] of payload.media.entries()) {
        const asset = media.mediaId ? await tx.mediaAsset.findUnique({ where: { id: media.mediaId } }) : null;
        await tx.productMedia.create({
          data: {
            productId: product.id,
            mediaAssetId: asset?.id,
            type: asset?.type ?? media.type ?? MediaType.image,
            url: asset?.url ?? media.url!,
            thumbnailUrl: asset?.thumbnailUrl ?? media.thumbnailUrl,
            mimeType: asset?.mimeType ?? media.mimeType ?? "image/jpeg",
            sizeBytes: asset?.sizeBytes ?? media.sizeBytes ?? 0,
            width: asset?.width,
            height: asset?.height,
            durationSeconds: asset?.durationSeconds,
            sortOrder: media.sortOrder ?? (index + 1) * 10,
            alt: media.alt ?? product.name,
          },
        });
      }
    }

    return tx.product.findUniqueOrThrow({ where: { id: product.id }, include: productInclude });
  });
}

function pickProductFields(payload: Partial<z.infer<typeof productPayload>>) {
  return {
    name: payload.name,
    brand: payload.brand,
    categoryId: payload.categoryId,
    description: payload.description,
    longDescription: payload.longDescription,
    badge: payload.badge,
    featured: payload.featured,
    status: payload.status,
    sortOrder: payload.sortOrder,
  };
}

function parseId(request: FastifyRequest) {
  const params = z.object({ id: z.string().uuid() }).safeParse(request.params);
  if (!params.success) throw badRequest("Invalid id", params.error.flatten());
  return params.data.id;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function formatTrackingTelegramMessage(input: {
  publicId: string;
  trackingCode: string;
  trackingUrl?: string;
  message?: string;
}) {
  return [
    `✅ <b>Ordine ${escapeHtml(input.publicId)} spedito</b>`,
    "",
    `Tracking: <code>${escapeHtml(input.trackingCode)}</code>`,
    input.trackingUrl ? `Link: ${escapeHtml(input.trackingUrl)}` : null,
    input.message ? `\n${escapeHtml(input.message)}` : null,
  ].filter(Boolean).join("\n");
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

async function audit(
  request: FastifyRequest,
  actorUserId: string,
  action: string,
  entityType: string,
  entityId: string | null,
  before: unknown,
  after: unknown,
) {
  await prisma.auditLog.create({
    data: {
      actorUserId,
      action,
      entityType,
      entityId,
      before: toJson(before),
      after: toJson(after),
      ip: request.ip,
      userAgent: request.headers["user-agent"],
    },
  });
}

function toJson(value: unknown) {
  if (value === null || value === undefined) return undefined;
  return JSON.parse(
    JSON.stringify(value, (_key, nestedValue) => {
      if (typeof nestedValue === "bigint") return nestedValue.toString();
      return nestedValue;
    }),
  );
}
