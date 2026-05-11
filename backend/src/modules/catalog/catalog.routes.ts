import type { FastifyInstance } from "fastify";
import { ProductStatus } from "@prisma/client";
import { z } from "zod";
import { badRequest, notFound } from "../../common/http-error.js";
import { pageMeta, money } from "../../common/serialize.js";
import { prisma } from "../../db/prisma.js";

const db = prisma as typeof prisma & {
  siteSettings: {
    upsert: (args: any) => Promise<any>;
  };
  shippingMethod: {
    findMany: (args: any) => Promise<any[]>;
  };
};

const productListQuery = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
  featured: z.coerce.boolean().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20),
  sort: z.enum(["newest", "popular", "price_asc", "price_desc"]).default("newest"),
});

export async function registerCatalogRoutes(app: FastifyInstance) {
  app.get("/api/v1/categories", async () => {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, slug: true, name: true, sortOrder: true },
    });
    return { data: categories };
  });

  app.get("/api/v1/products", async (request) => {
    const query = productListQuery.safeParse(request.query);
    if (!query.success) throw badRequest("Invalid product query", query.error.flatten());

    const { search, category, featured, page, limit, sort } = query.data;
    const where = {
      status: ProductStatus.active,
      featured,
      category: category ? { slug: category, isActive: true } : undefined,
      OR: search
        ? [
            { name: { contains: search, mode: "insensitive" as const } },
            { brand: { contains: search, mode: "insensitive" as const } },
            { description: { contains: search, mode: "insensitive" as const } },
          ]
        : undefined,
    };

    const orderBy =
      sort === "popular"
        ? [{ featured: "desc" as const }, { reviewsCount: "desc" as const }]
        : sort === "newest"
          ? [{ createdAt: "desc" as const }]
          : [{ createdAt: "desc" as const }];

    const [total, products] = await prisma.$transaction([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: productInclude,
      }),
    ]);

    const serialized = products.map(serializeProduct);
    const sorted =
      sort === "price_asc" || sort === "price_desc"
        ? serialized.sort((a, b) => {
            const left = a.priceTiers[0]?.amount ?? 0;
            const right = b.priceTiers[0]?.amount ?? 0;
            return sort === "price_asc" ? left - right : right - left;
          })
        : serialized;

    return { data: sorted, meta: pageMeta(page, limit, total) };
  });

  app.get("/api/v1/products/:slug", async (request) => {
    const params = z.object({ slug: z.string().min(1) }).safeParse(request.params);
    if (!params.success) throw badRequest("Invalid product slug", params.error.flatten());

    const product = await prisma.product.findFirst({
      where: { slug: params.data.slug, status: ProductStatus.active },
      include: productInclude,
    });

    if (!product) throw notFound("Product not found");

    const related = await prisma.product.findMany({
      where: {
        id: { not: product.id },
        categoryId: product.categoryId,
        status: ProductStatus.active,
      },
      take: 4,
      include: productInclude,
    });

    return { data: { ...serializeProduct(product), relatedProducts: related.map(serializeProduct) } };
  });

  app.get("/api/v1/contacts", async () => {
    const contacts = await prisma.contact.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
    return { data: contacts };
  });

  app.get("/api/v1/site-settings", async () => {
    const settings = await db.siteSettings.upsert({
      where: { id: "site" },
      update: {},
      create: { id: "site" },
    });
    return { data: serializeSiteSettings(settings) };
  });

  app.get("/api/v1/shipping-methods", async () => {
    const methods = await db.shippingMethod.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
    });
    return { data: methods.map(serializeShippingMethod) };
  });
}

const productInclude = {
  category: { select: { id: true, slug: true, name: true } },
  media: { orderBy: { sortOrder: "asc" as const } },
  priceTiers: { where: { isActive: true }, orderBy: { sortOrder: "asc" as const } },
};

export function serializeProduct(product: any) {
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    brand: product.brand,
    category: product.category,
    description: product.description,
    longDescription: product.longDescription,
    badge: product.badge,
    featured: product.featured,
    rating: product.rating === null ? null : money(product.rating),
    reviewsCount: product.reviewsCount,
    media: product.media.map((media: any) => ({
      id: media.id,
      type: media.type,
      url: media.url,
      thumbnailUrl: media.thumbnailUrl,
      alt: media.alt,
      sortOrder: media.sortOrder,
    })),
    priceTiers: product.priceTiers.map((tier: any) => ({
      id: tier.id,
      label: tier.label,
      amount: money(tier.amount),
      currency: tier.currency,
      sortOrder: tier.sortOrder,
    })),
  };
}

export function serializeSiteSettings(settings: any) {
  return {
    brandName: settings.brandName,
    logoUrl: settings.logoUrl,
    updatedAt: settings.updatedAt.toISOString(),
  };
}

export function serializeShippingMethod(method: any) {
  return {
    id: method.id,
    code: method.code,
    label: method.label,
    priceAmount: money(effectiveShippingPrice(method)),
    isActive: method.isActive,
    sortOrder: method.sortOrder,
  };
}

function inferShippingPrice(label: string) {
  const match = label.match(/(\d+(?:[.,]\d+)?)\s*(?:EUR|€)/i);
  return match ? Number(match[1].replace(",", ".")) : 0;
}

function effectiveShippingPrice(method: any) {
  const price = money(method.priceAmount ?? 0);
  return price > 0 ? price : inferShippingPrice(method.label);
}
