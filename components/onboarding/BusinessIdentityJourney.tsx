"use client";

import { useEffect, useMemo, useState } from "react";

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
  const initialKey = activeKey ?? steps[0]?.key ?? "identity";

  const [selectedKey, setSelectedKey] =
    useState<BusinessIdentityJourneyStep["key"]>(initialKey);

  const selectedIndex = useMemo(
    () => Math.max(0, steps.findIndex((step) => step.key === selectedKey)),
    [steps, selectedKey]
  );

  const selectedStep = steps[selectedIndex] ?? steps[0];

  useEffect(() => {
    if (!activeKey) return;

    /*
     * Parent-controlled navigation must always be honoured.
     *
     * This allows pending-step links, validation guidance and
     * Review & Finish to open sections that are currently hidden
     * by the journey presentation layer.
     */
    setSelectedKey(activeKey);
  }, [activeKey]);

  useEffect(() => {
    if (typeof document === "undefined") return;

    document.documentElement.dataset.businessJourneyStep = selectedKey;

    return () => {
      delete document.documentElement.dataset.businessJourneyStep;
    };
  }, [selectedKey]);

  function openStep(step: BusinessIdentityJourneyStep) {
    setSelectedKey(step.key);
    onStepSelect?.(step);

    window.setTimeout(() => {
      if (typeof document === "undefined") return;

      const target =
        document.getElementById(step.targetId) ??
        document.querySelector("form");

      target?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 30);
  }

  function moveBy(offset: number) {
    const next = steps[selectedIndex + offset];

    if (next) {
      openStep(next);
    }
  }

  return (
    <>
      <style>{`
        html[data-business-journey-step] #sec-nature,
        html[data-business-journey-step] #sec-story,
        html[data-business-journey-step] #sec-identity,
        html[data-business-journey-step] #sec-contact,
        html[data-business-journey-step] #sec-address,
        html[data-business-journey-step] #sec-documents,
        html[data-business-journey-step] #sec-property,
        html[data-business-journey-step] #sec-author {
          display: none !important;
        }

        html[data-business-journey-step="identity"] #sec-nature,
        html[data-business-journey-step="identity"] #sec-identity,
        html[data-business-journey-step="identity"] #sec-documents,
        html[data-business-journey-step="identity"] #sec-contact,
        html[data-business-journey-step="about-you"] #sec-story,
        html[data-business-journey-step="about-business"] #sec-story,
        html[data-business-journey-step="address"] #sec-address,
        html[data-business-journey-step="coverage"] #sec-address,
        html[data-business-journey-step="gallery"] #sec-documents,
        html[data-business-journey-step="documents"] #sec-documents {
          display: block !important;
        }

        html[data-business-journey-step="about-you"] #sec-about-business,
        html[data-business-journey-step="about-business"] #sec-about-you,
        html[data-business-journey-step="address"] #sec-service-area,
        html[data-business-journey-step="gallery"] #sec-legal-proof,
        html[data-business-journey-step="gallery"] #sec-selfie,
        html[data-business-journey-step="documents"] #sec-gallery {
          display: none !important;
        }

        html[data-business-journey-step="review"] form > section,
        html[data-business-journey-step="review"] form > div[id^="sec-"] {
          display: none !important;
        }

        html[data-business-journey-step] form {
          min-height: 220px;
        }

        html[data-business-journey-step] form > section,
        html[data-business-journey-step] form > div[id^="sec-"] {
          animation: businessJourneyReveal .22s ease-out;
        }

        @keyframes businessJourneyReveal {
          from {
            opacity: 0;
            transform: translateY(8px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

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
            const active = step.key === selectedKey;
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

        {selectedStep ? (
          <div
            style={{
              marginTop: 14,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
              borderTop: "1px solid #e2e8f0",
              paddingTop: 13,
            }}
          >
            <div
              style={{
                color: "#475569",
                fontSize: 13,
              }}
            >
              Step {selectedIndex + 1} of {steps.length}:{" "}
              <b>{selectedStep.title}</b>
            </div>

            <div
              style={{
                display: "flex",
                gap: 8,
              }}
            >
              <button
                type="button"
                disabled={selectedIndex === 0}
                onClick={() => moveBy(-1)}
                style={{
                  padding: "9px 13px",
                  borderRadius: 10,
                  border: "1px solid #cbd5e1",
                  background: "#fff",
                  fontWeight: 850,
                  cursor: selectedIndex === 0 ? "not-allowed" : "pointer",
                  opacity: selectedIndex === 0 ? 0.55 : 1,
                }}
              >
                Back
              </button>

              {selectedIndex < steps.length - 1 ? (
                <button
                  type="button"
                  onClick={() => moveBy(1)}
                  style={{
                    padding: "9px 14px",
                    borderRadius: 10,
                    border: "1px solid #2563eb",
                    background: "#2563eb",
                    color: "#fff",
                    fontWeight: 900,
                    cursor: "pointer",
                  }}
                >
                  Save & Continue
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </section>
    </>
  );
}
