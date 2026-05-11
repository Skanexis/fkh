export interface PriceTier {
  id?: string;
  weight: string;
  price: number;
}

export interface ProductMedia {
  id?: string;
  mediaId?: string;
  type: "image" | "video";
  url: string;
  thumbnailUrl?: string | null;
  alt?: string | null;
  sortOrder?: number;
}

export interface Product {
  id: string;
  slug?: string;
  name: string;
  brand: string;
  category: string;
  description: string;
  longDescription: string;
  images: string[];
  media?: ProductMedia[];
  priceTiers: PriceTier[];
  badge?: string;
  featured?: boolean;
  rating: number;
  reviews: number;
}

export const CATEGORIES = ["Tutti", "Premium", "Gold", "Limited", "New", "Classic"];

export const PRODUCTS: Product[] = [
  {
    id: "1",
    name: "Nero Assoluto",
    brand: "F.K.H",
    category: "Premium",
    description: "Extract premium di alta qualità",
    longDescription: "Nero Assoluto è il nostro estratto di punta, ottenuto attraverso un processo di estrazione a freddo che preserva tutti gli aromi e i principi attivi. Una scelta di lusso per i palati più esigenti.",
    images: [
      "https://images.unsplash.com/photo-1613031876173-da7407c43fff?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800",
      "https://images.unsplash.com/photo-1758903846707-7e34aa99175c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800",
    ],
    priceTiers: [
      { weight: "1g", price: 10 },
      { weight: "2g", price: 18 },
      { weight: "3g", price: 25 },
      { weight: "5g", price: 40 },
    ],
    badge: "Best Seller",
    featured: true,
    rating: 4.9,
    reviews: 128,
  },
  {
    id: "2",
    name: "Oro Puro",
    brand: "F.K.H",
    category: "Gold",
    description: "Riserva speciale dorata",
    longDescription: "Oro Puro rappresenta il culmine della nostra arte estrattiva. Una riserva speciale con note calde e avvolgenti, dal colore ambrato intenso.",
    images: [
      "https://images.unsplash.com/photo-1737920459846-2d0318700658?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800",
      "https://images.unsplash.com/photo-1749497636434-82e53b6358b2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800",
    ],
    priceTiers: [
      { weight: "1g", price: 15 },
      { weight: "2g", price: 28 },
      { weight: "3g", price: 38 },
      { weight: "5g", price: 60 },
    ],
    badge: "Gold",
    featured: true,
    rating: 4.8,
    reviews: 95,
  },
  {
    id: "3",
    name: "Cristallo Verde",
    brand: "F.K.H",
    category: "New",
    description: "Selezione primaverile esclusiva",
    longDescription: "Cristallo Verde è una selezione stagionale di rara freschezza. Il processo di raccolta manuale garantisce un prodotto di eccezionale purezza.",
    images: [
      "https://images.unsplash.com/photo-1567797005083-7b88aee866b7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800",
      "https://images.unsplash.com/photo-1599989687563-8d28144a3cc4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800",
    ],
    priceTiers: [
      { weight: "1g", price: 12 },
      { weight: "2g", price: 22 },
      { weight: "3g", price: 30 },
      { weight: "5g", price: 48 },
    ],
    badge: "New",
    rating: 4.7,
    reviews: 42,
  },
  {
    id: "4",
    name: "Perla Nera",
    brand: "F.K.H",
    category: "Limited",
    description: "Edizione limitata esclusiva",
    longDescription: "Perla Nera è una produzione limitatissima, disponibile solo in quantità ristrette. Un'esperienza sensoriale unica e irripetibile per i veri intenditori.",
    images: [
      "https://images.unsplash.com/photo-1733138187329-1663b79464b3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800",
      "https://images.unsplash.com/photo-1679139350905-883f2fa05101?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800",
    ],
    priceTiers: [
      { weight: "1g", price: 20 },
      { weight: "2g", price: 38 },
      { weight: "3g", price: 54 },
    ],
    badge: "Limited",
    featured: true,
    rating: 5.0,
    reviews: 17,
  },
  {
    id: "5",
    name: "Ambra Classica",
    brand: "F.K.H",
    category: "Classic",
    description: "La nostra ricetta originale",
    longDescription: "Ambra Classica è il prodotto storico di F.K.H, la ricetta originale che ha reso famoso il nostro marchio. Equilibrata, raffinata e sempre affidabile.",
    images: [
      "https://images.unsplash.com/photo-1679139350905-883f2fa05101?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800",
      "https://images.unsplash.com/photo-1613031876173-da7407c43fff?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800",
    ],
    priceTiers: [
      { weight: "1g", price: 8 },
      { weight: "2g", price: 15 },
      { weight: "3g", price: 21 },
      { weight: "5g", price: 33 },
      { weight: "10g", price: 60 },
    ],
    rating: 4.6,
    reviews: 203,
  },
  {
    id: "6",
    name: "Fumo d'Oriente",
    brand: "F.K.H",
    category: "Premium",
    description: "Aromi esotici dall'est",
    longDescription: "Fumo d'Oriente racchiude il mistero e il fascino delle spezie orientali. Un blend esclusivo con note esotiche e avvolgenti che trasportano i sensi.",
    images: [
      "https://images.unsplash.com/photo-1758903846707-7e34aa99175c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800",
      "https://images.unsplash.com/photo-1567797005083-7b88aee866b7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800",
    ],
    priceTiers: [
      { weight: "1g", price: 12 },
      { weight: "2g", price: 22 },
      { weight: "3g", price: 30 },
      { weight: "5g", price: 46 },
    ],
    rating: 4.7,
    reviews: 76,
  },
];

