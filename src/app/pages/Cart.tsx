import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { AlertCircle, ShoppingCart, Trash2, Minus, Plus, ArrowRight, Package, Coins, Copy, CheckCircle, Wallet, Search, MapPin, Loader2, LocateFixed } from "lucide-react";
import { useCart, type CartItem } from "../store/cart-context";
import { TopBar } from "../components/TopBar";
import { useNavigate } from "react-router";
import { useAuth } from "../auth/auth-context";
import { TelegramLoginPanel } from "../auth/TelegramLoginPanel";
import { apiRequest } from "../api/client";
import { ApiAddressSuggestion, ApiCryptoPaymentMethod, ApiOrder, ApiShippingMethod } from "../api/types";
import { useI18n } from "../i18n";
import { ProductImagePlaceholder } from "../components/ProductImagePlaceholder";

interface ShippingForm {
  fullName: string;
  company: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
  countryCode: string;
  phone: string;
  email: string;
  pickupPoint: string;
  instructions: string;
}

type ShippingFieldErrors = Partial<Record<keyof ShippingForm | "shippingMethod" | "paymentMethod", string>>;

const initialShippingForm: ShippingForm = {
  fullName: "",
  company: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  region: "",
  postalCode: "",
  country: "",
  countryCode: "",
  phone: "",
  email: "",
  pickupPoint: "",
  instructions: "",
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const fallbackCryptoMethods: ApiCryptoPaymentMethod[] = [
  { code: "btc", label: "BTC", network: "Bitcoin", available: false, configured: false, totalSlots: 0, freeSlots: 0 },
  { code: "usdt_erc20", label: "USDT (ETH)", network: "Ethereum ERC-20", available: false, configured: false, totalSlots: 0, freeSlots: 0 },
  { code: "usdt_trc20", label: "USDT (TRON)", network: "TRON TRC-20", available: false, configured: false, totalSlots: 0, freeSlots: 0 },
  { code: "usdc_erc20", label: "USDC (ETH)", network: "Ethereum ERC-20", available: false, configured: false, totalSlots: 0, freeSlots: 0 },
];

export function Cart() {
  const { items, removeItem, updateQuantity, total, clearCart } = useCart();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { t } = useI18n();
  const [ordered, setOrdered] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [showShippingForm, setShowShippingForm] = useState(false);
  const [shippingForm, setShippingForm] = useState<ShippingForm>(initialShippingForm);
  const [shippingErrors, setShippingErrors] = useState<ShippingFieldErrors>({});
  const [shippingMethods, setShippingMethods] = useState<ApiShippingMethod[]>([]);
  const [selectedShippingMethodId, setSelectedShippingMethodId] = useState("");
  const [cryptoMethods, setCryptoMethods] = useState<ApiCryptoPaymentMethod[]>(fallbackCryptoMethods);
  const [selectedPaymentCurrency, setSelectedPaymentCurrency] = useState(fallbackCryptoMethods[0].code);
  const [createdOrder, setCreatedOrder] = useState<ApiOrder | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [cancelingPayment, setCancelingPayment] = useState(false);
  const [addressQuery, setAddressQuery] = useState("");
  const [addressResults, setAddressResults] = useState<ApiAddressSuggestion[]>([]);
  const [addressSearching, setAddressSearching] = useState(false);
  const [addressLocating, setAddressLocating] = useState(false);
  const [addressSearchError, setAddressSearchError] = useState<string | null>(null);
  const selectedShippingMethod = shippingMethods.find((method) => method.id === selectedShippingMethodId);
  const selectedCryptoMethod = cryptoMethods.find((method) => method.code === selectedPaymentCurrency) ?? cryptoMethods[0];
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

  useEffect(() => {
    const query = addressQuery.trim();
    if (!showShippingForm || query.length < 3) {
      setAddressResults([]);
      setAddressSearching(false);
      setAddressSearchError(null);
      return;
    }

    let cancelled = false;
    setAddressSearching(true);
    const timer = window.setTimeout(() => {
      apiRequest<ApiAddressSuggestion[]>(`/api/v1/address/search?q=${encodeURIComponent(query)}&limit=6`)
        .then((results) => {
          if (cancelled) return;
          setAddressResults(results);
          setAddressSearchError(null);
        })
        .catch((err) => {
          if (cancelled) return;
          setAddressResults([]);
          setAddressSearchError(err instanceof Error ? err.message : t("cart.addressSearchError"));
        })
        .finally(() => {
          if (!cancelled) setAddressSearching(false);
        });
    }, 450);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [addressQuery, showShippingForm, t]);

  useEffect(() => {
    if (!createdOrder) return;
    let cancelled = false;
    const timer = window.setInterval(() => {
      apiRequest<ApiOrder>(`/api/v1/me/orders/${encodeURIComponent(createdOrder.publicId)}`)
        .then((order) => {
          if (!cancelled) setCreatedOrder(order);
        })
        .catch(() => undefined);
    }, 10000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [createdOrder?.publicId]);

  useEffect(() => {
    let cancelled = false;

    async function loadCryptoMethods() {
      const methods = await apiRequest<ApiCryptoPaymentMethod[]>(
        `/api/v1/payments/crypto/methods?ts=${Date.now()}`,
        { cache: "no-store" },
      );
      if (cancelled || methods.length === 0) return;
      setCryptoMethods(methods);
      setSelectedPaymentCurrency((current) => {
        const currentMethod = methods.find((method) => method.code === current);
        if (methodIsAvailable(currentMethod)) return current;
        return methods.find(methodIsAvailable)?.code ?? methods[0].code;
      });
    }

    loadCryptoMethods()
      .catch(() => undefined);
    const timer = window.setInterval(() => {
      loadCryptoMethods()
        .catch(() => undefined);
    }, 15000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
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

    const validationErrors = validateShippingForm(shippingForm, selectedShippingMethod, t);
    if (Object.keys(validationErrors).length > 0) {
      setShippingErrors(validationErrors);
      const firstField = Object.keys(validationErrors)[0];
      if (firstField) {
        document.querySelector(`[data-shipping-field="${firstField}"]`)?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
      return;
    }
    setShippingErrors({});

    const invalidCartItem = items.find((item) => !isValidOrderItem(item));
    if (invalidCartItem) {
      setCheckoutError(t("cart.invalidCartItem"));
      return;
    }

    if (!methodIsAvailable(selectedCryptoMethod)) {
      setCheckoutError(t("cart.paymentMethodBusyError"));
      document.querySelector(`[data-shipping-field="paymentMethod"]`)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      return;
    }

    try {
      setOrdered(true);
      const order = await apiRequest<ApiOrder>("/api/v1/orders", {
        method: "POST",
        body: JSON.stringify({
          shipping: toShippingPayload(shippingForm, selectedShippingMethod),
          paymentCurrency: selectedPaymentCurrency,
          items: items.map((item) => ({
            productId: item.product.id,
            priceTierId: item.tier.id,
            quantity: item.quantity,
          })),
        }),
      });
      clearCart();
      setOrdered(false);
      setCreatedOrder(order);
    } catch (err) {
      setOrdered(false);
      setCheckoutError(err instanceof Error ? err.message : t("cart.checkoutError"));
    }
  }

  async function cancelCreatedPayment() {
    if (!createdOrder || !canCancelPayment(createdOrder)) return;
    if (!window.confirm(t("cart.cancelPaymentConfirm"))) return;
    setCancelingPayment(true);
    setCheckoutError(null);
    try {
      const updated = await apiRequest<ApiOrder>(`/api/v1/me/orders/${encodeURIComponent(createdOrder.publicId)}/cancel-payment`, {
        method: "POST",
      });
      setCreatedOrder(updated);
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : t("cart.cancelPaymentError"));
    } finally {
      setCancelingPayment(false);
    }
  }

  if (createdOrder) {
    const payment = createdOrder.payment;
    const paymentCanBeCancelled = canCancelPayment(createdOrder);
    return (
      <div
        className="min-h-screen pb-24"
        style={{ background: "#0B0B0C", fontFamily: "Inter, sans-serif" }}
      >
        <TopBar title={t("cart.paymentTitle")} showBack />
        <div className="pt-20 px-4">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl p-5"
            style={{ background: "#1A1A1D", border: "1px solid rgba(34,197,94,0.24)" }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-full p-3" style={{ background: "rgba(34,197,94,0.12)" }}>
                <Coins size={22} color="#22c55e" />
              </div>
              <div>
                <h1 style={{ color: "#FFFFFF", fontSize: 20, fontWeight: 800 }}>{createdOrder.publicId}</h1>
                <p style={{ color: "#A0A0A0", fontSize: 12, marginTop: 2 }}>{t("cart.paymentWaiting")}</p>
              </div>
            </div>

            <PaymentLine label={t("cart.paymentMethod")} value={payment ? `${payment.currencyLabel} · ${payment.network}` : selectedCryptoMethod.label} />
            <PaymentLine label={t("cart.paymentStatus")} value={payment ? formatPaymentStatus(payment.providerStatus, t) : t("cart.paymentStatusWaiting")} />
            <PaymentLine label={t("cart.paymentFiat")} value={`${createdOrder.totalAmount} ${createdOrder.currency}`} />
            {payment?.expiresAt && (
              <PaymentLine label={t("cart.paymentExpires")} value={new Date(payment.expiresAt).toLocaleString()} />
            )}
            {payment?.payAmount && (
              <PaymentLine
                label={t("cart.paymentAmount")}
                value={`${formatCryptoAmount(payment.payAmount)} ${payment.providerCurrency.toUpperCase()}`}
                copyValue={String(payment.payAmount)}
                fieldId="amount"
                copiedField={copiedField}
                onCopy={copyPaymentValue}
              />
            )}
            {payment?.actuallyPaid !== null && payment?.actuallyPaid !== undefined && (
              <PaymentLine
                label={t("cart.paymentReceived")}
                value={`${formatCryptoAmount(payment.actuallyPaid)} ${payment.providerCurrency.toUpperCase()}`}
              />
            )}
            {payment?.pendingAmount && payment.pendingAmount > 0 && (
              <PaymentLine
                label={t("cart.paymentPending")}
                value={`${formatCryptoAmount(payment.pendingAmount)} ${payment.providerCurrency.toUpperCase()}`}
              />
            )}
            {payment?.isUnderpaid && payment.remainingAmount && payment.remainingAmount > 0 && (
              <PaymentLine
                label={t("cart.paymentRemaining")}
                value={`${formatCryptoAmount(payment.remainingAmount)} ${payment.providerCurrency.toUpperCase()}`}
                copyValue={String(payment.remainingAmount)}
                fieldId="remaining"
                copiedField={copiedField}
                onCopy={copyPaymentValue}
                tone="warning"
              />
            )}
            {payment?.payAddress && (
              <PaymentLine
                label={t("cart.paymentAddress")}
                value={payment.payAddress}
                copyValue={payment.payAddress}
                fieldId="address"
                copiedField={copiedField}
                onCopy={copyPaymentValue}
              />
            )}
            {payment?.payinExtraId && (
              <PaymentLine
                label={t("cart.paymentMemo")}
                value={payment.payinExtraId}
                copyValue={payment.payinExtraId}
                fieldId="memo"
                copiedField={copiedField}
                onCopy={copyPaymentValue}
              />
            )}

            <div
              className="mt-4 rounded-xl p-3"
              style={{
                background: createdOrder.status === "cancelled" ? "rgba(239,68,68,0.1)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${createdOrder.status === "cancelled" ? "rgba(239,68,68,0.24)" : "rgba(255,255,255,0.06)"}`,
              }}
            >
              <p style={{ color: "#E5E7EB", fontSize: 12, lineHeight: 1.5 }}>
                {createdOrder.status === "cancelled"
                  ? t("cart.paymentCancelled")
                  : payment?.isUnderpaid ? t("cart.paymentUnderpaidNotice") : t("cart.paymentNotice")}
              </p>
            </div>

            {checkoutError && (
              <div
                className="mt-4 rounded-xl px-4 py-3 flex items-center gap-2"
                style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)" }}
              >
                <AlertCircle size={16} color="#ef4444" />
                <span style={{ color: "#ef4444", fontSize: 13 }}>{checkoutError}</span>
              </div>
            )}

            {payment && createdOrder.status === "pending" && (
              <button
                onClick={cancelCreatedPayment}
                disabled={!paymentCanBeCancelled || cancelingPayment}
                className="mt-4 w-full py-3 rounded-xl flex items-center justify-center gap-2"
                style={{
                  background: paymentCanBeCancelled ? "rgba(239,68,68,0.12)" : "rgba(255,255,255,0.06)",
                  border: `1px solid ${paymentCanBeCancelled ? "rgba(239,68,68,0.28)" : "rgba(255,255,255,0.08)"}`,
                  color: paymentCanBeCancelled ? "#ef4444" : "#6B7280",
                  fontWeight: 800,
                }}
              >
                <Trash2 size={16} />
                {cancelingPayment ? t("admin.saving") : paymentCanBeCancelled ? t("cart.cancelPayment") : t("cart.cancelPaymentUnavailable")}
              </button>
            )}

            <button
              onClick={() => navigate("/profile")}
              className="mt-5 w-full py-3.5 rounded-xl flex items-center justify-center gap-2"
              style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)", color: "#FFFFFF", fontWeight: 800 }}
            >
              <CheckCircle size={18} />
              {t("cart.openOrders")}
            </button>
          </motion.div>
        </div>
      </div>
    );
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
                  <CartItemThumbnail item={item} />
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
              <ShippingInput field="fullName" label={t("cart.fullName")} required autoComplete="name" value={shippingForm.fullName} error={shippingErrors.fullName} onChange={(value) => updateShipping("fullName", value)} />
              <ShippingInput field="company" label={t("cart.company")} optionalLabel={t("cart.optional")} autoComplete="organization" value={shippingForm.company} error={shippingErrors.company} onChange={(value) => updateShipping("company", value)} />
              <AddressAutocompleteInput
                value={shippingForm.addressLine1}
                query={addressQuery}
                results={addressResults}
                searching={addressSearching}
                error={addressSearchError}
                locating={addressLocating}
                label={t("cart.addressLine1")}
                required
                field="addressLine1"
                autoComplete="address-line1"
                t={t}
                onChange={(value) => {
                  updateShipping("addressLine1", value);
                  setAddressQuery(value);
                  setAddressSearchError(null);
                }}
                onSelect={selectAddressSuggestion}
                onUseLocation={useCurrentLocationAddress}
                onManual={() => {
                  setAddressResults([]);
                  setAddressSearchError(null);
                }}
              />
              {shippingErrors.addressLine1 && <FieldError message={shippingErrors.addressLine1} />}
              <ShippingInput field="addressLine2" label={t("cart.addressLine2")} optionalLabel={t("cart.optional")} autoComplete="address-line2" value={shippingForm.addressLine2} error={shippingErrors.addressLine2} onChange={(value) => updateShipping("addressLine2", value)} />

              <div className="grid grid-cols-2 gap-3">
                <ShippingInput field="city" label={t("cart.city")} required autoComplete="address-level2" value={shippingForm.city} error={shippingErrors.city} onChange={(value) => updateShipping("city", value)} />
                <ShippingInput field="region" label={t("cart.region")} autoComplete="address-level1" value={shippingForm.region} error={shippingErrors.region} onChange={(value) => updateShipping("region", value)} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <ShippingInput field="postalCode" label={t("cart.postalCode")} required autoComplete="postal-code" value={shippingForm.postalCode} error={shippingErrors.postalCode} onChange={(value) => updateShipping("postalCode", value)} />
                <ShippingInput field="country" label={t("cart.country")} required autoComplete="country-name" value={shippingForm.country} error={shippingErrors.country} onChange={(value) => updateShipping("country", value)} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <ShippingInput field="phone" label={t("cart.phone")} required autoComplete="tel" type="tel" value={shippingForm.phone} error={shippingErrors.phone} onChange={(value) => updateShipping("phone", value)} />
                <ShippingInput field="email" label={t("cart.email")} autoComplete="email" type="email" value={shippingForm.email} error={shippingErrors.email} onChange={(value) => updateShipping("email", value)} />
              </div>

              <label className="block" data-shipping-field="shippingMethod">
                <span style={{ color: "#A0A0A0", fontSize: 12, fontWeight: 600 }}>{t("cart.courier")} *</span>
                <select
                  value={selectedShippingMethodId}
                  onChange={(event) => {
                    setSelectedShippingMethodId(event.target.value);
                    setShippingErrors((current) => ({ ...current, shippingMethod: undefined }));
                    setCheckoutError(null);
                  }}
                  aria-invalid={Boolean(shippingErrors.shippingMethod)}
                  className="mt-1 w-full rounded-xl px-3 py-2 outline-none"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: `1px solid ${shippingErrors.shippingMethod ? "rgba(239,68,68,0.72)" : "rgba(255,255,255,0.08)"}`,
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
                {shippingErrors.shippingMethod && <FieldError message={shippingErrors.shippingMethod} />}
              </label>
              <ShippingInput field="pickupPoint" label={t("cart.pickupPoint")} optionalLabel={t("cart.optional")} value={shippingForm.pickupPoint} error={shippingErrors.pickupPoint} onChange={(value) => updateShipping("pickupPoint", value)} />

              <div data-shipping-field="paymentMethod">
                <div className="flex items-center justify-between gap-3">
                  <span style={{ color: "#A0A0A0", fontSize: 12, fontWeight: 600 }}>{t("cart.paymentMethod")} *</span>
                  <span style={{ color: "#6B7280", fontSize: 11 }}>{t("cart.walletAvailability")}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {cryptoMethods.map((method) => (
                    <PaymentMethodCard
                      key={method.code}
                      method={method}
                      active={selectedPaymentCurrency === method.code}
                      t={t}
                      onSelect={() => {
                        if (!methodIsAvailable(method)) return;
                        setSelectedPaymentCurrency(method.code);
                        setCheckoutError(null);
                      }}
                    />
                  ))}
                </div>
              </div>

              <label className="block" data-shipping-field="instructions">
                <span style={{ color: "#A0A0A0", fontSize: 12, fontWeight: 600 }}>{t("cart.deliveryNotes")}</span>
                <textarea
                  value={shippingForm.instructions}
                  onChange={(event) => updateShipping("instructions", event.target.value)}
                  aria-invalid={Boolean(shippingErrors.instructions)}
                  rows={3}
                  className="mt-1 w-full rounded-xl px-3 py-2 outline-none resize-none"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: `1px solid ${shippingErrors.instructions ? "rgba(239,68,68,0.72)" : "rgba(255,255,255,0.08)"}`,
                    color: "#FFFFFF",
                    fontSize: 14,
                  }}
                />
                {shippingErrors.instructions && <FieldError message={shippingErrors.instructions} />}
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
              {t("cart.creatingPayment")}
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
    setShippingErrors((current) => ({ ...current, [field]: undefined }));
    setCheckoutError(null);
  }

  function applyAddressSuggestion(suggestion: ApiAddressSuggestion) {
    setShippingForm((current) => ({
      ...current,
      addressLine1: suggestion.addressLine1 || current.addressLine1,
      city: suggestion.city || current.city,
      region: suggestion.region || current.region,
      postalCode: suggestion.postalCode || current.postalCode,
      country: suggestion.country || current.country,
      countryCode: suggestion.countryCode || current.countryCode,
    }));
    setShippingErrors((current) => ({
      ...current,
      addressLine1: undefined,
      city: undefined,
      region: undefined,
      postalCode: undefined,
      country: undefined,
    }));
    setAddressQuery(suggestion.addressLine1 || suggestion.displayName);
    setAddressResults([]);
    setAddressSearchError(null);
    setCheckoutError(null);
  }

  async function selectAddressSuggestion(suggestion: ApiAddressSuggestion) {
    if (suggestion.postalCode || suggestion.latitude === null || suggestion.latitude === undefined || suggestion.longitude === null || suggestion.longitude === undefined) {
      applyAddressSuggestion(suggestion);
      return;
    }

    setAddressSearching(true);
    try {
      const detailed = await apiRequest<ApiAddressSuggestion>(
        `/api/v1/address/reverse?lat=${encodeURIComponent(suggestion.latitude)}&lon=${encodeURIComponent(suggestion.longitude)}`,
      );
      applyAddressSuggestion({
        ...suggestion,
        ...detailed,
        displayName: suggestion.displayName,
        addressLine1: detailed.addressLine1 || suggestion.addressLine1,
      });
    } catch {
      applyAddressSuggestion(suggestion);
    } finally {
      setAddressSearching(false);
    }
  }

  async function useCurrentLocationAddress() {
    if (!navigator.geolocation) {
      setAddressSearchError(t("cart.geolocationUnavailable"));
      return;
    }

    setAddressLocating(true);
    setAddressSearchError(null);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 120000,
        });
      });
      const suggestion = await apiRequest<ApiAddressSuggestion>(
        `/api/v1/address/reverse?lat=${encodeURIComponent(position.coords.latitude)}&lon=${encodeURIComponent(position.coords.longitude)}`,
      );
      applyAddressSuggestion(suggestion);
    } catch (err) {
      setAddressSearchError(err instanceof Error ? err.message : t("cart.geolocationError"));
    } finally {
      setAddressLocating(false);
    }
  }

  async function copyPaymentValue(fieldId: string, value: string) {
    await navigator.clipboard?.writeText(value).catch(() => undefined);
    setCopiedField(fieldId);
    window.setTimeout(() => setCopiedField(null), 1400);
  }
}

