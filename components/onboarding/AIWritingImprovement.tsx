"use client";

import { useMemo, useState } from "react";

type WritingTarget =
  | "about_person"
  | "about_business"
  | "author_bio";

type WritingTone =
  | "simple"
  | "professional"
  | "friendly"
  | "trust_building"
  | "short"
  | "detailed";

type WritingLanguage =
  | "English"
  | "Bengali"
  | "Hindi";

type AIWritingImprovementProps = {
  target: WritingTarget;
  value: string;
  onChange: (value: string) => void;
  title: string;
  helpText: string;
  placeholder: string;
  disabled?: boolean;
};

const TONES: Array<{
  value: WritingTone;
  label: string;
}> = [
  { value: "simple", label: "Simple" },
  { value: "professional", label: "Professional" },
  { value: "friendly", label: "Friendly" },
  { value: "trust_building", label: "Trust-building" },
  { value: "short", label: "Short" },
  { value: "detailed", label: "Detailed" },
];

export default function AIWritingImprovement({
  target,
  value,
  onChange,
  title,
  helpText,
  placeholder,
  disabled = false,
}: AIWritingImprovementProps) {
  const [tone, setTone] =
    useState<WritingTone>("professional");

  const [language, setLanguage] =
    useState<WritingLanguage>("English");

  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState("");
  const [error, setError] = useState<string | null>(null);

  const canImprove = useMemo(
    () =>
      value.trim().length >= 3 &&
      !loading &&
      !disabled,
    [value, loading, disabled]
  );

  async function improveWriting() {
    if (!canImprove) return;

    setLoading(true);
    setSuggestion("");
    setError(null);

    try {
      const response = await fetch(
        "/api/ai/profile-writing-improvement",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          cache: "no-store",
          body: JSON.stringify({
            target,
            sourceText: value,
            tone,
            language,
          }),
        }
      );

      const payload = await response
        .json()
        .catch(() => null);

      if (
        !response.ok ||
        payload?.ok !== true ||
        typeof payload?.improvedText !== "string"
      ) {
        throw new Error(
          payload?.error ||
            "AI writing assistance is temporarily unavailable."
        );
      }

      setSuggestion(payload.improvedText.trim());
    } catch (cause: unknown) {
      setError(
        cause instanceof Error
          ? cause.message
          : "AI writing assistance is temporarily unavailable."
      );
    } finally {
      setLoading(false);
    }
  }

  function useSuggestion() {
    const approvedText = suggestion.trim();

    if (!approvedText) return;

    onChange(approvedText);
    setSuggestion("");
    setError(null);
  }

  function discardSuggestion() {
    setSuggestion("");
    setError(null);
  }

  return (
    <section
      style={{
        display: "grid",
        gap: 12,
        padding: 16,
        border: "1px solid #dbeafe",
        borderRadius: 16,
        background: "#ffffff",
      }}
    >
      <div>
        <div
          style={{
            fontSize: 17,
            fontWeight: 900,
            color: "#0f172a",
          }}
        >
          {title}
        </div>

        <div
          style={{
            marginTop: 4,
            color: "#475569",
            lineHeight: 1.55,
            fontSize: 13,
          }}
        >
          {helpText}
        </div>
      </div>

      <textarea
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        placeholder={placeholder}
        rows={6}
        disabled={disabled}
        style={{
          width: "100%",
          resize: "vertical",
          minHeight: 132,
          padding: 12,
          borderRadius: 12,
          border: "1px solid #cbd5e1",
          outline: "none",
          font: "inherit",
          lineHeight: 1.6,
          background: disabled
            ? "#f8fafc"
            : "#ffffff",
        }}
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 10,
        }}
      >
        <label
          style={{
            display: "grid",
            gap: 5,
            fontSize: 13,
            fontWeight: 800,
          }}
        >
          Writing style

          <select
            value={tone}
            onChange={(event) =>
              setTone(
                event.target.value as WritingTone
              )
            }
            disabled={disabled || loading}
            style={{
              padding: 10,
              borderRadius: 10,
              border: "1px solid #cbd5e1",
              background: "#ffffff",
            }}
          >
            {TONES.map((item) => (
              <option
                key={item.value}
                value={item.value}
              >
                {item.label}
              </option>
            ))}
          </select>
        </label>

        <label
          style={{
            display: "grid",
            gap: 5,
            fontSize: 13,
            fontWeight: 800,
          }}
        >
          Final language

          <select
            value={language}
            onChange={(event) =>
              setLanguage(
                event.target.value as WritingLanguage
              )
            }
            disabled={disabled || loading}
            style={{
              padding: 10,
              borderRadius: 10,
              border: "1px solid #cbd5e1",
              background: "#ffffff",
            }}
          >
            <option value="English">English</option>
            <option value="Bengali">Bengali</option>
            <option value="Hindi">Hindi</option>
          </select>
        </label>
      </div>

      <div
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <button
          type="button"
          onClick={improveWriting}
          disabled={!canImprove}
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid #1d4ed8",
            background: canImprove
              ? "#1d4ed8"
              : "#cbd5e1",
            color: "#ffffff",
            fontWeight: 900,
            cursor: canImprove
              ? "pointer"
              : "not-allowed",
          }}
        >
          {loading
            ? "Improving your writing…"
            : "✨ Improve with AI"}
        </button>

        <span
          style={{
            fontSize: 12,
            color: "#64748b",
            lineHeight: 1.5,
          }}
        >
          AI improves only the facts you provide.
          Nothing is used without your approval.
        </span>
      </div>

      {error ? (
        <div
          style={{
            padding: 10,
            borderRadius: 10,
            background: "#fff1f2",
            border: "1px solid #fecdd3",
            color: "#9f1239",
            fontWeight: 700,
          }}
        >
          {error}
        </div>
      ) : null}

      {suggestion ? (
        <div
          style={{
            display: "grid",
            gap: 10,
            padding: 14,
            borderRadius: 14,
            background: "#f0fdf4",
            border: "1px solid #bbf7d0",
          }}
        >
          <div
            style={{
              fontWeight: 900,
              color: "#166534",
            }}
          >
            AI-prepared version — please review
            before using
          </div>

          <div
            style={{
              whiteSpace: "pre-wrap",
              lineHeight: 1.65,
              color: "#14532d",
            }}
          >
            {suggestion}
          </div>

          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              onClick={useSuggestion}
              style={{
                padding: "9px 12px",
                borderRadius: 9,
                border: "1px solid #15803d",
                background: "#15803d",
                color: "#ffffff",
                fontWeight: 900,
              }}
            >
              Use this version
            </button>

            <button
              type="button"
              onClick={discardSuggestion}
              style={{
                padding: "9px 12px",
                borderRadius: 9,
                border: "1px solid #94a3b8",
                background: "#ffffff",
                fontWeight: 800,
              }}
            >
              Discard
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}