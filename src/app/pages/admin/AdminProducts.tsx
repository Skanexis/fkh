import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Edit2, Trash2, X, Check, Search, Image } from "lucide-react";
import { Product } from "../../data/products";
import { apiRequest } from "../../api/client";
import { ApiCategory, ApiProduct } from "../../api/types";
import { toProduct } from "../../api/adapters";
import { useI18n } from "../../i18n";

type EditableProduct = Omit<Product, "id" | "rating" | "reviews"> & { id: string };

export function AdminProducts() {
  const { t } = useI18n();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [search, setSearch] = useState("");
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadProducts();
  }, []);

  async function loadProducts() {
    try {
      const [apiProducts, apiCategories] = await Promise.all([
        apiRequest<ApiProduct[]>("/api/v1/admin/products?limit=100"),
        apiRequest<ApiCategory[]>("/api/v1/categories"),
      ]);
      setProducts(apiProducts.map(toProduct));
      setCategories(apiCategories);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.productsError"));
    }
  }

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase())
  );

  function handleEdit(product: Product) {
    setEditingProduct({ ...product });
    setShowModal(true);
  }

  function handleNew() {
    setEditingProduct({
      id: `NEW-${Date.now()}`,
      name: "",
      brand: "F.K.H",
      category: "Premium",
      description: "",
      longDescription: "",
      images: [],
      priceTiers: [{ weight: "1g", price: 10 }],
      rating: 0,
      reviews: 0,
    });
    setShowModal(true);
  }

  async function handleSave() {
    if (!editingProduct) return;
    const exists = products.find((p) => p.id === editingProduct.id);
    const category = categories.find((c) => c.name === editingProduct.category) ?? categories[0];
    if (!category) {
      setError(t("admin.noCategories"));
      return;
    }

    const payload = {
      name: editingProduct.name,
      slug: editingProduct.slug,
      brand: editingProduct.brand,
      categoryId: category.id,
      description: editingProduct.description,
      longDescription: editingProduct.longDescription,
      badge: editingProduct.badge ?? null,
      featured: editingProduct.featured ?? false,
      status: "active",
      sortOrder: 0,
      priceTiers: editingProduct.priceTiers.map((tier, index) => ({
        label: tier.weight,
        amount: tier.price,
        currency: "EUR",
        sortOrder: (index + 1) * 10,
        isActive: true,
      })),
      media: editingProduct.images
        .filter(Boolean)
        .map((url, index) => ({
          type: "image",
          url,
          thumbnailUrl: url,
          mimeType: "image/jpeg",
          sizeBytes: 0,
          sortOrder: (index + 1) * 10,
          alt: editingProduct.name,
        })),
    };

    try {
      const saved = await apiRequest<ApiProduct>(
        exists ? `/api/v1/admin/products/${editingProduct.id}` : "/api/v1/admin/products",
        {
          method: exists ? "PATCH" : "POST",
          body: JSON.stringify(payload),
        },
      );
      const nextProduct = toProduct(saved);
      setProducts((prev) => (exists ? prev.map((p) => (p.id === nextProduct.id ? nextProduct : p)) : [nextProduct, ...prev]));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.saveProductError"));
      return;
    }
    setShowModal(false);
    setEditingProduct(null);
  }

  async function handleDelete(id: string) {
    try {
      await apiRequest<ApiProduct>(`/api/v1/admin/products/${id}`, { method: "DELETE" });
      setProducts((prev) => prev.filter((p) => p.id !== id));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.deleteProductError"));
    }
    setDeleteId(null);
  }

  return (
    <div className="p-5 pb-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-5"
      >
        <div>
          <h1 style={{ color: "#FFFFFF", fontWeight: 800, fontSize: 22 }}>{t("admin.products")}</h1>
          <p style={{ color: error ? "#ef4444" : "#6B7280", fontSize: 13 }}>
            {error ? `${t("common.backend")}: ${error}` : t("admin.totalProducts", { count: products.length })}
          </p>
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleNew}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl"
          style={{
            background: "linear-gradient(135deg, #3B82F6, #60A5FA)",
            color: "#FFFFFF",
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          <Plus size={16} strokeWidth={2.5} />
          {t("admin.new")}
        </motion.button>
      </motion.div>

      {/* Search */}
      <div
        className="flex items-center gap-3 rounded-xl px-4 py-3 mb-5"
        style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)" }}
      >
        <Search size={16} color="#6B7280" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("admin.searchProducts")}
          className="flex-1 bg-transparent outline-none"
          style={{ color: "#FFFFFF", fontSize: 14 }}
        />
      </div>

      {/* Products table */}
      <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
        <div
          className="grid grid-cols-12 px-4 py-2.5"
          style={{ background: "#111827", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          {[t("admin.product"), t("admin.category"), t("admin.minPrice"), t("admin.actions")].map((h) => (
            <span
              key={h}
              className={`${h === t("admin.product") ? "col-span-5" : h === t("admin.category") ? "col-span-3" : h === t("admin.minPrice") ? "col-span-2" : "col-span-2"}`}
              style={{ color: "#6B7280", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}
            >
              {h}
            </span>
          ))}
        </div>

        {filtered.map((product, i) => (
          <motion.div
            key={product.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.04 }}
            className="grid grid-cols-12 px-4 py-3 items-center"
            style={{
              borderBottom: i < filtered.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
              background: i % 2 === 0 ? "rgba(255,255,255,0.01)" : "transparent",
            }}
          >
            {/* Product */}
            <div className="col-span-5 flex items-center gap-3 min-w-0">
              <div
                className="rounded-lg overflow-hidden flex-shrink-0"
                style={{ width: 40, height: 40 }}
              >
                {product.images[0] ? (
                  <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center"
                    style={{ background: "rgba(59,130,246,0.1)" }}
                  >
                    <Image size={16} color="#3B82F6" />
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p style={{ color: "#FFFFFF", fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {product.name}
                </p>
                <p style={{ color: "#6B7280", fontSize: 11 }}>{product.brand}</p>
              </div>
            </div>

            {/* Category */}
            <div className="col-span-3">
              <span
                className="px-2 py-0.5 rounded-full"
                style={{
                  background: "rgba(59,130,246,0.1)",
                  color: "#60A5FA",
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >
                {product.category}
              </span>
            </div>

            {/* Min price */}
            <div className="col-span-2">
              <span style={{ color: "#FF4D6D", fontWeight: 700, fontSize: 13 }}>
                {product.priceTiers[0]?.price}€
              </span>
            </div>

            {/* Actions */}
            <div className="col-span-2 flex gap-1.5">
              <button
                onClick={() => handleEdit(product)}
                className="p-1.5 rounded-lg"
                style={{ background: "rgba(59,130,246,0.1)" }}
              >
                <Edit2 size={13} color="#3B82F6" strokeWidth={2} />
              </button>
              <button
                onClick={() => setDeleteId(product.id)}
                className="p-1.5 rounded-lg"
                style={{ background: "rgba(239,68,68,0.1)" }}
              >
                <Trash2 size={13} color="#ef4444" strokeWidth={2} />
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Edit/Create modal */}
      <AnimatePresence>
        {showModal && editingProduct && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
          >
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="w-full max-w-lg rounded-2xl overflow-hidden"
              style={{ background: "#111827", border: "1px solid rgba(59,130,246,0.2)", maxHeight: "85vh", overflowY: "auto" }}
            >
              <div
                className="flex items-center justify-between px-5 py-4"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
              >
                <h3 style={{ color: "#FFFFFF", fontWeight: 700, fontSize: 16 }}>
                  {editingProduct.id.startsWith("NEW") ? t("admin.newProduct") : t("admin.editProduct")}
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-1.5 rounded-lg"
                  style={{ background: "rgba(255,255,255,0.07)" }}
                >
                  <X size={16} color="#9CA3AF" />
                </button>
              </div>

              <div className="p-5 flex flex-col gap-4">
                {/* Name */}
                <div>
                  <label style={{ color: "#9CA3AF", fontSize: 12, fontWeight: 600 }}>{t("admin.productName")}</label>
                  <input
                    value={editingProduct.name}
                    onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                    className="w-full mt-1.5 px-3 py-2.5 rounded-xl outline-none"
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      color: "#FFFFFF",
                      fontSize: 14,
                    }}
                  />
                </div>

                {/* Category */}
                <div>
                  <label style={{ color: "#9CA3AF", fontSize: 12, fontWeight: 600 }}>{t("admin.category")}</label>
                  <select
                    value={editingProduct.category}
                    onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value })}
                    className="w-full mt-1.5 px-3 py-2.5 rounded-xl outline-none"
                    style={{
                      background: "#1F2937",
                      border: "1px solid rgba(255,255,255,0.08)",
                      color: "#FFFFFF",
                      fontSize: 14,
                    }}
                  >
                    {(categories.length ? categories.map((category) => category.name) : ["Premium", "Gold", "Limited", "New", "Classic"]).map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* Description */}
                <div>
                  <label style={{ color: "#9CA3AF", fontSize: 12, fontWeight: 600 }}>{t("admin.shortDescription")}</label>
                  <input
                    value={editingProduct.description}
                    onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                    className="w-full mt-1.5 px-3 py-2.5 rounded-xl outline-none"
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      color: "#FFFFFF",
                      fontSize: 14,
                    }}
                  />
                </div>

                {/* Long Description */}
                <div>
                  <label style={{ color: "#9CA3AF", fontSize: 12, fontWeight: 600 }}>{t("admin.fullDescription")}</label>
                  <textarea
                    value={editingProduct.longDescription}
                    onChange={(e) => setEditingProduct({ ...editingProduct, longDescription: e.target.value })}
                    rows={3}
                    className="w-full mt-1.5 px-3 py-2.5 rounded-xl outline-none resize-none"
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      color: "#FFFFFF",
                      fontSize: 14,
                    }}
                  />
                </div>

                {/* Price tiers */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label style={{ color: "#9CA3AF", fontSize: 12, fontWeight: 600 }}>{t("admin.pricesPerGram")}</label>
                    <button
                      onClick={() =>
                        setEditingProduct({
                          ...editingProduct,
                          priceTiers: [...editingProduct.priceTiers, { weight: "", price: 0 }],
                        })
                      }
                      className="flex items-center gap-1 px-2 py-1 rounded-lg"
                      style={{ background: "rgba(59,130,246,0.1)", color: "#3B82F6", fontSize: 11 }}
                    >
                      <Plus size={10} strokeWidth={2.5} />
                      {t("admin.add")}
                    </button>
                  </div>
                  <div className="flex flex-col gap-2">
                    {editingProduct.priceTiers.map((tier, i) => (
                      <div key={i} className="flex gap-2 items-center">
                        <input
                          value={tier.weight}
                          onChange={(e) => {
                            const tiers = [...editingProduct.priceTiers];
                            tiers[i] = { ...tiers[i], weight: e.target.value };
                            setEditingProduct({ ...editingProduct, priceTiers: tiers });
                          }}
                          placeholder="1g"
                          className="flex-1 px-3 py-2 rounded-xl outline-none"
                          style={{
                            background: "rgba(255,255,255,0.06)",
                            border: "1px solid rgba(255,255,255,0.08)",
                            color: "#FFFFFF",
                            fontSize: 13,
                          }}
                        />
                        <input
                          type="number"
                          value={tier.price}
                          onChange={(e) => {
                            const tiers = [...editingProduct.priceTiers];
                            tiers[i] = { ...tiers[i], price: Number(e.target.value) };
                            setEditingProduct({ ...editingProduct, priceTiers: tiers });
                          }}
                          placeholder="€"
                          className="w-20 px-3 py-2 rounded-xl outline-none"
                          style={{
                            background: "rgba(255,255,255,0.06)",
                            border: "1px solid rgba(255,255,255,0.08)",
                            color: "#FF4D6D",
                            fontSize: 13,
                          }}
                        />
                        <button
                          onClick={() => {
                            const tiers = editingProduct.priceTiers.filter((_, j) => j !== i);
                            setEditingProduct({ ...editingProduct, priceTiers: tiers });
                          }}
                        >
                          <X size={14} color="#ef4444" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Image URL */}
                <div>
                  <label style={{ color: "#9CA3AF", fontSize: 12, fontWeight: 600 }}>{t("admin.imageUrl")}</label>
                  <div
                    className="mt-1.5 rounded-xl p-4 flex flex-col items-center justify-center gap-2"
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "2px dashed rgba(59,130,246,0.3)",
                      minHeight: 80,
                    }}
                  >
                    <Image size={24} color="#3B82F6" strokeWidth={1.5} />
                    <p style={{ color: "#6B7280", fontSize: 12 }}>{t("admin.imageHelp")}</p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div
                className="flex gap-3 px-5 py-4"
                style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}
              >
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 rounded-xl"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    color: "#9CA3AF",
                    fontWeight: 600,
                    fontSize: 14,
                  }}
                >
                  {t("admin.cancel")}
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 py-3 rounded-xl flex items-center justify-center gap-2"
                  style={{
                    background: "linear-gradient(135deg, #3B82F6, #60A5FA)",
                    color: "#FFFFFF",
                    fontWeight: 700,
                    fontSize: 14,
                  }}
                >
                  <Check size={16} strokeWidth={2.5} />
                  {t("admin.save")}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete confirm modal */}
      <AnimatePresence>
        {deleteId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="rounded-2xl p-6 w-full max-w-xs text-center"
              style={{ background: "#111827", border: "1px solid rgba(239,68,68,0.3)" }}
            >
              <div
                className="rounded-full mx-auto mb-4 flex items-center justify-center"
                style={{ width: 52, height: 52, background: "rgba(239,68,68,0.12)" }}
              >
                <Trash2 size={24} color="#ef4444" strokeWidth={1.8} />
              </div>
              <h3 style={{ color: "#FFFFFF", fontWeight: 700, fontSize: 17, marginBottom: 8 }}>
                {t("admin.deleteProduct")}
              </h3>
              <p style={{ color: "#9CA3AF", fontSize: 13, marginBottom: 20 }}>
                {t("admin.deleteWarning")}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteId(null)}
                  className="flex-1 py-2.5 rounded-xl"
                  style={{ background: "rgba(255,255,255,0.07)", color: "#9CA3AF", fontWeight: 600, fontSize: 14 }}
                >
                  {t("admin.cancel")}
                </button>
                <button
                  onClick={() => handleDelete(deleteId)}
                  className="flex-1 py-2.5 rounded-xl"
                  style={{ background: "#ef4444", color: "#FFFFFF", fontWeight: 700, fontSize: 14 }}
                >
                  {t("admin.delete")}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
