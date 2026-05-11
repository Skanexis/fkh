import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { ImageUp, Plus, Save, Trash2, Settings, ExternalLink } from "lucide-react";
import { apiRequest } from "../../api/client";
import { ApiContact, ApiMediaAsset, ApiShippingMethod, ApiSiteSettings } from "../../api/types";
import { useI18n } from "../../i18n";

type ContactDraft = Omit<ApiContact, "id"> & { id?: string };
type ShippingMethodDraft = Omit<ApiShippingMethod, "id" | "code"> & { id?: string; code?: string };

const emptyContact: ContactDraft = {
  type: "telegram",
  label: "",
  value: "",
  href: "",
  isActive: true,
  sortOrder: 0,
};

const emptyShippingMethod: ShippingMethodDraft = {
  label: "",
  priceAmount: 0,
  isActive: true,
  sortOrder: 0,
};

export function AdminSettings() {
  const { t } = useI18n();
  const [settings, setSettings] = useState<ApiSiteSettings | null>(null);
  const [contacts, setContacts] = useState<ContactDraft[]>([]);
  const [shippingMethods, setShippingMethods] = useState<ShippingMethodDraft[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const [siteSettings, apiContacts, apiShippingMethods] = await Promise.all([
        apiRequest<ApiSiteSettings>("/api/v1/admin/site-settings"),
        apiRequest<ApiContact[]>("/api/v1/admin/contacts"),
        apiRequest<ApiShippingMethod[]>("/api/v1/admin/shipping-methods"),
      ]);
      setSettings(siteSettings);
      setContacts(apiContacts);
      setShippingMethods(apiShippingMethods);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.settingsError"));
    }
  }

  async function uploadLogo(file: File) {
    const body = new FormData();
    body.append("file", file);
    const media = await apiRequest<ApiMediaAsset>("/api/v1/admin/media", { method: "POST", body });
    setSettings((current) => current ? { ...current, logoUrl: media.url } : current);
  }

  async function saveAll() {
    if (!settings) return;
    setSaving(true);
    try {
      await apiRequest<ApiSiteSettings>("/api/v1/admin/site-settings", {
        method: "PATCH",
        body: JSON.stringify({ brandName: settings.brandName, logoUrl: settings.logoUrl || null }),
      });

      const savedContacts = await Promise.all(
        contacts
          .filter((contact) => contact.label.trim() && contact.value.trim() && contact.href.trim())
          .map((contact) => {
            const payload = {
              type: contact.type,
              label: contact.label.trim(),
              value: contact.value.trim(),
              href: contact.href.trim(),
              isActive: contact.isActive,
              sortOrder: Number(contact.sortOrder) || 0,
            };
            return contact.id
              ? apiRequest<ApiContact>(`/api/v1/admin/contacts/${contact.id}`, { method: "PATCH", body: JSON.stringify(payload) })
              : apiRequest<ApiContact>("/api/v1/admin/contacts", { method: "POST", body: JSON.stringify(payload) });
          }),
      );
      const savedShippingMethods = await Promise.all(
        shippingMethods
          .filter((method) => method.label.trim())
          .map((method) => {
            const payload = {
              label: method.label.trim(),
              priceAmount: Number(method.priceAmount) || 0,
              isActive: method.isActive,
              sortOrder: Number(method.sortOrder) || 0,
            };
            return method.id
              ? apiRequest<ApiShippingMethod>(`/api/v1/admin/shipping-methods/${method.id}`, { method: "PATCH", body: JSON.stringify(payload) })
              : apiRequest<ApiShippingMethod>("/api/v1/admin/shipping-methods", { method: "POST", body: JSON.stringify(payload) });
          }),
      );
      setContacts(savedContacts);
      setShippingMethods(savedShippingMethods);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.settingsError"));
    } finally {
      setSaving(false);
    }
  }

  async function removeContact(contact: ContactDraft, index: number) {
    if (!contact.id) {
      setContacts((current) => current.filter((_, itemIndex) => itemIndex !== index));
      return;
    }

    try {
      await apiRequest<ApiContact>(`/api/v1/admin/contacts/${contact.id}`, { method: "DELETE" });
      setContacts((current) => current.filter((_, itemIndex) => itemIndex !== index));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.settingsError"));
    }
  }

  function updateContact(index: number, patch: Partial<ContactDraft>) {
    setContacts((current) => current.map((contact, itemIndex) => itemIndex === index ? { ...contact, ...patch } : contact));
  }

  async function removeShippingMethod(method: ShippingMethodDraft, index: number) {
    if (!method.id) {
      setShippingMethods((current) => current.filter((_, itemIndex) => itemIndex !== index));
      return;
    }

    try {
      await apiRequest<ApiShippingMethod>(`/api/v1/admin/shipping-methods/${method.id}`, { method: "DELETE" });
      setShippingMethods((current) => current.filter((_, itemIndex) => itemIndex !== index));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.settingsError"));
    }
  }

  function updateShippingMethod(index: number, patch: Partial<ShippingMethodDraft>) {
    setShippingMethods((current) => current.map((method, itemIndex) => itemIndex === index ? { ...method, ...patch } : method));
  }

  return (
    <div className="p-5 pb-8">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 style={{ color: "#FFFFFF", fontWeight: 800, fontSize: 22 }}>{t("admin.settings")}</h1>
          <p style={{ color: error ? "#ef4444" : "#6B7280", fontSize: 13 }}>
            {error ? `${t("common.backend")}: ${error}` : t("admin.settingsSubtitle")}
          </p>
        </div>
        <button
          onClick={saveAll}
          disabled={saving || !settings}
          className="flex items-center gap-2 rounded-xl px-4 py-2.5"
          style={{
            background: "linear-gradient(135deg, #3B82F6, #60A5FA)",
            color: "#FFFFFF",
            opacity: saving ? 0.7 : 1,
            fontWeight: 700,
            fontSize: 13,
          }}
        >
          <Save size={15} />
          {saving ? t("admin.saving") : t("admin.save")}
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-5">
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-4"
          style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Settings size={17} color="#3B82F6" />
            <h2 style={{ color: "#FFFFFF", fontWeight: 700, fontSize: 16 }}>{t("admin.branding")}</h2>
          </div>

          <label className="block mb-4">
            <span style={{ color: "#9CA3AF", fontSize: 12 }}>{t("admin.brandName")}</span>
            <input
              value={settings?.brandName ?? ""}
              onChange={(event) => setSettings((current) => current ? { ...current, brandName: event.target.value } : current)}
              className="mt-1 w-full rounded-xl px-3 py-2 outline-none"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#FFFFFF" }}
            />
          </label>

          <div
            className="rounded-2xl p-4 mb-4 flex items-center gap-4"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <div
              className="rounded-xl flex items-center justify-center overflow-hidden"
              style={{ width: 72, height: 72, background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.25)" }}
            >
              {settings?.logoUrl ? (
                <img src={settings.logoUrl} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <ImageUp size={24} color="#60A5FA" />
              )}
            </div>
            <div className="min-w-0">
              <p style={{ color: "#FFFFFF", fontWeight: 700, fontSize: 14 }}>{t("admin.logo")}</p>
              <p style={{ color: "#6B7280", fontSize: 12, marginTop: 2 }}>{t("admin.logoHelp")}</p>
            </div>
          </div>

          <label
            className="flex items-center justify-center gap-2 rounded-xl px-4 py-3 cursor-pointer"
            style={{ background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.25)", color: "#60A5FA", fontWeight: 700 }}
          >
            <ImageUp size={16} />
            {t("admin.uploadLogo")}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void uploadLogo(file);
              }}
            />
          </label>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.06 }}
          className="rounded-2xl p-4"
          style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 style={{ color: "#FFFFFF", fontWeight: 700, fontSize: 16 }}>{t("admin.contacts")}</h2>
              <p style={{ color: "#6B7280", fontSize: 12 }}>{t("admin.contactsSubtitle")}</p>
            </div>
            <button
              onClick={() => setContacts((current) => [...current, { ...emptyContact, sortOrder: current.length * 10 }])}
              className="flex items-center gap-2 rounded-xl px-3 py-2"
              style={{ background: "rgba(59,130,246,0.12)", color: "#60A5FA", fontWeight: 700, fontSize: 12 }}
            >
              <Plus size={14} />
              {t("admin.add")}
            </button>
          </div>

          <div className="flex flex-col gap-3">
            {contacts.map((contact, index) => (
              <div
                key={contact.id ?? index}
                className="rounded-xl p-3"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                <div className="grid grid-cols-1 lg:grid-cols-[120px_1fr_1fr_1fr_80px] gap-2">
                  <select
                    value={contact.type}
                    onChange={(event) => updateContact(index, { type: event.target.value as ContactDraft["type"] })}
                    className="rounded-lg px-2 py-2 outline-none"
                    style={{ background: "#0A0F1C", color: "#FFFFFF", border: "1px solid rgba(255,255,255,0.08)", fontSize: 12 }}
                  >
                    {["phone", "telegram", "whatsapp", "email", "address", "custom"].map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                  <ContactInput value={contact.label} placeholder={t("admin.contactLabel")} onChange={(value) => updateContact(index, { label: value })} />
                  <ContactInput value={contact.value} placeholder={t("admin.contactValue")} onChange={(value) => updateContact(index, { value })} />
                  <ContactInput value={contact.href} placeholder={t("admin.contactHref")} onChange={(value) => updateContact(index, { href: value })} />
                  <ContactInput value={String(contact.sortOrder)} placeholder="#" onChange={(value) => updateContact(index, { sortOrder: Number(value) || 0 })} />
                </div>
                <div className="flex items-center justify-between mt-3">
                  <label className="flex items-center gap-2" style={{ color: "#9CA3AF", fontSize: 12 }}>
                    <input
                      type="checkbox"
                      checked={contact.isActive}
                      onChange={(event) => updateContact(index, { isActive: event.target.checked })}
                    />
                    {t("admin.active")}
                  </label>
                  <div className="flex items-center gap-2">
                    {contact.href && (
                      <a href={contact.href} target="_blank" rel="noreferrer" className="rounded-lg p-2" style={{ background: "rgba(59,130,246,0.1)" }}>
                        <ExternalLink size={14} color="#60A5FA" />
                      </a>
                    )}
                    <button onClick={() => void removeContact(contact, index)} className="rounded-lg p-2" style={{ background: "rgba(239,68,68,0.1)" }}>
                      <Trash2 size={14} color="#ef4444" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.09 }}
          className="rounded-2xl p-4 xl:col-span-2"
          style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 style={{ color: "#FFFFFF", fontWeight: 700, fontSize: 16 }}>{t("admin.shippingMethods")}</h2>
              <p style={{ color: "#6B7280", fontSize: 12 }}>{t("admin.shippingMethodsSubtitle")}</p>
            </div>
            <button
              onClick={() => setShippingMethods((current) => [...current, { ...emptyShippingMethod, sortOrder: current.length * 10 }])}
              className="flex items-center gap-2 rounded-xl px-3 py-2"
              style={{ background: "rgba(59,130,246,0.12)", color: "#60A5FA", fontWeight: 700, fontSize: 12 }}
            >
              <Plus size={14} />
              {t("admin.add")}
            </button>
          </div>

          <div className="flex flex-col gap-3">
            {shippingMethods.map((method, index) => (
              <div
                key={method.id ?? index}
                className="rounded-xl p-3"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                <div className="grid grid-cols-1 md:grid-cols-[1fr_120px_100px] gap-2">
                  <ContactInput
                    value={method.label}
                    placeholder={t("admin.shippingMethodLabel")}
                    onChange={(value) => updateShippingMethod(index, { label: value })}
                  />
                  <ContactInput
                    value={String(method.priceAmount ?? 0)}
                    placeholder={t("admin.shippingMethodPrice")}
                    type="number"
                    onChange={(value) => updateShippingMethod(index, { priceAmount: Number(value) || 0 })}
                  />
                  <ContactInput
                    value={String(method.sortOrder)}
                    placeholder="#"
                    onChange={(value) => updateShippingMethod(index, { sortOrder: Number(value) || 0 })}
                  />
                </div>
                <div className="flex items-center justify-between mt-3">
                  <label className="flex items-center gap-2" style={{ color: "#9CA3AF", fontSize: 12 }}>
                    <input
                      type="checkbox"
                      checked={method.isActive}
                      onChange={(event) => updateShippingMethod(index, { isActive: event.target.checked })}
                    />
                    {t("admin.active")}
                  </label>
                  <button onClick={() => void removeShippingMethod(method, index)} className="rounded-lg p-2" style={{ background: "rgba(239,68,68,0.1)" }}>
                    <Trash2 size={14} color="#ef4444" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </motion.section>
      </div>
    </div>
  );
}

function ContactInput({ value, placeholder, onChange, type = "text" }: { value: string; placeholder: string; onChange: (value: string) => void; type?: string }) {
  return (
    <input
      value={value}
      type={type}
      min={type === "number" ? 0 : undefined}
      step={type === "number" ? 0.01 : undefined}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      className="rounded-lg px-3 py-2 outline-none"
      style={{ background: "#0A0F1C", color: "#FFFFFF", border: "1px solid rgba(255,255,255,0.08)", fontSize: 12 }}
    />
  );
}
