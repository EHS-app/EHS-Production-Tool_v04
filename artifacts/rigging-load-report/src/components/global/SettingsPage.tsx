import React, { useEffect, useState, useRef } from "react";
import { useSettings, type OrganizationSettings } from "../../lib/useSettings";
import { Building2, Save, AlertCircle, RefreshCcw, Mail, Phone, MapPin, DollarSign, Image as ImageIcon, Briefcase, Plus, X } from "lucide-react";
import { useT } from "../../lib/i18n/I18nContext";

export function SettingsPage() {
  const t = useT();
  const { settings, loading, error, fetchSettings, updateSettings } = useSettings();
  const [formData, setFormData] = useState<Partial<OrganizationSettings>>({});
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === "number") {
      setFormData((prev) => ({ ...prev, [name]: value === "" ? "" : Number(value) }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
    setSaveStatus("idle");
  };

  const handleDepartmentChange = (index: number, value: string) => {
    setFormData((prev) => {
      const deps = [...(prev.departments || [])];
      deps[index] = value;
      return { ...prev, departments: deps };
    });
    setSaveStatus("idle");
  };

  const addDepartment = () => {
    setFormData((prev) => ({
      ...prev,
      departments: [...(prev.departments || []), ""],
    }));
  };

  const removeDepartment = (index: number) => {
    setFormData((prev) => {
      const deps = [...(prev.departments || [])];
      deps.splice(index, 1);
      return { ...prev, departments: deps };
    });
    setSaveStatus("idle");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveStatus("idle");
    setSaveError(null);
    const { id: _readOnlyId, ...updates } = formData;
    const result = await updateSettings(updates);
    setSaving(false);
    if (result.ok) {
      setSaveStatus("success");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } else {
      setSaveStatus("error");
      setSaveError(result.error || "Failed to save");
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 400, padding: "0 16px" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, color: "var(--text-muted)" }}>
          <RefreshCcw size={32} className="spin" />
          <p>{t("common.loading")}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ maxWidth: 900, margin: "32px auto", padding: "0 16px" }}>
        <div style={{ background: "color-mix(in srgb, var(--danger) 10%, transparent)", color: "var(--danger)", padding: 24, borderRadius: 12, border: "1px solid color-mix(in srgb, var(--danger) 30%, transparent)", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 16 }}>
          <AlertCircle size={40} />
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 8px 0" }}>{t("settings.errorTitle", { default: "Failed to load settings" })}</h3>
            <p style={{ margin: 0, opacity: 0.9, fontSize: 14 }}>{error === "Unauthorized" ? t("settings.unauthorized", { default: "You do not have permission to view or edit settings." }) : error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "0 16px 40px", maxWidth: 900, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 32, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ fontSize: "2rem", fontWeight: 300, margin: "0 0 8px 0", color: "var(--text-main)" }}>{t("settings.title", { default: "System Settings" })}</h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", margin: 0 }}>{t("settings.subtitle", { default: "Manage organization defaults and global configuration." })}</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {saveStatus === "success" && (
            <span className="settings-status-success">
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--success)", display: "inline-block" }} />
              {t("notif.saved", { default: "Saved." })}
            </span>
          )}
          {saveStatus === "error" && (
            <span className="settings-status-error">
              <AlertCircle size={16} />
              {saveError}
            </span>
          )}
          <button
            type="submit"
            form="settings-form"
            disabled={saving}
            className="ehs-primary-btn"
          >
            {saving ? (
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <RefreshCcw size={16} className="spin" />
                {t("common.saving", { default: "Saving..." })}
              </span>
            ) : (
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Save size={16} />
                {t("common.save", { default: "Save Changes" })}
              </span>
            )}
          </button>
        </div>
      </div>

      <form id="settings-form" onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {/* Brand & Identity */}
        <div className="settings-section">
          <div className="settings-section-header">
            <h2 className="settings-section-title">
              <Building2 size={18} color="var(--text-muted)" />
              {t("settings.brand.title", { default: "Brand & Identity" })}
            </h2>
          </div>
          <div className="settings-section-body">
            <div className="settings-grid cols-2">
              <div className="settings-field">
                <label className="settings-label">{t("settings.brand.companyName", { default: "Company Name" })}</label>
                <input
                  type="text"
                  name="companyName"
                  value={formData.companyName || ""}
                  onChange={handleChange}
                  className="ehs-input"
                  style={{ width: "100%" }}
                  required
                />
              </div>
              <div className="settings-field">
                <label className="settings-label">
                  <ImageIcon size={14} />
                  {t("settings.brand.logoUrl", { default: "Logo URL" })}
                </label>
                <input
                  type="url"
                  name="logoUrl"
                  value={formData.logoUrl || ""}
                  onChange={handleChange}
                  className="ehs-input"
                  style={{ width: "100%" }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="settings-section">
          <div className="settings-section-header">
            <h2 className="settings-section-title">
              <Phone size={18} color="var(--text-muted)" />
              {t("settings.contact.title", { default: "Contact Information" })}
            </h2>
          </div>
          <div className="settings-section-body">
            <div className="settings-grid cols-2">
              <div className="settings-field">
                <label className="settings-label">
                  <Mail size={14} />
                  {t("settings.contact.email", { default: "Primary Email" })}
                </label>
                <input
                  type="email"
                  name="contactEmail"
                  value={formData.contactEmail || ""}
                  onChange={handleChange}
                  className="ehs-input"
                  style={{ width: "100%" }}
                />
              </div>
              <div className="settings-field">
                <label className="settings-label">
                  <Phone size={14} />
                  {t("settings.contact.phone", { default: "Primary Phone" })}
                </label>
                <input
                  type="tel"
                  name="contactPhone"
                  value={formData.contactPhone || ""}
                  onChange={handleChange}
                  className="ehs-input"
                  style={{ width: "100%" }}
                />
              </div>
              <div className="settings-field" style={{ gridColumn: "1 / -1" }}>
                <label className="settings-label">
                  <MapPin size={14} />
                  {t("settings.contact.address", { default: "Office Address" })}
                </label>
                <textarea
                  name="contactAddress"
                  value={formData.contactAddress || ""}
                  onChange={handleChange}
                  rows={3}
                  className="ehs-input"
                  style={{ width: "100%", resize: "vertical", minHeight: 80 }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Financial & Economy */}
        <div className="settings-section">
          <div className="settings-section-header">
            <h2 className="settings-section-title">
              <DollarSign size={18} color="var(--text-muted)" />
              {t("settings.finance.title", { default: "Financial Defaults" })}
            </h2>
          </div>
          <div className="settings-section-body">
            <div className="settings-grid cols-3">
              <div className="settings-field">
                <label className="settings-label">{t("settings.finance.currency", { default: "Default Currency" })}</label>
                <input
                  type="text"
                  name="defaultCurrency"
                  value={formData.defaultCurrency || ""}
                  onChange={handleChange}
                  maxLength={3}
                  className="ehs-input"
                  style={{ width: "100%", textTransform: "uppercase" }}
                  required
                />
                <div className="settings-hint">{t("settings.currencyHint")}</div>
              </div>
              <div className="settings-field">
                <label className="settings-label">{t("settings.finance.vat", { default: "Default VAT (%)" })}</label>
                <div className="settings-input-group">
                  <input
                    type="number"
                    value={formData.defaultVatRateBasisPoints ? formData.defaultVatRateBasisPoints / 100 : 0}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      if (!isNaN(val)) {
                        setFormData(p => ({ ...p, defaultVatRateBasisPoints: Math.round(val * 100) }));
                        setSaveStatus("idle");
                      }
                    }}
                    step="0.1"
                    min="0"
                    max="100"
                    className="ehs-input"
                    style={{ width: "100%", paddingRight: 32 }}
                  />
                  <span className="settings-input-suffix">%</span>
                </div>
              </div>
              <div className="settings-field">
                <label className="settings-label">{t("settings.finance.paymentTerms", { default: "Payment Terms (Days)" })}</label>
                <input
                  type="number"
                  name="defaultPaymentTermsDays"
                  value={formData.defaultPaymentTermsDays ?? ""}
                  onChange={handleChange}
                  min="0"
                  className="ehs-input"
                  style={{ width: "100%" }}
                />
              </div>
              
              <div className="settings-divider" />
              
              <div className="settings-field">
                <label className="settings-label">{t("settings.finance.dayRate", { default: "Fallback Day Rate" })}</label>
                <input
                  type="number"
                  value={formData.fallbackDayRateMinor ? formData.fallbackDayRateMinor / 100 : 0}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val)) {
                      setFormData(p => ({ ...p, fallbackDayRateMinor: Math.round(val * 100) }));
                      setSaveStatus("idle");
                    }
                  }}
                  min="0"
                  className="ehs-input"
                  style={{ width: "100%" }}
                />
              </div>
              <div className="settings-field">
                <label className="settings-label">{t("settings.finance.hourlyRate", { default: "Fallback Hourly Rate" })}</label>
                <input
                  type="number"
                  value={formData.fallbackHourlyRateMinor ? formData.fallbackHourlyRateMinor / 100 : 0}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val)) {
                      setFormData(p => ({ ...p, fallbackHourlyRateMinor: Math.round(val * 100) }));
                      setSaveStatus("idle");
                    }
                  }}
                  min="0"
                  className="ehs-input"
                  style={{ width: "100%" }}
                />
              </div>
              <div className="settings-field">
                <label className="settings-label">{t("settings.finance.overtimeMultiplier", { default: "Overtime Multiplier" })}</label>
                <div className="settings-input-group">
                  <input
                    type="number"
                    value={formData.overtimeMultiplierBasisPoints ? formData.overtimeMultiplierBasisPoints / 100 : 1.5}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      if (!isNaN(val)) {
                        setFormData(p => ({ ...p, overtimeMultiplierBasisPoints: Math.round(val * 100) }));
                        setSaveStatus("idle");
                      }
                    }}
                    step="0.01"
                    min="1"
                    className="ehs-input"
                    style={{ width: "100%", paddingRight: 32 }}
                  />
                  <span className="settings-input-suffix">x</span>
                </div>
              </div>
              <div className="settings-field">
                <label className="settings-label">{t("settings.finance.overtimeThreshold", { default: "Overtime Threshold (Hours)" })}</label>
                <input
                  type="number"
                  value={formData.overtimeThresholdMinutes ? formData.overtimeThresholdMinutes / 60 : 8}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val)) {
                      setFormData(p => ({ ...p, overtimeThresholdMinutes: Math.round(val * 60) }));
                      setSaveStatus("idle");
                    }
                  }}
                  step="0.5"
                  min="0"
                  className="ehs-input"
                  style={{ width: "100%" }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Departments */}
        <div className="settings-section">
          <div className="settings-section-header">
            <h2 className="settings-section-title">
              <Briefcase size={18} color="var(--text-muted)" />
              {t("settings.departments.title", { default: "Global Departments" })}
            </h2>
            <button
              type="button"
              onClick={addDepartment}
              style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: "var(--primary)", background: "transparent", border: "none", cursor: "pointer", padding: 0 }}
            >
              <Plus size={14} />
              {t("settings.departments.add", { default: "Add Department" })}
            </button>
          </div>
          <div className="settings-section-body">
            {(!formData.departments || formData.departments.length === 0) ? (
              <div style={{ textAlign: "center", padding: "32px 16px", color: "var(--text-muted)", fontSize: 14, border: "2px dashed var(--border-color)", borderRadius: 8 }}>
                {t("settings.departments.empty", { default: "No departments configured." })}
              </div>
            ) : (
              <div className="settings-grid cols-3" style={{ gap: 12 }}>
                {formData.departments.map((dept, idx) => (
                  <div key={idx} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input
                      type="text"
                      value={dept}
                      onChange={(e) => handleDepartmentChange(idx, e.target.value)}
                      className="ehs-input"
                      style={{ flex: 1, minWidth: 0 }}
                      placeholder={t("settings.departments.placeholder", { default: "Department Name" })}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => removeDepartment(idx)}
                      style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: 6, background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", transition: "all 0.15s" }}
                      title={t("common.remove", { default: "Remove" })}
                      onMouseOver={(e) => { e.currentTarget.style.color = "var(--danger)"; e.currentTarget.style.background = "color-mix(in srgb, var(--danger) 10%, transparent)"; }}
                      onMouseOut={(e) => { e.currentTarget.style.color = "var(--text-muted)"; e.currentTarget.style.background = "transparent"; }}
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
