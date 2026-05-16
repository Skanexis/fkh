import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CheckCircle, Clock, AlertTriangle, Search, X, Copy, ExternalLink, WalletCards, Trash2 } from "lucide-react";
import { apiRequest } from "../../api/client";
import { ApiAdminPayment } from "../../api/types";
import { useI18n } from "../../i18n";
import { useBodyScrollLock } from "../../components/useBodyScrollLock";

type PaymentStatus = "waiting" | "confirming" | "partially_paid" | "finished" | "expired" | "failed" | "manual_pending" | "manual_accepted";

const STATUS_CONFIG: Record<string, { labelKey: string; color: string; bg: string; icon: typeof Clock }> = {
  waiting: { labelKey: "cart.paymentStatusWaiting", color: "#F59E0B", bg: "rgba(245,158,11,0.12)", icon: Clock },
  confirming: { labelKey: "cart.paymentStatusConfirming", color: "#3B82F6", bg: "rgba(59,130,246,0.12)", icon: Clock },
  partially_paid: { labelKey: "cart.paymentStatusPartial", color: "#F97316", bg: "rgba(249,115,22,0.12)", icon: AlertTriangle },
  finished: { labelKey: "cart.paymentStatusFinished", color: "#22c55e", bg: "rgba(34,197,94,0.12)", icon: CheckCircle },
  expired: { labelKey: "cart.paymentStatusExpired", color: "#6B7280", bg: "rgba(107,114,128,0.12)", icon: AlertTriangle },
  failed: { labelKey: "cart.paymentStatusFailed", color: "#ef4444", bg: "rgba(239,68,68,0.12)", icon: AlertTriangle },
  manual_pending: { labelKey: "cart.paymentStatusManualPending", color: "#3B82F6", bg: "rgba(59,130,246,0.12)", icon: Clock },
  manual_accepted: { labelKey: "cart.paymentStatusManualAccepted", color: "#22c55e", bg: "rgba(34,197,94,0.12)", icon: CheckCircle },
};

