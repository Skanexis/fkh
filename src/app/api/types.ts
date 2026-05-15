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

export interface ApiProductReview {
  id: string;
  rating: number;
  comment?: string | null;
  createdAt: string;
  user: {
    name: string;
    username?: string | null;
    avatarUrl?: string | null;
  };
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

export interface ApiCryptoPayment {
  id: string;
  provider: string;
  providerPaymentId?: string | null;
  providerStatus: string;
  currencyCode: string;
  currencyLabel: string;
  providerCurrency: string;
  network: string;
  priceAmount: number;
  priceCurrency: string;
  payAmount?: number | null;
  payAddress?: string | null;
  payinExtraId?: string | null;
  actuallyPaid?: number | null;
  pendingAmount?: number | null;
  remainingAmount?: number | null;
  isUnderpaid?: boolean;
  paidAt?: string | null;
  expiresAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiCryptoPaymentMethod {
  code: string;
  label: string;
  network: string;
  available?: boolean;
  configured?: boolean;
  totalSlots?: number;
  freeSlots?: number;
  busySlots?: number;
  wallets?: Array<{
    label: string;
    status: "available" | "busy";
  }>;
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
  payment?: ApiCryptoPayment | null;
  status: "pending" | "accepted" | "completed" | "cancelled";
  totalAmount: number;
  subtotalAmount: number;
  shippingAmount: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
  items: ApiOrderItem[];
}

export interface ApiAdminPayment extends ApiCryptoPayment {
  order: ApiOrder;
}

export interface ApiAdminPaymentCurrencyStats {
  currencyCode: string;
  currencyLabel: string;
  providerCurrency: string;
  network: string;
  count: number;
  paidCount: number;
  pendingCount: number;
  partialCount: number;
  expiredCount: number;
  expectedFiat: number;
  paidFiat: number;
  receivedCrypto: number;
  pendingCrypto: number;
}

export interface DashboardStats {
  totalRevenue: number;
  totalOrders: number;
  totalUsers: number;
  pendingOrders: number;
  ordersByStatus: Record<string, number>;
  recentOrders: ApiOrder[];
  monthlyRevenue?: Array<{ monthKey: string; value: number }>;
  topCustomers?: Array<{
    id: string;
    name: string;
    telegramUsername?: string | null;
    telegramId?: string | null;
    orderCount: number;
    spent: number;
    lastOrderPublicId: string;
  }>;
  paymentStats?: {
    totalPayments: number;
    paidPayments: number;
    pendingPayments: number;
    partialPayments: number;
    expiredPayments: number;
    totalExpectedRevenue: number;
    paidRevenue: number;
    totalReceivedCrypto: number;
    totalPendingCrypto: number;
    byCurrency: ApiAdminPaymentCurrencyStats[];
  };
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
