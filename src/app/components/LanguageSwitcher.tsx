import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Globe2 } from "lucide-react";
import { LANGUAGES, Language, useI18n } from "../i18n";

interface LanguageSwitcherProps {
  compact?: boolean;
}

export function LanguageSwitcher({ compact }: LanguageSwitcherProps) {
  const { language, setLanguage, t } = useI18n();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const activeLanguage = LANGUAGES.find((item) => item.code === language) ?? LANGUAGES[0];

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  function chooseLanguage(nextLanguage: Language) {
    setLanguage(nextLanguage);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative z-[120] inline-flex">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex items-center gap-2 rounded-full px-3 py-2 transition-all"
        style={{
          minWidth: compact ? 82 : 132,
          background: open
            ? "linear-gradient(135deg, rgba(255,77,109,0.2), rgba(255,154,139,0.1))"
            : "rgba(255,255,255,0.07)",
          border: `1px solid ${open ? "rgba(255,77,109,0.55)" : "rgba(255,77,109,0.28)"}`,
          color: "#FFFFFF",
          backdropFilter: "blur(12px)",
          boxShadow: open ? "0 12px 30px rgba(255,77,109,0.18), inset 0 0 0 1px rgba(255,255,255,0.04)" : "none",
        }}
        aria-label={t("common.language")}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <Globe2 size={compact ? 15 : 16} color="#FF4D6D" strokeWidth={2} />
        <span
          style={{
            color: "#FFFFFF",
            fontSize: compact ? 12 : 13,
            fontWeight: 800,
            lineHeight: 1,
            letterSpacing: 0.4,
          }}
        >
          {compact ? activeLanguage.short : activeLanguage.label}
        </span>
        <ChevronDown
          size={14}
          color="#FF9A8B"
          strokeWidth={2.3}
          style={{ marginLeft: "auto", transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.18s ease" }}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-[130] mt-2 overflow-hidden rounded-2xl p-1.5"
          style={{
            width: compact ? 142 : 180,
            background:
              "linear-gradient(180deg, rgba(28,28,31,0.98), rgba(12,12,14,0.98))",
            border: "1px solid rgba(255,77,109,0.34)",
            boxShadow:
              "0 22px 50px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04), 0 0 28px rgba(255,77,109,0.12)",
            backdropFilter: "blur(18px)",
          }}
        >
          {LANGUAGES.map((item) => {
            const selected = item.code === language;
            return (
              <button
                key={item.code}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                onClick={() => chooseLanguage(item.code)}
                data-selected={selected ? "true" : "false"}
                className="fkh-language-option group flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left transition-all"
                style={{
                  background: selected
                    ? "linear-gradient(135deg, #FF4D6D, #FF9A8B)"
                    : "transparent",
                  color: selected ? "#0B0B0C" : "#FFFFFF",
                }}
              >
                <span
                  className="flex items-center justify-center rounded-full"
                  style={{
                    width: compact ? 26 : 30,
                    height: compact ? 26 : 30,
                    background: selected ? "rgba(11,11,12,0.16)" : "rgba(255,255,255,0.06)",
                    border: selected ? "1px solid rgba(11,11,12,0.18)" : "1px solid rgba(255,255,255,0.08)",
                    color: selected ? "#0B0B0C" : "#FF9A8B",
                    fontSize: compact ? 10 : 11,
                    fontWeight: 900,
                  }}
                >
                  {item.short}
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className="block truncate"
                    style={{ fontSize: compact ? 12 : 13, fontWeight: 800, lineHeight: 1.15 }}
                  >
                    {item.label}
                  </span>
                </span>
                {selected && <Check size={15} color="#0B0B0C" strokeWidth={3} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
