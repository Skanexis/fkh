import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Clock, Package, CheckCircle, Search, X, MapPin, Truck, Phone, Mail, Send, WalletCards, AlertTriangle, Trash2 } from "lucide-react";
import { apiRequest } from "../../api/client";
import { ApiOrder } from "../../api/types";
import { useI18n } from "../../i18n";
import { useBodyScrollLock } from "../../components/useBodyScrollLock";

type OrderStatus = "pending" | "accepted" | "completed" | "cancelled";

interface AdminOrder {
  id: string;
  publicId: string;
  user: string;
  product: string;
  total: number;
  status: OrderStatus;
  date: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  shipping?: ApiOrder["shipping"];
  tracking?: ApiOrder["tracking"];
  payment?: ApiOrder["payment"];
}

const STATUS_CONFIG = {
  pending: { labelKey: "status.pending", color: "#FF4D6D", bg: "rgba(255,77,109,0.12)", icon: Clock },
  accepted: { labelKey: "status.accepted", color: "#3B82F6", bg: "rgba(59,130,246,0.12)", icon: Package },
  completed: { labelKey: "status.completed", color: "#22c55e", bg: "rgba(34,197,94,0.12)", icon: CheckCircle },
  cancelled: { labelKey: "status.cancelled", color: "#ef4444", bg: "rgba(239,68,68,0.12)", icon: AlertTriangle },
};

