import { Outlet, useLocation } from "react-router";
import { AnimatePresence, motion } from "motion/react";
import { BottomNav } from "./BottomNav";
import { useI18n } from "../i18n";

const SECTIONS = [
  { match: /^\/$/, labelKey: "nav.home" },
  { match: /^\/catalog/, labelKey: "nav.catalog" },
  { match: /^\/product/, labelKey: "nav.product" },
  { match: /^\/cart/, labelKey: "nav.cart" },
  { match: /^\/profile/, labelKey: "nav.profile" },
  { match: /^\/contacts/, labelKey: "nav.contacts" },
];

export function UserLayout() {
  const location = useLocation();
  const { t } = useI18n();
  const activeIndex = Math.max(0, SECTIONS.findIndex((section) => section.match.test(location.pathname)));
  const activeSection = SECTIONS[activeIndex] ?? SECTIONS[0];

  return (
    <div className="fkh-shell">
      <div className="fkh-shell-grid" />
      <div className="fkh-aurora fkh-aurora-one" />
      <div className="fkh-aurora fkh-aurora-two" />
      <div className="fkh-shell-beam fkh-shell-beam-one" />
      <div className="fkh-shell-beam fkh-shell-beam-two" />
      <motion.div
        className="fkh-app-frame"
        initial={{ opacity: 0, scale: 0.96, y: 18 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="fkh-frame-corner fkh-frame-corner-tl" />
        <div className="fkh-frame-depth" />
        <div className="fkh-section-rail" aria-hidden="true">
          <span className="fkh-section-rail-code">0{activeIndex + 1}</span>
          <span className="fkh-section-rail-label">{t(activeSection.labelKey)}</span>
          <div className="fkh-section-rail-dots">
            {SECTIONS.map((section, index) => (
              <span
                key={section.labelKey}
                className={index === activeIndex ? "is-active" : undefined}
              />
            ))}
          </div>
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            className="fkh-route-surface"
            initial={{ opacity: 0, y: 12, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -10, filter: "blur(6px)" }}
            transition={{ duration: 0.24, ease: "easeOut" }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
        <BottomNav />
      </motion.div>
    </div>
  );
}
