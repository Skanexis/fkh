import { useState } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { ShoppingCart, Star, ChevronLeft, ChevronRight } from "lucide-react";
import { Product } from "../data/products";
import { useCart } from "../store/cart-context";
import { useI18n } from "../i18n";
import { ProductImagePlaceholder } from "./ProductImagePlaceholder";

interface ProductCardProps {
  product: Product;
  variant?: "standard" | "feature";
}

export function ProductCard({ product, variant = "standard" }: ProductCardProps) {
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { t } = useI18n();
  const [imgIdx, setImgIdx] = useState(0);
  const [selectedTierIdx, setSelectedTierIdx] = useState(0);
  const [added, setAdded] = useState(false);
  const [failedImages, setFailedImages] = useState<Set<string>>(() => new Set());

  const selectedTier = product.priceTiers[selectedTierIdx];
  const imageGallery = product.images.filter((url) => Boolean(url) && !failedImages.has(url));
  const activeImageUrl = imageGallery[Math.min(imgIdx, Math.max(imageGallery.length - 1, 0))] ?? "";

  function handleAdd(e: React.MouseEvent) {
    e.stopPropagation();
    addItem(product, selectedTier, 1);
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  }

  function handlePrevImg(e: React.MouseEvent) {
    e.stopPropagation();
    setImgIdx((i) => (i === 0 ? imageGallery.length - 1 : i - 1));
  }

  function handleNextImg(e: React.MouseEvent) {
    e.stopPropagation();
    setImgIdx((i) => (i === imageGallery.length - 1 ? 0 : i + 1));
  }

  const BADGE_COLORS: Record<string, string> = {
    "Best Seller": "#FF4D6D",
    Gold: "#FF9A8B",
    New: "#22c55e",
    Limited: "#ef4444",
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => navigate(`/product/${product.slug ?? product.id}`)}
      className={`fkh-product-card ${variant === "feature" ? "fkh-product-card-feature" : ""} relative rounded-2xl overflow-hidden cursor-pointer flex flex-col`}
      style={{
        background: "#1A1A1D",
        boxShadow: "0 14px 34px rgba(0,0,0,0.42)",
        border: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      <div className="fkh-card-signal" />
      {/* Image Gallery */}
      <div className="relative overflow-hidden" style={{ aspectRatio: "1/1" }}>
        {imageGallery.length > 0 ? (
          <AnimatePresence mode="wait">
            <motion.img
              key={imgIdx}
              src={activeImageUrl}
              alt={product.name}
              className="fkh-product-image w-full h-full object-cover"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              onError={(event) => {
                setFailedImages((current) => new Set(current).add(activeImageUrl));
                setImgIdx(0);
              }}
            />
          </AnimatePresence>
        ) : (
          <ProductImagePlaceholder className="absolute inset-0" iconSize={34} />
        )}

        {/* Gradient overlay */}
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.6) 100%)" }}
        />

        {/* Gallery nav */}
        {imageGallery.length > 1 && (
          <>
            <button
              onClick={handlePrevImg}
              className="absolute left-1.5 top-1/2 -translate-y-1/2 rounded-full p-0.5"
              style={{ background: "rgba(0,0,0,0.5)" }}
            >
              <ChevronLeft size={14} color="#FFFFFF" />
            </button>
            <button
              onClick={handleNextImg}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full p-0.5"
              style={{ background: "rgba(0,0,0,0.5)" }}
            >
              <ChevronRight size={14} color="#FFFFFF" />
            </button>
            <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex gap-1">
              {imageGallery.map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: i === imgIdx ? 12 : 4,
                    height: 4,
                    borderRadius: 2,
                    background: i === imgIdx ? "#FF4D6D" : "rgba(255,255,255,0.4)",
                    transition: "all 0.2s",
                  }}
                />
              ))}
            </div>
          </>
        )}

        {/* Brand tag */}
        <div
          className="absolute top-2 left-2 px-2 py-0.5 rounded-full"
          style={{
            background: "rgba(11,11,12,0.8)",
            border: "1px solid rgba(255,77,109,0.4)",
            backdropFilter: "blur(8px)",
          }}
        >
          <span style={{ color: "#FF4D6D", fontSize: 10, fontWeight: 600, letterSpacing: 1 }}>
            {product.brand}
          </span>
        </div>

        {/* Badge */}
        {product.badge && (
          <div
            className="absolute top-2 right-2 px-2 py-0.5 rounded-full"
            style={{
              background: BADGE_COLORS[product.badge] || "#FF4D6D",
              fontSize: 9,
              fontWeight: 700,
              color: "#0B0B0C",
              letterSpacing: 0.5,
            }}
          >
            {product.badge}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3 flex flex-col gap-2 flex-1">
        <div>
          <h3 style={{ color: "#FFFFFF", fontWeight: 700, fontSize: 15, lineHeight: 1.3 }}>
            {product.name}
          </h3>
          <p style={{ color: "#A0A0A0", fontSize: 11, marginTop: 2 }}>{product.description}</p>
        </div>

        {/* Rating */}
        <div className="flex items-center gap-1">
          <Star size={10} fill="#FF4D6D" color="#FF4D6D" />
          <span style={{ color: "#FF4D6D", fontSize: 11, fontWeight: 600 }}>{product.rating}</span>
          <span style={{ color: "#A0A0A0", fontSize: 10 }}>({product.reviews})</span>
        </div>

        {/* Price tiers */}
        <div className="flex flex-wrap gap-1">
          {product.priceTiers.slice(0, 4).map((tier, i) => (
            <button
              key={tier.weight}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedTierIdx(i);
              }}
              className="px-2 py-0.5 rounded-full transition-all"
              style={{
                fontSize: 10,
                fontWeight: 600,
                background: selectedTierIdx === i ? "#FF4D6D" : "rgba(255,255,255,0.07)",
                color: selectedTierIdx === i ? "#0B0B0C" : "#A0A0A0",
                border: `1px solid ${selectedTierIdx === i ? "#FF4D6D" : "rgba(255,255,255,0.1)"}`,
              }}
            >
              {tier.weight} · {tier.price}€
            </button>
          ))}
        </div>

        {/* Add to cart */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleAdd}
          className="flex items-center justify-center gap-2 rounded-xl py-2 mt-auto transition-all"
          style={{
            background: added ? "#22c55e" : "linear-gradient(135deg, #FF4D6D, #FF9A8B)",
            color: "#0B0B0C",
            fontWeight: 700,
            fontSize: 12,
          }}
        >
          <ShoppingCart size={13} strokeWidth={2.5} />
          {added ? t("card.added") : `${t("card.add")} · ${selectedTier.price}€`}
        </motion.button>
      </div>
    </motion.div>
  );
}
