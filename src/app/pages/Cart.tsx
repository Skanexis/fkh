import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { AlertCircle, ShoppingCart, Trash2, Minus, Plus, ArrowRight, Package } from "lucide-react";
import { useCart } from "../store/cart-context";
import { TopBar } from "../components/TopBar";
import { useNavigate } from "react-router";
import { useAuth } from "../auth/auth-context";
import { TelegramLoginPanel } from "../auth/TelegramLoginPanel";
import { apiRequest } from "../api/client";
import { ApiOrder, ApiShippingMethod } from "../api/types";
import { useI18n } from "../i18n";

interface ShippingForm {
  fullName: string;
  company: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
  phone: string;
  email: string;
  pickupPoint: string;
  instructions: string;
}

const initialShippingForm: ShippingForm = {
  fullName: "",
  company: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  region: "",
  postalCode: "",
  country: "",
  phone: "",
  email: "",
  pickupPoint: "",
  instructions: "",
};

export function Cart() {
  const { items, removeItem, updateQuantity, total, clearCart } = useCart();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { t } = useI18n();
  const [ordered, setOrdered] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [showShippingForm, setShowShippingForm] = useState(false);
  const [shippingForm, setShippingForm] = useState<ShippingForm>(initialShippingForm);
  const [shippingMethods, setShippingMethods] = useState<ApiShippingMethod[]>([]);
  const [selectedShippingMethodId, setSelectedShippingMethodId] = useState("");
  const selectedShippingMethod = shippingMethods.find((method) => method.id === selectedShippingMethodId);
  const shippingAmount = selectedShippingMethod?.priceAmount ?? 0;
  const orderTotal = total + shippingAmount;

  useEffect(() => {
    let cancelled = false;
    apiRequest<ApiShippingMethod[]>("/api/v1/shipping-methods")
      .then((methods) => {
        if (cancelled) return;
        setShippingMethods(methods);
        setSelectedShippingMethodId((current) => current || methods[0]?.id || "");
      })
      .catch(() => {
        if (!cancelled) setShippingMethods([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleCheckout() {
    setCheckoutError(null);

    if (!isAuthenticated) {
      setCheckoutError(t("cart.loginBeforeCheckout"));
      return;
    }

    if (!showShippingForm) {
      setShowShippingForm(true);
      return;
    }

    const validationError = validateShippingForm(shippingForm, selectedShippingMethod, t);
    if (validationError) {
      setCheckoutError(validationError);
      return;
    }

    try {
      setOrdered(true);
      await apiRequest<ApiOrder>("/api/v1/orders", {
        method: "POST",
        body: JSON.stringify({
          shipping: toShippingPayload(shippingForm, selectedShippingMethod),
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
      className="min-h-screen pb-60"
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

        {showShippingForm && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 rounded-2xl p-4"
            style={{
              background: "#1A1A1D",
              border: "1px solid rgba(255,77,109,0.16)",
            }}
          >
            <div className="mb-4">
              <h2 style={{ color: "#FFFFFF", fontWeight: 800, fontSize: 18 }}>{t("cart.shippingTitle")}</h2>
              <p style={{ color: "#A0A0A0", fontSize: 12, marginTop: 4, lineHeight: 1.45 }}>
                {t("cart.shippingSubtitle")}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <ShippingInput label={t("cart.fullName")} required value={shippingForm.fullName} onChange={(value) => updateShipping("fullName", value)} />
              <ShippingInput label={t("cart.company")} value={shippingForm.company} onChange={(value) => updateShipping("company", value)} />
              <ShippingInput label={t("cart.addressLine1")} required value={shippingForm.addressLine1} onChange={(value) => updateShipping("addressLine1", value)} />
              <ShippingInput label={t("cart.addressLine2")} value={shippingForm.addressLine2} onChange={(value) => updateShipping("addressLine2", value)} />

              <div className="grid grid-cols-2 gap-3">
                <ShippingInput label={t("cart.city")} required value={shippingForm.city} onChange={(value) => updateShipping("city", value)} />
                <ShippingInput label={t("cart.region")} value={shippingForm.region} onChange={(value) => updateShipping("region", value)} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <ShippingInput label={t("cart.postalCode")} required value={shippingForm.postalCode} onChange={(value) => updateShipping("postalCode", value)} />
                <ShippingInput label={t("cart.country")} required value={shippingForm.country} onChange={(value) => updateShipping("country", value)} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <ShippingInput label={t("cart.phone")} required value={shippingForm.phone} onChange={(value) => updateShipping("phone", value)} />
                <ShippingInput label={t("cart.email")} type="email" value={shippingForm.email} onChange={(value) => updateShipping("email", value)} />
              </div>

              <label className="block">
                <span style={{ color: "#A0A0A0", fontSize: 12, fontWeight: 600 }}>{t("cart.courier")} *</span>
                <select
                  value={selectedShippingMethodId}
                  onChange={(event) => setSelectedShippingMethodId(event.target.value)}
                  className="mt-1 w-full rounded-xl px-3 py-2 outline-none"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: "#FFFFFF",
                    fontSize: 14,
                  }}
                >
                  {shippingMethods.length === 0 ? (
                    <option value="">{t("cart.noCouriers")}</option>
                  ) : (
                    shippingMethods.map((method) => (
                      <option key={method.id} value={method.id}>
                        {method.label} - {formatPrice(method.priceAmount, t)}
                      </option>
                    ))
                  )}
                </select>
              </label>
              <ShippingInput label={t("cart.pickupPoint")} value={shippingForm.pickupPoint} onChange={(value) => updateShipping("pickupPoint", value)} />

              <label className="block">
                <span style={{ color: "#A0A0A0", fontSize: 12, fontWeight: 600 }}>{t("cart.deliveryNotes")}</span>
                <textarea
                  value={shippingForm.instructions}
                  onChange={(event) => updateShipping("instructions", event.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-xl px-3 py-2 outline-none resize-none"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: "#FFFFFF",
                    fontSize: 14,
                  }}
                />
              </label>
            </div>
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
            <span style={{ color: shippingAmount > 0 ? "#FFFFFF" : "#22c55e", fontWeight: 600, fontSize: 14 }}>
              {selectedShippingMethod ? `${selectedShippingMethod.label} · ${formatPrice(shippingAmount, t)}` : t("cart.selectCourier")}
            </span>
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
                {formatPrice(orderTotal, t)}
              </span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Sticky checkout button */}
      <div
        className="fkh-cart-checkout fixed left-0 right-0 z-40 px-5 pb-3 pt-4"
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
              {showShippingForm ? t("cart.confirmOrder") : t("cart.checkout")} · {formatPrice(showShippingForm ? orderTotal : total, t)}
              <ArrowRight size={20} strokeWidth={2.5} />
            </>
          )}
        </motion.button>
      </div>
    </div>
  );

  function updateShipping(field: keyof ShippingForm, value: string) {
    setShippingForm((current) => ({ ...current, [field]: value }));
  }
}

function ShippingInput({
  label,
  value,
  onChange,
  required,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: string;
}) {
  return (
    <label className="block">
      <span style={{ color: "#A0A0A0", fontSize: 12, fontWeight: 600 }}>
        {label}
        {required ? " *" : ""}
      </span>
      <input
        value={value}
        type={type}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-xl px-3 py-2 outline-none"
        style={{
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.08)",
          color: "#FFFFFF",
          fontSize: 14,
        }}
      />
    </label>
  );
}

function validateShippingForm(
  form: ShippingForm,
  shippingMethod: ApiShippingMethod | undefined,
  t: (key: string, values?: Record<string, string | number>) => string,
) {
  const required: Array<[keyof ShippingForm, string]> = [
    ["fullName", t("cart.fullName")],
    ["addressLine1", t("cart.addressLine1")],
    ["city", t("cart.city")],
    ["postalCode", t("cart.postalCode")],
    ["country", t("cart.country")],
    ["phone", t("cart.phone")],
  ];

  const missing = required.find(([field]) => !form[field].trim());
  if (missing) return t("cart.requiredField", { field: missing[1] });
  if (!shippingMethod) return t("cart.selectCourierError");
  if (form.email.trim() && !/^\S+@\S+\.\S+$/.test(form.email.trim())) return t("cart.invalidEmail");
  return null;
}

function toShippingPayload(form: ShippingForm, shippingMethod?: ApiShippingMethod) {
  return {
    methodId: shippingMethod?.id,
    fullName: form.fullName.trim(),
    company: optionalString(form.company),
    addressLine1: form.addressLine1.trim(),
    addressLine2: optionalString(form.addressLine2),
    city: form.city.trim(),
    region: optionalString(form.region),
    postalCode: form.postalCode.trim(),
    country: form.country.trim(),
    phone: form.phone.trim(),
    email: optionalString(form.email),
    pickupPoint: optionalString(form.pickupPoint),
    instructions: optionalString(form.instructions),
  };
}

function formatPrice(amount: number, t: (key: string) => string) {
  return amount > 0 ? `${amount}€` : t("cart.free");
}

function optionalString(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}
