"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

import { i18nConfig, type Locale } from "@/lib/i18n/config";

const LANGUAGE_STORAGE_KEY = "3bigha_preferred_locale";
const BATCH_SIZE = 80;
const SKIP_TAGS = new Set([
  "SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "INPUT", "SELECT", "OPTION",
  "CODE", "PRE", "SVG", "CANVAS",
]);

function getLocale(pathname: string): Locale {
  const first = pathname.split("/").filter(Boolean)[0];
  if (i18nConfig.locales.includes(first as Locale)) return first as Locale;

  try {
    const saved = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (i18nConfig.locales.includes(saved as Locale)) return saved as Locale;
  } catch {}

  return i18nConfig.defaultLocale as Locale;
}

function shouldTranslateText(text: string) {
  const clean = text.trim();
  if (!clean || clean.length < 2) return false;
  if (/^[\d\s₹$€£.,:/\-–—()]+$/.test(clean)) return false;
  return /\p{L}/u.test(clean);
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
    let timer: number | undefined;
    let scanning = false;
    let scanAgain = false;
    const attempted = new WeakSet<Text>();

    function scheduleScan(delay = 0) {
      if (cancelled) return;
      if (timer !== undefined) window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        timer = undefined;
        void translatePendingText();
      }, delay);
    }

    async function translatePendingText() {
      if (cancelled) return;
      if (scanning) {
        scanAgain = true;
        return;
      }

      scanning = true;
      try {
        do {
          scanAgain = false;
          const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
            acceptNode(node) {
              const parent = node.parentElement;
              if (!parent || SKIP_TAGS.has(parent.tagName)) return NodeFilter.FILTER_REJECT;
              if (parent.closest("[data-no-translate='true']")) return NodeFilter.FILTER_REJECT;
              return shouldTranslateText(node.textContent || "")
                ? NodeFilter.FILTER_ACCEPT
                : NodeFilter.FILTER_REJECT;
            },
          });

          const byText = new Map<string, Text[]>();
          while (walker.nextNode()) {
            const node = walker.currentNode as Text;
            if (attempted.has(node)) continue;
            const clean = (node.textContent || "").trim();
            if (!clean) continue;

            let cached: string | null = null;
            try {
              cached = window.localStorage.getItem(getCacheKey(locale, clean));
            } catch {}

            if (cached && cached !== clean) {
              node.textContent = (node.textContent || "").replace(clean, cached);
              attempted.add(node);
              continue;
            }
            if (cached === clean) {
              try { window.localStorage.removeItem(getCacheKey(locale, clean)); } catch {}
            }

            const matches = byText.get(clean) || [];
            matches.push(node);
            byText.set(clean, matches);
          }

          const batch = Array.from(byText.entries()).slice(0, BATCH_SIZE);
          if (!batch.length) continue;
          const texts = batch.map(([text]) => text);
          const nodes = batch.map(([, matches]) => matches);
          nodes.flat().forEach((node) => attempted.add(node));

          try {
            const response = await fetch("/api/ai/translate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ texts, targetLocale: locale }),
            });
            const json = await response.json();
            if (!response.ok || json?.ok !== true || !Array.isArray(json.translatedTexts) || json.translatedTexts.length !== texts.length) {
              throw new Error("Translation service unavailable");
            }
            window.dispatchEvent(new CustomEvent("3bigha:translation-ready", { detail: { locale } }));

            json.translatedTexts.forEach((value: unknown, index: number) => {
              const translated = typeof value === "string" ? value.trim() : "";
              const original = texts[index];
              if (!translated || translated === original) return;

              try { window.localStorage.setItem(getCacheKey(locale, original), translated); } catch {}
              nodes[index].forEach((node) => {
                if (cancelled) return;
                const current = node.textContent || "";
                if (current.trim() === original) node.textContent = current.replace(original, translated);
              });
            });
          } catch {
            window.dispatchEvent(new CustomEvent("3bigha:translation-error", { detail: { locale } }));
            // Leave the source text visible. Never cache an English fallback as a translation.
          }

          if (byText.size > batch.length) scanAgain = true;
        } while (scanAgain && !cancelled);
      } finally {
        scanning = false;
        if (scanAgain && !cancelled) scheduleScan();
      }
    }

    const observer = new MutationObserver(() => scheduleScan(120));
    observer.observe(document.body, { childList: true, characterData: true, subtree: true });
    scheduleScan(500);

    return () => {
      cancelled = true;
      if (timer !== undefined) window.clearTimeout(timer);
      observer.disconnect();
    };
  }, [pathname]);

  return null;
}
