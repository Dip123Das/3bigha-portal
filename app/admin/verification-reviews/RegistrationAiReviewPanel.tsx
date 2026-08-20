"use client";

import { useState } from "react";

type RecommendedAction =
  | "APPROVE"
  | "REQUEST_CORRECTION"
  | "MANUAL_REVIEW";

type AiBrief = {
  version: string;
  advisoryOnly: true;
  source:
    | "openai_assisted"
    | "deterministic_fallback";
  summary: string;
  overallConfidence: number;
  recommendedAction: RecommendedAction;
  positiveSignals: string[];
  concerns: string[];
  missingEvidence: string[];
  anomalies: string[];
  reviewFocus: string[];
  explanation: string;
  generatedAt: string;
  model: string | null;
  humanAuthorityNotice: string;
};

type Props = {
  userId: string;
  caseId: string;
};

function actionPresentation(
  action: RecommendedAction
) {
  if (action === "APPROVE") {
    return {
      label: "Consider approval",
      border: "#86efac",
      background: "#f0fdf4",
      color: "#166534",
    };
  }

  if (action === "REQUEST_CORRECTION") {
    return {
      label: "Consider requesting correction",
      border: "#fde68a",
      background: "#fffbeb",
      color: "#92400e",
    };
  }

  return {
    label: "Continue manual review",
    border: "#bfdbfe",
    background: "#eff6ff",
    color: "#1d4ed8",
  };
}

