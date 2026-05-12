import { Product } from "../data/products";
import { ApiOrder, ApiProduct } from "./types";

export function toProduct(apiProduct: ApiProduct): Product {
  const media = apiProduct.media.map((item) => ({
    id: item.id,
    type: item.type,
    url: item.url,
    thumbnailUrl: item.thumbnailUrl ?? null,
    alt: item.alt ?? null,
    sortOrder: item.sortOrder,
  }));
  const imagePreviews = media
    .filter((item) => item.type === "image" || item.thumbnailUrl)
    .map((item) => item.thumbnailUrl || item.url)
    .filter(Boolean);

  return {
    id: apiProduct.id,
    slug: apiProduct.slug,
    name: apiProduct.name,
    brand: apiProduct.brand,
    category: apiProduct.category.name,
    description: apiProduct.description,
    longDescription: apiProduct.longDescription,
    images: imagePreviews,
    media,
    priceTiers: apiProduct.priceTiers.map((tier) => ({
      id: tier.id,
      weight: tier.label,
      price: tier.amount,
    })),
    badge: apiProduct.badge ?? undefined,
    featured: apiProduct.featured,
    rating: apiProduct.rating ?? 0,
    reviews: apiProduct.reviewsCount,
  };
}

export function toProfileOrder(order: ApiOrder) {
  return {
    id: order.publicId,
    date: order.createdAt,
    status: order.status,
    items: order.items.map((item) => ({
      productId: item.productId,
      name: item.productName,
      weight: item.priceTierLabel,
      price: item.unitPrice,
      qty: item.quantity,
    })),
    total: order.totalAmount,
  };
}
