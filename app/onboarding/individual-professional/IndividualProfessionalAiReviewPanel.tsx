"use client";

type PhotoAssessment = {
  photo?: string;
  quality?: string;
  skillRelevance?: string;
  visibleSignals?: string[];
  concerns?: string[];
  correctiveGuidance?: string;
};

type Props = {
  checking: boolean;
  status: string;
  confidence: number | null;
  result: Record<string, any> | null;
  decisionStatus: string;
  decisionReason: string;
  canCheck: boolean;
  onCheck: () => void;
};

function statusLabel(status: string) {
  switch (status) {
    case "strong_match":
      return "Strong work match";
    case "likely_match":
      return "Likely work match";
    case "likely_unrelated":
      return "Work evidence does not match clearly";
    case "contractor_risk":
      return "Human classification required";
    case "unclear":
      return "Evidence unclear";
    case "human_review":
      return "Human review required";
    case "failed":
      return "Automated review unavailable";
    default:
      return "Not checked yet";
  }
}

function statusTone(status: string) {
  if (
    status === "strong_match" ||
    status === "likely_match"
  ) {
    return {
      border: "#86efac",
      background: "#f0fdf4",
      color: "#166534",
    };
  }

  if (
    status === "likely_unrelated" ||
    status === "contractor_risk"
  ) {
    return {
      border: "#fca5a5",
      background: "#fef2f2",
      color: "#991b1b",
    };
  }

  return {
    border: "#fdba74",
    background: "#fff7ed",
    color: "#9a3412",
  };
}

export default function IndividualProfessionalAiReviewPanel({
  checking,
  status,
  confidence,
  result,
  decisionStatus,
  decisionReason,
  canCheck,
  onCheck,
}: Props) {
  const tone = statusTone(status);

  const assessments = Array.isArray(
    result?.photoAssessments
  )
    ? (result.photoAssessments as PhotoAssessment[])
    : [];

  return (
    <section style={sectionStyle}>
      <div style={eyebrowStyle}>
        Work-evidence check
      </div>

      <h2 style={headingStyle}>
        Check whether your photos match your skill
      </h2>

      <p style={helperStyle}>
        3Bigha checks the visible work, tools, materials and
        activity in your two live photographs. The result
        assists review but does not itself approve or reject
        your lifetime-free registration.
      </p>

      <button
        type="button"
        onClick={onCheck}
        disabled={checking || !canCheck}
        style={{
          ...buttonStyle,
          opacity: checking || !canCheck ? 0.55 : 1,
        }}
      >
        {checking
          ? "Checking your work evidence…"
          : "Check My Work Evidence"}
      </button>

      <div
        style={{
          padding: 13,
          borderRadius: 12,
          border: `1px solid ${tone.border}`,
          background: tone.background,
          color: tone.color,
        }}
      >
        <strong>{statusLabel(status)}</strong>

        {confidence != null ? (
          <div style={{ marginTop: 5 }}>
            Review confidence:{" "}
            {Math.round(confidence * 100)}%
          </div>
        ) : null}

        {result?.summary ? (
          <div style={{ marginTop: 7 }}>
            {String(result.summary)}
          </div>
        ) : null}
      </div>

      {assessments.length ? (
        <div style={cardsStyle}>
          {assessments.map((assessment, index) => (
            <div
              key={`${assessment.photo || "photo"}-${index}`}
              style={cardStyle}
            >
              <strong>
                {assessment.photo === "work_photo_two"
                  ? "Second work photo"
                  : "First work photo"}
              </strong>

              <div style={smallStyle}>
                Quality:{" "}
                {assessment.quality || "not assessed"}
              </div>

              <div style={smallStyle}>
                Skill relevance:{" "}
                {assessment.skillRelevance ||
                  "not assessed"}
              </div>

              {assessment.visibleSignals?.length ? (
                <div style={smallStyle}>
                  Visible work signals:{" "}
                  {assessment.visibleSignals.join(", ")}
                </div>
              ) : null}

              {assessment.concerns?.length ? (
                <div style={warningStyle}>
                  {assessment.concerns.join(" ")}
                </div>
              ) : null}

              {assessment.correctiveGuidance ? (
                <div style={guidanceStyle}>
                  {assessment.correctiveGuidance}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      <div style={decisionStyle}>
        <strong>
          Lifetime-free decision:{" "}
          {decisionStatus.replaceAll("_", " ")}
        </strong>

        {decisionReason ? (
          <div style={{ marginTop: 5 }}>
            {decisionReason}
          </div>
        ) : null}

        <div style={{ marginTop: 6 }}>
          {"Final approval remains with an authorised human reviewer."}
        </div>
      </div>
    </section>
  );
}

const sectionStyle: React.CSSProperties = {
  display: "grid",
  gap: 12,
  padding: 16,
  border: "1px solid #c7d2fe",
  borderRadius: 16,
  background: "#f8faff",
};

const eyebrowStyle: React.CSSProperties = {
  color: "#4338ca",
  fontWeight: 900,
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: ".07em",
};

const headingStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 18,
};

const helperStyle: React.CSSProperties = {
  margin: 0,
  color: "#475569",
  lineHeight: 1.55,
};

const buttonStyle: React.CSSProperties = {
  padding: "12px 14px",
  border: 0,
  borderRadius: 10,
  background: "#1d4ed8",
  color: "white",
  fontWeight: 900,
  cursor: "pointer",
};

const cardsStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(240px,1fr))",
  gap: 10,
};

const cardStyle: React.CSSProperties = {
  padding: 12,
  border: "1px solid #dbe4ef",
  borderRadius: 12,
  background: "white",
};

const smallStyle: React.CSSProperties = {
  marginTop: 6,
  color: "#475569",
  fontSize: 13,
  lineHeight: 1.45,
};

const warningStyle: React.CSSProperties = {
  marginTop: 8,
  padding: 8,
  borderRadius: 8,
  background: "#fef2f2",
  color: "#991b1b",
  fontSize: 13,
};

const guidanceStyle: React.CSSProperties = {
  marginTop: 8,
  padding: 8,
  borderRadius: 8,
  background: "#eff6ff",
  color: "#1e3a8a",
  fontSize: 13,
};

const decisionStyle: React.CSSProperties = {
  padding: 12,
  border: "1px solid #ddd6fe",
  borderRadius: 11,
  background: "#faf5ff",
  color: "#5b21b6",
  lineHeight: 1.5,
};