function FindingsList({
  title,
  items,
  emptyText,
}: {
  title: string;
  items: string[];
  emptyText: string;
}) {
  return (
    <div
      style={{
        padding: 14,
        border: "1px solid #e2e8f0",
        borderRadius: 12,
        background: "white",
      }}
    >
      <strong>{title}</strong>

      {items.length ? (
        <ul
          style={{
            marginBottom: 0,
            paddingLeft: 20,
            color: "#334155",
          }}
        >
          {items.map((item, index) => (
            <li key={`${title}-${index}`}>
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <div
          style={{
            marginTop: 8,
            color: "#64748b",
          }}
        >
          {emptyText}
        </div>
      )}
    </div>
  );
}

export default function RegistrationAiReviewPanel({
  userId,
  caseId,
}: Props) {
  const [brief, setBrief] =
    useState<AiBrief | null>(null);
  const [loading, setLoading] =
    useState(false);
  const [error, setError] =
    useState("");

  async function generateBrief() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        "/api/admin/registration-review/ai-brief",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            userId,
            caseId,
          }),
          cache: "no-store",
        }
      );

      const payload = await response.json();

      if (!response.ok || !payload?.ok) {
        throw new Error(
          payload?.error ||
            "The AI review brief could not be generated."
        );
      }

      setBrief(payload.brief as AiBrief);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "The AI review brief could not be generated."
      );
    } finally {
      setLoading(false);
    }
  }

  const action = brief
    ? actionPresentation(
        brief.recommendedAction
      )
    : null;

  return (
    <article
      style={{
        padding: 18,
        border: "1px solid #c4b5fd",
        borderRadius: 14,
        background:
          "linear-gradient(135deg, #faf5ff 0%, #eef2ff 100%)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 14,
          alignItems: "flex-start",
          flexWrap: "wrap",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 950,
              color: "#6d28d9",
              letterSpacing: 0.6,
              textTransform: "uppercase",
            }}
          >
            REG-EV-04B
          </div>

          <h3
            style={{
              margin: "5px 0 6px",
            }}
          >
            AI-assisted registration review
          </h3>

          <p
            style={{
              margin: 0,
              maxWidth: 720,
              color: "#475569",
            }}
          >
            Generate an explainable advisory
            brief from the existing trust,
            document and capture facts. The AI
            cannot approve, reject or alter this
            registration.
          </p>
        </div>

        <button
          type="button"
          onClick={generateBrief}
          disabled={loading}
          style={{
            padding: "10px 14px",
            border: "1px solid #7c3aed",
            borderRadius: 10,
            background: loading
              ? "#ddd6fe"
              : "#7c3aed",
            color: loading
              ? "#5b21b6"
              : "white",
            fontWeight: 950,
            cursor: loading
              ? "wait"
              : "pointer",
          }}
        >
          {loading
            ? "Analysing registration…"
            : brief
              ? "Refresh AI brief"
              : "Generate AI brief"}
        </button>
      </div>

      {error ? (
        <div
          role="alert"
          style={{
            marginTop: 14,
            padding: 12,
            border: "1px solid #fca5a5",
            borderRadius: 10,
            background: "#fef2f2",
            color: "#991b1b",
            fontWeight: 800,
          }}
        >
          {error}
        </div>
      ) : null}

      {!brief && !error ? (
        <div
          style={{
            marginTop: 14,
            padding: 14,
            border:
              "1px dashed #c4b5fd",
            borderRadius: 12,
            background:
              "rgba(255,255,255,0.7)",
            color: "#5b21b6",
          }}
        >
          No AI analysis has been generated
          for this review session.
        </div>
      ) : null}

      {brief && action ? (
        <div
          style={{
            marginTop: 16,
            display: "grid",
            gap: 14,
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "minmax(0, 1fr) auto",
              gap: 14,
              alignItems: "start",
              padding: 15,
              border:
                `1px solid ${action.border}`,
              borderRadius: 12,
              background: action.background,
            }}
          >
            <div>
              <strong
                style={{
                  color: action.color,
                }}
              >
                {action.label}
              </strong>

              <p
                style={{
                  margin: "7px 0 0",
                  color: "#334155",
                }}
              >
                {brief.summary}
              </p>
            </div>

            <div
              style={{
                minWidth: 90,
                textAlign: "right",
              }}
            >
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 950,
                  color: action.color,
                }}
              >
                {Math.round(
                  Number(
                    brief.overallConfidence ||
                      0
                  )
                )}
                %
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "#64748b",
                }}
              >
                AI confidence
              </div>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 12,
            }}
          >
            <FindingsList
              title="Positive signals"
              items={
                brief.positiveSignals || []
              }
              emptyText="No strong positive signal was identified."
            />

            <FindingsList
              title="Concerns"
              items={brief.concerns || []}
              emptyText="No specific concern was identified."
            />

            <FindingsList
              title="Missing evidence"
              items={
                brief.missingEvidence || []
              }
              emptyText="No required evidence appears to be missing."
            />

            <FindingsList
              title="Anomalies"
              items={brief.anomalies || []}
              emptyText="No anomaly was detected from the available facts."
            />

            <FindingsList
              title="Reviewer focus"
              items={brief.reviewFocus || []}
              emptyText="Complete the normal visual evidence review."
            />
          </div>

          <div
            style={{
              padding: 14,
              border:
                "1px solid #ddd6fe",
              borderRadius: 12,
              background: "white",
              color: "#334155",
            }}
          >
            <strong>Why this was suggested</strong>
            <p
              style={{
                margin: "7px 0 0",
              }}
            >
              {brief.explanation}
            </p>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent:
                "space-between",
              gap: 10,
              flexWrap: "wrap",
              fontSize: 12,
              color: "#64748b",
            }}
          >
            <span>
              Source:{" "}
              {brief.source ===
              "openai_assisted"
                ? `OpenAI-assisted${
                    brief.model
                      ? ` (${brief.model})`
                      : ""
                  }`
                : "Deterministic fallback"}
            </span>

            <span>
              Generated:{" "}
              {new Date(
                brief.generatedAt
              ).toLocaleString("en-IN")}
            </span>
          </div>

          <div
            style={{
              padding: 12,
              border:
                "1px solid #c4b5fd",
              borderRadius: 10,
              background: "#f5f3ff",
              color: "#5b21b6",
              fontWeight: 800,
            }}
          >
            {brief.humanAuthorityNotice}
          </div>
        </div>
      ) : null}
    </article>
  );
}
