"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type ReviewDecision =
  | "approved_lifetime_free"
  | "correction_requested"
  | "rejected_misuse"
  | "reclassified_as_business";

type Props = {
  userId: string;
  verificationStatus: string;
  lifetimeFreeDecisionStatus: string;
  approvalFailures: string[];
};

const DECISIONS: Array<{
  value: ReviewDecision;
  label: string;
  description: string;
  tone: "positive" | "warning" | "danger";
}> = [
  {
    value: "approved_lifetime_free",
    label: "Approve Lifetime-Free",
    description:
      "Confirm that this is a genuine self-working individual professional and activate lifetime-free eligibility.",
    tone: "positive",
  },
  {
    value: "correction_requested",
    label: "Request Correction",
    description:
      "Return the application so the member can correct identity information or submit clearer evidence.",
    tone: "warning",
  },
  {
    value: "rejected_misuse",
    label: "Reject Misuse",
    description:
      "Reject deliberate misuse, false evidence or fraudulent registration after human review.",
    tone: "danger",
  },
  {
    value: "reclassified_as_business",
    label: "Reclassify as Business",
    description:
      "Move a contractor, labour supplier, agency or business operator out of the lifetime-free pathway.",
    tone: "danger",
  },
];

function toneStyle(tone: "positive" | "warning" | "danger") {
  if (tone === "positive") {
    return {
      border: "#86efac",
      background: "#f0fdf4",
      color: "#166534",
    };
  }

  if (tone === "warning") {
    return {
      border: "#fdba74",
      background: "#fff7ed",
      color: "#9a3412",
    };
  }

  return {
    border: "#fca5a5",
    background: "#fef2f2",
    color: "#991b1b",
  };
}

