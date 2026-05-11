import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { AlertCircle, ShoppingCart, Trash2, Minus, Plus, ArrowRight, Package } from "lucide-react";
import { useCart } from "../store/cart-context";
import { TopBar } from "../components/TopBar";
import { useNavigate } from "react-router";
import { useAuth } from "../auth/auth-context";
import { TelegramLoginPanel } from "../auth/TelegramLoginPanel";
import { apiRequest } from "../api/client";
import { ApiOrder } from "../api/types";
import { useI18n } from "../i18n";

export function Cart() {
  const { items, removeItem, updateQuantity, total, clearCart } = useCart();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { t } = useI18n();
  const [ordered, setOrdered] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  async function handleCheckout() {
    setCheckoutError(null);

    if (!isAuthenticated) {
      setCheckoutError(t("cart.loginBeforeCheckout"));
      return;
    }

    try {
      setOrdered(true);
      await apiRequest<ApiOrder>("/api/v1/orders", {
        method: "POST",
        body: JSON.stringify({
          items: items.map((item) => ({
            productId: item.product.id,
            priceTierId: item.tier.id,
            quantity: item.quantity,
          })),
        }),
      });
      clearCart();
      setOrdered(false);
      navigate("/profile");
    } catch (err) {
      setOrdered(false);
      setCheckoutError(err instanceof Error ? err.message : t("cart.checkoutError"));
    }
  }

  if (items.length === 0) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center gap-4"
        style={{ background: "#0B0B0C", fontFamily: "Inter, sans-serif" }}
      >
        <TopBar title={t("nav.cart")} showBack />
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div
            className="rounded-full p-8"
            style={{ background: "rgba(255,77,109,0.08)", border: "2px solid rgba(255,77,109,0.15)" }}
          >
            <ShoppingCart size={48} color="#FF4D6D" strokeWidth={1.5} />
          </div>
          <h2 style={{ color: "#FFFFFF", fontWeight: 700, fontSize: 22 }}>{t("cart.emptyTitle")}</h2>
          <p style={{ color: "#A0A0A0", fontSize: 14, textAlign: "center" }}>
            {t("cart.emptySubtitle")}
          </p>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate("/catalog")}
            className="mt-2 px-6 py-3 rounded-xl"
            style={{
              background: "linear-gradient(135deg, #FF4D6D, #FF9A8B)",
              color: "#0B0B0C",
              fontWeight: 700,
              fontSize: 15,
            }}
          >
            {t("cart.goCatalog")}
          </motion.button>
        </motion.div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen pb-40"
      style={{ background: "#0B0B0C", fontFamily: "Inter, sans-serif" }}
    >
      <TopBar title={t("nav.cart")} showBack />

      <div className="pt-16 px-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="pt-4 mb-4"
        >
          <h1 style={{ color: "#FFFFFF", fontWeight: 800, fontSize: 26 }}>
            {t("cart.yourCart")}
          </h1>
          <p style={{ color: "#A0A0A0", fontSize: 13, marginTop: 2 }}>
            {items.length} {items.length === 1 ? t("cart.item") : t("cart.items")}
          </p>
        </motion.div>

        {/* Cart items */}
        <AnimatePresence>
          {items.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 100, height: 0, marginBottom: 0 }}
              transition={{ delay: i * 0.05 }}
              className="mb-3 rounded-2xl overflow-hidden"
              style={{
                background: "#1A1A1D",
                border: "1px solid rgba(255,255,255,0.05)",
              }}
            >
              <div className="flex gap-3 p-3">
                {/* Thumbnail */}
                <div
                  className="rounded-xl overflow-hidden flex-shrink-0"
                  style={{ width: 72, height: 72 }}
                >
                  <img
                    src={item.product.images[0]}
                    alt={item.product.name}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 style={{ color: "#FFFFFF", fontWeight: 700, fontSize: 14, lineHeight: 1.3 }}>
                        {item.product.name}
                      </h4>
                      <span
                        className="inline-block mt-1 px-2 py-0.5 rounded-full"
                        style={{
                          background: "rgba(255,77,109,0.12)",
                          border: "1px solid rgba(255,77,109,0.25)",
                          color: "#FF4D6D",
                          fontSize: 11,
                          fontWeight: 600,
                        }}
                      >
                        {item.tier.weight}
                      </span>
                    </div>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="p-1.5 rounded-lg"
                      style={{ background: "rgba(239,68,68,0.1)" }}
                    >
                      <Trash2 size={14} color="#ef4444" strokeWidth={2} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between mt-2">
                    {/* Quantity stepper */}
                    <div
                      className="flex items-center gap-2 rounded-lg px-2 py-1"
                      style={{ background: "rgba(255,255,255,0.06)" }}
                    >
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="rounded p-0.5"
                      >
                        <Minus size={13} color={item.quantity > 1 ? "#FF4D6D" : "#A0A0A0"} strokeWidth={2.5} />
                      </button>
                      <span style={{ color: "#FFFFFF", fontWeight: 700, fontSize: 14, minWidth: 18, textAlign: "center" }}>
                        {item.quantity}
                      </span>
                      <button onClick={() => updateQuantity(item.id, item.quantity + 1)}>
                        <Plus size={13} color="#FF4D6D" strokeWidth={2.5} />
                      </button>
                    </div>

                    {/* Price */}
                    <span style={{ color: "#FF4D6D", fontWeight: 800, fontSize: 16 }}>
                      {item.tier.price * item.quantity}€
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {!isAuthenticated && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-4">
            <TelegramLoginPanel
              title={t("cart.loginRequired")}
              subtitle={t("cart.loginSubtitle")}
            />
          </motion.div>
        )}

        {checkoutError && (
          <div
            className="mb-4 rounded-xl px-4 py-3 flex items-center gap-2"
            style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)" }}
          >
            <AlertCircle size={16} color="#ef4444" />
            <span style={{ color: "#ef4444", fontSize: 13 }}>{checkoutError}</span>
          </div>
        )}

        {/* Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-4 rounded-2xl p-4"
          style={{
            background: "#1A1A1D",
            border: "1px solid rgba(255,77,109,0.15)",
          }}
        >
          <div className="flex justify-between items-center mb-2">
            <span style={{ color: "#A0A0A0", fontSize: 14 }}>{t("cart.subtotal")}</span>
            <span style={{ color: "#FFFFFF", fontWeight: 600, fontSize: 14 }}>{total}€</span>
          </div>
          <div className="flex justify-between items-center mb-2">
            <span style={{ color: "#A0A0A0", fontSize: 14 }}>{t("cart.shipping")}</span>
            <span style={{ color: "#22c55e", fontWeight: 600, fontSize: 14 }}>{t("cart.free")}</span>
          </div>
          <div className="mt-3 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex justify-between items-center">
              <span style={{ color: "#FFFFFF", fontWeight: 700, fontSize: 16 }}>{t("product.total")}</span>
              <span
                style={{
                  color: "#FF4D6D",
                  fontWeight: 800,
                  fontSize: 22,
                }}
              >
                {total}€
              </span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Sticky checkout button */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="fixed bottom-0 left-0 right-0 px-5 pb-6 pt-4"
        style={{
          background: "linear-gradient(to top, #0B0B0C 80%, transparent)",
        }}
      >
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleCheckout}
          disabled={ordered}
          className="w-full py-4 rounded-2xl flex items-center justify-center gap-3"
          style={{
            background: ordered
              ? "linear-gradient(135deg, #22c55e, #16a34a)"
              : "linear-gradient(135deg, #FF4D6D, #FF9A8B)",
            color: "#0B0B0C",
            fontWeight: 800,
            fontSize: 17,
            boxShadow: "0 8px 30px rgba(255,77,109,0.35)",
            opacity: ordered ? 0.75 : 1,
          }}
        >
          {ordered ? (
            <>
              <Package size={20} strokeWidth={2.5} />
              {t("cart.orderPlaced")}
            </>
          ) : (
            <>
              {t("cart.checkout")} · {total}€
              <ArrowRight size={20} strokeWidth={2.5} />
            </>
          )}
        </motion.button>
      </motion.div>
    </div>
  );
}
