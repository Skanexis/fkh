import { PrismaClient, ProductStatus, ContactType, MediaType, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

const categories = [
  { slug: "drysift", name: "Drysift", sortOrder: 10, isActive: true },
  { slug: "frozen", name: "Frozen", sortOrder: 20, isActive: true },
  { slug: "static", name: "Static", sortOrder: 30, isActive: true },
  { slug: "usa", name: "USA", sortOrder: 40, isActive: true },
  { slug: "cali", name: "Cali", sortOrder: 50, isActive: true },
  { slug: "vapes", name: "Vapes", sortOrder: 60, isActive: true },
];

const products = [
  {
    slug: "drysift-premium",
    name: "DRYSIFT PREMIUM",
    brand: "F.K.H",
    category: "drysift",
    description: "Premium Moroccan drysift selection.",
    longDescription:
      "DRYSIFT PREMIUM from Morocco. Shipping worldwide from Barcelona. Tracking available in 24h.",
    images: [
      "https://images.unsplash.com/photo-1515823064-d6e0c04616a7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800",
    ],
    priceTiers: [
      { label: "100g", amount: 350 },
      { label: "500g", amount: 1300 },
      { label: "1kg", amount: 2500 },
    ],
    badge: "Morocco",
    featured: true,
    rating: 4.9,
    reviewsCount: 40,
  },
  {
    slug: "fkh120-2k25",
    name: "FKH120 2K25",
    brand: "F.K.H",
    category: "drysift",
    description: "FKH120 2K25 premium batch.",
    longDescription:
      "FKH120 2K25 premium batch. Shipping worldwide from Barcelona. Tracking available in 24h.",
    images: [
      "https://images.unsplash.com/photo-1515823064-d6e0c04616a7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800",
    ],
    priceTiers: [
      { label: "100g", amount: 350 },
      { label: "500g", amount: 1300 },
      { label: "1kg", amount: 2400 },
    ],
    badge: "2K25",
    featured: true,
    rating: 4.8,
    reviewsCount: 36,
  },
  {
    slug: "fkh120-2k26",
    name: "FKH120 2K26",
    brand: "F.K.H",
    category: "drysift",
    description: "FKH120 2K26 premium batch.",
    longDescription:
      "FKH120 2K26 premium batch. Shipping worldwide from Barcelona. Tracking available in 24h.",
    images: [
      "https://images.unsplash.com/photo-1515823064-d6e0c04616a7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800",
    ],
    priceTiers: [
      { label: "100g", amount: 350 },
      { label: "500g", amount: 1350 },
      { label: "1kg", amount: 2500 },
    ],
    badge: "2K26",
    featured: true,
    rating: 4.9,
    reviewsCount: 38,
  },
  {
    slug: "la-commissione-frozen-105u",
    name: "LA COMMISSIONE",
    brand: "F.K.H",
    category: "frozen",
    description: "Frozen 105u selection.",
    longDescription:
      "LA COMMISSIONE Frozen 105u. Shipping worldwide from Barcelona. Tracking available in 24h.",
    images: [
      "https://images.unsplash.com/photo-1515823064-d6e0c04616a7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800",
    ],
    priceTiers: [
      { label: "50g", amount: 250 },
      { label: "100g", amount: 450 },
      { label: "1kg", amount: 3800 },
    ],
    badge: "Frozen 105u",
    featured: true,
    rating: 4.8,
    reviewsCount: 31,
  },
  {
    slug: "eggs-frozen-90u",
    name: "EGGS FROZEN 90u",
    brand: "F.K.H",
    category: "frozen",
    description: "Moroccan Eggs Frozen 90u.",
    longDescription:
      "EGGS FROZEN 90u from Morocco. Shipping worldwide from Barcelona. Tracking available in 24h.",
    images: [
      "https://images.unsplash.com/photo-1515823064-d6e0c04616a7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800",
    ],
    priceTiers: [
      { label: "50g", amount: 250 },
      { label: "100g", amount: 450 },
      { label: "1kg", amount: 4000 },
    ],
    badge: "Morocco",
    featured: true,
    rating: 4.8,
    reviewsCount: 28,
  },
  {
    slug: "frozen-premium",
    name: "FROZEN PREMIUM",
    brand: "F.K.H",
    category: "frozen",
    description: "Premium Moroccan frozen selection.",
    longDescription:
      "FROZEN PREMIUM from Morocco. Shipping worldwide from Barcelona. Tracking available in 24h.",
    images: [
      "https://images.unsplash.com/photo-1515823064-d6e0c04616a7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800",
    ],
    priceTiers: [
      { label: "50g", amount: 350 },
      { label: "100g", amount: 650 },
      { label: "1kg", amount: 6000 },
    ],
    badge: "Premium",
    featured: true,
    rating: 4.9,
    reviewsCount: 34,
  },
  {
    slug: "static-super-roocks",
    name: "STATIC SUPER ROOCKS",
    brand: "F.K.H",
    category: "static",
    description: "Moroccan static super roocks.",
    longDescription:
      "STATIC SUPER ROOCKS from Morocco. Shipping worldwide from Barcelona. Tracking available in 24h.",
    images: [
      "https://images.unsplash.com/photo-1515823064-d6e0c04616a7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800",
    ],
    priceTiers: [
      { label: "50g", amount: 350 },
      { label: "100g", amount: 650 },
      { label: "1kg", amount: 6000 },
    ],
    badge: "Static",
    featured: true,
    rating: 4.9,
    reviewsCount: 26,
  },
  {
    slug: "static-90u",
    name: "STATIC 90u",
    brand: "F.K.H",
    category: "static",
    description: "Moroccan static 90u selection.",
    longDescription:
      "STATIC 90u from Morocco. Shipping worldwide from Barcelona. Tracking available in 24h.",
    images: [
      "https://images.unsplash.com/photo-1515823064-d6e0c04616a7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800",
    ],
    priceTiers: [
      { label: "50g", amount: 400 },
      { label: "100g", amount: 700 },
      { label: "1kg", amount: 6200 },
    ],
    badge: "Static 90u",
    featured: true,
    rating: 4.9,
    reviewsCount: 24,
  },
  {
    slug: "static-73u",
    name: "STATIC 73u",
    brand: "F.K.H",
    category: "static",
    description: "Moroccan static 73u selection.",
    longDescription:
      "STATIC 73u from Morocco. Shipping worldwide from Barcelona. Tracking available in 24h.",
    images: [
      "https://images.unsplash.com/photo-1515823064-d6e0c04616a7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800",
    ],
    priceTiers: [
      { label: "50g", amount: 450 },
      { label: "100g", amount: 750 },
      { label: "1kg", amount: 6500 },
    ],
    badge: "Static 73u",
    featured: true,
    rating: 4.9,
    reviewsCount: 23,
  },
  {
    slug: "drysift-usa",
    name: "DRYSIFT USA",
    brand: "F.K.H",
    category: "usa",
    description: "USA drysift selection.",
    longDescription:
      "DRYSIFT USA selection. Shipping worldwide from Barcelona. Tracking available in 24h.",
    images: [
      "https://images.unsplash.com/photo-1515823064-d6e0c04616a7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800",
    ],
    priceTiers: [
      { label: "100g", amount: 1000 },
      { label: "1kg", amount: 8500 },
    ],
    badge: "USA",
    featured: false,
    rating: 4.8,
    reviewsCount: 18,
  },
  {
    slug: "waterhash-siftedgold",
    name: "WATERHASH SIFTEDGOLD",
    brand: "F.K.H",
    category: "usa",
    description: "USA Waterhash Siftedgold.",
    longDescription:
      "WATERHASH SIFTEDGOLD USA. Shipping worldwide from Barcelona. Tracking available in 24h.",
    images: [
      "https://images.unsplash.com/photo-1515823064-d6e0c04616a7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800",
    ],
    priceTiers: [
      { label: "100g", amount: 1000 },
      { label: "1kg", amount: 8500 },
    ],
    badge: "USA",
    featured: false,
    rating: 4.8,
    reviewsCount: 17,
  },
  {
    slug: "siftedgold-static-usa",
    name: "SIFTEDGOLD STATIC USA",
    brand: "F.K.H",
    category: "usa",
    description: "Siftedgold Static USA.",
    longDescription:
      "SIFTEDGOLD STATIC USA selection. Shipping worldwide from Barcelona. Tracking available in 24h.",
    images: [
      "https://images.unsplash.com/photo-1515823064-d6e0c04616a7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800",
    ],
    priceTiers: [
      { label: "10g", amount: 300 },
      { label: "50g", amount: 1200 },
      { label: "100g", amount: 2100 },
    ],
    badge: "Static USA",
    featured: false,
    rating: 4.8,
    reviewsCount: 20,
  },
  {
    slug: "wonka-static-usa",
    name: "WONKA STATIC USA",
    brand: "F.K.H",
    category: "usa",
    description: "Wonka Static USA.",
    longDescription:
      "WONKA STATIC USA selection. Shipping worldwide from Barcelona. Tracking available in 24h.",
    images: [
      "https://images.unsplash.com/photo-1515823064-d6e0c04616a7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800",
    ],
    priceTiers: [
      { label: "10g", amount: 300 },
      { label: "50g", amount: 1250 },
    ],
    badge: "USA",
    featured: false,
    rating: 4.8,
    reviewsCount: 16,
  },
  {
    slug: "cali-usa-premium-exotic-black-cherry-coke",
    name: "CALI USA PREMIUM EXOTIC",
    brand: "Black Cherry Coke",
    category: "cali",
    description: "Cali USA Premium Exotic - Black Cherry Coke.",
    longDescription:
      "CALI USA PREMIUM EXOTIC Black Cherry Coke. Shipping worldwide from Barcelona. Tracking available in 24h.",
    images: [
      "https://images.unsplash.com/photo-1515823064-d6e0c04616a7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800",
    ],
    priceTiers: [
      { label: "28g", amount: 325 },
      { label: "56g", amount: 600 },
      { label: "112g", amount: 1100 },
      { label: "224g", amount: 2000 },
      { label: "1lb", amount: 4000 },
    ],
    badge: "Exotic",
    featured: true,
    rating: 4.8,
    reviewsCount: 22,
  },
  {
    slug: "vapes-usa",
    name: "VAPES USA",
    brand: "F.K.H",
    category: "vapes",
    description: "USA vapes.",
    longDescription:
      "VAPES USA. Shipping worldwide from Barcelona. Tracking available in 24h.",
    images: [
      "https://images.unsplash.com/photo-1601924638867-3a6de6b7a500?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800",
    ],
    priceTiers: [
      { label: "1u", amount: 50 },
      { label: "10u", amount: 400 },
    ],
    badge: "USA",
    featured: false,
    rating: 4.7,
    reviewsCount: 14,
  },
];

async function main() {
  await prisma.product.updateMany({
    where: {
      slug: {
        in: [
          "nero-assoluto",
          "oro-puro",
          "cristallo-verde",
          "perla-nera",
          "ambra-classica",
          "fumo-d-oriente",
        ],
      },
    },
    data: { status: ProductStatus.archived },
  });

  await prisma.category.updateMany({
    where: { slug: { in: ["premium", "gold", "limited", "new", "classic"] } },
    data: { isActive: false },
  });

  for (const category of categories) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: category,
      create: category,
    });
  }

  for (const product of products) {
    const category = await prisma.category.findUniqueOrThrow({ where: { slug: product.category } });

    const savedProduct = await prisma.product.upsert({
      where: { slug: product.slug },
      update: {
        name: product.name,
        brand: product.brand,
        categoryId: category.id,
        description: product.description,
        longDescription: product.longDescription,
        badge: product.badge,
        featured: product.featured,
        rating: product.rating,
        reviewsCount: product.reviewsCount,
        status: ProductStatus.active,
      },
      create: {
        slug: product.slug,
        name: product.name,
        brand: product.brand,
        categoryId: category.id,
        description: product.description,
        longDescription: product.longDescription,
        badge: product.badge,
        featured: product.featured,
        rating: product.rating,
        reviewsCount: product.reviewsCount,
        status: ProductStatus.active,
        media: {
          create: product.images.map((url, index) => ({
            type: MediaType.image,
            url,
            thumbnailUrl: url,
            mimeType: "image/jpeg",
            sizeBytes: 0,
            sortOrder: (index + 1) * 10,
            alt: product.name,
          })),
        },
        priceTiers: {
          create: product.priceTiers.map((tier, index) => ({
            label: tier.label,
            amount: tier.amount,
            currency: "EUR",
            sortOrder: (index + 1) * 10,
            isActive: true,
          })),
        },
      },
    });

    await prisma.productPriceTier.updateMany({
      where: {
        productId: savedProduct.id,
        label: { notIn: product.priceTiers.map((tier) => tier.label) },
      },
      data: { isActive: false },
    });

    for (const [index, tier] of product.priceTiers.entries()) {
      const existingTier = await prisma.productPriceTier.findFirst({
        where: { productId: savedProduct.id, label: tier.label },
      });
      const tierData = {
        amount: tier.amount,
        currency: "EUR",
        sortOrder: (index + 1) * 10,
        isActive: true,
      };

      if (existingTier) {
        await prisma.productPriceTier.update({
          where: { id: existingTier.id },
          data: tierData,
        });
      } else {
        await prisma.productPriceTier.create({
          data: {
            productId: savedProduct.id,
            label: tier.label,
            ...tierData,
          },
        });
      }
    }

    for (const [index, url] of product.images.entries()) {
      const existingMedia = await prisma.productMedia.findFirst({
        where: { productId: savedProduct.id, url },
      });
      const mediaData = {
        type: MediaType.image,
        url,
        thumbnailUrl: url,
        mimeType: "image/jpeg",
        sizeBytes: 0,
        sortOrder: (index + 1) * 10,
        alt: product.name,
      };

      if (existingMedia) {
        await prisma.productMedia.update({
          where: { id: existingMedia.id },
          data: mediaData,
        });
      } else {
        await prisma.productMedia.create({
          data: {
            productId: savedProduct.id,
            ...mediaData,
          },
        });
      }
    }
  }

  const adminIds = (process.env.TELEGRAM_ADMIN_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  for (const telegramId of adminIds) {
    await prisma.user.upsert({
      where: { telegramId },
      update: { role: UserRole.admin, status: "active" },
      create: {
        telegramId,
        telegramUsername: null,
        name: `Admin ${telegramId}`,
        role: UserRole.admin,
      },
    });
  }

  const contacts = [
    {
      id: "seed-linktree-contact",
      type: ContactType.custom,
      label: "Linktree",
      value: "familykinghash2.0",
      href: "https://linktr.ee/familykinghash2.0",
      sortOrder: 5,
    },
    {
      id: "seed-instagram-contact",
      type: ContactType.custom,
      label: "Instagram",
      value: "familykinghshofficial",
      href: "https://www.instagram.com/familykinghshofficial?igsh=MW02aG02MTNwMWVsbQ%3D%3D&utm_source=qr",
      sortOrder: 15,
    },
    {
      id: "seed-telegram-contact",
      type: ContactType.telegram,
      label: "Telegram",
      value: "@aureliocasillas3",
      href: "https://t.me/aureliocasillas3",
      sortOrder: 20,
    },
    {
      id: "seed-signal-contact",
      type: ContactType.custom,
      label: "Signal",
      value: "Secure chat",
      href: "https://signal.me/#eu/uy4MO_w49Rffj-kMz7YNazKvZV2a7ujUbGTtjoi8__36geihO35O-qe2OJEk8aOc",
      sortOrder: 30,
    },
    {
      id: "seed-threema-contact",
      type: ContactType.custom,
      label: "Threema",
      value: "P9CN86Z8",
      href: "https://threema.id/P9CN86Z8",
      sortOrder: 40,
    },
  ];

  for (const contact of contacts) {
    await prisma.contact.upsert({
      where: { id: contact.id },
      update: {
        type: contact.type,
        label: contact.label,
        value: contact.value,
        href: contact.href,
        isActive: true,
        sortOrder: contact.sortOrder,
      },
      create: {
        ...contact,
        isActive: true,
      },
    });
  }

  const shippingMethodDb = prisma as PrismaClient & {
    shippingMethod: {
      upsert: (args: any) => Promise<unknown>;
    };
  };

  for (const [index, method] of [
    { code: "correos-spain", label: "Correos Spain - 50 EUR" },
    { code: "inpost", label: "InPost / Mondial Relay - 20 EUR" },
    { code: "seur", label: "Seur / DPD / BRT - 50 EUR" },
    { code: "ups", label: "UPS - 50 EUR" },
    { code: "dhl", label: "DHL - 50 EUR" },
  ].entries()) {
    await shippingMethodDb.shippingMethod.upsert({
      where: { code: method.code },
      update: {
        label: method.label,
        isActive: true,
        sortOrder: (index + 1) * 10,
      },
      create: {
        code: method.code,
        label: method.label,
        isActive: true,
        sortOrder: (index + 1) * 10,
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