export default function IndividualProfessionalReviewActions({
  userId,
  verificationStatus,
  lifetimeFreeDecisionStatus,
  approvalFailures,
}: Props) {
  const router = useRouter();

  const [decision, setDecision] =
    useState<ReviewDecision>("correction_requested");
  const [reason, setReason] = useState("");
  const [reviewerNotes, setReviewerNotes] = useState("");
  const [confirmationAccepted, setConfirmationAccepted] =
    useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [failures, setFailures] = useState<string[]>([]);

  const selectedDecision = DECISIONS.find(
    (item) => item.value === decision
  )!;

  const approvalBlocked =
    decision === "approved_lifetime_free" &&
    approvalFailures.length > 0;

  async function submitDecision() {
    setMessage("");
    setFailures([]);

    if (reason.trim().length < 8) {
      setMessage(
        "Enter a clear decision reason of at least 8 characters."
      );
      return;
    }

    if (!confirmationAccepted) {
      setMessage(
        "Confirm that you personally reviewed the evidence before submitting this decision."
      );
      return;
    }

    if (approvalBlocked) {
      setMessage(
        "Lifetime-free approval is blocked until all mandatory human-verification requirements are complete."
      );
      setFailures(approvalFailures);
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(
        "/api/admin/individual-professional-review",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId,
            decision,
            reason: reason.trim(),
            reviewerNotes: reviewerNotes.trim(),
          }),
        }
      );

      const payload = await response.json();

      if (!response.ok) {
        setFailures(
          Array.isArray(payload?.failures)
            ? payload.failures.map(String)
            : []
        );

        throw new Error(
          payload?.error ||
            "The review decision could not be completed."
        );
      }

      setMessage(
        decision === "approved_lifetime_free"
          ? "Lifetime-free eligibility approved by authorised human review."
          : decision === "correction_requested"
          ? "Correction requested successfully."
          : decision === "reclassified_as_business"
          ? "The applicant has been reclassified as a business."
          : "The registration has been rejected after human review."
      );

      setReason("");
      setReviewerNotes("");
      setConfirmationAccepted(false);

      router.refresh();
    } catch (error: any) {
      setMessage(
        error?.message ||
          "The review decision could not be completed."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section style={sectionStyle}>
      <div style={eyebrowStyle}>
        Authorised human decision
      </div>

      <h2 style={headingStyle}>
        Complete this review
      </h2>

      <p style={helperStyle}>
        AI observations are advisory. You must personally inspect
        the identity information, live selfie and both work
        photographs before making a decision.
      </p>

      <div style={currentStateStyle}>
        <div>
          Current verification:{" "}
          <strong>
            {verificationStatus.replaceAll("_", " ")}
          </strong>
        </div>

        <div>
          Lifetime-free decision:{" "}
          <strong>
            {lifetimeFreeDecisionStatus.replaceAll("_", " ")}
          </strong>
        </div>
      </div>

      <div style={decisionGridStyle}>
        {DECISIONS.map((item) => {
          const active = decision === item.value;
          const tone = toneStyle(item.tone);

          return (
            <label
              key={item.value}
              style={{
                padding: 13,
                border: active
                  ? `2px solid ${tone.border}`
                  : "1px solid #dbe4ef",
                borderRadius: 12,
                background: active
                  ? tone.background
                  : "white",
                color: active ? tone.color : "#0f172a",
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 9,
                }}
              >
                <input
                  type="radio"
                  name="review-decision"
                  value={item.value}
                  checked={active}
                  onChange={() => setDecision(item.value)}
                  style={{ marginTop: 3 }}
                />

                <div>
                  <strong>{item.label}</strong>

                  <div
                    style={{
                      marginTop: 5,
                      fontSize: 13,
                      lineHeight: 1.45,
                    }}
                  >
                    {item.description}
                  </div>
                </div>
              </div>
            </label>
          );
        })}
      </div>

      {approvalBlocked ? (
        <div style={blockedStyle}>
          <strong>
            Lifetime-free approval is currently blocked.
          </strong>

          <ul style={{ marginBottom: 0 }}>
            {approvalFailures.map((failure) => (
              <li key={failure}>{failure}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div
        style={{
          padding: 12,
          border: `1px solid ${
            toneStyle(selectedDecision.tone).border
          }`,
          borderRadius: 11,
          background:
            toneStyle(selectedDecision.tone).background,
          color: toneStyle(selectedDecision.tone).color,
        }}
      >
        <strong>{selectedDecision.label}</strong>
        <div style={{ marginTop: 4 }}>
          {selectedDecision.description}
        </div>
      </div>

      <label style={labelStyle}>
        Decision reason *
        <textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          rows={4}
          placeholder="State the evidence and reason supporting this human decision."
          style={textareaStyle}
        />
      </label>

      <label style={labelStyle}>
        Internal reviewer notes
        <textarea
          value={reviewerNotes}
          onChange={(event) =>
            setReviewerNotes(event.target.value)
          }
          rows={3}
          placeholder="Optional internal notes. These are preserved in the immutable audit history."
          style={textareaStyle}
        />
      </label>

      <label style={confirmationStyle}>
        <input
          type="checkbox"
          checked={confirmationAccepted}
          onChange={(event) =>
            setConfirmationAccepted(event.target.checked)
          }
          style={{ marginTop: 3 }}
        />

        <span>
          I confirm that I personally reviewed the available
          identity information, live selfie, work photographs,
          declared skill, contractor-risk indicators and AI
          observations. This is my authorised human decision.
        </span>
      </label>

      {message ? (
        <div role="status" style={messageStyle}>
          {message}
        </div>
      ) : null}

      {failures.length ? (
        <div style={blockedStyle}>
          <strong>Decision requirements:</strong>
          <ul style={{ marginBottom: 0 }}>
            {failures.map((failure) => (
              <li key={failure}>{failure}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <button
        type="button"
        onClick={submitDecision}
        disabled={
          submitting ||
          !confirmationAccepted ||
          approvalBlocked
        }
        style={{
          ...submitStyle,
          opacity:
            submitting ||
            !confirmationAccepted ||
            approvalBlocked
              ? 0.55
              : 1,
        }}
      >
        {submitting
          ? "Recording human decision…"
          : `Submit: ${selectedDecision.label}`}
      </button>
    </section>
  );
}

const sectionStyle: React.CSSProperties = {
  display: "grid",
  gap: 14,
  padding: 18,
  border: "1px solid #c7d2fe",
  borderRadius: 16,
  background: "#f8faff",
};

const eyebrowStyle: React.CSSProperties = {
  color: "#4338ca",
  fontWeight: 900,
  fontSize: 11,
  letterSpacing: ".07em",
  textTransform: "uppercase",
};

const headingStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 21,
};

const helperStyle: React.CSSProperties = {
  margin: 0,
  color: "#475569",
  lineHeight: 1.55,
};

const currentStateStyle: React.CSSProperties = {
  display: "grid",
  gap: 5,
  padding: 12,
  border: "1px solid #dbe4ef",
  borderRadius: 11,
  background: "white",
};

const decisionGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(230px,1fr))",
  gap: 10,
};

const labelStyle: React.CSSProperties = {
  display: "grid",
  gap: 6,
  fontWeight: 800,
};

const textareaStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  resize: "vertical",
  padding: 11,
  border: "1px solid #cbd5e1",
  borderRadius: 10,
  background: "white",
  font: "inherit",
};

const confirmationStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: 10,
  padding: 13,
  border: "1px solid #bfdbfe",
  borderRadius: 11,
  background: "white",
  lineHeight: 1.5,
  fontWeight: 700,
};

const blockedStyle: React.CSSProperties = {
  padding: 12,
  border: "1px solid #fca5a5",
  borderRadius: 11,
  background: "#fef2f2",
  color: "#991b1b",
  lineHeight: 1.5,
};

const messageStyle: React.CSSProperties = {
  padding: 12,
  border: "1px solid #cbd5e1",
  borderRadius: 11,
  background: "white",
  color: "#334155",
  fontWeight: 800,
};

const submitStyle: React.CSSProperties = {
  padding: "13px 16px",
  border: 0,
  borderRadius: 11,
  background: "#1d4ed8",
  color: "white",
  fontWeight: 900,
  cursor: "pointer",
};
