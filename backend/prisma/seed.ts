import { PrismaClient, ProductStatus, ContactType, MediaType, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

const categories = [
  { slug: "premium", name: "Premium", sortOrder: 10 },
  { slug: "gold", name: "Gold", sortOrder: 20 },
  { slug: "limited", name: "Limited", sortOrder: 30 },
  { slug: "new", name: "New", sortOrder: 40 },
  { slug: "classic", name: "Classic", sortOrder: 50 },
];

const products = [
  {
    slug: "nero-assoluto",
    name: "Nero Assoluto",
    brand: "F.K.H",
    category: "premium",
    description: "Extract premium di alta qualita",
    longDescription:
      "Nero Assoluto e il nostro estratto di punta, ottenuto attraverso un processo di estrazione a freddo che preserva tutti gli aromi e i principi attivi. Una scelta di lusso per i palati piu esigenti.",
    images: [
      "https://images.unsplash.com/photo-1613031876173-da7407c43fff?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800",
      "https://images.unsplash.com/photo-1758903846707-7e34aa99175c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800",
    ],
    priceTiers: [
      { label: "1g", amount: 10 },
      { label: "2g", amount: 18 },
      { label: "3g", amount: 25 },
      { label: "5g", amount: 40 },
    ],
    badge: "Best Seller",
    featured: true,
    rating: 4.9,
    reviewsCount: 128,
  },
  {
    slug: "oro-puro",
    name: "Oro Puro",
    brand: "F.K.H",
    category: "gold",
    description: "Riserva speciale dorata",
    longDescription:
      "Oro Puro rappresenta il culmine della nostra arte estrattiva. Una riserva speciale con note calde e avvolgenti, dal colore ambrato intenso.",
    images: [
      "https://images.unsplash.com/photo-1737920459846-2d0318700658?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800",
      "https://images.unsplash.com/photo-1749497636434-82e53b6358b2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800",
    ],
    priceTiers: [
      { label: "1g", amount: 15 },
      { label: "2g", amount: 28 },
      { label: "3g", amount: 38 },
      { label: "5g", amount: 60 },
    ],
    badge: "Gold",
    featured: true,
    rating: 4.8,
    reviewsCount: 95,
  },
  {
    slug: "cristallo-verde",
    name: "Cristallo Verde",
    brand: "F.K.H",
    category: "new",
    description: "Selezione primaverile esclusiva",
    longDescription:
      "Cristallo Verde e una selezione stagionale di rara freschezza. Il processo di raccolta manuale garantisce un prodotto di eccezionale purezza.",
    images: [
      "https://images.unsplash.com/photo-1567797005083-7b88aee866b7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800",
      "https://images.unsplash.com/photo-1599989687563-8d28144a3cc4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800",
    ],
    priceTiers: [
      { label: "1g", amount: 12 },
      { label: "2g", amount: 22 },
      { label: "3g", amount: 30 },
      { label: "5g", amount: 48 },
    ],
    badge: "New",
    featured: false,
    rating: 4.7,
    reviewsCount: 42,
  },
  {
    slug: "perla-nera",
    name: "Perla Nera",
    brand: "F.K.H",
    category: "limited",
    description: "Edizione limitata esclusiva",
    longDescription:
      "Perla Nera e una produzione limitatissima, disponibile solo in quantita ristrette. Un'esperienza sensoriale unica e irripetibile per i veri intenditori.",
    images: [
      "https://images.unsplash.com/photo-1733138187329-1663b79464b3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800",
      "https://images.unsplash.com/photo-1679139350905-883f2fa05101?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800",
    ],
    priceTiers: [
      { label: "1g", amount: 20 },
      { label: "2g", amount: 38 },
      { label: "3g", amount: 54 },
    ],
    badge: "Limited",
    featured: true,
    rating: 5.0,
    reviewsCount: 17,
  },
  {
    slug: "ambra-classica",
    name: "Ambra Classica",
    brand: "F.K.H",
    category: "classic",
    description: "La nostra ricetta originale",
    longDescription:
      "Ambra Classica e il prodotto storico di F.K.H, la ricetta originale che ha reso famoso il nostro marchio. Equilibrata, raffinata e sempre affidabile.",
    images: [
      "https://images.unsplash.com/photo-1679139350905-883f2fa05101?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800",
      "https://images.unsplash.com/photo-1613031876173-da7407c43fff?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800",
    ],
    priceTiers: [
      { label: "1g", amount: 8 },
      { label: "2g", amount: 15 },
      { label: "3g", amount: 21 },
      { label: "5g", amount: 33 },
      { label: "10g", amount: 60 },
    ],
    featured: false,
    rating: 4.6,
    reviewsCount: 203,
  },
  {
    slug: "fumo-d-oriente",
    name: "Fumo d'Oriente",
    brand: "F.K.H",
    category: "premium",
    description: "Aromi esotici dall'est",
    longDescription:
      "Fumo d'Oriente racchiude il mistero e il fascino delle spezie orientali. Un blend esclusivo con note esotiche e avvolgenti che trasportano i sensi.",
    images: [
      "https://images.unsplash.com/photo-1758903846707-7e34aa99175c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800",
      "https://images.unsplash.com/photo-1567797005083-7b88aee866b7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800",
    ],
    priceTiers: [
      { label: "1g", amount: 12 },
      { label: "2g", amount: 22 },
      { label: "3g", amount: 30 },
      { label: "5g", amount: 46 },
    ],
    featured: false,
    rating: 4.7,
    reviewsCount: 76,
  },
];

async function main() {
  for (const category of categories) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: category,
      create: category,
    });
  }

  for (const product of products) {
    const category = await prisma.category.findUniqueOrThrow({ where: { slug: product.category } });

    await prisma.product.upsert({
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

  await prisma.contact.upsert({
    where: { id: "seed-telegram-contact" },
    update: {
      type: ContactType.telegram,
      label: "Telegram",
      value: "@the_fkh",
      href: "https://t.me/the_fkh",
      isActive: true,
      sortOrder: 10,
    },
    create: {
      id: "seed-telegram-contact",
      type: ContactType.telegram,
      label: "Telegram",
      value: "@the_fkh",
      href: "https://t.me/the_fkh",
      isActive: true,
      sortOrder: 10,
    },
  });
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
