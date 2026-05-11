import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Send, RefreshCw, CheckCircle, AlertCircle } from "lucide-react";
import { useAuth } from "./auth-context";
import { useI18n } from "../i18n";

interface TelegramLoginPanelProps {
  title?: string;
  subtitle?: string;
}

export function TelegramLoginPanel({
  title,
  subtitle,
}: TelegramLoginPanelProps) {
  const { startTelegramLogin, pollTelegramLogin } = useAuth();
  const { t } = useI18n();
  const [authRequestId, setAuthRequestId] = useState<string | null>(null);
  const [botUrl, setBotUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "pending" | "confirmed" | "expired" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function begin() {
    setError(null);
    setStatus("pending");
    try {
      const data = await startTelegramLogin();
      setAuthRequestId(data.authRequestId);
      setBotUrl(data.botStartUrl);
      window.open(data.botStartUrl, "_blank", "noopener,noreferrer");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : t("auth.startError"));
    }
  }

  useEffect(() => {
    if (!authRequestId || status !== "pending") return;

    const interval = window.setInterval(async () => {
      try {
        const result = await pollTelegramLogin(authRequestId);
        if (result.status === "confirmed") {
          setStatus("confirmed");
          window.clearInterval(interval);
        }
        if (result.status === "expired" || result.status === "cancelled") {
          setStatus("expired");
          window.clearInterval(interval);
        }
      } catch (err) {
        setStatus("error");
        setError(err instanceof Error ? err.message : t("auth.pollError"));
        window.clearInterval(interval);
      }
    }, 1500);

    return () => window.clearInterval(interval);
  }, [authRequestId, pollTelegramLogin, status, t]);

  return (
    <div
      className="rounded-2xl p-5"
      style={{ background: "#1A1A1D", border: "1px solid rgba(255,77,109,0.18)" }}
    >
      <div className="flex items-start gap-4">
        <div
          className="rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{
            width: 48,
            height: 48,
            background: "rgba(255,77,109,0.12)",
            border: "1px solid rgba(255,77,109,0.3)",
          }}
        >
          {status === "confirmed" ? (
            <CheckCircle size={23} color="#22c55e" />
          ) : status === "error" || status === "expired" ? (
            <AlertCircle size={23} color="#ef4444" />
          ) : (
            <Send size={22} color="#FF4D6D" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h2 style={{ color: "#FFFFFF", fontWeight: 800, fontSize: 18 }}>{title ?? t("auth.title")}</h2>
          <p style={{ color: "#A0A0A0", fontSize: 13, marginTop: 4, lineHeight: 1.5 }}>{subtitle ?? t("auth.subtitle")}</p>
          {error && <p style={{ color: "#ef4444", fontSize: 12, marginTop: 8 }}>{error}</p>}
          {status === "expired" && (
            <p style={{ color: "#ef4444", fontSize: 12, marginTop: 8 }}>{t("auth.expired")}</p>
          )}
        </div>
      </div>

      <div className="flex gap-3 mt-5">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={begin}
          disabled={status === "pending"}
          className="flex-1 py-3 rounded-xl flex items-center justify-center gap-2"
          style={{
            background: "linear-gradient(135deg, #FF4D6D, #FF9A8B)",
            color: "#0B0B0C",
            fontWeight: 800,
            fontSize: 14,
            opacity: status === "pending" ? 0.75 : 1,
          }}
        >
          {status === "pending" ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
          {status === "pending" ? t("auth.waiting") : t("auth.openTelegram")}
        </motion.button>
        {botUrl && (
          <a
            href={botUrl}
            target="_blank"
            rel="noreferrer"
            className="px-4 py-3 rounded-xl"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "#A0A0A0",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {t("common.link")}
          </a>
        )}
      </div>
    </div>
  );
}