export function AdminOrders() {
  const { t, locale } = useI18n();
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<OrderStatus | "all">("all");
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [trackingCode, setTrackingCode] = useState("");
  const [trackingUrl, setTrackingUrl] = useState("");
  const [trackingMessage, setTrackingMessage] = useState("");
  const [trackingSending, setTrackingSending] = useState(false);
  const [paymentCanceling, setPaymentCanceling] = useState(false);

  useEffect(() => {
    void loadOrders();
  }, []);

  useBodyScrollLock(Boolean(selectedOrder));

  useEffect(() => {
    setTrackingCode(selectedOrder?.tracking?.code ?? "");
    setTrackingUrl(selectedOrder?.tracking?.url ?? "");
    setTrackingMessage(selectedOrder?.tracking?.message ?? "");
  }, [selectedOrder?.id]);

  async function loadOrders() {
    try {
      const apiOrders = await apiRequest<ApiOrder[]>("/api/v1/admin/orders?limit=100");
      setOrders(apiOrders.map(toAdminOrder));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.ordersError"));
    }
  }

  const filtered = orders.filter((o) => {
    const matchSearch =
      o.publicId.toLowerCase().includes(search.toLowerCase()) ||
      o.user.toLowerCase().includes(search.toLowerCase()) ||
      (o.payment?.currencyLabel ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (o.payment?.payAddress ?? "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || o.status === filterStatus;
    return matchSearch && matchStatus;
  });

  async function updateStatus(id: string, status: OrderStatus) {
    let next: AdminOrder | null = null;
    try {
      const updated = await apiRequest<ApiOrder>(`/api/v1/admin/orders/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      const nextOrder = toAdminOrder(updated);
      next = nextOrder;
      setOrders((prev) => prev.map((o) => (o.id === id ? nextOrder : o)));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.orderStatusError"));
      return;
    }
    if (next && selectedOrder?.id === id) {
      setSelectedOrder(next);
    }
  }

  async function cancelSelectedPayment() {
    if (!selectedOrder?.payment || !canCancelOrderPayment(selectedOrder)) return;
    if (!window.confirm(t("admin.cancelPaymentConfirm"))) return;
    setPaymentCanceling(true);
    try {
      const updated = await apiRequest<ApiOrder>(`/api/v1/admin/orders/${selectedOrder.id}/cancel-payment`, {
        method: "POST",
      });
      const next = toAdminOrder(updated);
      setOrders((prev) => prev.map((o) => (o.id === next.id ? next : o)));
      setSelectedOrder(next);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.cancelPaymentError"));
    } finally {
      setPaymentCanceling(false);
    }
  }

  async function sendTracking() {
    if (!selectedOrder || !trackingCode.trim()) return;
    setTrackingSending(true);
    try {
      const updated = await apiRequest<ApiOrder>(`/api/v1/admin/orders/${selectedOrder.id}/tracking`, {
        method: "PATCH",
        body: JSON.stringify({
          trackingCode: trackingCode.trim(),
          trackingUrl: trackingUrl.trim() || undefined,
          message: trackingMessage.trim() || undefined,
        }),
      });
      const next = toAdminOrder(updated);
      setOrders((prev) => prev.map((o) => (o.id === next.id ? next : o)));
      setSelectedOrder(next);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.trackingError"));
    } finally {
      setTrackingSending(false);
    }
  }

  const counts = {
    pending: orders.filter((o) => o.status === "pending").length,
    accepted: orders.filter((o) => o.status === "accepted").length,
    completed: orders.filter((o) => o.status === "completed").length,
    cancelled: orders.filter((o) => o.status === "cancelled").length,
  };

  return (
    <div className="p-5 pb-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-5"
      >
        <h1 style={{ color: "#FFFFFF", fontWeight: 800, fontSize: 22 }}>{t("admin.orders")}</h1>
        <p style={{ color: error ? "#ef4444" : "#6B7280", fontSize: 13 }}>
          {error ? `${t("common.backend")}: ${error}` : t("admin.totalOrders", { count: orders.length })}
        </p>
      </motion.div>

      {/* Status summary */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {(Object.keys(STATUS_CONFIG) as OrderStatus[]).map((status) => {
          const cfg = STATUS_CONFIG[status];
          const Icon = cfg.icon;
          return (
            <motion.button
              key={status}
              whileTap={{ scale: 0.97 }}
              onClick={() => setFilterStatus(filterStatus === status ? "all" : status)}
              className="rounded-xl p-3 text-left"
              style={{
                background: filterStatus === status ? cfg.bg : "#111827",
                border: `1px solid ${filterStatus === status ? cfg.color.replace(")", ", 0.5)").replace("rgb", "rgba") : "rgba(255,255,255,0.05)"}`,
              }}
            >
              <Icon size={16} color={cfg.color} strokeWidth={2} className="mb-1.5" />
              <p style={{ color: "#FFFFFF", fontWeight: 700, fontSize: 18 }}>{counts[status]}</p>
              <p style={{ color: "#6B7280", fontSize: 10 }}>{t(cfg.labelKey)}</p>
            </motion.button>
          );
        })}
      </div>

      {/* Search */}
      <div
        className="flex items-center gap-3 rounded-xl px-4 py-3 mb-4"
        style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)" }}
      >
        <Search size={15} color="#6B7280" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("admin.searchOrders")}
          className="flex-1 bg-transparent outline-none"
          style={{ color: "#FFFFFF", fontSize: 14 }}
        />
        {search && <button onClick={() => setSearch("")}><X size={14} color="#6B7280" /></button>}
      </div>

      {/* Orders list */}
      <div className="flex flex-col gap-2">
        {filtered.map((order, i) => {
          const cfg = STATUS_CONFIG[order.status];
          const Icon = cfg.icon;
          return (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="rounded-xl p-4 cursor-pointer"
              style={{
                background: "#111827",
                border: "1px solid rgba(255,255,255,0.05)",
              }}
              onClick={() => setSelectedOrder(order)}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span style={{ color: "#FFFFFF", fontWeight: 700, fontSize: 14 }}>{order.publicId}</span>
                  <span
                    className="flex items-center gap-1 px-2 py-0.5 rounded-full"
                    style={{ background: cfg.bg }}
                  >
                    <Icon size={10} color={cfg.color} strokeWidth={2.5} />
                    <span style={{ color: cfg.color, fontSize: 10, fontWeight: 600 }}>{t(cfg.labelKey)}</span>
                  </span>
                </div>
                <span style={{ color: "#FF4D6D", fontWeight: 700, fontSize: 15 }}>€{order.total}</span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p style={{ color: "#9CA3AF", fontSize: 12 }}>{order.user}</p>
                  <p style={{ color: "#6B7280", fontSize: 11, marginTop: 1 }}>{order.product}</p>
                  {order.payment && (
                    <p style={{ color: "#60A5FA", fontSize: 11, marginTop: 3 }}>
                      {order.payment.currencyLabel} · {paymentStatusLabel(order.payment.providerStatus, t)} · {t("cart.paymentReceived").toLowerCase()} {formatCrypto(order.payment.actuallyPaid)} {order.payment.providerCurrency.toUpperCase()}
                    </p>
                  )}
                </div>
                <span style={{ color: "#6B7280", fontSize: 11 }}>
                  {new Date(order.date).toLocaleDateString(locale)}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Order detail modal */}
      <AnimatePresence>
        {selectedOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fkh-modal-overlay fixed inset-0 z-50 flex items-end md:items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
            onClick={() => setSelectedOrder(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              className="fkh-modal-panel w-full max-w-md overflow-y-auto rounded-2xl"
              style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.08)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className="flex items-center justify-between px-5 py-4"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
              >
                <h3 style={{ color: "#FFFFFF", fontWeight: 700, fontSize: 16 }}>
                  {t("admin.orderDetail")}
                </h3>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="p-1.5 rounded-lg"
                  style={{ background: "rgba(255,255,255,0.07)" }}
                >
                  <X size={15} color="#9CA3AF" />
                </button>
              </div>

              <div className="p-5">
                <div className="grid grid-cols-2 gap-3 mb-5">
                  {[
                    { label: t("admin.orderId"), value: selectedOrder.publicId },
                    { label: t("admin.customer"), value: selectedOrder.user },
                    { label: t("admin.product"), value: selectedOrder.product },
                    { label: t("admin.date"), value: new Date(selectedOrder.date).toLocaleDateString(locale) },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p style={{ color: "#6B7280", fontSize: 11 }}>{label}</p>
                      <p style={{ color: "#FFFFFF", fontWeight: 600, fontSize: 13, marginTop: 2 }}>{value}</p>
                    </div>
                  ))}
                </div>

                <div
                  className="rounded-xl p-3 mb-5 flex items-center justify-between"
                  style={{ background: "rgba(255,255,255,0.04)" }}
                >
                  <span style={{ color: "#9CA3AF", fontSize: 13 }}>{t("admin.total")}</span>
                  <span style={{ color: "#FF4D6D", fontWeight: 800, fontSize: 20 }}>
                    €{selectedOrder.total}
                  </span>
                </div>

                {selectedOrder.payment && (
                  <div
                    className="rounded-xl p-3 mb-5"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <WalletCards size={15} color="#3B82F6" />
                      <p style={{ color: "#FFFFFF", fontWeight: 700, fontSize: 13 }}>{t("admin.payment")}</p>
                      <span
                        className="px-2 py-0.5 rounded-full"
                        style={{
                          background: paymentStatusBg(selectedOrder.payment.providerStatus),
                          color: paymentStatusColor(selectedOrder.payment.providerStatus),
                          fontSize: 10,
                          fontWeight: 800,
                        }}
                      >
                        {paymentStatusLabel(selectedOrder.payment.providerStatus, t)}
                      </span>
                    </div>
                    <div className="space-y-2">
                      <DeliveryLine label={t("admin.asset")} value={`${selectedOrder.payment.currencyLabel} (${selectedOrder.payment.network})`} />
                      <DeliveryLine label={t("admin.expected")} value={`${formatCrypto(selectedOrder.payment.payAmount)} ${selectedOrder.payment.providerCurrency.toUpperCase()}`} />
                      <DeliveryLine label={t("admin.confirmed")} value={`${formatCrypto(selectedOrder.payment.actuallyPaid)} ${selectedOrder.payment.providerCurrency.toUpperCase()}`} />
                      <DeliveryLine label={t("admin.pendingChain")} value={`${formatCrypto(selectedOrder.payment.pendingAmount)} ${selectedOrder.payment.providerCurrency.toUpperCase()}`} />
                      <DeliveryLine label={t("cart.paymentRemaining")} value={`${formatCrypto(selectedOrder.payment.remainingAmount)} ${selectedOrder.payment.providerCurrency.toUpperCase()}`} />
                      <DeliveryLine label={t("cart.paymentAddress")} value={selectedOrder.payment.payAddress} />
                      <DeliveryLine label={t("admin.paymentId")} value={selectedOrder.payment.providerPaymentId} />
                      <DeliveryLine label={t("admin.paidAt")} value={selectedOrder.payment.paidAt ? new Date(selectedOrder.payment.paidAt).toLocaleString(locale) : undefined} />
                    </div>
                    <button
                      type="button"
                      onClick={cancelSelectedPayment}
                      disabled={!canCancelOrderPayment(selectedOrder) || paymentCanceling}
                      className="mt-3 w-full flex items-center justify-center gap-2 rounded-xl py-3 transition-all"
                      style={{
                        background: canCancelOrderPayment(selectedOrder) ? "rgba(239,68,68,0.12)" : "rgba(255,255,255,0.06)",
                        border: `1px solid ${canCancelOrderPayment(selectedOrder) ? "rgba(239,68,68,0.32)" : "rgba(255,255,255,0.08)"}`,
                        color: canCancelOrderPayment(selectedOrder) ? "#ef4444" : "#6B7280",
                        fontSize: 13,
                        fontWeight: 800,
                        opacity: paymentCanceling ? 0.75 : 1,
                      }}
                    >
                      <Trash2 size={15} />
                      {paymentCanceling ? t("admin.saving") : canCancelOrderPayment(selectedOrder) ? t("admin.cancelPayment") : t("admin.cancelPaymentUnavailable")}
                    </button>
                  </div>
                )}

                <div
                  className="rounded-xl p-3 mb-5"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <MapPin size={15} color="#FF4D6D" />
                    <p style={{ color: "#FFFFFF", fontWeight: 700, fontSize: 13 }}>{t("admin.delivery")}</p>
                  </div>
                  <div className="space-y-2">
                    <DeliveryLine label={t("admin.recipient")} value={selectedOrder.shipping?.fullName} />
                    <DeliveryLine label={t("cart.company")} value={selectedOrder.shipping?.company} />
                    <DeliveryLine
                      label={t("cart.addressLine1")}
                      value={formatAddress(selectedOrder.shipping)}
                    />
                    <DeliveryLine
                      icon={<Phone size={13} color="#6B7280" />}
                      label={t("cart.phone")}
                      value={selectedOrder.shipping?.phone ?? selectedOrder.customerPhone}
                    />
                    <DeliveryLine
                      icon={<Mail size={13} color="#6B7280" />}
                      label={t("cart.email")}
                      value={selectedOrder.shipping?.email ?? selectedOrder.customerEmail}
                    />
                    <DeliveryLine label={t("admin.vatTaxId")} value={selectedOrder.shipping?.taxId} />
                    <DeliveryLine
                      icon={<Truck size={13} color="#6B7280" />}
                      label={t("admin.carrier")}
                      value={selectedOrder.shipping?.methodPreference}
                    />
                    <DeliveryLine label={t("admin.pickupPoint")} value={selectedOrder.shipping?.pickupPoint} />
                    <DeliveryLine label={t("admin.instructions")} value={selectedOrder.shipping?.instructions} />
                  </div>
                </div>

                <div
                  className="rounded-xl p-3 mb-5"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Send size={15} color="#22c55e" />
                    <p style={{ color: "#FFFFFF", fontWeight: 700, fontSize: 13 }}>{t("admin.tracking")}</p>
                  </div>
                  {selectedOrder.tracking?.sentAt && (
                    <p className="mb-3" style={{ color: "#22c55e", fontSize: 12 }}>
                      {t("admin.trackingSentAt", { date: new Date(selectedOrder.tracking.sentAt).toLocaleString(locale) })}
                    </p>
                  )}
                  <div className="space-y-2">
                    <input
                      value={trackingCode}
                      onChange={(event) => setTrackingCode(event.target.value)}
                      placeholder={t("admin.trackingCode")}
                      className="w-full rounded-xl px-3 py-2.5 bg-transparent outline-none"
                      style={{ border: "1px solid rgba(255,255,255,0.08)", color: "#FFFFFF", fontSize: 13 }}
                    />
                    <input
                      value={trackingUrl}
                      onChange={(event) => setTrackingUrl(event.target.value)}
                      placeholder={t("admin.trackingLink")}
                      className="w-full rounded-xl px-3 py-2.5 bg-transparent outline-none"
                      style={{ border: "1px solid rgba(255,255,255,0.08)", color: "#FFFFFF", fontSize: 13 }}
                    />
                    <textarea
                      value={trackingMessage}
                      onChange={(event) => setTrackingMessage(event.target.value)}
                      placeholder={t("admin.trackingMessage")}
                      rows={3}
                      className="w-full rounded-xl px-3 py-2.5 bg-transparent outline-none resize-none"
                      style={{ border: "1px solid rgba(255,255,255,0.08)", color: "#FFFFFF", fontSize: 13 }}
                    />
                    <button
                      onClick={sendTracking}
                      disabled={trackingSending || !trackingCode.trim()}
                      className="w-full flex items-center justify-center gap-2 rounded-xl py-3 transition-all"
                      style={{
                        background: trackingSending || !trackingCode.trim() ? "rgba(255,255,255,0.08)" : "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
                        color: "#FFFFFF",
                        fontWeight: 700,
                        fontSize: 13,
                        opacity: trackingSending || !trackingCode.trim() ? 0.6 : 1,
                      }}
                    >
                      <Send size={15} />
                      {trackingSending ? t("admin.trackingSending") : t("admin.sendTrackingComplete")}
                    </button>
                  </div>
                </div>

                {/* Status update */}
                <p style={{ color: "#6B7280", fontSize: 12, marginBottom: 10 }}>{t("admin.updateStatus")}</p>
                <div className="flex gap-2">
                  {(Object.keys(STATUS_CONFIG) as OrderStatus[]).map((status) => {
                    const cfg = STATUS_CONFIG[status];
                    const Icon = cfg.icon;
                    const isActive = selectedOrder.status === status;
                    return (
                      <button
                        key={status}
                        onClick={() => updateStatus(selectedOrder.id, status)}
                        className="flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl transition-all"
                        style={{
                          background: isActive ? cfg.bg : "rgba(255,255,255,0.04)",
                          border: `1px solid ${isActive ? cfg.color + "80" : "rgba(255,255,255,0.07)"}`,
                        }}
                      >
                        <Icon size={15} color={isActive ? cfg.color : "#6B7280"} strokeWidth={2} />
                        <span style={{ color: isActive ? cfg.color : "#6B7280", fontSize: 10, fontWeight: 600 }}>
                          {t(cfg.labelKey)}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="mt-3 w-full rounded-xl py-3"
                  style={{ background: "rgba(255,255,255,0.07)", color: "#9CA3AF", fontSize: 13, fontWeight: 800 }}
                >
                  {t("admin.cancel")}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function toAdminOrder(order: ApiOrder): AdminOrder {
  return {
    id: order.id,
    publicId: order.publicId,
    user: order.customerName,
    product: order.items.map((item) => `${item.productName} ${item.priceTierLabel}`).join(", "),
    total: order.totalAmount,
    status: order.status,
    date: order.createdAt,
    customerEmail: order.customerEmail,
    customerPhone: order.customerPhone,
    shipping: order.shipping,
    tracking: order.tracking,
    payment: order.payment,
  };
}

function DeliveryLine({
  label,
  value,
  icon,
}: {
  label: string;
  value?: string | null;
  icon?: ReactNode;
}) {
  if (!value) return null;
  return (
    <div className="grid grid-cols-[96px_1fr] gap-2">
      <p className="flex items-center gap-1" style={{ color: "#6B7280", fontSize: 11 }}>
        {icon}
        {label}
      </p>
      <p style={{ color: "#E5E7EB", fontSize: 12, lineHeight: 1.45, whiteSpace: "pre-line" }}>{value}</p>
    </div>
  );
}

function formatAddress(shipping: ApiOrder["shipping"]) {
  if (!shipping) return null;
  const cityLine = [shipping.postalCode, shipping.city, shipping.region].filter(Boolean).join(" ");
  const countryLine = [shipping.country, shipping.countryCode ? `(${shipping.countryCode})` : null].filter(Boolean).join(" ");
  return [shipping.addressLine1, shipping.addressLine2, cityLine, countryLine].filter(Boolean).join("\n");
}

function paymentStatusLabel(status: string, t: (key: string) => string) {
  const labels: Record<string, string> = {
    waiting: t("cart.paymentStatusWaiting"),
    confirming: t("cart.paymentStatusConfirming"),
    partially_paid: t("cart.paymentStatusPartial"),
    finished: t("cart.paymentStatusFinished"),
    expired: t("cart.paymentStatusExpired"),
    failed: t("cart.paymentStatusFailed"),
    manual_pending: t("cart.paymentStatusManualPending"),
    manual_accepted: t("cart.paymentStatusManualAccepted"),
  };
  return labels[status] ?? status;
}

function paymentStatusColor(status: string) {
  if (status === "finished") return "#22c55e";
  if (status === "manual_pending" || status === "manual_accepted") return "#3B82F6";
  if (status === "partially_paid") return "#F97316";
  if (status === "expired") return "#6B7280";
  if (status === "failed") return "#ef4444";
  return "#3B82F6";
}

function paymentStatusBg(status: string) {
  if (status === "finished") return "rgba(34,197,94,0.12)";
  if (status === "manual_pending" || status === "manual_accepted") return "rgba(59,130,246,0.12)";
  if (status === "partially_paid") return "rgba(249,115,22,0.12)";
  if (status === "expired") return "rgba(107,114,128,0.12)";
  if (status === "failed") return "rgba(239,68,68,0.12)";
  return "rgba(59,130,246,0.12)";
}

function canCancelOrderPayment(order: AdminOrder) {
  const payment = order.payment;
  if (!payment) return false;
  const actuallyPaid = payment.actuallyPaid ?? 0;
  const pendingAmount = payment.pendingAmount ?? 0;
  return actuallyPaid <= 0 && pendingAmount <= 0 && !["finished", "manual_accepted"].includes(payment.providerStatus);
}

function formatCrypto(value?: number | null) {
  if (value === null || value === undefined) return "0";
  return Number(value).toLocaleString("en-US", {
    maximumFractionDigits: 12,
    useGrouping: false,
  });
}
