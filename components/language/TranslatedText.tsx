"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

import { i18nConfig, type Locale } from "@/lib/i18n/config";

const cache = new Map<string, string>();

function getActiveLocale(pathname: string): Locale {
  const first = pathname.split("/").filter(Boolean)[0];

  if (i18nConfig.locales.includes(first as Locale)) {
    return first as Locale;
  }

  return i18nConfig.defaultLocale as Locale;
}

export default function TranslatedText({ text }: { text: string }) {
  const pathname = usePathname();
  const locale = useMemo(() => getActiveLocale(pathname), [pathname]);
  const [translated, setTranslated] = useState(text);

  useEffect(() => {
    let cancelled = false;

    async function translate() {
      if (!text || locale === i18nConfig.defaultLocale) {
        setTranslated(text);
        return;
      }

      const key = `${locale}:${text}`;

      if (cache.has(key)) {
        setTranslated(cache.get(key) || text);
        return;
      }

      try {
        const res = await fetch("/api/ai/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, targetLocale: locale }),
        });

        const json = await res.json();
        const next = json?.translatedText || text;

        cache.set(key, next);

        if (!cancelled) {
          setTranslated(next);
        }
      } catch {
        if (!cancelled) {
          setTranslated(text);
        }
      }
    }

    translate();

    return () => {
      cancelled = true;
    };
  }, [locale, text]);

  return <>{translated}</>;
}