import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Plus, Save, Trash2, Truck } from "lucide-react";
import { apiRequest } from "../../api/client";
import { ApiShippingMethod } from "../../api/types";
import { useI18n } from "../../i18n";

type ShippingMethodDraft = Omit<ApiShippingMethod, "id" | "code"> & { id?: string; code?: string };

const emptyShippingMethod: ShippingMethodDraft = {
  label: "",
  isActive: true,
  sortOrder: 0,
};

export function AdminShippingMethods() {
  const { t } = useI18n();
  const [methods, setMethods] = useState<ShippingMethodDraft[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadMethods();
  }, []);

  async function loadMethods() {
    try {
      const apiMethods = await apiRequest<ApiShippingMethod[]>("/api/v1/admin/shipping-methods");
      setMethods(apiMethods);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.settingsError"));
    }
  }

  async function saveAll() {
    setSaving(true);
    try {
      const saved = await Promise.all(
        methods
          .filter((method) => method.label.trim())
          .map((method) => {
            const payload = {
              label: method.label.trim(),
              isActive: method.isActive,
              sortOrder: Number(method.sortOrder) || 0,
            };
            return method.id
              ? apiRequest<ApiShippingMethod>(`/api/v1/admin/shipping-methods/${method.id}`, { method: "PATCH", body: JSON.stringify(payload) })
              : apiRequest<ApiShippingMethod>("/api/v1/admin/shipping-methods", { method: "POST", body: JSON.stringify(payload) });
          }),
      );
      setMethods(saved);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.settingsError"));
    } finally {
      setSaving(false);
    }
  }

  async function removeMethod(method: ShippingMethodDraft, index: number) {
    if (!method.id) {
      setMethods((current) => current.filter((_, itemIndex) => itemIndex !== index));
      return;
    }

    try {
      await apiRequest<ApiShippingMethod>(`/api/v1/admin/shipping-methods/${method.id}`, { method: "DELETE" });
      setMethods((current) => current.filter((_, itemIndex) => itemIndex !== index));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.settingsError"));
    }
  }

  function updateMethod(index: number, patch: Partial<ShippingMethodDraft>) {
    setMethods((current) => current.map((method, itemIndex) => itemIndex === index ? { ...method, ...patch } : method));
  }

  return (
    <div className="p-5 pb-8">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Truck size={20} color="#60A5FA" />
            <h1 style={{ color: "#FFFFFF", fontWeight: 800, fontSize: 22 }}>{t("admin.shippingMethods")}</h1>
          </div>
          <p style={{ color: error ? "#ef4444" : "#6B7280", fontSize: 13, marginTop: 4 }}>
            {error ? `${t("common.backend")}: ${error}` : t("admin.shippingMethodsSubtitle")}
          </p>
        </div>
        <button
          onClick={saveAll}
          disabled={saving}
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

      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-4"
        style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)" }}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 style={{ color: "#FFFFFF", fontWeight: 700, fontSize: 16 }}>{t("admin.shippingMethods")}</h2>
            <p style={{ color: "#6B7280", fontSize: 12 }}>{t("admin.shippingMethodsSubtitle")}</p>
          </div>
          <button
            onClick={() => setMethods((current) => [...current, { ...emptyShippingMethod, sortOrder: current.length * 10 }])}
            className="flex items-center gap-2 rounded-xl px-3 py-2"
            style={{ background: "rgba(59,130,246,0.12)", color: "#60A5FA", fontWeight: 700, fontSize: 12 }}
          >
            <Plus size={14} />
            {t("admin.add")}
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {methods.map((method, index) => (
            <div
              key={method.id ?? index}
              className="rounded-xl p-3"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              <div className="grid grid-cols-1 md:grid-cols-[1fr_100px] gap-2">
                <MethodInput
                  value={method.label}
                  placeholder={t("admin.shippingMethodLabel")}
                  onChange={(value) => updateMethod(index, { label: value })}
                />
                <MethodInput
                  value={String(method.sortOrder)}
                  placeholder="#"
                  onChange={(value) => updateMethod(index, { sortOrder: Number(value) || 0 })}
                />
              </div>
              <div className="flex items-center justify-between mt-3">
                <label className="flex items-center gap-2" style={{ color: "#9CA3AF", fontSize: 12 }}>
                  <input
                    type="checkbox"
                    checked={method.isActive}
                    onChange={(event) => updateMethod(index, { isActive: event.target.checked })}
                  />
                  {t("admin.active")}
                </label>
                <button onClick={() => void removeMethod(method, index)} className="rounded-lg p-2" style={{ background: "rgba(239,68,68,0.1)" }}>
                  <Trash2 size={14} color="#ef4444" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </motion.section>
    </div>
  );
}

function MethodInput({ value, placeholder, onChange }: { value: string; placeholder: string; onChange: (value: string) => void }) {
  return (
    <input
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      className="rounded-lg px-3 py-2 outline-none"
      style={{ background: "#0A0F1C", color: "#FFFFFF", border: "1px solid rgba(255,255,255,0.08)", fontSize: 12 }}
    />
  );
}
