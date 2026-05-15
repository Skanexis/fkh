import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { User, Package, Clock, CheckCircle, ChevronRight, Settings, LogOut, ShieldCheck, LayoutDashboard, Coins, Copy, X, AlertCircle, Trash2 } from "lucide-react";
import { useNavigate } from "react-router";
import { TopBar } from "../components/TopBar";
import { useAuth } from "../auth/auth-context";
import { TelegramLoginPanel } from "../auth/TelegramLoginPanel";
import { apiRequest } from "../api/client";
import { ApiOrder } from "../api/types";
import { toProfileOrder } from "../api/adapters";
import { useI18n } from "../i18n";
import { BannedNotice } from "../components/BannedNotice";

const STATUS_CONFIG = {
  pending: { labelKey: "status.pending", color: "#FF4D6D", bg: "rgba(255,77,109,0.12)" },
  accepted: { labelKey: "status.accepted", color: "#3B82F6", bg: "rgba(59,130,246,0.12)" },
  completed: { labelKey: "status.completed", color: "#22c55e", bg: "rgba(34,197,94,0.12)" },
  cancelled: { labelKey: "status.cancelled", color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
};

const STATUS_ICON = {
  pending: Clock,
  accepted: Package,
  completed: CheckCircle,
  cancelled: Package,
};

type ProfileOrder = ReturnType<typeof toProfileOrder>;

export function Profile() {
  const navigate = useNavigate();
  const { t, locale } = useI18n();
  const [activeTab, setActiveTab] = useState<"current" | "history">("current");
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const [orders, setOrders] = useState<ProfileOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<ProfileOrder | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [cancelingPayment, setCancelingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  async function loadOrders() {
    if (!isAuthenticated || user?.status !== "active") {
      setOrders([]);
      return;
    }

    setLoadingOrders(true);
    try {
      const apiOrders = await apiRequest<ApiOrder[]>("/api/v1/me/orders");
      setOrders(apiOrders.map(toProfileOrder));
    } finally {
      setLoadingOrders(false);
    }
  }

  useEffect(() => {
    void loadOrders();
  }, [isAuthenticated, user?.status]);

  useEffect(() => {
    if (!selectedOrder) return;
    let cancelled = false;
    const timer = window.setInterval(() => {
      apiRequest<ApiOrder>(`/api/v1/me/orders/${encodeURIComponent(selectedOrder.id)}`)
        .then((apiOrder) => {
          if (cancelled) return;
          const next = toProfileOrder(apiOrder);
          setSelectedOrder(next);
          setOrders((current) => current.map((order) => (order.id === next.id ? next : order)));
        })
        .catch(() => undefined);
    }, 10000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [selectedOrder?.id]);

  const currentOrders = useMemo(
    () => orders.filter((o) => o.status !== "completed" && o.status !== "cancelled"),
    [orders],
  );
  const historyOrders = useMemo(
    () => orders.filter((o) => o.status === "completed" || o.status === "cancelled"),
    [orders],
  );
  const displayOrders = activeTab === "current" ? currentOrders : historyOrders;
  const isBanned = user?.status === "blocked" || user?.status === "deleted";

  async function cancelPayment(order: ProfileOrder) {
    if (!canCancelPayment(order)) return;
    if (!window.confirm(t("cart.cancelPaymentConfirm"))) return;
    setCancelingPayment(true);
    setPaymentError(null);
    try {
      const updated = await apiRequest<ApiOrder>(`/api/v1/me/orders/${encodeURIComponent(order.id)}/cancel-payment`, {
        method: "POST",
      });
      const next = toProfileOrder(updated);
      setOrders((current) => current.map((item) => (item.id === next.id ? next : item)));
      setSelectedOrder(next);
    } catch (err) {
      setPaymentError(err instanceof Error ? err.message : t("cart.cancelPaymentError"));
    } finally {
      setCancelingPayment(false);
    }
  }

  async function copyPaymentValue(fieldId: string, value: string) {
    await navigator.clipboard?.writeText(value);
    setCopiedField(fieldId);
    window.setTimeout(() => setCopiedField((current) => (current === fieldId ? null : current)), 1200);
  }

  return (
    <div
      className="min-h-screen pb-24"
      style={{ background: "#0B0B0C", fontFamily: "Inter, sans-serif" }}
    >
      <TopBar title={t("nav.profile")} />

      <div className="pt-16 px-4">
        {!isAuthenticated ? (
          <div className="pt-4">
            <TelegramLoginPanel />
          </div>
        ) : (
          <>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="pt-4 mb-6"
            >
              <div
                className="rounded-2xl p-5 flex items-center gap-4"
                style={{
                  background: "#1A1A1D",
                  border: "1px solid rgba(255,77,109,0.15)",
                }}
              >
                <div
                  className="rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden"
                  style={{
                    width: 60,
                    height: 60,
                    background: "linear-gradient(135deg, rgba(255,77,109,0.3), rgba(255,154,139,0.15))",
                    border: "2px solid rgba(255,77,109,0.4)",
                  }}
                >
                  {user?.telegramPhotoUrl || user?.avatarUrl ? (
                    <img
                      src={user.telegramPhotoUrl || user.avatarUrl || ""}
                      alt={user.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User size={28} color="#FF4D6D" strokeWidth={1.8} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 style={{ color: "#FFFFFF", fontWeight: 700, fontSize: 18 }}>{user?.name}</h2>
                  <p style={{ color: "#A0A0A0", fontSize: 13, marginTop: 2 }}>
                    {user?.telegramUsername ? `@${user.telegramUsername}` : `ID ${user?.telegramId}`}
                  </p>
                  <div className="flex gap-3 mt-2">
                    <span style={{ color: "#A0A0A0", fontSize: 12 }}>
                      <span style={{ color: "#FF4D6D", fontWeight: 700 }}>{orders.length}</span> {t("profile.orders")}
                    </span>
                    <span style={{ color: "#A0A0A0", fontSize: 12 }}>{t("profile.telegramLinked")}</span>
                  </div>
                </div>
                {isAdmin && (
                  <div className="fkh-admin-badge">
                    <ShieldCheck size={14} />
                    <span>{t("common.admin")}</span>
                  </div>
                )}
              </div>
            </motion.div>

            {isBanned && (
              <div className="mb-4">
                <BannedNotice />
              </div>
            )}

            {isAdmin && !isBanned && (
              <motion.button
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 }}
                onClick={() => navigate("/admin")}
                className="fkh-admin-entry mb-4"
              >
                <span>
                  <LayoutDashboard size={18} />
                  {t("profile.adminPanel")}
                </span>
                <ChevronRight size={18} />
              </motion.button>
            )}

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex gap-3 mb-6"
            >
              {[
                { icon: Settings, label: t("profile.settings"), action: undefined },
                { icon: LogOut, label: t("profile.logout"), action: logout },
              ].map(({ icon: Icon, label, action }) => (
                <button
                  key={label}
                  onClick={action}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <Icon size={15} color="#A0A0A0" strokeWidth={1.8} />
                  <span style={{ color: "#A0A0A0", fontSize: 13 }}>{label}</span>
                </button>
              ))}
            </motion.div>

            {!isBanned && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <h2 style={{ color: "#FFFFFF", fontWeight: 700, fontSize: 18, marginBottom: 12 }}>
                {t("profile.yourOrders")}
              </h2>

              <div className="flex gap-1 p-1 rounded-xl mb-4" style={{ background: "#1A1A1D" }}>
                {[
                  { key: "current", label: t("profile.current"), count: currentOrders.length },
                  { key: "history", label: t("profile.history"), count: historyOrders.length },
                ].map(({ key, label, count }) => (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key as "current" | "history")}
                    className="flex-1 py-2 rounded-lg flex items-center justify-center gap-2 transition-all"
                    style={{
                      background: activeTab === key ? "rgba(255,77,109,0.15)" : "transparent",
                      border: activeTab === key ? "1px solid rgba(255,77,109,0.3)" : "1px solid transparent",
                    }}
                  >
                    <span
                      style={{
                        color: activeTab === key ? "#FF4D6D" : "#A0A0A0",
                        fontWeight: activeTab === key ? 700 : 400,
                        fontSize: 14,
                      }}
                    >
                      {label}
                    </span>
                    <span
                      className="rounded-full px-1.5 py-0.5"
                      style={{
                        background: activeTab === key ? "rgba(255,77,109,0.25)" : "rgba(255,255,255,0.08)",
                        color: activeTab === key ? "#FF4D6D" : "#A0A0A0",
                        fontSize: 11,
                        fontWeight: 600,
                      }}
                    >
                      {count}
                    </span>
                  </button>
                ))}
              </div>

              {loadingOrders ? (
                <div className="text-center py-12 rounded-2xl" style={{ background: "#1A1A1D" }}>
                  <p style={{ color: "#A0A0A0", fontSize: 14 }}>{t("profile.loadingOrders")}</p>
                </div>
              ) : displayOrders.length === 0 ? (
                <div className="text-center py-12 rounded-2xl" style={{ background: "#1A1A1D" }}>
                  <Package size={36} color="#A0A0A0" className="mx-auto mb-3" strokeWidth={1.5} />
                  <p style={{ color: "#A0A0A0", fontSize: 14 }}>{t("profile.noOrders")}</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {displayOrders.map((order, i) => {
                    const status = STATUS_CONFIG[order.status as keyof typeof STATUS_CONFIG];
                    const StatusIcon = STATUS_ICON[order.status as keyof typeof STATUS_ICON];
                    return (
                      <motion.div
                        key={order.id}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.06 }}
                        className="rounded-2xl p-4"
                        style={{
                          background: "#1A1A1D",
                          border: "1px solid rgba(255,255,255,0.05)",
                          cursor: "pointer",
                        }}
                        onClick={() => {
                          setSelectedOrder(order);
                          setPaymentError(null);
                        }}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span style={{ color: "#FFFFFF", fontWeight: 700, fontSize: 14 }}>
                              {order.id}
                            </span>
                            <span className="px-2 py-0.5 rounded-full flex items-center gap-1" style={{ background: status.bg }}>
                              <StatusIcon size={10} color={status.color} strokeWidth={2.5} />
                              <span style={{ color: status.color, fontSize: 10, fontWeight: 600 }}>
                                {t(status.labelKey)}
                              </span>
                            </span>
                          </div>
                          <ChevronRight size={16} color="#A0A0A0" />
                        </div>

                        {order.items.map((item) => (
                          <div key={`${order.id}-${item.productId}-${item.weight}`} className="flex justify-between items-center py-1.5">
                            <div>
                              <p style={{ color: "#FFFFFF", fontSize: 13, fontWeight: 500 }}>{item.name}</p>
                              <p style={{ color: "#A0A0A0", fontSize: 11, marginTop: 1 }}>
                                {item.weight} x {item.qty}
                              </p>
                            </div>
                            <span style={{ color: "#FF4D6D", fontWeight: 700, fontSize: 14 }}>
                              {item.price * item.qty}€
                            </span>
                          </div>
                        ))}

                        <div
                          className="flex justify-between items-center mt-2 pt-2"
                          style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
                        >
                          <span style={{ color: "#A0A0A0", fontSize: 12 }}>
                            {new Date(order.date).toLocaleDateString(locale)}
                          </span>
                          <span style={{ color: "#FF4D6D", fontWeight: 800, fontSize: 16 }}>{order.total}€</span>
                        </div>
                        {order.payment?.isUnderpaid && order.payment.remainingAmount && order.payment.remainingAmount > 0 && (
                          <div
                            className="mt-2 rounded-xl px-3 py-2"
                            style={{ background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.25)" }}
                          >
                            <span style={{ color: "#f59e0b", fontSize: 12, fontWeight: 700 }}>
                              {t("cart.paymentRemaining")}: {formatCryptoAmount(order.payment.remainingAmount)} {order.payment.providerCurrency.toUpperCase()}
                            </span>
                          </div>
                        )}
                        {order.payment && (
                          <div
                            className="mt-2 rounded-xl px-3 py-2"
                            style={{ background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)" }}
                          >
                            <span style={{ color: "#60A5FA", fontSize: 12, fontWeight: 700 }}>
                              {order.payment.currencyLabel} · {formatPaymentStatus(order.payment.providerStatus, t)}
                            </span>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
            )}
          </>
        )}
      </div>

      <AnimatePresence>
        {selectedOrder && (
          <PaymentModal
            order={selectedOrder}
            locale={locale}
            copiedField={copiedField}
            paymentError={paymentError}
            cancelingPayment={cancelingPayment}
            t={t}
            onCopy={copyPaymentValue}
            onCancelPayment={() => cancelPayment(selectedOrder)}
            onClose={() => setSelectedOrder(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function formatCryptoAmount(amount: number) {
  return amount.toFixed(12).replace(/\.?0+$/, "");
}

function PaymentModal({
  order,
  locale,
  copiedField,
  paymentError,
  cancelingPayment,
  t,
  onCopy,
  onCancelPayment,
  onClose,
}: {
  order: ProfileOrder;
  locale: string;
  copiedField: string | null;
  paymentError: string | null;
  cancelingPayment: boolean;
  t: (key: string) => string;
  onCopy: (fieldId: string, value: string) => void;
  onCancelPayment: () => void;
  onClose: () => void;
}) {
  const payment = order.payment;
  const canCancel = canCancelPayment(order);
  const status = STATUS_CONFIG[order.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.pending;
  const StatusIcon = STATUS_ICON[order.status as keyof typeof STATUS_ICON] ?? Clock;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fkh-modal-overlay fixed inset-0 z-50 flex items-end md:items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        className="fkh-modal-panel w-full max-w-md overflow-y-auto rounded-2xl"
        style={{ background: "#1A1A1D", border: "1px solid rgba(255,77,109,0.18)" }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="flex items-center gap-3">
            <div className="rounded-full p-2.5" style={{ background: "rgba(255,77,109,0.12)" }}>
              <Coins size={18} color="#FF4D6D" />
            </div>
            <div>
              <h3 style={{ color: "#FFFFFF", fontWeight: 800, fontSize: 16 }}>{order.id}</h3>
              <p style={{ color: "#A0A0A0", fontSize: 12 }}>{new Date(order.date).toLocaleString(locale)}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ background: "rgba(255,255,255,0.07)" }}>
            <X size={15} color="#A0A0A0" />
          </button>
        </div>

        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="px-2.5 py-1 rounded-full flex items-center gap-1.5" style={{ background: status.bg }}>
              <StatusIcon size={12} color={status.color} strokeWidth={2.5} />
              <span style={{ color: status.color, fontSize: 11, fontWeight: 800 }}>{t(status.labelKey)}</span>
            </span>
            <span style={{ color: "#FF4D6D", fontWeight: 900, fontSize: 18 }}>{order.total}€</span>
          </div>

          {payment ? (
            <>
              <PaymentLine label={t("cart.paymentMethod")} value={`${payment.currencyLabel} · ${payment.network}`} />
              <PaymentLine label={t("cart.paymentStatus")} value={formatPaymentStatus(payment.providerStatus, t)} />
              {payment.expiresAt && <PaymentLine label={t("cart.paymentExpires")} value={new Date(payment.expiresAt).toLocaleString(locale)} />}
              {payment.payAmount && (
                <PaymentLine
                  label={t("cart.paymentAmount")}
                  value={`${formatCryptoAmount(payment.payAmount)} ${payment.providerCurrency.toUpperCase()}`}
                  copyValue={String(payment.payAmount)}
                  fieldId="amount"
                  copiedField={copiedField}
                  onCopy={onCopy}
                />
              )}
              <PaymentLine
                label={t("cart.paymentReceived")}
                value={`${formatCryptoAmount(payment.actuallyPaid ?? 0)} ${payment.providerCurrency.toUpperCase()}`}
              />
              {(payment.pendingAmount ?? 0) > 0 && (
                <PaymentLine
                  label={t("cart.paymentPending")}
                  value={`${formatCryptoAmount(payment.pendingAmount ?? 0)} ${payment.providerCurrency.toUpperCase()}`}
                />
              )}
              {(payment.remainingAmount ?? 0) > 0 && (
                <PaymentLine
                  label={t("cart.paymentRemaining")}
                  value={`${formatCryptoAmount(payment.remainingAmount ?? 0)} ${payment.providerCurrency.toUpperCase()}`}
                  copyValue={String(payment.remainingAmount ?? 0)}
                  fieldId="remaining"
                  copiedField={copiedField}
                  onCopy={onCopy}
                  tone={payment.isUnderpaid ? "warning" : undefined}
                />
              )}
              {payment.payAddress && (
                <PaymentLine
                  label={t("cart.paymentAddress")}
                  value={payment.payAddress}
                  copyValue={payment.payAddress}
                  fieldId="address"
                  copiedField={copiedField}
                  onCopy={onCopy}
                />
              )}
              {payment.payinExtraId && (
                <PaymentLine
                  label={t("cart.paymentMemo")}
                  value={payment.payinExtraId}
                  copyValue={payment.payinExtraId}
                  fieldId="memo"
                  copiedField={copiedField}
                  onCopy={onCopy}
                />
              )}

              <div className="mt-4 rounded-xl p-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <p style={{ color: "#E5E7EB", fontSize: 12, lineHeight: 1.5 }}>
                  {payment.isUnderpaid ? t("cart.paymentUnderpaidNotice") : t("cart.paymentNotice")}
                </p>
              </div>

              {paymentError && (
                <div className="mt-4 rounded-xl px-4 py-3 flex items-center gap-2" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)" }}>
                  <AlertCircle size={16} color="#ef4444" />
                  <span style={{ color: "#ef4444", fontSize: 13 }}>{paymentError}</span>
                </div>
              )}

              {order.status === "pending" && (
                <button
                  onClick={onCancelPayment}
                  disabled={!canCancel || cancelingPayment}
                  className="mt-4 w-full py-3 rounded-xl flex items-center justify-center gap-2"
                  style={{
                    background: canCancel ? "rgba(239,68,68,0.12)" : "rgba(255,255,255,0.06)",
                    border: `1px solid ${canCancel ? "rgba(239,68,68,0.28)" : "rgba(255,255,255,0.08)"}`,
                    color: canCancel ? "#ef4444" : "#6B7280",
                    fontWeight: 800,
                  }}
                >
                  <Trash2 size={16} />
                  {cancelingPayment ? t("admin.saving") : canCancel ? t("cart.cancelPayment") : t("cart.cancelPaymentUnavailable")}
                </button>
              )}
            </>
          ) : (
            <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.04)" }}>
              <p style={{ color: order.status === "cancelled" ? "#ef4444" : "#A0A0A0", fontSize: 13, fontWeight: 700 }}>
                {order.status === "cancelled" ? t("cart.paymentCancelled") : t("profile.noOrders")}
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function PaymentLine({
  label,
  value,
  copyValue,
  fieldId,
  copiedField,
  onCopy,
  tone,
}: {
  label: string;
  value: string;
  copyValue?: string;
  fieldId?: string;
  copiedField?: string | null;
  onCopy?: (fieldId: string, value: string) => void;
  tone?: "warning";
}) {
  const copied = fieldId && copiedField === fieldId;
  return (
    <div className="py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
      <p style={{ color: "#A0A0A0", fontSize: 11, marginBottom: 4 }}>{label}</p>
      <div className="flex items-center gap-2">
        <p style={{ color: tone === "warning" ? "#f59e0b" : "#FFFFFF", fontSize: 14, fontWeight: 700, overflowWrap: "anywhere", flex: 1 }}>
          {value}
        </p>
        {copyValue && fieldId && onCopy && (
          <button
            onClick={() => onCopy(fieldId, copyValue)}
            className="px-2.5 py-1.5 rounded-lg flex items-center gap-1"
            style={{ background: copied ? "rgba(34,197,94,0.14)" : "rgba(255,255,255,0.06)" }}
          >
            <Copy size={13} color={copied ? "#22c55e" : "#A0A0A0"} />
            <span style={{ color: copied ? "#22c55e" : "#A0A0A0", fontSize: 11, fontWeight: 800 }}>
              {copied ? "OK" : "Copy"}
            </span>
          </button>
        )}
      </div>
    </div>
  );
}

function formatPaymentStatus(status: string, t: (key: string) => string) {
  const labels: Record<string, string> = {
    waiting: t("cart.paymentStatusWaiting"),
    confirming: t("cart.paymentStatusConfirming"),
    confirmed: t("cart.paymentStatusConfirming"),
    sending: t("cart.paymentStatusConfirming"),
    finished: t("cart.paymentStatusFinished"),
    partially_paid: t("cart.paymentStatusPartial"),
    failed: t("cart.paymentStatusFailed"),
    expired: t("cart.paymentStatusExpired"),
  };
  return labels[status] ?? status;
}

function canCancelPayment(order: ProfileOrder) {
  const payment = order.payment;
  if (!payment || order.status !== "pending") return false;
  const actuallyPaid = payment.actuallyPaid ?? 0;
  const pendingAmount = payment.pendingAmount ?? 0;
  return actuallyPaid <= 0 && pendingAmount <= 0 && !["confirming", "partially_paid", "finished"].includes(payment.providerStatus);
}
