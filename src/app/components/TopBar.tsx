import { useNavigate } from "react-router";
import { ShoppingCart, User, ChevronLeft } from "lucide-react";
import { useCart } from "../store/cart-context";
import { motion } from "motion/react";
import { useAuth } from "../auth/auth-context";
import { useSiteSettings } from "../site-settings";

interface TopBarProps {
  title?: string;
  showBack?: boolean;
  transparent?: boolean;
}

export function TopBar({ title, showBack, transparent }: TopBarProps) {
  const navigate = useNavigate();
  const { itemCount } = useCart();
  const { user } = useAuth();
  const settings = useSiteSettings();

  return (
    <div
      className="fkh-topbar fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 h-14"
      style={{
        background: transparent
          ? "transparent"
          : "linear-gradient(to bottom, rgba(11,11,12,0.94), rgba(11,11,12,0.72), transparent)",
        backdropFilter: transparent ? "none" : "blur(12px)",
      }}
    >
      {showBack ? (
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 rounded-full p-2"
          style={{ background: "rgba(255,255,255,0.07)" }}
        >
          <ChevronLeft size={20} color="#FFFFFF" strokeWidth={2} />
        </button>
      ) : (
        <div className="flex items-center gap-2">
          {settings.logoUrl ? (
            <img
              src={settings.logoUrl}
              alt={settings.brandName}
              className="rounded-full object-cover"
              style={{ width: 28, height: 28, border: "1px solid rgba(255,77,109,0.35)" }}
            />
          ) : (
            <span className="fkh-live-dot" />
          )}
          <span
            className="fkh-brand-word"
            style={{
              fontFamily: "Inter, sans-serif",
              fontWeight: 800,
              fontSize: 18,
              color: "#FF4D6D",
              letterSpacing: 2,
            }}
          >
            {settings.brandName}
          </span>
        </div>
      )}

      {title && (
        <span
          style={{
            color: "#FFFFFF",
            fontWeight: 600,
            fontSize: 17,
            fontFamily: "Inter, sans-serif",
          }}
        >
          {title}
        </span>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("/profile")}
          className="rounded-full p-2"
          style={{ background: "rgba(255,255,255,0.07)" }}
        >
          {user?.telegramPhotoUrl || user?.avatarUrl ? (
            <img
              src={user.telegramPhotoUrl || user.avatarUrl || ""}
              alt={user.name}
              className="rounded-full object-cover"
              style={{ width: 18, height: 18 }}
            />
          ) : (
            <User size={18} color={user ? "#FF4D6D" : "#A0A0A0"} strokeWidth={1.8} />
          )}
        </button>
        <button
          onClick={() => navigate("/cart")}
          className="relative rounded-full p-2"
          style={{ background: "rgba(255,255,255,0.07)" }}
        >
          <ShoppingCart size={18} color="#A0A0A0" strokeWidth={1.8} />
          {itemCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-0.5 -right-0.5 rounded-full flex items-center justify-center"
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
              {itemCount}
            </motion.span>
          )}
        </button>
      </div>
    </div>
  );
}
