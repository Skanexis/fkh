import { motion } from "motion/react";
import { Phone, MessageCircle, Mail, MapPin, ExternalLink, Send } from "lucide-react";
import { TopBar } from "../components/TopBar";
import { useI18n } from "../i18n";

const CONTACTS = [
  {
    id: "phone",
    icon: Phone,
    labelKey: "contacts.phone",
    value: "+39 333 000 0000",
    subKey: "contacts.hours",
    actionKey: "contacts.call",
    href: "tel:+393330000000",
    color: "#22c55e",
    bg: "rgba(34,197,94,0.1)",
    border: "rgba(34,197,94,0.2)",
  },
  {
    id: "telegram",
    icon: Send,
    label: "Telegram",
    value: "@thefkh",
    subKey: "contacts.telegramSub",
    actionKey: "contacts.openTelegram",
    href: "https://t.me/thefkh",
    color: "#3B82F6",
    bg: "rgba(59,130,246,0.1)",
    border: "rgba(59,130,246,0.2)",
  },
  {
    id: "whatsapp",
    icon: MessageCircle,
    label: "WhatsApp",
    value: "+39 333 000 0000",
    subKey: "contacts.whatsappSub",
    actionKey: "contacts.openWhatsapp",
    href: "https://wa.me/393330000000",
    color: "#22c55e",
    bg: "rgba(34,197,94,0.1)",
    border: "rgba(34,197,94,0.2)",
  },
  {
    id: "email",
    icon: Mail,
    labelKey: "contacts.email",
    value: "info@thefkh.com",
    subKey: "contacts.emailSub",
    actionKey: "contacts.sendEmail",
    href: "mailto:info@thefkh.com",
    color: "#FF4D6D",
    bg: "rgba(255,77,109,0.1)",
    border: "rgba(255,77,109,0.2)",
  },
  {
    id: "address",
    icon: MapPin,
    labelKey: "contacts.address",
    value: "Via Roma, 1",
    subKey: "contacts.city",
    actionKey: "contacts.openMaps",
    href: "https://maps.google.com",
    color: "#ef4444",
    bg: "rgba(239,68,68,0.1)",
    border: "rgba(239,68,68,0.2)",
  },
];

export function Contacts() {
  const { t } = useI18n();

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
          <p style={{ color: "#A0A0A0", fontSize: 13, marginTop: 4 }}>
            {t("contacts.intro")}
          </p>
        </motion.div>

        {/* Contact cards */}
        <div className="flex flex-col gap-3">
          {CONTACTS.map((contact, i) => {
            const Icon = contact.icon;
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
                  border: `1px solid ${contact.border}`,
                  textDecoration: "none",
                }}
              >
                <div className="flex items-center gap-4">
                  {/* Icon */}
                  <div
                    className="rounded-2xl flex items-center justify-center flex-shrink-0"
                    style={{
                      width: 52,
                      height: 52,
                      background: contact.bg,
                      border: `1px solid ${contact.border}`,
                    }}
                  >
                    <Icon size={22} color={contact.color} strokeWidth={1.8} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p style={{ color: "#A0A0A0", fontSize: 11, fontWeight: 500, marginBottom: 2 }}>
                      {"labelKey" in contact ? t(contact.labelKey) : contact.label}
                    </p>
                    <p style={{ color: "#FFFFFF", fontWeight: 700, fontSize: 15 }}>
                      {contact.value}
                    </p>
                    <p style={{ color: "#A0A0A0", fontSize: 12, marginTop: 2 }}>{t(contact.subKey)}</p>
                  </div>

                  {/* CTA */}
                  <div className="flex-shrink-0 flex flex-col items-end gap-2">
                    <div
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                      style={{
                        background: contact.bg,
                        border: `1px solid ${contact.border}`,
                      }}
                    >
                      <span style={{ color: contact.color, fontSize: 11, fontWeight: 600 }}>
                        {t(contact.actionKey)}
                      </span>
                      <ExternalLink size={10} color={contact.color} />
                    </div>
                  </div>
                </div>
              </motion.a>
            );
          })}
        </div>

        {/* Social footer */}
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
            className="mx-auto mb-3 flex items-center justify-center rounded-full"
            style={{
              width: 44,
              height: 44,
              background: "rgba(255,77,109,0.15)",
              border: "1px solid rgba(255,77,109,0.3)",
            }}
          >
            <span style={{ color: "#FF4D6D", fontWeight: 900, fontSize: 14 }}>FKH</span>
          </div>
          <p style={{ color: "#FFFFFF", fontWeight: 700, fontSize: 16 }}>The F.K.H</p>
          <p style={{ color: "#A0A0A0", fontSize: 13, marginTop: 4 }}>
            {t("contacts.footer")}
          </p>
        </motion.div>
      </div>
    </div>
  );
}
