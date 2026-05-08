"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

import { i18nConfig, type Locale } from "@/lib/i18n/config";

const LANGUAGE_STORAGE_KEY = "3bigha_preferred_locale";

const SKIP_TAGS = new Set([
  "SCRIPT",
  "STYLE",
  "NOSCRIPT",
  "TEXTAREA",
  "INPUT",
  "SELECT",
  "OPTION",
  "CODE",
  "PRE",
  "SVG",
  "CANVAS",
]);

function getLocale(pathname: string): Locale {
  const first = pathname.split("/").filter(Boolean)[0];

  if (i18nConfig.locales.includes(first as Locale)) {
    return first as Locale;
  }

  try {
    const saved = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (i18nConfig.locales.includes(saved as Locale)) {
      return saved as Locale;
    }
  } catch {}

  return i18nConfig.defaultLocale as Locale;
}

function shouldTranslateText(text: string) {
  const clean = text.trim();

  if (!clean) return false;
  if (clean.length < 2) return false;
  if (/^[\d\s₹$€£.,:/\-–—()]+$/.test(clean)) return false;
  if (/^[^\p{L}]+$/u.test(clean)) return false;

  return true;
}

function getCacheKey(locale: string, text: string) {
  return `3bigha_translate:${locale}:${text}`;
}

export default function AutoTranslatePage() {
  const pathname = usePathname();

  useEffect(() => {
    const locale = getLocale(pathname || "/");

    if (locale === i18nConfig.defaultLocale) return;

    let cancelled = false;
    let timer: number | null = null;

    async function translatePage() {
      if (cancelled) return;

      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode(node) {
            const parent = node.parentElement;

            if (!parent) return NodeFilter.FILTER_REJECT;
            if (SKIP_TAGS.has(parent.tagName)) return NodeFilter.FILTER_REJECT;
            if (parent.closest("[data-no-translate='true']")) {
              return NodeFilter.FILTER_REJECT;
            }
            if (parent.closest("[data-ai-translated='true']")) {
              return NodeFilter.FILTER_REJECT;
            }

            const text = node.textContent || "";

            if (!shouldTranslateText(text)) {
              return NodeFilter.FILTER_REJECT;
            }

            return NodeFilter.FILTER_ACCEPT;
          },
        }
      );

      const nodes: Text[] = [];
      const texts: string[] = [];
      const seen = new Set<string>();

      while (walker.nextNode()) {
        const node = walker.currentNode as Text;
        const parent = node.parentElement;
        const clean = (node.textContent || "").trim();

        if (!parent || !clean || seen.has(clean)) continue;

        const cached = window.localStorage.getItem(getCacheKey(locale, clean));

        if (cached) {
          node.textContent = (node.textContent || "").replace(clean, cached);
          parent.setAttribute("data-ai-translated", "true");
          continue;
        }

        seen.add(clean);
        nodes.push(node);
        texts.push(clean);

        if (texts.length >= 80) break;
      }

      if (!texts.length) return;

      try {
        const res = await fetch("/api/ai/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            texts,
            targetLocale: locale,
          }),
        });

        const json = await res.json();

        const translatedTexts: string[] = Array.isArray(json?.translatedTexts)
          ? json.translatedTexts
          : [];

        translatedTexts.forEach((translated, index) => {
          const original = texts[index];
          const node = nodes[index];
          const parent = node?.parentElement;

          if (!original || !translated || !node || !parent) return;

          window.localStorage.setItem(getCacheKey(locale, original), translated);

          if (!cancelled) {
            node.textContent = (node.textContent || "").replace(
              original,
              translated
            );
            parent.setAttribute("data-ai-translated", "true");
          }
        });
      } catch {
        // Keep original English fallback.
      }
    }

    timer = window.setTimeout(() => {
      translatePage();
    }, 700);

    return () => {
      cancelled = true;

      if (timer) {
        window.clearTimeout(timer);
      }
    };
  }, [pathname]);

  return null;
}