function PaymentLine({
  label,
  value,
  copyValue,
  fieldId,
  copiedField,
  onCopy,
  tone = "default",
}: {
  label: string;
  value: string;
  copyValue?: string;
  fieldId?: string;
  copiedField?: string | null;
  onCopy?: (fieldId: string, value: string) => void;
  tone?: "default" | "warning";
}) {
  const { t } = useI18n();
  const copied = Boolean(fieldId && copiedField === fieldId);
  const valueColor = tone === "warning" ? "#f59e0b" : "#FFFFFF";
  return (
    <div className="py-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
      <p style={{ color: "#A0A0A0", fontSize: 11, fontWeight: 700, marginBottom: 5 }}>{label}</p>
      <div className="flex items-start gap-2">
        <p className="flex-1 break-all" style={{ color: valueColor, fontSize: 14, lineHeight: 1.45, fontWeight: 650 }}>
          {value}
        </p>
        {copyValue && fieldId && onCopy && (
          <button
            type="button"
            onClick={() => onCopy(fieldId, copyValue)}
            className="rounded-lg p-2 flex-shrink-0"
            style={{ background: copied ? "rgba(34,197,94,0.16)" : "rgba(255,255,255,0.07)" }}
            aria-label={copied ? t("common.copied") : t("common.copy")}
          >
            {copied ? <CheckCircle size={15} color="#22c55e" /> : <Copy size={15} color="#A0A0A0" />}
          </button>
        )}
      </div>
    </div>
  );
}

