import { useEffect, useState } from "react";
import Admin from "@/models/admin";
import showToast from "@/utils/toast";

const DEFAULT_SETTINGS = {
  enabled: false,
  blockPhoneNumbers: true,
  blockContactNames: true,
  customRules: "",
  fallbackText: "Diese Antwort wurde durch einen Standardtext ersetzt.",
};

export default function ResponseGuard() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    async function fetchSettings() {
      const response = await Admin.systemPreferencesByFields([
        "response_guard_settings",
      ]);
      const fetched = response?.settings?.response_guard_settings || {};
      setSettings({ ...DEFAULT_SETTINGS, ...fetched });
      setLoading(false);
    }
    fetchSettings();
  }, []);

  const updateSetting = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const saveSettings = async () => {
    const payload = { ...settings };
    const { success, error } = await Admin.updateSystemPreferences({
      response_guard_settings: JSON.stringify(payload),
    });
    if (!success) {
      showToast(`Failed to update response guard settings: ${error}`, "error");
      return;
    }
    showToast("Response guard settings updated.", "success");
    setHasChanges(false);
  };

  if (loading) return null;

  return (
    <div className="flex flex-col gap-y-2 my-6">
      <div className="flex flex-col gap-y-1">
        <p className="text-sm leading-6 font-semibold text-white">
          Ausgabenprüfung (LLM)
        </p>
        <p className="text-xs text-white/60">
          Lass eine zweite LLM-Prüfung laufen, um Antworten auf Telefonnummern,
          erfundene Ansprechpersonen oder andere Regeln zu kontrollieren und
          bei Bedarf durch einen Standardtext zu ersetzen.
        </p>
      </div>

      <div className="flex flex-col gap-y-4 bg-theme-settings-input-bg rounded-lg p-4 max-w-[720px]">
        <ToggleRow
          label="Aktiviert"
          description="Deaktiviert das Streaming und erzwingt eine Zweitprüfung der Modellantwort."
          checked={settings.enabled}
          onChange={(value) => updateSetting("enabled", value)}
        />

        <ToggleRow
          label="Telefonnummern blockieren"
          description="Antworten, die Telefonnummern enthalten oder zur Kontaktaufnahme per Anruf auffordern, werden verworfen."
          checked={settings.blockPhoneNumbers}
          onChange={(value) => updateSetting("blockPhoneNumbers", value)}
          disabled={!settings.enabled}
        />

        <ToggleRow
          label="Erfundene Ansprechpartner blockieren"
          description="Antworten mit frei erfundenen Kontakt- oder Personennamen werden verworfen."
          checked={settings.blockContactNames}
          onChange={(value) => updateSetting("blockContactNames", value)}
          disabled={!settings.enabled}
        />

        <div className="flex flex-col gap-y-2">
          <label className="text-sm font-semibold text-white">
            Weitere Prüfregeln
          </label>
          <p className="text-xs text-white/60">
            Beschreibe zusätzliche Vorgaben, die die Prüf-LLM berücksichtigen
            soll (z.B. keine vertraulichen Details, neutrale Tonalität etc.).
          </p>
          <textarea
            rows={3}
            className="border-none bg-theme-settings-input-bg text-white text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-3 placeholder:text-theme-settings-input-placeholder focus:ring-blue-500"
            value={settings.customRules}
            onChange={(e) => updateSetting("customRules", e.target.value)}
            disabled={!settings.enabled}
            placeholder="Keine zusätzlichen Regeln"
          />
        </div>

        <div className="flex flex-col gap-y-2">
          <label className="text-sm font-semibold text-white">
            Standardantwort bei Verstoß
          </label>
          <p className="text-xs text-white/60">
            Dieser Text wird ausgegeben, wenn die geprüfte Antwort gegen eine
            Regel verstößt.
          </p>
          <textarea
            rows={2}
            className="border-none bg-theme-settings-input-bg text-white text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-3 placeholder:text-theme-settings-input-placeholder focus:ring-blue-500"
            value={settings.fallbackText}
            onChange={(e) => updateSetting("fallbackText", e.target.value)}
            disabled={!settings.enabled}
          />
        </div>
      </div>

      {hasChanges && (
        <div className="flex justify-start pt-2">
          <button
            type="button"
            onClick={saveSettings}
            className="transition-all duration-300 border border-slate-200 px-5 py-2.5 rounded-lg text-white text-sm items-center flex gap-x-2 hover:bg-slate-200 hover:text-slate-800 focus:ring-gray-800"
          >
            Einstellungen speichern
          </button>
        </div>
      )}
    </div>
  );
}

function ToggleRow({ label, description, checked, onChange, disabled = false }) {
  return (
    <div className="flex flex-col gap-y-1">
      <div className="flex items-center gap-x-4">
        <div>
          <p className="text-sm font-semibold text-white">{label}</p>
          <p className="text-xs text-white/60">{description}</p>
        </div>
        <label className="relative inline-flex cursor-pointer items-center">
          <input
            type="checkbox"
            checked={checked}
            disabled={disabled}
            onChange={(e) => onChange(e.target.checked)}
            className="peer sr-only"
          />
          <div className="pointer-events-none peer h-6 w-11 rounded-full bg-[#CFCFD0] after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:shadow-xl after:border-none after:bg-white after:box-shadow-md after:transition-all after:content-[''] peer-checked:bg-[#32D583] peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-transparent"></div>
        </label>
      </div>
    </div>
  );
}
