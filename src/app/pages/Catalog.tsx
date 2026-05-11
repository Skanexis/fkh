import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { AlertCircle, Search, SlidersHorizontal, X } from "lucide-react";
import { ProductCard } from "../components/ProductCard";
import { TopBar } from "../components/TopBar";
import { apiRequest } from "../api/client";
import { ApiCategory, ApiProduct } from "../api/types";
import { toProduct } from "../api/adapters";
import { Product } from "../data/products";
import { useI18n } from "../i18n";

const ALL_CATEGORY = "__all__";

export function Catalog() {
  const { t } = useI18n();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState(ALL_CATEGORY);
  const [showSearch, setShowSearch] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([ALL_CATEGORY]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadCatalog() {
      setLoading(true);
      setError(null);
      try {
        const [apiProducts, apiCategories] = await Promise.all([
          apiRequest<ApiProduct[]>("/api/v1/products?limit=50"),
          apiRequest<ApiCategory[]>("/api/v1/categories"),
        ]);
        if (cancelled) return;
        setProducts(apiProducts.map(toProduct));
        setCategories([ALL_CATEGORY, ...apiCategories.map((category) => category.name)]);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : t("catalog.error"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadCatalog();
    return () => {
      cancelled = true;
    };
  }, [t]);

  const filtered = useMemo(() => products.filter((p) => {
    const matchesCat = activeCategory === ALL_CATEGORY || p.category === activeCategory;
    const matchesSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.brand.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  }), [activeCategory, products, search]);

  return (
    <div
      className="min-h-screen pb-24"
      style={{ background: "#0B0B0C", fontFamily: "Inter, sans-serif" }}
    >
      <TopBar />

      <div className="pt-16 px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-4 pt-2"
        >
          <div>
            <h1 style={{ color: "#FFFFFF", fontWeight: 800, fontSize: 26, lineHeight: 1.2 }}>
              {t("catalog.title")}
            </h1>
            <p style={{ color: "#A0A0A0", fontSize: 13, marginTop: 2 }}>
              {t(filtered.length === 1 ? "catalog.productAvailable" : "catalog.productsAvailable", { count: filtered.length })}
            </p>
          </div>
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="rounded-xl p-2.5"
            style={{
              background: showSearch ? "rgba(255,77,109,0.15)" : "rgba(255,255,255,0.07)",
              border: `1px solid ${showSearch ? "rgba(255,77,109,0.4)" : "rgba(255,255,255,0.08)"}`,
            }}
          >
            <Search size={18} color={showSearch ? "#FF4D6D" : "#A0A0A0"} strokeWidth={1.8} />
          </button>
        </motion.div>

        {/* Search bar */}
        <AnimatePresence>
          {showSearch && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: "auto", marginBottom: 16 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              className="overflow-hidden"
            >
              <div
                className="flex items-center gap-3 rounded-xl px-4 py-3"
                style={{
                  background: "#1A1A1D",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <Search size={16} color="#A0A0A0" />
                <input
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t("catalog.searchPlaceholder")}
                  className="flex-1 bg-transparent outline-none"
                  style={{ color: "#FFFFFF", fontSize: 15 }}
                />
                {search && (
                  <button onClick={() => setSearch("")}>
                    <X size={16} color="#A0A0A0" />
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="fkh-catalog-strip mb-4"
        >
          <div>
            <span>{t("catalog.selectionMode")}</span>
            <strong>{activeCategory === ALL_CATEGORY ? t("catalog.all") : activeCategory}</strong>
          </div>
          <div>
            <span>{t("catalog.items")}</span>
            <strong>{filtered.length.toString().padStart(2, "0")}</strong>
          </div>
        </motion.div>

        {/* Category chips */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-hide">
          {categories.map((cat) => {
            const label = cat === ALL_CATEGORY ? t("catalog.all") : cat;
            return (
            <motion.button
              key={cat}
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveCategory(cat)}
              className="flex-shrink-0 px-4 py-1.5 rounded-full transition-all"
              style={{
                background:
                  activeCategory === cat
                    ? "linear-gradient(135deg, #FF4D6D, #FF9A8B)"
                    : "rgba(255,255,255,0.06)",
                border: `1px solid ${
                  activeCategory === cat ? "transparent" : "rgba(255,255,255,0.1)"
                }`,
                color: activeCategory === cat ? "#0B0B0C" : "#A0A0A0",
                fontWeight: activeCategory === cat ? 700 : 400,
                fontSize: 13,
                whiteSpace: "nowrap",
              }}
            >
              {label}
            </motion.button>
            );
          })}
        </div>

        {/* Product grid */}
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((item) => (
                <div
                  key={item}
                  className="rounded-2xl animate-pulse"
                  style={{ height: 260, background: "#1A1A1D" }}
                />
              ))}
            </motion.div>
          ) : error ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-20 gap-3"
            >
              <div className="rounded-full p-5" style={{ background: "rgba(239,68,68,0.1)" }}>
                <AlertCircle size={32} color="#ef4444" />
              </div>
              <p style={{ color: "#A0A0A0", fontSize: 15, textAlign: "center" }}>
                {t("catalog.backendUnavailable", { error })}
              </p>
            </motion.div>
          ) : filtered.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-20 gap-3"
            >
              <div
                className="rounded-full p-5"
                style={{ background: "rgba(255,255,255,0.05)" }}
              >
                <SlidersHorizontal size={32} color="#A0A0A0" />
              </div>
              <p style={{ color: "#A0A0A0", fontSize: 15 }}>{t("catalog.noProducts")}</p>
            </motion.div>
          ) : (
            <motion.div
              key={activeCategory + search}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-2 gap-3"
            >
              {filtered.map((product, i) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={i % 5 === 0 ? "col-span-2" : undefined}
                >
                  <ProductCard product={product} variant={i % 5 === 0 ? "feature" : "standard"} />
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
