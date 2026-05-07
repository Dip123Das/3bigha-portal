"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { i18nConfig, type Locale } from "@/lib/i18n/config";

const LANGUAGE_STORAGE_KEY = "3bigha_preferred_locale";

const LANGUAGE_LABELS: Record<string, string> = {
  en: "English",
  bn: "বাংলা",
  hi: "हिन्दी",
  as: "অসমীয়া",
  or: "ଓଡ଼ିଆ",
  ta: "தமிழ்",
  te: "తెలుగు",
  ml: "മലയാളം",
  kn: "ಕನ್ನಡ",
  mr: "मराठी",
  gu: "ગુજરાતી",
  pa: "ਪੰਜਾਬੀ",
  ur: "اردو",
};

function getCurrentLocale(pathname: string): Locale {
  const first = pathname.split("/").filter(Boolean)[0];

  if (i18nConfig.locales.includes(first as Locale)) {
    return first as Locale;
  }

  return i18nConfig.defaultLocale as Locale;
}

function buildLocalizedPath(pathname: string, locale: Locale) {
  const parts = pathname.split("/").filter(Boolean);
  const first = parts[0];

  const hasLocalePrefix = i18nConfig.locales.includes(first as Locale);

  const cleanParts = hasLocalePrefix ? parts.slice(1) : parts;

  if (locale === i18nConfig.defaultLocale) {
    return `/${cleanParts.join("/")}` || "/";
  }

  return `/${[locale, ...cleanParts].join("/")}`;
}

export default function LanguageSwitcher() {
  const router = useRouter();
  const pathname = usePathname();

  const activeLocale = useMemo(() => getCurrentLocale(pathname || "/"), [pathname]);
  const [selectedLocale, setSelectedLocale] = useState<Locale>(activeLocale);

  function changeLanguage(nextLocale: Locale) {
    setSelectedLocale(nextLocale);

    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLocale);
      window.dispatchEvent(
        new CustomEvent("3bigha:language-change", {
          detail: { locale: nextLocale },
        })
      );
    } catch {}

    const nextPath = buildLocalizedPath(pathname || "/", nextLocale);
    router.push(nextPath);
    router.refresh();
  }

  return (
    <div data-no-translate="true" style={{ display: "inline-flex" }}>
      <label
        htmlFor="global-language-select"
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          padding: 0,
          margin: -1,
          overflow: "hidden",
          clip: "rect(0,0,0,0)",
          whiteSpace: "nowrap",
          border: 0,
        }}
      >
        Select Language
      </label>

      <select
        id="global-language-select"
        value={selectedLocale}
        onChange={(e) => changeLanguage(e.target.value as Locale)}
        title="Select Language"
        aria-label="Select Language"
        style={{
          height: 36,
          borderRadius: 999,
          border: "1px solid rgba(15,23,42,0.16)",
          background: "#ffffff",
          color: "#0f172a",
          fontSize: 13,
          fontWeight: 800,
          padding: "0 12px",
          cursor: "pointer",
          maxWidth: 170,
        }}
      >
        {i18nConfig.locales.map((locale) => (
          <option key={locale} value={locale}>
            {locale === activeLocale ? "✓ " : ""}
            {LANGUAGE_LABELS[locale] || locale.toUpperCase()}
          </option>
        ))}
      </select>
    </div>
  );
}