function ShippingInput({
  field,
  label,
  value,
  onChange,
  error,
  required,
  optionalLabel,
  autoComplete,
  type = "text",
}: {
  field: keyof ShippingForm;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  optionalLabel?: string;
  autoComplete?: string;
  type?: string;
}) {
  return (
    <label className="block" data-shipping-field={field}>
      <span style={{ color: "#A0A0A0", fontSize: 12, fontWeight: 600 }}>
        {label}
        {required ? " *" : ""}
        {!required && optionalLabel ? <span style={{ color: "#6B7280", fontWeight: 500 }}> · {optionalLabel}</span> : null}
      </span>
      <input
        value={value}
        type={type}
        autoComplete={autoComplete}
        aria-invalid={Boolean(error)}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-xl px-3 py-2 outline-none"
        style={{
          background: "rgba(255,255,255,0.06)",
          border: `1px solid ${error ? "rgba(239,68,68,0.72)" : "rgba(255,255,255,0.08)"}`,
          color: "#FFFFFF",
          fontSize: 14,
        }}
      />
      {error && <FieldError message={error} />}
    </label>
  );
}

function FieldError({ message }: { message: string }) {
  return <p style={{ color: "#ef4444", fontSize: 11, lineHeight: 1.35, marginTop: 5 }}>{message}</p>;
}

