"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { i18nConfig, type Locale } from "@/lib/i18n/config";

export default function LanguageSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const activeLocale = useMemo<Locale>(() => {
    const first = pathname.split("/").filter(Boolean)[0];

    if (i18nConfig.locales.includes(first as Locale)) {
      return first as Locale;
    }

    return i18nConfig.defaultLocale as Locale;
  }, [pathname]);

  function switchLanguage(locale: Locale) {
    const parts = pathname.split("/").filter(Boolean);
    const first = parts[0];

    const pathWithoutLocale = i18nConfig.locales.includes(first as Locale)
      ? `/${parts.slice(1).join("/")}`
      : pathname;

    const cleanPath =
      pathWithoutLocale === "/" || pathWithoutLocale === ""
        ? ""
        : pathWithoutLocale;

    const nextPath =
      locale === i18nConfig.defaultLocale
        ? cleanPath || "/"
        : `/${locale}${cleanPath}`;

    document.cookie = `3bigha_locale=${locale}; path=/; max-age=${
      60 * 60 * 24 * 365
    }; samesite=lax`;

    setOpen(false);
    router.push(nextPath);
  }

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          height: 40,
          padding: "0 14px",
          borderRadius: 12,
          border: "1px solid rgba(15,23,42,0.12)",
          background: "#fff",
          display: "flex",
          alignItems: "center",
          gap: 8,
          cursor: "pointer",
          fontWeight: 700,
        }}
      >
        <span style={{ fontSize: 18 }}>🌐</span>
        {
          i18nConfig.localeLabels[
            activeLocale as keyof typeof i18nConfig.localeLabels
          ]
        }
      </button>

      {open ? (
        <div
          style={{
            position: "absolute",
            top: 48,
            right: 0,
            width: 240,
            maxHeight: 420,
            overflowY: "auto",
            background: "#fff",
            borderRadius: 16,
            border: "1px solid rgba(15,23,42,0.08)",
            boxShadow: "0 20px 40px rgba(0,0,0,0.12)",
            padding: 10,
            zIndex: 1000,
          }}
        >
          {i18nConfig.locales.map((locale) => (
            <button
              key={locale}
              onClick={() => switchLanguage(locale)}
              style={{
                width: "100%",
                height: 42,
                borderRadius: 10,
                border: "none",
                background:
                  locale === activeLocale ? "rgba(37,99,235,0.08)" : "transparent",
                color: locale === activeLocale ? "#1d4ed8" : "#0f172a",
                textAlign: "left",
                padding: "0 12px",
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              {
                i18nConfig.localeLabels[
                  locale as keyof typeof i18nConfig.localeLabels
                ]
              }
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}