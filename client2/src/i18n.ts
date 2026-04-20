import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import enAdmin from "@/locales/en/admin.json";
import enAuth from "@/locales/en/auth.json";
import enBooking from "@/locales/en/booking.json";
import enCommon from "@/locales/en/common.json";
import enHome from "@/locales/en/home.json";
import enProfile from "@/locales/en/profile.json";
import enServices from "@/locales/en/services.json";
import zhAdmin from "@/locales/zh/admin.json";
import zhAuth from "@/locales/zh/auth.json";
import zhBooking from "@/locales/zh/booking.json";
import zhCommon from "@/locales/zh/common.json";
import zhHome from "@/locales/zh/home.json";
import zhProfile from "@/locales/zh/profile.json";
import zhServices from "@/locales/zh/services.json";

export const I18N_STORAGE_KEY = "petground_i18n_lng";

/** localStorage → browser (en only if explicit English) → default zh */
function getInitialLanguage(): string {
  if (typeof window === "undefined") return "zh";
  try {
    const stored = window.localStorage.getItem(I18N_STORAGE_KEY);
    if (stored === "en" || stored === "zh") return stored;
    const nav = (navigator.language || "").toLowerCase();
    if (nav.startsWith("en")) return "en";
    return "zh";
  } catch {
    return "zh";
  }
}

function applyDocumentLang(lng: string) {
  if (typeof document !== "undefined") {
    document.documentElement.lang = lng.startsWith("zh") ? "zh-CN" : "en";
  }
}

void i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        common: enCommon,
        home: enHome,
        booking: enBooking,
        services: enServices,
        admin: enAdmin,
        auth: enAuth,
        profile: enProfile,
      },
      zh: {
        common: zhCommon,
        home: zhHome,
        booking: zhBooking,
        services: zhServices,
        admin: zhAdmin,
        auth: zhAuth,
        profile: zhProfile,
      },
    },
    lng: getInitialLanguage(),
    fallbackLng: "zh",
    supportedLngs: ["zh", "en"],
    defaultNS: "common",
    ns: ["common", "home", "booking", "services", "admin", "auth", "profile"],
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  })
  .then(() => {
    applyDocumentLang(i18n.language);
  });

i18n.on("languageChanged", (lng) => {
  applyDocumentLang(lng);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(I18N_STORAGE_KEY, lng);
  }
});

export default i18n;