function AddressAutocompleteInput({
  value,
  query,
  results,
  searching,
  locating,
  error,
  label,
  required,
  field,
  autoComplete,
  onChange,
  onSelect,
  onUseLocation,
  onManual,
  t,
}: {
  value: string;
  query: string;
  results: ApiAddressSuggestion[];
  searching: boolean;
  locating: boolean;
  error: string | null;
  label: string;
  required?: boolean;
  field: keyof ShippingForm;
  autoComplete?: string;
  onChange: (value: string) => void;
  onSelect: (suggestion: ApiAddressSuggestion) => void;
  onUseLocation: () => void;
  onManual: () => void;
  t: (key: string, values?: Record<string, string | number>) => string;
}) {
  const showManualFallback = query.trim().length >= 3 && !searching && !error && results.length === 0;
  return (
    <div data-shipping-field={field}>
      <div className="flex items-center justify-between gap-3">
        <span style={{ color: "#A0A0A0", fontSize: 12, fontWeight: 600 }}>
          {label}
          {required ? " *" : ""}
        </span>
        <span style={{ color: "#6B7280", fontSize: 11 }}>{t("cart.addressSearchPowered")}</span>
      </div>
      <div
        className="mt-1 flex items-center gap-2 rounded-xl px-3 py-2"
        style={{
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <Search size={15} color="#6B7280" />
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={t("cart.addressSearchPlaceholder")}
          autoComplete={autoComplete}
          className="min-w-0 flex-1 bg-transparent outline-none"
          style={{ color: "#FFFFFF", fontSize: 14 }}
        />
        {searching && <Loader2 className="animate-spin" size={15} color="#FF4D6D" />}
        <button
          type="button"
          onClick={onUseLocation}
          disabled={locating}
          className="rounded-lg p-1.5 flex-shrink-0"
          style={{
            background: locating ? "rgba(255,255,255,0.07)" : "rgba(255,77,109,0.12)",
            color: locating ? "#A0A0A0" : "#FF4D6D",
          }}
          aria-label={locating ? t("cart.locatingAddress") : t("cart.useCurrentLocation")}
          title={locating ? t("cart.locatingAddress") : t("cart.useCurrentLocation")}
        >
          {locating ? <Loader2 className="animate-spin" size={15} /> : <LocateFixed size={15} />}
        </button>
      </div>

      {query.trim().length >= 3 && (results.length > 0 || error || showManualFallback) && (
        <div
          className="mt-2 rounded-xl overflow-hidden"
          style={{ background: "#111113", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          {error ? (
            <p className="px-3 py-2" style={{ color: "#ef4444", fontSize: 12 }}>
              {error}
            </p>
          ) : showManualFallback ? (
            <div className="p-3">
              <p style={{ color: "#E5E7EB", fontSize: 12, lineHeight: 1.45, fontWeight: 700 }}>
                {t("cart.addressNotFound")}
              </p>
              <p style={{ color: "#A0A0A0", fontSize: 11, lineHeight: 1.45, marginTop: 3 }}>
                {t("cart.addressManualHint")}
              </p>
              <button
                type="button"
                onClick={onManual}
                className="mt-3 w-full rounded-lg py-2"
                style={{ background: "rgba(255,255,255,0.07)", color: "#FFFFFF", fontSize: 12, fontWeight: 800 }}
              >
                {t("cart.fillManually")}
              </button>
            </div>
          ) : (
            results.map((result) => (
              <button
                key={result.id}
                type="button"
                onClick={() => onSelect(result)}
                className="w-full px-3 py-2.5 text-left flex items-start gap-2"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
              >
                <MapPin size={15} color="#FF4D6D" className="mt-0.5 flex-shrink-0" />
                <span className="min-w-0">
                  <span className="block" style={{ color: "#FFFFFF", fontSize: 12, lineHeight: 1.35, fontWeight: 700 }}>
                    {result.addressLine1 || result.displayName}
                  </span>
                  <span className="block" style={{ color: "#A0A0A0", fontSize: 11, lineHeight: 1.35, marginTop: 2 }}>
                    {[result.postalCode, result.city, result.region, result.country].filter(Boolean).join(", ") || result.displayName}
                  </span>
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function PaymentMethodCard({
  method,
  active,
  onSelect,
  t,
}: {
  method: ApiCryptoPaymentMethod;
  active: boolean;
  onSelect: () => void;
  t: (key: string, values?: Record<string, string | number>) => string;
}) {
  const available = methodIsAvailable(method);
  const configured = method.configured !== false;
  const statusColor = available ? "#22c55e" : configured ? "#f59e0b" : "#ef4444";
  const statusLabel = available ? t("cart.walletAvailable") : configured ? t("cart.walletBusy") : t("cart.walletNotConfigured");
  const freeSlots = method.freeSlots ?? (available ? 1 : 0);
  const totalSlots = method.totalSlots ?? 1;

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={!available}
      className="rounded-xl p-2.5 text-left transition-all"
      style={{
        minHeight: 84,
        background: active
          ? "linear-gradient(135deg, rgba(255,77,109,0.16), rgba(255,154,139,0.08))"
          : "rgba(255,255,255,0.045)",
        border: `1px solid ${active ? "rgba(255,77,109,0.52)" : available ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.05)"}`,
        opacity: available ? 1 : 0.62,
      }}
    >
      <div className="flex items-center gap-2 min-w-0">
          <span
            className="rounded-lg flex items-center justify-center flex-shrink-0"
            style={{
              width: 30,
              height: 30,
              background: active ? "rgba(255,77,109,0.18)" : "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.07)",
            }}
          >
            <Wallet size={16} color={active ? "#FF4D6D" : "#A0A0A0"} />
          </span>
          <div className="min-w-0">
            <p className="truncate" style={{ color: active ? "#FF4D6D" : "#FFFFFF", fontSize: 13, fontWeight: 800 }}>
              {method.label}
            </p>
            <p className="truncate" style={{ color: "#A0A0A0", fontSize: 10, marginTop: 1 }}>
              {method.network}
            </p>
          </div>
      </div>

      <div className="mt-2 flex items-center justify-between gap-2">
        <span
          className="rounded-full px-2 py-0.5 flex-shrink-0"
          style={{
            color: statusColor,
            background: `${statusColor}1f`,
            border: `1px solid ${statusColor}40`,
            fontSize: 9,
            fontWeight: 800,
            maxWidth: "calc(100% - 34px)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {statusLabel}
        </span>
        <span style={{ color: available ? "#E5E7EB" : "#A0A0A0", fontSize: 11, fontWeight: 800 }}>
          {freeSlots}/{totalSlots}
        </span>
      </div>

      {active && method.wallets && method.wallets.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {method.wallets.slice(0, 2).map((wallet) => {
            const walletFree = wallet.status === "available";
            return (
              <span
                key={wallet.label}
                className="rounded-full px-2 py-1"
                style={{
                  color: walletFree ? "#22c55e" : "#f59e0b",
                  background: walletFree ? "rgba(34,197,94,0.1)" : "rgba(245,158,11,0.1)",
                  border: `1px solid ${walletFree ? "rgba(34,197,94,0.2)" : "rgba(245,158,11,0.22)"}`,
                  fontSize: 9,
                  fontWeight: 750,
                }}
              >
                {wallet.label}: {walletFree ? t("cart.walletFreeShort") : t("cart.walletBusyShort")}
              </span>
            );
          })}
          {method.wallets.length > 2 && (
            <span style={{ color: "#6B7280", fontSize: 10, alignSelf: "center" }}>
              +{method.wallets.length - 2}
            </span>
          )}
        </div>
      )}
    </button>
  );
}

function CartItemThumbnail({ item }: { item: CartItem }) {
  const [failed, setFailed] = useState(false);
  const imageUrl = item.product.images.find(Boolean);

  if (!imageUrl || failed) {
    return <ProductImagePlaceholder iconSize={24} />;
  }

  return (
    <img
      src={imageUrl}
      alt={item.product.name}
      className="w-full h-full object-cover"
      onError={() => setFailed(true)}
    />
  );
}

function validateShippingForm(
  form: ShippingForm,
  shippingMethod: ApiShippingMethod | undefined,
  t: (key: string, values?: Record<string, string | number>) => string,
) {
  const errors: ShippingFieldErrors = {};
  const required: Array<[keyof ShippingForm, string, number]> = [
    ["fullName", t("cart.fullName"), 2],
    ["addressLine1", t("cart.addressLine1"), 3],
    ["city", t("cart.city"), 2],
    ["postalCode", t("cart.postalCode"), 2],
    ["country", t("cart.country"), 2],
    ["phone", t("cart.phone"), 5],
  ];
  const maxLengths: Array<[keyof ShippingForm, string, number]> = [
    ["fullName", t("cart.fullName"), 120],
    ["company", t("cart.company"), 120],
    ["addressLine1", t("cart.addressLine1"), 180],
    ["addressLine2", t("cart.addressLine2"), 180],
    ["city", t("cart.city"), 100],
    ["region", t("cart.region"), 100],
    ["postalCode", t("cart.postalCode"), 24],
    ["country", t("cart.country"), 100],
    ["phone", t("cart.phone"), 40],
    ["pickupPoint", t("cart.pickupPoint"), 180],
    ["instructions", t("cart.deliveryNotes"), 1000],
  ];

  for (const [field, label, minLength] of required) {
    const value = form[field].trim();
    if (!value) {
      errors[field] = t("cart.requiredField", { field: label });
    } else if (value.length < minLength) {
      errors[field] = t("cart.fieldTooShort", { field: label, min: minLength });
    }
  }

  for (const [field, label, maxLength] of maxLengths) {
    if (!errors[field] && form[field].trim().length > maxLength) {
      errors[field] = t("cart.fieldTooLong", { field: label, max: maxLength });
    }
  }

  if (!shippingMethod) errors.shippingMethod = t("cart.selectCourierError");
  if (form.email.trim() && !/^\S+@\S+\.\S+$/.test(form.email.trim())) errors.email = t("cart.invalidEmail");
  return errors;
}

function isValidOrderItem(item: CartItem) {
  return UUID_PATTERN.test(item.product.id) && Boolean(item.tier.id && UUID_PATTERN.test(item.tier.id));
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
    countryCode: optionalString(form.countryCode),
    phone: form.phone.trim(),
    email: optionalString(form.email),
    pickupPoint: optionalString(form.pickupPoint),
    instructions: optionalString(form.instructions),
  };
}

function formatPrice(amount: number, t: (key: string) => string) {
  return amount > 0 ? `${amount}€` : t("cart.free");
}

function formatCryptoAmount(amount: number) {
  return amount.toFixed(12).replace(/\.?0+$/, "");
}

function formatPaymentStatus(status: string, t: (key: string) => string) {
  const normalized = status.toLowerCase();
  const labels: Record<string, string> = {
    waiting: t("cart.paymentStatusWaiting"),
    confirming: t("cart.paymentStatusConfirming"),
    confirmed: t("cart.paymentStatusConfirming"),
    sending: t("cart.paymentStatusConfirming"),
    finished: t("cart.paymentStatusFinished"),
    partially_paid: t("cart.paymentStatusPartial"),
    failed: t("cart.paymentStatusFailed"),
    expired: t("cart.paymentStatusExpired"),
    refunded: t("cart.paymentStatusFailed"),
  };
  return labels[normalized] ?? status;
}

function canCancelPayment(order: ApiOrder) {
  const payment = order.payment;
  if (!payment || order.status !== "pending") return false;
  const actuallyPaid = payment.actuallyPaid ?? 0;
  const pendingAmount = payment.pendingAmount ?? 0;
  return actuallyPaid <= 0 && pendingAmount <= 0 && payment.providerStatus !== "finished";
}

function methodIsAvailable(method?: ApiCryptoPaymentMethod) {
  if (!method) return false;
  if (method.configured === false) return false;
  if (typeof method.available === "boolean") return method.available;
  return true;
}

function optionalString(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}
