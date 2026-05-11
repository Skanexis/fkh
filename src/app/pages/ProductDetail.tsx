import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { AlertCircle, Star, ShoppingCart, ChevronLeft, ChevronRight, Minus, Plus, Check, Send } from "lucide-react";
import { Product, ProductMedia } from "../data/products";
import { useCart } from "../store/cart-context";
import { TopBar } from "../components/TopBar";
import { ProductMediaPlayer } from "../components/ProductMediaPlayer";
import { useAuth } from "../auth/auth-context";
import { apiRequest } from "../api/client";
import { ApiProduct, ApiProductReview } from "../api/types";
import { toProduct } from "../api/adapters";
import { useI18n } from "../i18n";

export function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { isAuthenticated } = useAuth();
  const { t } = useI18n();
  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<ApiProductReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [imgIdx, setImgIdx] = useState(0);
  const [selectedTierIdx, setSelectedTierIdx] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewSaving, setReviewSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadProduct() {
      if (!id) return;
      setLoading(true);
      setError(null);
      try {
        const [apiProduct, apiReviews] = await Promise.all([
          apiRequest<ApiProduct>(`/api/v1/products/${id}`),
          apiRequest<ApiProductReview[]>(`/api/v1/products/${id}/reviews`),
        ]);
        if (!cancelled) {
          setProduct(toProduct(apiProduct));
          setReviews(apiReviews);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : t("product.notFound"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadProduct();
    return () => {
      cancelled = true;
    };
  }, [id, t]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0B0B0C" }}>
        <p style={{ color: "#A0A0A0" }}>{t("common.loadingProduct")}</p>
      </div>
    );
  }

  if (!product || error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-6" style={{ background: "#0B0B0C" }}>
        <AlertCircle size={34} color="#ef4444" />
        <p style={{ color: "#A0A0A0", textAlign: "center" }}>
          {error || t("product.notFound")}
        </p>
      </div>
    );
  }

  const selectedTier = product.priceTiers[selectedTierIdx];
  const totalPrice = selectedTier.price * quantity;
  const galleryMedia = getGalleryMedia(product);
  const activeMediaIndex = Math.min(imgIdx, Math.max(galleryMedia.length - 1, 0));
  const activeMedia = galleryMedia[activeMediaIndex];

  function handleAdd() {
    addItem(product, selectedTier, quantity);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  async function handleReviewSubmit() {
    if (!id) return;
    setReviewSaving(true);
    setReviewError(null);
    try {
      const saved = await apiRequest<ApiProductReview>(`/api/v1/products/${id}/reviews`, {
        method: "POST",
        body: JSON.stringify({
          rating: reviewRating,
          comment: reviewComment.trim() || undefined,
        }),
      });
      const nextReviews = [saved, ...reviews.filter((review) => review.id !== saved.id)];
      setReviews(nextReviews);
      setProduct((current) => current ? {
        ...current,
        rating: Math.round((nextReviews.reduce((sum, review) => sum + review.rating, 0) / nextReviews.length) * 10) / 10,
        reviews: nextReviews.length,
      } : current);
      setReviewComment("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      setReviewError(message.includes("Only customers") ? t("product.reviewOrderRequired") : message || t("product.reviewOrderRequired"));
    } finally {
      setReviewSaving(false);
    }
  }

  const BADGE_COLORS: Record<string, string> = {
    "Best Seller": "#FF4D6D",
    Gold: "#FF9A8B",
    New: "#22c55e",
    Limited: "#ef4444",
  };

  return (
    <div
      className="min-h-screen relative"
      style={{ background: "#0B0B0C", fontFamily: "Inter, sans-serif" }}
    >
      {/* Image Gallery */}
      <div className="relative" style={{ height: "42dvh", minHeight: 260 }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={`${activeMedia.type}-${activeMedia.url}-${activeMediaIndex}`}
            className="absolute inset-0"
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
          >
            {activeMedia.type === "video" ? (
              <ProductMediaPlayer media={activeMedia} title={product.name} />
            ) : (
              <img
                src={activeMedia.url}
                alt={activeMedia.alt ?? product.name}
                className="absolute inset-0 w-full h-full object-cover"
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Gradient overlay */}
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(to bottom, rgba(11,11,12,0.3) 0%, transparent 40%, rgba(11,11,12,0.9) 100%)",
            pointerEvents: "none",
          }}
        />

        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-14 left-4 z-10 rounded-full p-2.5"
          style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(10px)" }}
        >
          <ChevronLeft size={20} color="#FFFFFF" strokeWidth={2} />
        </button>

        {/* Brand tag */}
        <div
          className="absolute top-14 right-4 z-10 px-3 py-1 rounded-full"
          style={{
            background: "rgba(11,11,12,0.7)",
            border: "1px solid rgba(255,77,109,0.5)",
            backdropFilter: "blur(8px)",
          }}
        >
          <span style={{ color: "#FF4D6D", fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>
            {product.brand}
          </span>
        </div>

        {/* Badge */}
        {product.badge && (
          <div
            className="absolute bottom-6 left-4 z-10 px-3 py-1 rounded-full"
            style={{
              background: BADGE_COLORS[product.badge] || "#FF4D6D",
              fontSize: 11,
              fontWeight: 700,
              color: "#0B0B0C",
            }}
          >
            {product.badge}
          </div>
        )}

        {/* Gallery nav */}
        {galleryMedia.length > 1 && (
          <>
            <button
              onClick={() => setImgIdx((i) => (i === 0 ? galleryMedia.length - 1 : i - 1))}
              className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full p-2"
              style={{ background: "rgba(0,0,0,0.5)" }}
            >
              <ChevronLeft size={18} color="#FFFFFF" />
            </button>
            <button
              onClick={() => setImgIdx((i) => (i === galleryMedia.length - 1 ? 0 : i + 1))}
              className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-2"
              style={{ background: "rgba(0,0,0,0.5)" }}
            >
              <ChevronRight size={18} color="#FFFFFF" />
            </button>
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              {galleryMedia.map((item, i) => (
                <button key={i} onClick={() => setImgIdx(i)}>
                  <div
                    style={{
                      width: i === activeMediaIndex ? 20 : 6,
                      height: 6,
                      borderRadius: 3,
                      background: i === activeMediaIndex ? "#FF4D6D" : item.type === "video" ? "rgba(255,77,109,0.45)" : "rgba(255,255,255,0.4)",
                      transition: "all 0.25s",
                    }}
                  />
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Content */}
      <div className="px-5 pt-5" style={{ paddingBottom: "calc(170px + env(safe-area-inset-bottom, 0px))" }}>
        {/* Name and rating */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h1 style={{ color: "#FFFFFF", fontWeight: 800, fontSize: 28, lineHeight: 1.2 }}>
            {product.name}
          </h1>
          <div className="flex items-center gap-3 mt-2">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  size={14}
                  fill={s <= Math.floor(product.rating) ? "#FF4D6D" : "transparent"}
                  color="#FF4D6D"
                />
              ))}
              <span style={{ color: "#FF4D6D", fontSize: 14, fontWeight: 600, marginLeft: 4 }}>
                {product.rating}
              </span>
            </div>
            <span style={{ color: "#A0A0A0", fontSize: 13 }}>({product.reviews} {t("product.reviews")})</span>
          </div>
        </motion.div>

        {/* Divider */}
        <div className="my-4" style={{ height: 1, background: "rgba(255,255,255,0.06)" }} />

        {/* Description */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <h3 style={{ color: "#FFFFFF", fontWeight: 600, fontSize: 16, marginBottom: 8 }}>
            {t("product.description")}
          </h3>
          <p style={{ color: "#A0A0A0", fontSize: 14, lineHeight: 1.7 }}>
            {product.longDescription}
          </p>
        </motion.div>

        {/* Divider */}
        <div className="my-4" style={{ height: 1, background: "rgba(255,255,255,0.06)" }} />

        {/* Price tiers */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h3 style={{ color: "#FFFFFF", fontWeight: 600, fontSize: 16, marginBottom: 12 }}>
            {t("product.selectGrams")}
          </h3>
          <div className="flex flex-wrap gap-2 mb-5">
            {product.priceTiers.map((tier, i) => (
              <motion.button
                key={tier.weight}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedTierIdx(i)}
                className="flex flex-col items-center px-4 py-2.5 rounded-xl transition-all"
                style={{
                  background:
                    selectedTierIdx === i
                      ? "rgba(255,77,109,0.15)"
                      : "rgba(255,255,255,0.05)",
                  border: `2px solid ${
                    selectedTierIdx === i ? "#FF4D6D" : "rgba(255,255,255,0.08)"
                  }`,
                  minWidth: 72,
                }}
              >
                <span
                  style={{
                    color: selectedTierIdx === i ? "#FF4D6D" : "#FFFFFF",
                    fontWeight: 700,
                    fontSize: 15,
                  }}
                >
                  {tier.weight}
                </span>
                <span
                  style={{
                    color: selectedTierIdx === i ? "#FF9A8B" : "#A0A0A0",
                    fontSize: 13,
                    fontWeight: 500,
                  }}
                >
                  {tier.price}€
                </span>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Quantity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="flex items-center gap-4 mb-5"
        >
          <span style={{ color: "#A0A0A0", fontSize: 14, fontWeight: 500 }}>{t("product.quantity")}</span>
          <div
            className="flex items-center gap-3 rounded-xl px-3 py-2"
            style={{ background: "#1A1A1D", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <button onClick={() => setQuantity((q) => Math.max(1, q - 1))}>
              <Minus size={16} color={quantity > 1 ? "#FF4D6D" : "#A0A0A0"} strokeWidth={2.5} />
            </button>
            <span style={{ color: "#FFFFFF", fontWeight: 700, fontSize: 16, minWidth: 24, textAlign: "center" }}>
              {quantity}
            </span>
            <button onClick={() => setQuantity((q) => q + 1)}>
              <Plus size={16} color="#FF4D6D" strokeWidth={2.5} />
            </button>
          </div>
          <span style={{ color: "#A0A0A0", fontSize: 13 }}>
            {t("product.total")}{" "}
            <span style={{ color: "#FF4D6D", fontWeight: 700 }}>{totalPrice}€</span>
          </span>
        </motion.div>

        {/* Divider */}
        <div className="my-4" style={{ height: 1, background: "rgba(255,255,255,0.06)" }} />

        {/* Reviews */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center justify-between gap-3 mb-3">
            <h3 style={{ color: "#FFFFFF", fontWeight: 700, fontSize: 16 }}>
              {t("product.customerReviews")}
            </h3>
            <span style={{ color: "#A0A0A0", fontSize: 12 }}>
              {reviews.length} {t("product.reviews")}
            </span>
          </div>

          <div className="rounded-2xl p-4 mb-3" style={{ background: "#1A1A1D", border: "1px solid rgba(255,255,255,0.06)" }}>
            {isAuthenticated ? (
              <>
                <div className="flex items-center justify-between gap-3 mb-3">
                  <span style={{ color: "#A0A0A0", fontSize: 13, fontWeight: 600 }}>{t("product.yourReview")}</span>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <button key={value} type="button" onClick={() => setReviewRating(value)}>
                        <Star size={20} fill={value <= reviewRating ? "#FF4D6D" : "transparent"} color="#FF4D6D" />
                      </button>
                    ))}
                  </div>
                </div>
                <textarea
                  value={reviewComment}
                  onChange={(event) => setReviewComment(event.target.value)}
                  rows={3}
                  placeholder={t("product.reviewPlaceholder")}
                  className="w-full rounded-xl px-3 py-2 outline-none resize-none"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", color: "#FFFFFF", fontSize: 14 }}
                />
                {reviewError && (
                  <p style={{ color: "#ef4444", fontSize: 12, lineHeight: 1.45, marginTop: 8 }}>{reviewError}</p>
                )}
                <button
                  type="button"
                  disabled={reviewSaving}
                  onClick={() => void handleReviewSubmit()}
                  className="mt-3 w-full rounded-xl py-3 flex items-center justify-center gap-2"
                  style={{
                    background: "rgba(255,77,109,0.14)",
                    border: "1px solid rgba(255,77,109,0.28)",
                    color: "#FF4D6D",
                    fontWeight: 800,
                    opacity: reviewSaving ? 0.65 : 1,
                  }}
                >
                  <Send size={15} />
                  {reviewSaving ? t("admin.saving") : t("product.submitReview")}
                </button>
              </>
            ) : (
              <p style={{ color: "#A0A0A0", fontSize: 13, lineHeight: 1.55 }}>
                {t("product.loginToReview")}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-3">
            {reviews.length === 0 ? (
              <p style={{ color: "#A0A0A0", fontSize: 13 }}>{t("product.noReviews")}</p>
            ) : (
              reviews.map((review) => (
                <div key={review.id} className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p style={{ color: "#FFFFFF", fontWeight: 700, fontSize: 13, overflowWrap: "anywhere" }}>
                        {review.user.name}
                      </p>
                      <p style={{ color: "#6B7280", fontSize: 11 }}>{new Date(review.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((value) => (
                        <Star key={value} size={13} fill={value <= review.rating ? "#FF4D6D" : "transparent"} color="#FF4D6D" />
                      ))}
                    </div>
                  </div>
                  {review.comment && (
                    <p style={{ color: "#A0A0A0", fontSize: 13, lineHeight: 1.55, marginTop: 10 }}>{review.comment}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>

      {/* Sticky bottom CTA */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="fixed left-0 right-0 z-40 px-5 pb-3 pt-4"
        style={{
          bottom: "calc(62px + env(safe-area-inset-bottom, 0px))",
          background: "linear-gradient(to top, #0B0B0C 80%, transparent)",
        }}
      >
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleAdd}
          className="w-full py-4 rounded-2xl flex items-center justify-center gap-3"
          style={{
            background: added
              ? "linear-gradient(135deg, #22c55e, #16a34a)"
              : "linear-gradient(135deg, #FF4D6D, #FF9A8B)",
            color: "#0B0B0C",
            fontWeight: 800,
            fontSize: 17,
            boxShadow: added
              ? "0 8px 30px rgba(34,197,94,0.4)"
              : "0 8px 30px rgba(255,77,109,0.4)",
          }}
        >
          {added ? (
            <>
              <Check size={20} strokeWidth={2.5} />
              {t("product.addedToCart")}
            </>
          ) : (
            <>
              <ShoppingCart size={20} strokeWidth={2.5} />
              {t("product.addToCart")} · {totalPrice}€
            </>
          )}
        </motion.button>
      </motion.div>
    </div>
  );
}

function getGalleryMedia(product: Product): ProductMedia[] {
  const media = product.media?.filter((item) => item.url) ?? [];
  if (media.length) return media;

  const images = product.images
    .filter(Boolean)
    .map((url, index) => ({
      id: `${product.id}-image-${index}`,
      type: "image",
      url,
      thumbnailUrl: url,
      alt: product.name,
      sortOrder: (index + 1) * 10,
    }));
  return images.length ? images : [{ id: `${product.id}-empty`, type: "image", url: "", alt: product.name }];
}