export const MOCK_ORDERS = [
  {
    id: "ORD-001",
    date: "2026-05-01",
    status: "accepted" as const,
    items: [{ productId: "1", name: "Nero Assoluto", weight: "2g", price: 18, qty: 1 }],
    total: 18,
  },
  {
    id: "ORD-002",
    date: "2026-04-28",
    status: "pending" as const,
    items: [
      { productId: "2", name: "Oro Puro", weight: "1g", price: 15, qty: 2 },
      { productId: "5", name: "Ambra Classica", weight: "3g", price: 21, qty: 1 },
    ],
    total: 51,
  },
  {
    id: "ORD-003",
    date: "2026-04-15",
    status: "completed" as const,
    items: [{ productId: "4", name: "Perla Nera", weight: "2g", price: 38, qty: 1 }],
    total: 38,
  },
  {
    id: "ORD-004",
    date: "2026-03-20",
    status: "completed" as const,
    items: [{ productId: "3", name: "Cristallo Verde", weight: "5g", price: 48, qty: 1 }],
    total: 48,
  },
];

export const ADMIN_STATS = {
  totalRevenue: 12480,
  totalOrders: 284,
  totalUsers: 156,
  pendingOrders: 12,
};

export const ADMIN_ORDERS = [
  { id: "ORD-284", user: "Marco R.", product: "Nero Assoluto 2g", total: 18, status: "pending" as const, date: "2026-05-08" },
  { id: "ORD-283", user: "Giulia M.", product: "Oro Puro 3g", total: 38, status: "accepted" as const, date: "2026-05-08" },
  { id: "ORD-282", user: "Luca B.", product: "Perla Nera 1g", total: 20, status: "pending" as const, date: "2026-05-07" },
  { id: "ORD-281", user: "Sofia C.", product: "Ambra Classica 10g", total: 60, status: "completed" as const, date: "2026-05-07" },
  { id: "ORD-280", user: "Alessandro T.", product: "Cristallo Verde 3g", total: 30, status: "accepted" as const, date: "2026-05-06" },
  { id: "ORD-279", user: "Federica N.", product: "Fumo d'Oriente 2g", total: 22, status: "completed" as const, date: "2026-05-06" },
  { id: "ORD-278", user: "Roberto P.", product: "Oro Puro 5g", total: 60, status: "completed" as const, date: "2026-05-05" },
];

export const ADMIN_USERS = [
  { id: "U001", name: "Marco Rossi", email: "marco@email.com", orders: 12, spent: 340, joined: "2025-11-02", active: true },
  { id: "U002", name: "Giulia Mancini", email: "giulia@email.com", orders: 8, spent: 220, joined: "2025-12-14", active: true },
  { id: "U003", name: "Luca Bianchi", email: "luca@email.com", orders: 5, spent: 110, joined: "2026-01-05", active: true },
  { id: "U004", name: "Sofia Conti", email: "sofia@email.com", orders: 22, spent: 680, joined: "2025-09-20", active: true },
  { id: "U005", name: "Alessandro Tori", email: "alex@email.com", orders: 3, spent: 85, joined: "2026-03-11", active: false },
  { id: "U006", name: "Federica Neri", email: "fed@email.com", orders: 18, spent: 520, joined: "2025-10-30", active: true },
];
