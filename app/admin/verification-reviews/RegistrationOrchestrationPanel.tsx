"use client";

import { useState } from "react";

type Orchestration = {
  completedAt: string;
  summary: {
    documentsProcessed: number;
    documentsNeedingManualReview: number;
    crossChecksCompleted: number;
    crossChecksNeedingManualReview: number;
    overallRecommendedAction: string;
  };
  aiReviewBrief: {
    summary: string;
    overallConfidence: number;
  };
};

export default function RegistrationOrchestrationPanel({
  userId,
  caseId,
}: {
  userId: string;
  caseId: string;
}) {
  const [result, setResult] =
    useState<Orchestration | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function run() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        "/api/admin/registration-review/orchestrate",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ userId, caseId }),
          cache: "no-store",
        }
      );
      const payload = await response.json();

      if (!response.ok || !payload?.ok) {
        throw new Error(
          payload?.error ||
            "Registration orchestration failed."
        );
      }

      setResult(payload.orchestration as Orchestration);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Registration orchestration failed."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <article
      style={{
        padding: 18,
        border: "1px solid #99f6e4",
        borderRadius: 14,
        background: "#f0fdfa",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 14,
          flexWrap: "wrap",
          alignItems: "flex-start",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 950,
              color: "#0f766e",
              textTransform: "uppercase",
              letterSpacing: 0.6,
            }}
          >
            REG-EV-06
          </div>
          <h3 style={{ margin: "5px 0 6px" }}>
            End-to-end registration review
          </h3>
          <p
            style={{
              margin: 0,
              color: "#475569",
              maxWidth: 720,
            }}
          >
            Runs document intelligence,
            cross-verification and the AI review brief
            as one advisory workflow.
          </p>
        </div>

        <button
          type="button"
          onClick={run}
          disabled={loading}
          style={{
            padding: "10px 14px",
            border: "1px solid #0f766e",
            borderRadius: 10,
            background: loading ? "#ccfbf1" : "#0f766e",
            color: loading ? "#115e59" : "white",
            fontWeight: 950,
            cursor: loading ? "wait" : "pointer",
          }}
        >
          {loading
            ? "Running complete review…"
            : result
              ? "Run complete review again"
              : "Run complete review"}
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

      {result ? (
        <div
          style={{
            display: "grid",
            gap: 12,
            marginTop: 16,
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(170px, 1fr))",
              gap: 10,
            }}
          >
            {[
              ["Documents processed", result.summary.documentsProcessed],
              [
                "Document reviews needed",
                result.summary.documentsNeedingManualReview,
              ],
              ["Cross-checks completed", result.summary.crossChecksCompleted],
              [
                "Cross-check reviews needed",
                result.summary.crossChecksNeedingManualReview,
              ],
            ].map(([label, value]) => (
              <div
                key={String(label)}
                style={{
                  padding: 12,
                  border: "1px solid #99f6e4",
                  borderRadius: 10,
                  background: "white",
                }}
              >
                <div
                  style={{
                    color: "#64748b",
                    fontSize: 12,
                    fontWeight: 800,
                  }}
                >
                  {label}
                </div>
                <div
                  style={{
                    marginTop: 4,
                    fontSize: 24,
                    fontWeight: 950,
                  }}
                >
                  {value}
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              padding: 14,
              border: "1px solid #5eead4",
              borderRadius: 12,
              background: "white",
            }}
          >
            <strong>
              Overall advisory action:{" "}
              {result.summary.overallRecommendedAction.replaceAll(
                "_",
                " "
              )}
            </strong>
            <p style={{ margin: "7px 0 0", color: "#334155" }}>
              {result.aiReviewBrief.summary}
            </p>
            <div
              style={{
                marginTop: 7,
                color: "#64748b",
                fontSize: 13,
              }}
            >
              Confidence:{" "}
              {Math.round(
                Number(
                  result.aiReviewBrief.overallConfidence || 0
                )
              )}
              % · Completed:{" "}
              {new Date(result.completedAt).toLocaleString("en-IN")}
            </div>
          </div>

          <div
            style={{
              padding: 12,
              border: "1px solid #99f6e4",
              borderRadius: 10,
              color: "#115e59",
              fontWeight: 800,
            }}
          >
            Advisory only. No registration, approval,
            dashboard, subscription or original evidence
            state was changed.
          </div>
        </div>
      ) : null}
    </article>
  );
}
