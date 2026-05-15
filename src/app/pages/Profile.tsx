import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { User, Package, Clock, CheckCircle, ChevronRight, Settings, LogOut, ShieldCheck, LayoutDashboard } from "lucide-react";
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

  useEffect(() => {
    let cancelled = false;

    async function loadOrders() {
      if (!isAuthenticated || user?.status !== "active") {
        setOrders([]);
        return;
      }

      setLoadingOrders(true);
      try {
        const apiOrders = await apiRequest<ApiOrder[]>("/api/v1/me/orders");
        if (!cancelled) setOrders(apiOrders.map(toProfileOrder));
      } finally {
        if (!cancelled) setLoadingOrders(false);
      }
    }

    void loadOrders();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user?.status]);

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
    </div>
  );
}

function formatCryptoAmount(amount: number) {
  return amount.toFixed(12).replace(/\.?0+$/, "");
}
