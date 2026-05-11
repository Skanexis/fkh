import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Phone, MessageCircle, Mail, MapPin, ExternalLink, Send, Link, ShieldCheck } from "lucide-react";
import { TopBar } from "../components/TopBar";
import { apiRequest } from "../api/client";
import { ApiContact, ApiSiteSettings } from "../api/types";
import { useI18n } from "../i18n";

const TYPE_STYLE = {
  phone: { icon: Phone, color: "#22c55e", bg: "rgba(34,197,94,0.1)", border: "rgba(34,197,94,0.2)" },
  telegram: { icon: Send, color: "#3B82F6", bg: "rgba(59,130,246,0.1)", border: "rgba(59,130,246,0.2)" },
  whatsapp: { icon: MessageCircle, color: "#22c55e", bg: "rgba(34,197,94,0.1)", border: "rgba(34,197,94,0.2)" },
  email: { icon: Mail, color: "#FF4D6D", bg: "rgba(255,77,109,0.1)", border: "rgba(255,77,109,0.2)" },
  address: { icon: MapPin, color: "#ef4444", bg: "rgba(239,68,68,0.1)", border: "rgba(239,68,68,0.2)" },
  custom: { icon: Link, color: "#A78BFA", bg: "rgba(167,139,250,0.1)", border: "rgba(167,139,250,0.2)" },
};

const CHANNEL_STYLE = {
  signal: { icon: MessageCircle, color: "#3A76F0", bg: "rgba(58,118,240,0.12)", border: "rgba(58,118,240,0.28)" },
  threema: { icon: ShieldCheck, color: "#22c55e", bg: "rgba(34,197,94,0.12)", border: "rgba(34,197,94,0.28)" },
};

export function Contacts() {
  const { t } = useI18n();
  const [contacts, setContacts] = useState<ApiContact[]>([]);
  const [settings, setSettings] = useState<ApiSiteSettings | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadContacts() {
      try {
        const [apiContacts, siteSettings] = await Promise.all([
          apiRequest<ApiContact[]>("/api/v1/contacts"),
          apiRequest<ApiSiteSettings>("/api/v1/site-settings"),
        ]);
        setContacts(apiContacts);
        setSettings(siteSettings);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : t("catalog.error"));
      }
    }

    void loadContacts();
  }, [t]);

  return (
    <div
      className="min-h-screen pb-24"
      style={{ background: "#0B0B0C", fontFamily: "Inter, sans-serif" }}
    >
      <TopBar title={t("nav.contacts")} />

      <div className="pt-16 px-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="pt-4 mb-6"
        >
          <h1 style={{ color: "#FFFFFF", fontWeight: 800, fontSize: 26 }}>{t("nav.contacts")}</h1>
          <p style={{ color: error ? "#ef4444" : "#A0A0A0", fontSize: 13, marginTop: 4 }}>
            {error ? `${t("common.backend")}: ${error}` : t("contacts.intro")}
          </p>
        </motion.div>

        <div className="flex flex-col gap-3">
          {contacts.map((contact, i) => {
            const style = getContactStyle(contact);
            const Icon = style.icon;
            return (
              <motion.a
                key={contact.id}
                href={contact.href}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                whileHover={{ scale: 1.01, y: -1 }}
                whileTap={{ scale: 0.98 }}
                className="block rounded-2xl p-4 no-underline"
                style={{
                  background: "#1A1A1D",
                  border: `1px solid ${style.border}`,
                  textDecoration: "none",
                }}
              >
                <div className="flex items-center gap-4">
                  <div
                    className="rounded-2xl flex items-center justify-center flex-shrink-0"
                    style={{
                      width: 52,
                      height: 52,
                      background: style.bg,
                      border: `1px solid ${style.border}`,
                    }}
                  >
                    <Icon size={22} color={style.color} strokeWidth={1.8} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p style={{ color: "#A0A0A0", fontSize: 11, fontWeight: 500, marginBottom: 2 }}>
                      {contact.label}
                    </p>
                    <p style={{ color: "#FFFFFF", fontWeight: 700, fontSize: 15 }}>
                      {contact.value}
                    </p>
                  </div>

                  <div className="flex-shrink-0">
                    <div
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                      style={{
                        background: style.bg,
                        border: `1px solid ${style.border}`,
                      }}
                    >
                      <span style={{ color: style.color, fontSize: 11, fontWeight: 600 }}>
                        {t("common.link")}
                      </span>
                      <ExternalLink size={10} color={style.color} />
                    </div>
                  </div>
                </div>
              </motion.a>
            );
          })}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 rounded-2xl p-5 text-center"
          style={{
            background: "linear-gradient(135deg, rgba(255,77,109,0.08), rgba(255,154,139,0.04))",
            border: "1px solid rgba(255,77,109,0.15)",
          }}
        >
          <div
            className="mx-auto mb-3 flex items-center justify-center rounded-full overflow-hidden"
            style={{
              width: 44,
              height: 44,
              background: "rgba(255,77,109,0.15)",
              border: "1px solid rgba(255,77,109,0.3)",
            }}
          >
            {settings?.logoUrl ? (
              <img src={settings.logoUrl} alt={settings.brandName} className="w-full h-full object-cover" />
            ) : (
              <span style={{ color: "#FF4D6D", fontWeight: 900, fontSize: 14 }}>FKH</span>
            )}
          </div>
          <p style={{ color: "#FFFFFF", fontWeight: 700, fontSize: 16 }}>{settings?.brandName ?? "The F.K.H"}</p>
          <p style={{ color: "#A0A0A0", fontSize: 13, marginTop: 4 }}>
            {t("contacts.footer")}
          </p>
        </motion.div>
      </div>
    </div>
  );
}

function getContactStyle(contact: ApiContact) {
  const channel = `${contact.label} ${contact.value} ${contact.href}`.toLowerCase();
  if (channel.includes("signal")) return CHANNEL_STYLE.signal;
  if (channel.includes("threema")) return CHANNEL_STYLE.threema;
  return TYPE_STYLE[contact.type] ?? TYPE_STYLE.custom;
}
