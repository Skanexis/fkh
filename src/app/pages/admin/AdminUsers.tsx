import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Search, X, User, ShoppingBag, TrendingUp, Mail, Ban, CheckCircle } from "lucide-react";
import { apiRequest } from "../../api/client";
import { ApiUser } from "../../api/types";
import { useI18n } from "../../i18n";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  telegramUsername?: string | null;
  telegramId: string;
  avatarUrl?: string | null;
  orders: number;
  paidOrders: number;
  spent: number;
  paymentCurrencies: Array<{
    currencyCode: string;
    currencyLabel: string;
    providerCurrency: string;
    network: string;
    orderCount: number;
    spent: number;
    receivedCrypto: number;
  }>;
  joined: string;
  active: boolean;
}

export function AdminUsers() {
  const { t } = useI18n();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadUsers();
  }, []);

  async function loadUsers() {
    try {
      const apiUsers = await apiRequest<Array<ApiUser & {
        email?: string | null;
        orderCount?: number;
        paidOrderCount?: number;
        spent?: number;
        paymentCurrencies?: AdminUser["paymentCurrencies"];
        createdAt?: string;
      }>>(
        "/api/v1/admin/users?limit=100",
      );
      setUsers(apiUsers.map(toAdminUser));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.usersError"));
    }
  }

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.telegramUsername ?? "").toLowerCase().includes(search.toLowerCase()) ||
      u.telegramId.includes(search)
  );

  async function toggleActive(id: string) {
    const current = users.find((user) => user.id === id);
    if (!current) return;
    try {
      const updated = await apiRequest<ApiUser>(`/api/v1/admin/users/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: current.active ? "blocked" : "active" }),
      });
      const next = { ...current, active: updated.status === "active" };
      setUsers((prev) => prev.map((u) => (u.id === id ? next : u)));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.userStatusError"));
      return;
    }
    if (selectedUser?.id === id) {
      setSelectedUser((prev) => prev ? { ...prev, active: !prev.active } : null);
    }
  }

  const totalSpent = users.reduce((s, u) => s + u.spent, 0);
  const activeCount = users.filter((u) => u.active).length;

  return (
    <div className="p-5 pb-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-5"
      >
        <h1 style={{ color: "#FFFFFF", fontWeight: 800, fontSize: 22 }}>{t("admin.users")}</h1>
        <p style={{ color: error ? "#ef4444" : "#6B7280", fontSize: 13 }}>
          {error ? `${t("common.backend")}: ${error}` : t("admin.totalUsers", { count: users.length })}
        </p>
      </motion.div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: t("admin.total"), value: users.length, icon: User, color: "#3B82F6", bg: "rgba(59,130,246,0.1)" },
          { label: t("admin.active"), value: activeCount, icon: CheckCircle, color: "#22c55e", bg: "rgba(34,197,94,0.1)" },
          { label: t("admin.revenue"), value: `€${totalSpent}`, icon: TrendingUp, color: "#FF4D6D", bg: "rgba(255,77,109,0.1)" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div
            key={label}
            className="rounded-xl p-3"
            style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.05)" }}
          >
            <div className="rounded-lg flex items-center justify-center mb-2" style={{ width: 30, height: 30, background: bg }}>
              <Icon size={14} color={color} strokeWidth={2} />
            </div>
            <p style={{ color: "#FFFFFF", fontWeight: 800, fontSize: 17 }}>{value}</p>
            <p style={{ color: "#6B7280", fontSize: 10 }}>{label}</p>
          </div>
        ))}
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
          placeholder={t("admin.searchUsers")}
          className="flex-1 bg-transparent outline-none"
          style={{ color: "#FFFFFF", fontSize: 14 }}
        />
        {search && <button onClick={() => setSearch("")}><X size={14} color="#6B7280" /></button>}
      </div>

      {/* Users list */}
      <div className="flex flex-col gap-2">
        {filtered.map((user, i) => (
          <motion.div
            key={user.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-xl p-4 flex items-center gap-3 cursor-pointer"
            style={{
              background: "#111827",
              border: "1px solid rgba(255,255,255,0.05)",
            }}
            onClick={() => setSelectedUser(user)}
          >
            {/* Avatar */}
            <div
              className="rounded-full flex items-center justify-center flex-shrink-0"
              style={{
                width: 44,
                height: 44,
                background: user.active
                  ? "linear-gradient(135deg, rgba(59,130,246,0.25), rgba(96,165,250,0.15))"
                  : "rgba(255,255,255,0.06)",
                border: `2px solid ${user.active ? "rgba(59,130,246,0.4)" : "rgba(255,255,255,0.08)"}`,
                color: user.active ? "#3B82F6" : "#6B7280",
                fontWeight: 700,
                fontSize: 16,
              }}
            >
              {user.name.charAt(0)}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p style={{ color: "#FFFFFF", fontWeight: 600, fontSize: 14 }}>{user.name}</p>
                {!user.active && (
                  <span
                    className="px-1.5 py-0.5 rounded-full"
                    style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", fontSize: 9, fontWeight: 600 }}
                  >
                    {t("admin.suspended")}
                  </span>
                )}
              </div>
              <p style={{ color: "#6B7280", fontSize: 11, marginTop: 1 }}>
                {user.telegramUsername ? `@${user.telegramUsername}` : `ID ${user.telegramId}`}
              </p>
              <div className="flex items-center gap-3 mt-1.5">
                <span style={{ color: "#9CA3AF", fontSize: 11 }}>
                  <span style={{ color: "#60A5FA", fontWeight: 600 }}>{user.orders}</span> {t("profile.orders")}
                </span>
                <span style={{ color: "#FF4D6D", fontWeight: 600, fontSize: 11 }}>€{user.spent}</span>
              </div>
              {user.paymentCurrencies.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {user.paymentCurrencies.slice(0, 3).map((currency) => (
                    <span
                      key={`${currency.currencyCode}:${currency.network}`}
                      className="px-2 py-0.5 rounded-full"
                      style={{ background: "rgba(59,130,246,0.12)", color: "#60A5FA", fontSize: 10, fontWeight: 700 }}
                    >
                      {currency.currencyLabel}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* User detail modal */}
      <AnimatePresence>
        {selectedUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
            onClick={() => setSelectedUser(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              className="w-full max-w-sm rounded-2xl"
              style={{ background: "#111827", border: "1px solid rgba(59,130,246,0.2)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className="flex items-center justify-between px-5 py-4"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
              >
                <h3 style={{ color: "#FFFFFF", fontWeight: 700, fontSize: 16 }}>{t("admin.userProfile")}</h3>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="p-1.5 rounded-lg"
                  style={{ background: "rgba(255,255,255,0.07)" }}
                >
                  <X size={15} color="#9CA3AF" />
                </button>
              </div>

              <div className="p-5">
                {/* Avatar */}
                <div className="flex flex-col items-center mb-5">
                  <div
                    className="rounded-full flex items-center justify-center mb-3"
                    style={{
                      width: 64,
                      height: 64,
                      background: "linear-gradient(135deg, rgba(59,130,246,0.3), rgba(96,165,250,0.15))",
                      border: "2px solid rgba(59,130,246,0.4)",
                      color: "#3B82F6",
                      fontWeight: 700,
                      fontSize: 24,
                    }}
                  >
                    {selectedUser.name.charAt(0)}
                  </div>
                  <p style={{ color: "#FFFFFF", fontWeight: 700, fontSize: 17 }}>{selectedUser.name}</p>
                  <p style={{ color: "#6B7280", fontSize: 13 }}>
                    {selectedUser.telegramUsername ? `@${selectedUser.telegramUsername}` : `ID ${selectedUser.telegramId}`}
                  </p>
                  <span
                    className="mt-2 px-3 py-1 rounded-full"
                    style={{
                      background: selectedUser.active ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.1)",
                      color: selectedUser.active ? "#22c55e" : "#ef4444",
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  >
                    {selectedUser.active ? t("admin.active") : t("admin.suspended")}
                  </span>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 mb-5">
                  {[
                    { label: t("admin.orders"), value: selectedUser.orders, icon: ShoppingBag, color: "#3B82F6" },
                    { label: t("admin.spent"), value: `€${selectedUser.spent}`, icon: TrendingUp, color: "#FF4D6D" },
                    { label: t("admin.since"), value: new Date(selectedUser.joined).getFullYear(), icon: User, color: "#22c55e" },
                  ].map(({ label, value, icon: Icon, color }) => (
                    <div
                      key={label}
                      className="rounded-xl p-2.5 text-center"
                      style={{ background: "rgba(255,255,255,0.04)" }}
                    >
                      <Icon size={14} color={color} className="mx-auto mb-1" strokeWidth={2} />
                      <p style={{ color: "#FFFFFF", fontWeight: 700, fontSize: 14 }}>{value}</p>
                      <p style={{ color: "#6B7280", fontSize: 10 }}>{label}</p>
                    </div>
                  ))}
                </div>

                {selectedUser.paymentCurrencies.length > 0 && (
                  <div
                    className="rounded-xl p-3 mb-5"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
                  >
                    <p style={{ color: "#FFFFFF", fontWeight: 700, fontSize: 13, marginBottom: 10 }}>Crypto spent</p>
                    <div className="flex flex-col gap-2">
                      {selectedUser.paymentCurrencies.map((currency) => (
                        <div
                          key={`${currency.currencyCode}:${currency.network}`}
                          className="flex items-center justify-between gap-3"
                        >
                          <div>
                            <p style={{ color: "#E5E7EB", fontSize: 12, fontWeight: 700 }}>{currency.currencyLabel}</p>
                            <p style={{ color: "#6B7280", fontSize: 11 }}>{currency.network} · {currency.orderCount} paid orders</p>
                          </div>
                          <div className="text-right">
                            <p style={{ color: "#22c55e", fontSize: 12, fontWeight: 800 }}>
                              {formatCrypto(currency.receivedCrypto)} {currency.providerCurrency.toUpperCase()}
                            </p>
                            <p style={{ color: "#6B7280", fontSize: 11 }}>€{currency.spent}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                  <a
                    href={selectedUser.telegramUsername ? `https://t.me/${selectedUser.telegramUsername}` : "#"}
                    className="flex-1 py-2.5 rounded-xl flex items-center justify-center gap-2"
                    style={{ background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.25)" }}
                  >
                    <Mail size={14} color="#3B82F6" strokeWidth={2} />
                    <span style={{ color: "#3B82F6", fontWeight: 600, fontSize: 13 }}>Telegram</span>
                  </a>
                  <button
                    onClick={() => toggleActive(selectedUser.id)}
                    className="flex-1 py-2.5 rounded-xl flex items-center justify-center gap-2"
                    style={{
                      background: selectedUser.active ? "rgba(239,68,68,0.1)" : "rgba(34,197,94,0.1)",
                      border: `1px solid ${selectedUser.active ? "rgba(239,68,68,0.25)" : "rgba(34,197,94,0.25)"}`,
                    }}
                  >
                    {selectedUser.active ? (
                      <>
                        <Ban size={14} color="#ef4444" strokeWidth={2} />
                        <span style={{ color: "#ef4444", fontWeight: 600, fontSize: 13 }}>{t("admin.suspend")}</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle size={14} color="#22c55e" strokeWidth={2} />
                        <span style={{ color: "#22c55e", fontWeight: 600, fontSize: 13 }}>{t("admin.activate")}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function toAdminUser(user: ApiUser & {
  email?: string | null;
  orderCount?: number;
  paidOrderCount?: number;
  spent?: number;
  paymentCurrencies?: AdminUser["paymentCurrencies"];
  createdAt?: string;
}): AdminUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email ?? "",
    telegramUsername: user.telegramUsername,
    telegramId: user.telegramId,
    avatarUrl: user.telegramPhotoUrl ?? user.avatarUrl,
    orders: user.orderCount ?? 0,
    paidOrders: user.paidOrderCount ?? 0,
    spent: user.spent ?? 0,
    paymentCurrencies: user.paymentCurrencies ?? [],
    joined: user.createdAt ?? new Date().toISOString(),
    active: user.status === "active",
  };
}

function formatCrypto(value: number) {
  return value.toLocaleString("en-US", {
    maximumFractionDigits: 12,
    useGrouping: false,
  });
}
