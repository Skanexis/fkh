import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { AlertCircle, Star, ShoppingCart, ChevronLeft, ChevronRight, Minus, Plus, Check } from "lucide-react";
import { Product, ProductMedia } from "../data/products";
import { useCart } from "../store/cart-context";
import { TopBar } from "../components/TopBar";
import { ProductMediaPlayer } from "../components/ProductMediaPlayer";
import { apiRequest } from "../api/client";
import { ApiProduct } from "../api/types";
import { toProduct } from "../api/adapters";
import { useI18n } from "../i18n";

export function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { t } = useI18n();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [imgIdx, setImgIdx] = useState(0);
  const [selectedTierIdx, setSelectedTierIdx] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadProduct() {
      if (!id) return;
      setLoading(true);
      setError(null);
      try {
        const apiProduct = await apiRequest<ApiProduct>(`/api/v1/products/${id}`);
        if (!cancelled) setProduct(toProduct(apiProduct));
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

  const BADGE_COLORS: Record<string, string> = {
    "Best Seller": "#FF4D6D",
    Gold: "#FF9A8B",
    New: "#22c55e",
    Limited: "#ef4444",
  };

  return (
    <div
      className="min-h-screen pb-32 relative"
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
      <div className="px-5 pt-5">
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
      </div>

      {/* Sticky bottom CTA */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="fixed bottom-0 left-0 right-0 px-5 pb-6 pt-4"
        style={{
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
