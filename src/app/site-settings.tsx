import React, { createContext, useContext, useEffect, useState } from "react";
import { apiRequest } from "./api/client";
import { ApiSiteSettings } from "./api/types";

const fallbackSettings: ApiSiteSettings = {
  brandName: "F.K.H",
  logoUrl: null,
  updatedAt: new Date(0).toISOString(),
};

const SiteSettingsContext = createContext<ApiSiteSettings>(fallbackSettings);

export function SiteSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<ApiSiteSettings>(fallbackSettings);

  useEffect(() => {
    let cancelled = false;
    apiRequest<ApiSiteSettings>("/api/v1/site-settings")
      .then((data) => {
        if (!cancelled) setSettings(data);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  return <SiteSettingsContext.Provider value={settings}>{children}</SiteSettingsContext.Provider>;
}

export function useSiteSettings() {
  return useContext(SiteSettingsContext);
}
