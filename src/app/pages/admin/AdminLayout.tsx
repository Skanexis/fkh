import { Outlet, useNavigate, useLocation } from "react-router";
import { motion } from "motion/react";
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Users,
  ArrowLeft,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";
import { useI18n } from "../../i18n";

const NAV_ITEMS = [
  { path: "/admin", icon: LayoutDashboard, labelKey: "admin.dashboard" },
  { path: "/admin/products", icon: Package, labelKey: "admin.products" },
  { path: "/admin/orders", icon: ShoppingBag, labelKey: "admin.orders" },
  { path: "/admin/users", icon: Users, labelKey: "admin.users" },
];

export function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const { t } = useI18n();

  return (
    <div
      className="min-h-screen flex"
      style={{ background: "#0A0F1C", fontFamily: "Inter, sans-serif" }}
    >
      {/* Desktop Sidebar */}
      <div
        className="hidden md:flex flex-col w-60 flex-shrink-0 fixed left-0 top-0 bottom-0"
        style={{
          background: "#111827",
          borderRight: "1px solid rgba(59,130,246,0.15)",
        }}
      >
        {/* Logo */}
        <div className="px-5 py-6">
          <div className="flex items-center gap-3 mb-1">
            <div
              className="rounded-lg flex items-center justify-center"
              style={{
                width: 36,
                height: 36,
                background: "linear-gradient(135deg, rgba(59,130,246,0.3), rgba(96,165,250,0.15))",
                border: "1px solid rgba(59,130,246,0.4)",
              }}
            >
              <span style={{ color: "#3B82F6", fontWeight: 900, fontSize: 12 }}>FKH</span>
            </div>
            <div>
              <p style={{ color: "#FFFFFF", fontWeight: 700, fontSize: 14 }}>F.K.H Admin</p>
              <p style={{ color: "#60A5FA", fontSize: 10 }}>{t("admin.controlPanel")}</p>
            </div>
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-3">
          {NAV_ITEMS.map(({ path, icon: Icon, labelKey }) => {
            const isActive =
              path === "/admin"
                ? location.pathname === "/admin"
                : location.pathname.startsWith(path);
            const label = t(labelKey);
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1 text-left transition-all"
                style={{
                  background: isActive ? "rgba(59,130,246,0.15)" : "transparent",
                  border: isActive ? "1px solid rgba(59,130,246,0.3)" : "1px solid transparent",
                }}
              >
                <Icon
                  size={18}
                  color={isActive ? "#3B82F6" : "#6B7280"}
                  strokeWidth={isActive ? 2 : 1.8}
                />
                <span
                  style={{
                    color: isActive ? "#60A5FA" : "#9CA3AF",
                    fontWeight: isActive ? 600 : 400,
                    fontSize: 14,
                  }}
                >
                  {label}
                </span>
                {isActive && (
                  <motion.div
                    layoutId="admin-indicator"
                    className="ml-auto rounded-full"
                    style={{ width: 6, height: 6, background: "#3B82F6" }}
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Back to store */}
        <div className="px-3 pb-6">
          <button
            onClick={() => navigate("/")}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl"
            style={{ background: "rgba(255,255,255,0.04)" }}
          >
            <ArrowLeft size={16} color="#6B7280" strokeWidth={1.8} />
            <span style={{ color: "#6B7280", fontSize: 13 }}>{t("admin.backToStore")}</span>
          </button>
        </div>
      </div>

      {/* Mobile header */}
      <div
        className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 h-14"
        style={{
          background: "#111827",
          borderBottom: "1px solid rgba(59,130,246,0.15)",
        }}
      >
        <div className="flex items-center gap-2">
          <div
            className="rounded-lg flex items-center justify-center"
            style={{
              width: 30,
              height: 30,
              background: "rgba(59,130,246,0.2)",
              border: "1px solid rgba(59,130,246,0.35)",
            }}
          >
            <span style={{ color: "#3B82F6", fontWeight: 900, fontSize: 10 }}>FKH</span>
          </div>
          <span style={{ color: "#FFFFFF", fontWeight: 700, fontSize: 14 }}>{t("profile.adminPanel")}</span>
        </div>
        <button onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? (
            <X size={22} color="#9CA3AF" />
          ) : (
            <Menu size={22} color="#9CA3AF" />
          )}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="md:hidden fixed top-14 left-0 right-0 z-40 px-3 py-3"
          style={{ background: "#111827", borderBottom: "1px solid rgba(59,130,246,0.15)" }}
        >
          {NAV_ITEMS.map(({ path, icon: Icon, labelKey }) => {
            const isActive =
              path === "/admin"
                ? location.pathname === "/admin"
                : location.pathname.startsWith(path);
            const label = t(labelKey);
            return (
              <button
                key={path}
                onClick={() => { navigate(path); setMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1"
                style={{
                  background: isActive ? "rgba(59,130,246,0.15)" : "transparent",
                }}
              >
                <Icon size={18} color={isActive ? "#3B82F6" : "#6B7280"} strokeWidth={1.8} />
                <span style={{ color: isActive ? "#60A5FA" : "#9CA3AF", fontWeight: isActive ? 600 : 400, fontSize: 14 }}>
                  {label}
                </span>
              </button>
            );
          })}
          <button
            onClick={() => navigate("/")}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl mt-1"
          >
            <ArrowLeft size={16} color="#6B7280" />
            <span style={{ color: "#6B7280", fontSize: 13 }}>{t("admin.backToStore")}</span>
          </button>
        </motion.div>
      )}

      {/* Main content */}
      <div className="flex-1 md:ml-60 pt-14 md:pt-0 min-h-screen overflow-auto">
        <Outlet />
      </div>
    </div>
  );
}
