"use client";

export type BusinessIdentityJourneyStep = {
  key:
    | "identity"
    | "address"
    | "about-you"
    | "about-business"
    | "coverage"
    | "gallery"
    | "documents"
    | "review";
  title: string;
  description: string;
  targetId: string;
  complete?: boolean;
  optional?: boolean;
};

type Props = {
  steps: BusinessIdentityJourneyStep[];
  activeKey?: BusinessIdentityJourneyStep["key"];
  completionScore: number;
  onStepSelect?: (step: BusinessIdentityJourneyStep) => void;
};

function clampScore(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

export default function BusinessIdentityJourney({
  steps,
  activeKey,
  completionScore,
  onStepSelect,
}: Props) {
  const score = clampScore(completionScore);

  function openStep(step: BusinessIdentityJourneyStep) {
    onStepSelect?.(step);

    if (typeof document === "undefined") return;

    document
      .getElementById(step.targetId)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <section
      aria-label="Business identity setup journey"
      style={{
        position: "sticky",
        top: 12,
        zIndex: 20,
        border: "1px solid #dbeafe",
        borderRadius: 20,
        background: "rgba(255,255,255,.97)",
        boxShadow: "0 14px 36px rgba(15,23,42,.08)",
        padding: 16,
        backdropFilter: "blur(12px)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div
            style={{
              color: "#1d4ed8",
              fontSize: 12,
              fontWeight: 900,
              letterSpacing: ".07em",
              textTransform: "uppercase",
            }}
          >
            Human-first setup
          </div>

          <h2
            style={{
              margin: "5px 0 3px",
              fontSize: 20,
              lineHeight: 1.2,
            }}
          >
            Build your trusted business identity
          </h2>

          <p
            style={{
              margin: 0,
              color: "#475569",
              fontSize: 13,
              lineHeight: 1.55,
            }}
          >
            Complete one clear step at a time. AI may help with presentation,
            but you remain in control.
          </p>
        </div>

        <div style={{ minWidth: 180 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 8,
              marginBottom: 7,
              fontSize: 13,
              fontWeight: 800,
            }}
          >
            <span>Profile readiness</span>
            <span>{score}%</span>
          </div>

          <div
            aria-label={`${score}% complete`}
            style={{
              height: 9,
              borderRadius: 999,
              overflow: "hidden",
              background: "#e2e8f0",
            }}
          >
            <div
              style={{
                width: `${score}%`,
                height: "100%",
                borderRadius: 999,
                background: score === 100 ? "#16a34a" : "#2563eb",
                transition: "width .25s ease",
              }}
            />
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: 15,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: 8,
        }}
      >
        {steps.map((step, index) => {
          const active = step.key === activeKey;
          const complete = Boolean(step.complete);

          return (
            <button
              key={step.key}
              type="button"
              onClick={() => openStep(step)}
              aria-current={active ? "step" : undefined}
              style={{
                display: "grid",
                gridTemplateColumns: "34px 1fr",
                gap: 9,
                alignItems: "start",
                width: "100%",
                padding: 10,
                textAlign: "left",
                borderRadius: 13,
                border: active
                  ? "2px solid #2563eb"
                  : complete
                    ? "1px solid #86efac"
                    : "1px solid #e2e8f0",
                background: active
                  ? "#eff6ff"
                  : complete
                    ? "#f0fdf4"
                    : "#fff",
                cursor: "pointer",
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  display: "grid",
                  placeItems: "center",
                  width: 32,
                  height: 32,
                  borderRadius: 999,
                  background: complete
                    ? "#16a34a"
                    : active
                      ? "#2563eb"
                      : "#e2e8f0",
                  color: complete || active ? "#fff" : "#334155",
                  fontWeight: 900,
                  fontSize: 13,
                }}
              >
                {complete ? "✓" : index + 1}
              </span>

              <span>
                <span
                  style={{
                    display: "block",
                    fontWeight: 900,
                    color: "#0f172a",
                  }}
                >
                  {step.title}

                  {step.optional ? (
                    <span
                      style={{
                        marginLeft: 5,
                        color: "#64748b",
                        fontWeight: 700,
                        fontSize: 11,
                      }}
                    >
                      Optional
                    </span>
                  ) : null}
                </span>

                <span
                  style={{
                    display: "block",
                    marginTop: 3,
                    color: "#64748b",
                    fontSize: 11,
                    lineHeight: 1.4,
                  }}
                >
                  {step.description}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
