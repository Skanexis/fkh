import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { ArrowRight, Phone } from "lucide-react";
import { LanguageSwitcher } from "../components/LanguageSwitcher";
import { useI18n } from "../i18n";

export function Home() {
  const navigate = useNavigate();
  const { t } = useI18n();

  return (
    <div
      className="fkh-home min-h-screen flex flex-col relative overflow-hidden"
      style={{ background: "#0B0B0C", fontFamily: "Inter, sans-serif" }}
    >
      {/* Background texture */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(145deg, rgba(255,77,109,0.08), transparent 36%), linear-gradient(315deg, rgba(255,154,139,0.06), transparent 42%)",
          opacity: 1,
        }}
      />

      {/* Top logo */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.6 }}
        className="relative z-50 flex items-center justify-between px-6 pt-14 pb-3"
      >
        <span
          style={{
            fontWeight: 900,
            fontSize: 22,
            color: "#FF4D6D",
            letterSpacing: 4,
          }}
        >
          F.K.H
        </span>
        <LanguageSwitcher compact />
      </motion.div>

      <div className="relative z-10 flex-1 px-6 pt-2">
        <div className="fkh-home-hero">
          <motion.div
            initial={{ opacity: 0, x: -18 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.45, duration: 0.65 }}
            className="fkh-home-copy"
          >
            <div className="fkh-home-kicker">
              <span />
              {t("home.kicker")}
            </div>
            <motion.h1
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.62, duration: 0.6 }}
            >
              The F.K.H
              <small>{t("home.subtitle")}</small>
            </motion.h1>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 24, rotate: 2 }}
            animate={{ opacity: 1, x: 0, rotate: 0 }}
            transition={{ delay: 0.58, duration: 0.75, type: "spring", stiffness: 90 }}
            className="fkh-home-stage"
          >
            <motion.div
              className="fkh-floating-logo"
              animate={{ y: [0, -12, 0], rotate: [-1.5, 1.5, -1.5] }}
              transition={{ duration: 5.8, repeat: Infinity, ease: "easeInOut" }}
            >
              <span className="fkh-floating-logo-orbit" />
              <span className="fkh-floating-logo-mark">F.K.H</span>
              <span className="fkh-floating-logo-sub">{t("home.floatingSub")}</span>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Bottom CTAs */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.3, duration: 0.6, type: "spring", stiffness: 100 }}
        className="relative z-10 px-6 pb-24 flex flex-col gap-3"
      >
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate("/catalog")}
          className="fkh-primary-cta w-full py-4 rounded-2xl flex items-center justify-center gap-3"
          style={{
            background: "linear-gradient(135deg, #FF4D6D, #FF9A8B)",
            color: "#0B0B0C",
            fontWeight: 800,
            fontSize: 17,
            letterSpacing: 0.5,
            boxShadow: "0 8px 30px rgba(255,77,109,0.4)",
          }}
        >
          {t("home.openCatalog")}
          <ArrowRight size={20} strokeWidth={2.5} />
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate("/contacts")}
          className="w-full py-4 rounded-2xl flex items-center justify-center gap-3"
          style={{
            background: "transparent",
            border: "2px solid rgba(255,77,109,0.5)",
            color: "#FF4D6D",
            fontWeight: 700,
            fontSize: 17,
          }}
        >
          <Phone size={18} strokeWidth={2} />
          {t("nav.contacts")}
        </motion.button>
      </motion.div>
    </div>
  );
}