export function AdminPayments() {
  const { t, locale } = useI18n();
  const [payments, setPayments] = useState<ApiAdminPayment[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<PaymentStatus | "all">("all");
  const [selectedPayment, setSelectedPayment] = useState<ApiAdminPayment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cancelingPaymentId, setCancelingPaymentId] = useState<string | null>(null);

  useEffect(() => {
    void loadPayments();
  }, []);

  useBodyScrollLock(Boolean(selectedPayment));

  async function loadPayments() {
    try {
      const apiPayments = await apiRequest<ApiAdminPayment[]>("/api/v1/admin/payments?limit=100");
      setPayments(apiPayments);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.paymentsError"));
    }
  }

  async function cancelPayment(payment: ApiAdminPayment) {
    if (!canCancelAdminPayment(payment)) return;
    if (!window.confirm(t("admin.cancelPaymentConfirm"))) return;
    setCancelingPaymentId(payment.id);
    try {
      await apiRequest(`/api/v1/admin/payments/${payment.id}/cancel`, { method: "POST" });
      setPayments((current) => current.filter((item) => item.id !== payment.id));
      setSelectedPayment(null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.cancelPaymentError"));
    } finally {
      setCancelingPaymentId(null);
    }
  }

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return payments.filter((payment) => {
      const matchStatus = filterStatus === "all" || payment.providerStatus === filterStatus;
      const haystack = [
        payment.order.publicId,
        payment.order.customerName,
        payment.currencyLabel,
        payment.network,
        payment.providerStatus,
        payment.payAddress,
        payment.providerPaymentId,
      ].filter(Boolean).join(" ").toLowerCase();
      return matchStatus && (!query || haystack.includes(query));
    });
  }, [payments, search, filterStatus]);

  const totals = {
    paid: payments.filter((payment) => payment.providerStatus === "finished").length,
    pending: payments.filter((payment) => ["waiting", "confirming"].includes(payment.providerStatus)).length,
    partial: payments.filter((payment) => payment.providerStatus === "partially_paid").length,
    expired: payments.filter((payment) => payment.providerStatus === "expired").length,
    revenue: payments
      .filter((payment) => payment.providerStatus === "finished")
      .reduce((sum, payment) => sum + payment.priceAmount, 0),
  };

  return (
    <div className="p-5 pb-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-5">
        <h1 style={{ color: "#FFFFFF", fontWeight: 800, fontSize: 22 }}>{t("admin.payments")}</h1>
        <p style={{ color: error ? "#ef4444" : "#6B7280", fontSize: 13 }}>
          {error ? `${t("common.backend")}: ${error}` : t("admin.totalPayments", { count: payments.length })}
        </p>
      </motion.div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
        <SummaryCard label={t("cart.paymentStatusFinished")} value={totals.paid} color="#22c55e" bg="rgba(34,197,94,0.1)" />
        <SummaryCard label={t("admin.pending")} value={totals.pending} color="#3B82F6" bg="rgba(59,130,246,0.1)" />
        <SummaryCard label={t("cart.paymentStatusPartial")} value={totals.partial} color="#F97316" bg="rgba(249,115,22,0.1)" />
        <SummaryCard label={t("cart.paymentStatusExpired")} value={totals.expired} color="#6B7280" bg="rgba(107,114,128,0.1)" />
        <SummaryCard label={t("admin.paidEur")} value={`€${formatFiat(totals.revenue)}`} color="#FF4D6D" bg="rgba(255,77,109,0.1)" />
      </div>

      <div
        className="flex items-center gap-3 rounded-xl px-4 py-3 mb-4"
        style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)" }}
      >
        <Search size={15} color="#6B7280" />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t("admin.searchPayments")}
          className="flex-1 bg-transparent outline-none"
          style={{ color: "#FFFFFF", fontSize: 14 }}
        />
        {search && <button onClick={() => setSearch("")}><X size={14} color="#6B7280" /></button>}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
        {(["all", "waiting", "confirming", "partially_paid", "finished", "expired", "manual_pending", "manual_accepted"] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className="px-3 py-1.5 rounded-full flex-shrink-0"
            style={{
              background: filterStatus === status ? "rgba(59,130,246,0.15)" : "rgba(255,255,255,0.04)",
              border: `1px solid ${filterStatus === status ? "rgba(59,130,246,0.35)" : "rgba(255,255,255,0.07)"}`,
              color: filterStatus === status ? "#60A5FA" : "#9CA3AF",
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            {status === "all" ? t("catalog.all") : t(STATUS_CONFIG[status]?.labelKey ?? status)}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        {filtered.map((payment, index) => {
          const cfg = STATUS_CONFIG[payment.providerStatus] ?? STATUS_CONFIG.waiting;
          const Icon = cfg.icon;
          return (
            <motion.div
              key={payment.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              className="rounded-xl p-4 cursor-pointer"
              style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.05)" }}
              onClick={() => setSelectedPayment(payment)}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p style={{ color: "#FFFFFF", fontWeight: 800, fontSize: 14 }}>{payment.order.publicId}</p>
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ background: cfg.bg }}>
                      <Icon size={10} color={cfg.color} strokeWidth={2.5} />
                      <span style={{ color: cfg.color, fontSize: 10, fontWeight: 700 }}>{t(cfg.labelKey)}</span>
                    </span>
                  </div>
                  <p style={{ color: "#9CA3AF", fontSize: 12 }}>{payment.order.customerName}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p style={{ color: "#FF4D6D", fontWeight: 800, fontSize: 15 }}>€{formatFiat(payment.priceAmount)}</p>
                  <p style={{ color: "#6B7280", fontSize: 11 }}>{new Date(payment.createdAt).toLocaleDateString(locale)}</p>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      void cancelPayment(payment);
                    }}
                    disabled={!canCancelAdminPayment(payment) || cancelingPaymentId === payment.id}
                    className="mt-2 inline-flex items-center justify-center gap-1 rounded-lg px-2.5 py-1.5"
                    style={{
                      background: canCancelAdminPayment(payment) ? "rgba(239,68,68,0.12)" : "rgba(255,255,255,0.06)",
                      border: `1px solid ${canCancelAdminPayment(payment) ? "rgba(239,68,68,0.3)" : "rgba(255,255,255,0.08)"}`,
                      color: canCancelAdminPayment(payment) ? "#ef4444" : "#6B7280",
                      fontSize: 11,
                      fontWeight: 800,
                    }}
                  >
                    <Trash2 size={12} />
                    {cancelingPaymentId === payment.id ? t("admin.saving") : t("admin.cancelPayment")}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <Metric label={t("admin.asset")} value={`${payment.currencyLabel} · ${payment.network}`} />
                <Metric label={t("admin.expected")} value={`${formatCrypto(payment.payAmount)} ${payment.providerCurrency.toUpperCase()}`} />
                <Metric label={t("cart.paymentReceived")} value={`${formatCrypto(payment.actuallyPaid)} ${payment.providerCurrency.toUpperCase()}`} />
                <Metric label={t("cart.paymentRemaining")} value={`${formatCrypto(payment.remainingAmount)} ${payment.providerCurrency.toUpperCase()}`} tone={payment.isUnderpaid ? "#F97316" : undefined} />
              </div>
            </motion.div>
          );
        })}
        {filtered.length === 0 && (
          <p className="rounded-xl p-4" style={{ background: "#111827", color: "#6B7280", fontSize: 13 }}>
            {t("admin.noPayments")}
          </p>
        )}
      </div>

      <AnimatePresence>
        {selectedPayment && (
          <PaymentModal
            payment={selectedPayment}
            locale={locale}
            t={t}
            canceling={cancelingPaymentId === selectedPayment.id}
            onCancel={() => cancelPayment(selectedPayment)}
            onClose={() => setSelectedPayment(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function PaymentModal({
  payment,
  locale,
  t,
  canceling,
  onCancel,
  onClose,
}: {
  payment: ApiAdminPayment;
  locale: string;
  t: (key: string, values?: Record<string, string | number>) => string;
  canceling: boolean;
  onCancel: () => void;
  onClose: () => void;
}) {
  const cfg = STATUS_CONFIG[payment.providerStatus] ?? STATUS_CONFIG.waiting;
  const Icon = cfg.icon;
  const canCancel = canCancelAdminPayment(payment);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fkh-modal-overlay fixed inset-0 z-50 flex items-end md:items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        className="fkh-modal-panel w-full max-w-lg overflow-y-auto rounded-2xl"
        style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.08)" }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <div>
            <h3 style={{ color: "#FFFFFF", fontWeight: 800, fontSize: 16 }}>{t("admin.paymentDetailTitle", { order: payment.order.publicId })}</h3>
            <p style={{ color: "#6B7280", fontSize: 12 }}>{new Date(payment.createdAt).toLocaleString(locale)}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ background: "rgba(255,255,255,0.07)" }}>
            <X size={15} color="#9CA3AF" />
          </button>
        </div>

        <div className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="flex items-center gap-1 px-2 py-1 rounded-full" style={{ background: cfg.bg }}>
              <Icon size={12} color={cfg.color} strokeWidth={2.5} />
              <span style={{ color: cfg.color, fontSize: 11, fontWeight: 800 }}>{t(cfg.labelKey)}</span>
            </span>
            <span style={{ color: "#9CA3AF", fontSize: 12 }}>{t("admin.paymentAssetNetwork", { asset: payment.currencyLabel, network: payment.network })}</span>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-5">
            <MetricBox label={t("cart.paymentFiat")} value={`€${formatFiat(payment.priceAmount)}`} />
            <MetricBox label={t("admin.invoiceAmount")} value={`${formatCrypto(payment.payAmount)} ${payment.providerCurrency.toUpperCase()}`} />
            <MetricBox label={t("admin.confirmed")} value={`${formatCrypto(payment.actuallyPaid)} ${payment.providerCurrency.toUpperCase()}`} />
            <MetricBox label={t("admin.pendingChain")} value={`${formatCrypto(payment.pendingAmount)} ${payment.providerCurrency.toUpperCase()}`} />
            <MetricBox label={t("cart.paymentRemaining")} value={`${formatCrypto(payment.remainingAmount)} ${payment.providerCurrency.toUpperCase()}`} tone={payment.isUnderpaid ? "#F97316" : "#FFFFFF"} />
            <MetricBox label={t("admin.paidAt")} value={payment.paidAt ? new Date(payment.paidAt).toLocaleString(locale) : "-"} />
          </div>

          <div className="rounded-xl p-3 mb-5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex items-center gap-2 mb-3">
              <WalletCards size={15} color="#3B82F6" />
              <p style={{ color: "#FFFFFF", fontWeight: 700, fontSize: 13 }}>{t("admin.walletInvoice")}</p>
            </div>
            <InfoLine label={t("cart.paymentAddress")} value={payment.payAddress} copy />
            <InfoLine label={t("admin.paymentId")} value={payment.providerPaymentId} />
            <InfoLine label={t("admin.memo")} value={payment.payinExtraId} copy />
            <InfoLine label={t("admin.expires")} value={payment.expiresAt ? new Date(payment.expiresAt).toLocaleString(locale) : "-"} />
          </div>

          <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p style={{ color: "#FFFFFF", fontWeight: 700, fontSize: 13 }}>{payment.order.customerName}</p>
                <p style={{ color: "#6B7280", fontSize: 12 }}>{payment.order.publicId} · {payment.order.status}</p>
              </div>
              <a
                href={`/admin/orders`}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg"
                style={{ background: "rgba(59,130,246,0.12)", color: "#60A5FA", fontSize: 12, fontWeight: 700 }}
              >
                <ExternalLink size={13} />
                {t("admin.orders")}
              </a>
            </div>
          </div>

          <button
            type="button"
            onClick={onCancel}
            disabled={!canCancel || canceling}
            className="mt-4 w-full flex items-center justify-center gap-2 rounded-xl py-3 transition-all"
            style={{
              background: canCancel ? "rgba(239,68,68,0.12)" : "rgba(255,255,255,0.06)",
              border: `1px solid ${canCancel ? "rgba(239,68,68,0.32)" : "rgba(255,255,255,0.08)"}`,
              color: canCancel ? "#ef4444" : "#6B7280",
              fontSize: 13,
              fontWeight: 800,
              opacity: canceling ? 0.75 : 1,
            }}
          >
            <Trash2 size={15} />
            {canceling ? t("admin.saving") : canCancel ? t("admin.cancelPayment") : t("admin.cancelPaymentUnavailable")}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="mt-2 w-full rounded-xl py-3"
            style={{ background: "rgba(255,255,255,0.07)", color: "#9CA3AF", fontSize: 13, fontWeight: 800 }}
          >
            {t("admin.cancel")}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function SummaryCard({ label, value, color, bg }: { label: string; value: string | number; color: string; bg: string }) {
  return (
    <div className="rounded-xl p-3" style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.05)" }}>
      <div className="rounded-lg flex items-center justify-center mb-2" style={{ width: 30, height: 30, background: bg }}>
        <WalletCards size={14} color={color} strokeWidth={2} />
      </div>
      <p style={{ color: "#FFFFFF", fontWeight: 800, fontSize: 17 }}>{value}</p>
      <p style={{ color: "#6B7280", fontSize: 10 }}>{label}</p>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-lg px-3 py-2" style={{ background: "rgba(255,255,255,0.035)" }}>
      <p style={{ color: "#6B7280", fontSize: 10, marginBottom: 2 }}>{label}</p>
      <p style={{ color: tone ?? "#E5E7EB", fontSize: 12, fontWeight: 700, overflowWrap: "anywhere" }}>{value}</p>
    </div>
  );
}

function MetricBox({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.04)" }}>
      <p style={{ color: "#6B7280", fontSize: 11 }}>{label}</p>
      <p style={{ color: tone ?? "#FFFFFF", fontSize: 13, fontWeight: 800, marginTop: 3, overflowWrap: "anywhere" }}>{value}</p>
    </div>
  );
}

function InfoLine({ label, value, copy }: { label: string; value?: string | null; copy?: boolean }) {
  if (!value) return null;
  return (
    <div className="grid grid-cols-[92px_1fr_auto] gap-2 py-1.5">
      <p style={{ color: "#6B7280", fontSize: 11 }}>{label}</p>
      <p style={{ color: "#E5E7EB", fontSize: 12, overflowWrap: "anywhere" }}>{value}</p>
      {copy && (
        <button onClick={() => void navigator.clipboard?.writeText(value)}>
          <Copy size={13} color="#6B7280" />
        </button>
      )}
    </div>
  );
}

function formatCrypto(value?: number | null) {
  if (value === null || value === undefined) return "0";
  return Number(value).toLocaleString("en-US", {
    maximumFractionDigits: 12,
    useGrouping: false,
  });
}

function formatFiat(value: number) {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

function canCancelAdminPayment(payment: ApiAdminPayment) {
  const actuallyPaid = payment.actuallyPaid ?? 0;
  const pendingAmount = payment.pendingAmount ?? 0;
  return actuallyPaid <= 0 && pendingAmount <= 0 && !["finished", "manual_accepted"].includes(payment.providerStatus);
}
