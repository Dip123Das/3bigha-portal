"use client";

import { useState } from "react";

import React from "react";

import { i18nConfig } from "@/lib/i18n/config";

export default function LanguageSwitcher() {
  const [open, setOpen] = useState(false);

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
        Language
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
              style={{
                width: "100%",
                height: 42,
                borderRadius: 10,
                border: "none",
                background: "transparent",
                textAlign: "left",
                padding: "0 12px",
                cursor: "pointer",
                fontWeight: 600,
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