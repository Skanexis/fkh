export interface ApiCategory {
  id: string;
  slug: string;
  name: string;
  sortOrder: number;
}

export interface ApiProductMedia {
  id: string;
  type: "image" | "video";
  url: string;
  thumbnailUrl?: string | null;
  alt?: string | null;
  sortOrder: number;
}

export interface ApiPriceTier {
  id: string;
  label: string;
  amount: number;
  currency: string;
  sortOrder: number;
}

export interface ApiProduct {
  id: string;
  slug: string;
  name: string;
  brand: string;
  category: ApiCategory;
  description: string;
  longDescription: string;
  badge?: string | null;
  featured: boolean;
  rating?: number | null;
  reviewsCount: number;
  media: ApiProductMedia[];
  priceTiers: ApiPriceTier[];
  relatedProducts?: ApiProduct[];
}

export interface ApiUser {
  id: string;
  name: string;
  telegramId: string;
  telegramUsername?: string | null;
  telegramPhotoUrl?: string | null;
  avatarUrl?: string | null;
  role: "user" | "admin";
  status: "active" | "blocked" | "deleted";
}

export interface ApiOrderItem {
  id: string;
  productId: string;
  productName: string;
  productBrand: string;
  priceTierId: string;
  priceTierLabel: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  thumbnailUrl?: string | null;
}

export interface ApiOrder {
  id: string;
  publicId: string;
  userId: string;
  telegramIdSnapshot: string;
  telegramUsernameSnapshot?: string | null;
  customerName: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  shipping?: {
    fullName?: string | null;
    company?: string | null;
    addressLine1?: string | null;
    addressLine2?: string | null;
    city?: string | null;
    region?: string | null;
    postalCode?: string | null;
    country?: string | null;
    countryCode?: string | null;
    phone?: string | null;
    email?: string | null;
    taxId?: string | null;
    methodPreference?: string | null;
    pickupPoint?: string | null;
    instructions?: string | null;
  };
  tracking?: {
    code?: string | null;
    url?: string | null;
    message?: string | null;
    sentAt?: string | null;
  };
  status: "pending" | "accepted" | "completed" | "cancelled";
  totalAmount: number;
  subtotalAmount: number;
  shippingAmount: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
  items: ApiOrderItem[];
}

export interface DashboardStats {
  totalRevenue: number;
  totalOrders: number;
  totalUsers: number;
  pendingOrders: number;
  ordersByStatus: Record<string, number>;
  recentOrders: ApiOrder[];
}

export interface ApiContact {
  id: string;
  type: "phone" | "telegram" | "whatsapp" | "email" | "address" | "custom";
  label: string;
  value: string;
  href: string;
  isActive: boolean;
  sortOrder: number;
}

export interface ApiSiteSettings {
  brandName: string;
  logoUrl?: string | null;
  updatedAt: string;
}

export interface ApiMediaAsset {
  id: string;
  type: "image" | "video";
  url: string;
  thumbnailUrl?: string | null;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

export interface ApiShippingMethod {
  id: string;
  code: string;
  label: string;
  priceAmount: number;
  isActive: boolean;
  sortOrder: number;
}
