import { Ban, LogOut } from "lucide-react";
import { motion } from "motion/react";
import { useAuth } from "../auth/auth-context";
import { useI18n } from "../i18n";

export function BannedNotice({ showLogout = true }: { showLogout?: boolean }) {
  const { logout } = useAuth();
  const { t } = useI18n();

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-5"
      style={{
        background: "linear-gradient(135deg, rgba(239,68,68,0.14), rgba(255,77,109,0.07))",
        border: "1px solid rgba(239,68,68,0.32)",
        boxShadow: "0 18px 48px rgba(239,68,68,0.12)",
      }}
    >
      <div className="flex items-start gap-4">
        <div
          className="rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{
            width: 52,
            height: 52,
            background: "rgba(239,68,68,0.14)",
            border: "1px solid rgba(239,68,68,0.35)",
          }}
        >
          <Ban size={24} color="#ef4444" />
        </div>
        <div className="min-w-0 flex-1">
          <p style={{ color: "#FFFFFF", fontWeight: 900, fontSize: 22 }}>{t("ban.title")}</p>
          <p style={{ color: "#FCA5A5", fontSize: 13, marginTop: 6, lineHeight: 1.5 }}>
            {t("ban.message")}
          </p>
        </div>
      </div>
      {showLogout && (
        <button
          onClick={logout}
          className="mt-5 w-full rounded-xl py-3 flex items-center justify-center gap-2"
          style={{
            background: "rgba(239,68,68,0.12)",
            border: "1px solid rgba(239,68,68,0.26)",
            color: "#FCA5A5",
            fontWeight: 700,
          }}
        >
          <LogOut size={16} />
          {t("profile.logout")}
        </button>
      )}
    </motion.div>
  );
}
