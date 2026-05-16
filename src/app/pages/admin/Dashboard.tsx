import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { TrendingUp, ShoppingBag, Users, Clock, ArrowUpRight, ArrowRight, WalletCards, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { apiRequest } from "../../api/client";
import { DashboardStats } from "../../api/types";
import { useI18n } from "../../i18n";

const REVENUE_DATA = [
  { monthKey: "month.jan", value: 820 },
  { monthKey: "month.feb", value: 1050 },
  { monthKey: "month.mar", value: 940 },
  { monthKey: "month.apr", value: 1300 },
  { monthKey: "month.may", value: 1480 },
  { monthKey: "month.jun", value: 1250 },
  { monthKey: "month.jul", value: 1600 },
  { monthKey: "month.aug", value: 1420 },
  { monthKey: "month.sep", value: 1750 },
  { monthKey: "month.oct", value: 1900 },
  { monthKey: "month.nov", value: 2100 },
  { monthKey: "month.dec", value: 2480 },
];

const STATUS_CONFIG = {
  pending: { labelKey: "status.pending", color: "#FF4D6D", bg: "rgba(255,77,109,0.12)" },
  accepted: { labelKey: "status.accepted", color: "#3B82F6", bg: "rgba(59,130,246,0.12)" },
  completed: { labelKey: "status.completed", color: "#22c55e", bg: "rgba(34,197,94,0.12)" },
  cancelled: { labelKey: "status.cancelled", color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
};

export function Dashboard() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [dashboard, setDashboard] = useState<DashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadDashboard() {
      try {
        const data = await apiRequest<DashboardStats>("/api/v1/admin/dashboard");
        if (!cancelled) setDashboard(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : t("admin.dashboardError"));
      }
    }
    void loadDashboard();
    return () => {
      cancelled = true;
    };
  }, []);

  const emptyDashboard: DashboardStats = {
    totalRevenue: 0,
    totalOrders: 0,
    totalUsers: 0,
    pendingOrders: 0,
    ordersByStatus: {},
    recentOrders: [],
  };
  const data = dashboard ?? emptyDashboard;
  const chartData = data.monthlyRevenue?.length ? data.monthlyRevenue : REVENUE_DATA;
  const paymentStats = data.paymentStats;

  const stats = [
    {
      label: t("admin.revenue"),
      value: `€${data.totalRevenue.toLocaleString()}`,
      icon: TrendingUp,
      change: "+18%",
      color: "#FF4D6D",
      bg: "rgba(255,77,109,0.1)",
    },
    {
      label: t("admin.orders"),
      value: data.totalOrders,
      icon: ShoppingBag,
      change: "+12%",
      color: "#3B82F6",
      bg: "rgba(59,130,246,0.1)",
    },
    {
      label: t("admin.users"),
      value: data.totalUsers,
      icon: Users,
      change: "+8%",
      color: "#22c55e",
      bg: "rgba(34,197,94,0.1)",
    },
    {
      label: t("admin.pending"),
      value: data.pendingOrders,
      icon: Clock,
      change: t("admin.toManage"),
      color: "#ef4444",
      bg: "rgba(239,68,68,0.1)",
    },
  ];

  return (
    <div className="p-5 pb-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1 style={{ color: "#FFFFFF", fontWeight: 800, fontSize: 24 }}>{t("admin.dashboard")}</h1>
        <p style={{ color: "#6B7280", fontSize: 13, marginTop: 2 }}>
          {error ? `${t("common.backend")}: ${error}` : t("admin.welcome")}
        </p>
      </motion.div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className="rounded-2xl p-4"
              style={{
                background: "#111827",
                border: "1px solid rgba(255,255,255,0.05)",
              }}
            >
              <div
                className="rounded-xl flex items-center justify-center mb-3"
                style={{ width: 38, height: 38, background: stat.bg }}
              >
                <Icon size={18} color={stat.color} strokeWidth={2} />
              </div>
              <p style={{ color: "#FFFFFF", fontWeight: 800, fontSize: 20 }}>{stat.value}</p>
              <p style={{ color: "#6B7280", fontSize: 12, marginTop: 1 }}>{stat.label}</p>
              <p style={{ color: stat.color, fontSize: 11, marginTop: 4, fontWeight: 600 }}>
                {stat.change}
              </p>
            </motion.div>
          );
        })}
      </div>

      {/* Payment dashboard */}
      {paymentStats && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="rounded-2xl p-4 mb-5"
          style={{
            background: "#111827",
            border: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 style={{ color: "#FFFFFF", fontWeight: 700, fontSize: 15 }}>{t("admin.payments")}</h3>
              <p style={{ color: "#6B7280", fontSize: 12 }}>{t("admin.paymentDashboardSubtitle")}</p>
            </div>
            <button onClick={() => navigate("/admin/payments")} className="flex items-center gap-1">
              <span style={{ color: "#3B82F6", fontSize: 12 }}>{t("admin.viewAll")}</span>
              <ArrowRight size={12} color="#3B82F6" />
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
            <PaymentStat label={t("cart.paymentStatusFinished")} value={paymentStats.paidPayments} icon={WalletCards} color="#22c55e" bg="rgba(34,197,94,0.1)" />
            <PaymentStat label={t("admin.pending")} value={paymentStats.pendingPayments} icon={Clock} color="#3B82F6" bg="rgba(59,130,246,0.1)" />
            <PaymentStat label={t("cart.paymentStatusPartial")} value={paymentStats.partialPayments} icon={AlertTriangle} color="#F97316" bg="rgba(249,115,22,0.1)" />
            <PaymentStat label={t("cart.paymentStatusExpired")} value={paymentStats.expiredPayments} icon={AlertTriangle} color="#6B7280" bg="rgba(107,114,128,0.1)" />
          </div>

          <div className="flex flex-col gap-2">
            {paymentStats.byCurrency.slice(0, 4).map((currency) => (
              <div
                key={`${currency.currencyCode}:${currency.network}`}
                className="rounded-xl p-3"
                style={{ background: "rgba(255,255,255,0.03)" }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p style={{ color: "#FFFFFF", fontSize: 13, fontWeight: 800 }}>{currency.currencyLabel}</p>
                    <p style={{ color: "#6B7280", fontSize: 11 }}>{currency.network} · {t("admin.invoicesCount", { count: currency.count })}</p>
                  </div>
                  <div className="text-right">
                    <p style={{ color: "#22c55e", fontSize: 13, fontWeight: 800 }}>
                      {formatCrypto(currency.receivedCrypto)} {currency.providerCurrency.toUpperCase()}
                    </p>
                    <p style={{ color: "#6B7280", fontSize: 11 }}>{t("admin.paidFiat", { amount: `€${formatFiat(currency.paidFiat)}` })}</p>
                  </div>
                </div>
              </div>
            ))}
            {paymentStats.byCurrency.length === 0 && (
              <p style={{ color: "#6B7280", fontSize: 12 }}>{t("admin.noCryptoPaymentsYet")}</p>
            )}
          </div>
        </motion.div>
      )}

      {/* Revenue chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="rounded-2xl p-4 mb-5"
        style={{
          background: "#111827",
          border: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 style={{ color: "#FFFFFF", fontWeight: 600, fontSize: 15 }}>{t("admin.revenueYear")}</h3>
            <p style={{ color: "#6B7280", fontSize: 12 }}>{t("admin.monthlyRevenue")}</p>
          </div>
          <div className="flex items-center gap-1 px-2 py-1 rounded-full"
            style={{ background: "rgba(34,197,94,0.1)" }}>
            <ArrowUpRight size={12} color="#22c55e" strokeWidth={2.5} />
            <span style={{ color: "#22c55e", fontSize: 11, fontWeight: 600 }}>+18%</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={140}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#FF4D6D" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#FF4D6D" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="monthKey"
              tick={{ fill: "#6B7280", fontSize: 10 }}
              tickFormatter={(key) => t(String(key))}
              axisLine={false}
              tickLine={false}
            />
            <YAxis hide />
            <Tooltip
              contentStyle={{
                background: "#1F2937",
                border: "1px solid rgba(255,77,109,0.3)",
                borderRadius: 10,
                color: "#FFFFFF",
                fontSize: 12,
              }}
              formatter={(v: number) => [`€${v}`, t("admin.revenue")]}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#FF4D6D"
              strokeWidth={2}
              fill="url(#goldGrad)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Recent orders */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="rounded-2xl p-4 mb-5"
        style={{
          background: "#111827",
          border: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 style={{ color: "#FFFFFF", fontWeight: 600, fontSize: 15 }}>{t("admin.recentOrders")}</h3>
          <button
            onClick={() => navigate("/admin/orders")}
            className="flex items-center gap-1"
          >
            <span style={{ color: "#3B82F6", fontSize: 12 }}>{t("admin.viewAll")}</span>
            <ArrowRight size={12} color="#3B82F6" />
          </button>
        </div>
        <div className="flex flex-col gap-2">
          {data.recentOrders.slice(0, 4).map((order) => {
            const status = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending;
            return (
              <div
                key={order.publicId}
                className="flex items-center justify-between py-2 px-3 rounded-xl"
                style={{ background: "rgba(255,255,255,0.03)" }}
              >
                <div>
                  <p style={{ color: "#FFFFFF", fontSize: 13, fontWeight: 600 }}>{order.publicId}</p>
                  <p style={{ color: "#6B7280", fontSize: 11 }}>
                    {order.customerName}
                    {order.payment ? ` · ${order.payment.currencyLabel}` : ""}
                  </p>
                </div>
                <span
                  className="px-2 py-0.5 rounded-full"
                  style={{ background: status.bg, color: status.color, fontSize: 11, fontWeight: 600 }}
                >
                  {t(status.labelKey)}
                </span>
                <span style={{ color: "#FF4D6D", fontWeight: 700, fontSize: 14 }}>
                  €{order.totalAmount}
                </span>
              </div>
            );
          })}
          {data.recentOrders.length === 0 && (
            <p style={{ color: "#6B7280", fontSize: 12 }}>{t("admin.noRecentOrders")}</p>
          )}
        </div>
      </motion.div>

      {/* Top users */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="rounded-2xl p-4"
        style={{
          background: "#111827",
          border: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 style={{ color: "#FFFFFF", fontWeight: 600, fontSize: 15 }}>{t("admin.topCustomers")}</h3>
          <button
            onClick={() => navigate("/admin/users")}
            className="flex items-center gap-1"
          >
            <span style={{ color: "#3B82F6", fontSize: 12 }}>{t("admin.viewAll")}</span>
            <ArrowRight size={12} color="#3B82F6" />
          </button>
        </div>
        <div className="flex flex-col gap-2">
          {(data.topCustomers?.length ? data.topCustomers : data.recentOrders.slice(0, 3).map((order) => ({
            id: order.id,
            name: order.customerName,
            orderCount: 1,
            spent: order.totalAmount,
            lastOrderPublicId: order.publicId,
          }))).map((customer, i) => (
            <div
              key={customer.id}
              className="flex items-center gap-3 py-2 px-3 rounded-xl"
              style={{ background: "rgba(255,255,255,0.03)" }}
            >
              <div
                className="rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  width: 32,
                  height: 32,
                  background: `rgba(59,130,246,${0.15 + i * 0.05})`,
                  border: "1px solid rgba(59,130,246,0.3)",
                  color: "#3B82F6",
                  fontWeight: 700,
                  fontSize: 12,
                }}
              >
                {customer.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p style={{ color: "#FFFFFF", fontSize: 13, fontWeight: 500 }}>{customer.name}</p>
                <p style={{ color: "#6B7280", fontSize: 11 }}>{t("admin.ordersCount", { count: customer.orderCount })} · {customer.lastOrderPublicId}</p>
              </div>
              <span style={{ color: "#22c55e", fontWeight: 700, fontSize: 13 }}>€{formatFiat(customer.spent)}</span>
            </div>
          ))}
          {data.recentOrders.length === 0 && (
            <p style={{ color: "#6B7280", fontSize: 12 }}>{t("admin.customersAfterOrders")}</p>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function PaymentStat({
  label,
  value,
  icon: Icon,
  color,
  bg,
}: {
  label: string;
  value: number;
  icon: typeof WalletCards;
  color: string;
  bg: string;
}) {
  return (
    <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.03)" }}>
      <div className="rounded-lg flex items-center justify-center mb-2" style={{ width: 30, height: 30, background: bg }}>
        <Icon size={14} color={color} strokeWidth={2} />
      </div>
      <p style={{ color: "#FFFFFF", fontWeight: 800, fontSize: 17 }}>{value}</p>
      <p style={{ color: "#6B7280", fontSize: 10 }}>{label}</p>
    </div>
  );
}

function formatCrypto(value: number) {
  return value.toLocaleString("en-US", {
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
