import { useNavigate, useLocation } from "react-router";
import { motion } from "motion/react";
import { Home, Grid3X3, ShoppingCart, User, Phone } from "lucide-react";
import { useCart } from "../store/cart-context";
import { useI18n } from "../i18n";

const NAV_ITEMS = [
  { path: "/", icon: Home, labelKey: "nav.home" },
  { path: "/catalog", icon: Grid3X3, labelKey: "nav.catalog" },
  { path: "/cart", icon: ShoppingCart, labelKey: "nav.cart" },
  { path: "/profile", icon: User, labelKey: "nav.profile" },
  { path: "/contacts", icon: Phone, labelKey: "nav.contacts" },
];

export function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { itemCount } = useCart();
  const { t } = useI18n();

  return (
    <div
      className="fkh-bottom-nav fixed bottom-0 left-0 right-0 z-50 flex justify-around items-center px-2 py-2"
      style={{
        background: "linear-gradient(to top, rgba(11,11,12,0.98), rgba(18,18,20,0.9))",
        borderTop: "1px solid rgba(255,77,109,0.15)",
        paddingBottom: "env(safe-area-inset-bottom, 8px)",
        backdropFilter: "blur(18px)",
      }}
    >
      {NAV_ITEMS.map(({ path, icon: Icon, labelKey }) => {
        const isActive = location.pathname === path;
        const isCart = path === "/cart";
        const label = t(labelKey);
        return (
          <button
            key={path}
            onClick={() => navigate(path)}
            className="relative flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all"
            style={{
              minWidth: 48,
              background: isActive ? "rgba(255,77,109,0.1)" : "transparent",
              boxShadow: isActive ? "inset 0 0 0 1px rgba(255,77,109,0.16)" : "none",
            }}
          >
            <motion.div
              animate={{ scale: isActive ? 1.15 : 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className="relative"
            >
              <Icon
                size={22}
                style={{ color: isActive ? "#FF4D6D" : "#A0A0A0" }}
                strokeWidth={isActive ? 2.2 : 1.8}
              />
              {isCart && itemCount > 0 && (
                <span
                  className="absolute -top-1.5 -right-1.5 rounded-full flex items-center justify-center"
                  style={{
                    background: "#FF4D6D",
                    color: "#0B0B0C",
                    fontSize: 9,
                    fontWeight: 700,
                    minWidth: 16,
                    height: 16,
                    padding: "0 3px",
                  }}
                >
                  {itemCount > 9 ? "9+" : itemCount}
                </span>
              )}
            </motion.div>
            <span
              style={{
                fontSize: 10,
                color: isActive ? "#FF4D6D" : "#A0A0A0",
                fontWeight: isActive ? 600 : 400,
              }}
            >
              {label}
            </span>
            {isActive && (
              <motion.div
                layoutId="nav-indicator"
                className="absolute -bottom-0.5 rounded-full"
                style={{ width: 20, height: 2, background: "#FF4D6D" }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
