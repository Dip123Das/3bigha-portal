"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

type ProfileRow = {
  full_name?: string | null;
  role?: string | null;
  onboarding_completed?: boolean | null;
  registration_verification_status?: string | null;
  registration_verification_score?: number | null;
  registration_verified_at?: string | null;
  dashboard_activation_status?: string | null;
  admin_review_reason?: string | null;
};

type CaseRow = {
  id: string;
  status?: string | null;
  confidence?: number | null;
  created_at?: string | null;
};

type EventRow = {
  id: string;
  event_type?: string | null;
  previous_status?: string | null;
  next_status?: string | null;
  score?: number | null;
  decision_source?: string | null;
  created_at?: string | null;
};

type BusinessEvidenceRow = {
  selfie_capture_status?: string | null;
  workplace_evidence_status?: string | null;
  selfie_media_json?: unknown;
  workplace_media_json?: unknown;
  automated_verification_json?: unknown;
};

function clean(value: unknown) {
  return String(value || "").trim();
}

function titleCase(value: unknown) {
  return clean(value)
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}

function displayDate(value: unknown) {
  const date = new Date(clean(value));

  if (!Number.isFinite(date.getTime())) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function mediaCount(value: unknown) {
  if (Array.isArray(value)) {
    return value.length;
  }

  if (value && typeof value === "object") {
    return Object.keys(value as Record<string, unknown>).length
      ? 1
      : 0;
  }

  return 0;
}

function evidenceTone(status: string) {
  if (["verified", "captured", "submitted", "not_required"].includes(status)) {
    return {
      border: "#bbf7d0",
      background: "#f0fdf4",
      color: "#166534",
    };
  }

  if (["correction_required", "missing"].includes(status)) {
    return {
      border: "#fde68a",
      background: "#fffbeb",
      color: "#92400e",
    };
  }

  return {
    border: "#cbd5e1",
    background: "#f8fafc",
    color: "#475569",
  };
}

function publicEventTitle(event: EventRow) {
  const type = clean(event.event_type);

  if (type.includes("correction")) {
    return "Correction requested";
  }

  if (type.includes("admin") && type.includes("verified")) {
    return "Registration verified by administrator";
  }

  if (type.includes("auto") && type.includes("verified")) {
    return "Registration verified";
  }

  if (type.includes("review")) {
    return "Registration moved to human review";
  }

  if (type.includes("evidence")) {
    return "Registration evidence updated";
  }

  if (type.includes("restricted")) {
    return "Registration access restricted";
  }

  return titleCase(event.next_status || event.event_type || "Registration updated");
}

function publicEventDetail(event: EventRow) {
  const next = clean(event.next_status);

  switch (next) {
    case "draft":
      return "Your registration draft was saved.";
    case "evidence_incomplete":
      return "More registration evidence is required.";
    case "automated_verification_pending":
      return "Your submitted evidence entered verification.";
    case "admin_review_required":
      return "A human administrator will review your registration.";
    case "correction_required":
      return "A correction is required before verification can continue.";
    case "auto_verified":
    case "admin_verified":
      return "Your registration was verified successfully.";
    case "restricted":
      return "Your registration requires administrator attention.";
    default:
      return "Your registration status was updated.";
  }
}

function resolveProgress(status: string) {
  switch (status) {
    case "draft":
      return 20;
    case "evidence_incomplete":
      return 35;
    case "automated_verification_pending":
      return 55;
    case "admin_review_required":
      return 70;
    case "correction_required":
      return 65;
    case "auto_verified":
    case "admin_verified":
      return 100;
    case "restricted":
      return 100;
    default:
      return 15;
  }
}

function resolveStatusCopy(status: string) {
  switch (status) {
    case "draft":
      return {
        title: "Complete your registration",
        message:
          "Your registration has started, but some required information is still missing.",
        actionLabel: "Continue registration",
        actionHref:
          "/onboarding/business?returnTo=%2Fdashboard%2Fregistration&registration=1",
      };
    case "evidence_incomplete":
      return {
        title: "Evidence is incomplete",
        message:
          "Please review your submitted information and add the remaining required evidence.",
        actionLabel: "Complete evidence",
        actionHref:
          "/onboarding/business?returnTo=%2Fdashboard%2Fregistration&registration=1",
      };
    case "automated_verification_pending":
      return {
        title: "Verification is in progress",
        message:
          "Your evidence has been received and is being checked. No action is required right now.",
        actionLabel: "Review submitted information",
        actionHref:
          "/onboarding/business?returnTo=%2Fdashboard%2Fregistration&registration=1",
      };
    case "admin_review_required":
      return {
        title: "Human review is in progress",
        message:
          "Your registration is with the verification team for a final human review.",
        actionLabel: "Contact support",
        actionHref: "/support/new",
      };
    case "correction_required":
      return {
        title: "A correction is required",
        message:
          "Review the correction request and update only the information that needs attention.",
        actionLabel: "Review correction",
        actionHref:
          "/onboarding/business?returnTo=%2Fdashboard%2Fregistration&registration=1",
      };
    case "auto_verified":
    case "admin_verified":
      return {
        title: "Registration verified",
        message:
          "Your registration has been verified successfully. Your verified status remains separate from paid Growth Plans.",
        actionLabel: "Open workspace",
        actionHref: "/dashboard/workspace",
      };
    case "restricted":
      return {
        title: "Registration access is restricted",
        message:
          "Your registration requires administrator attention before normal access can continue.",
        actionLabel: "Contact support",
        actionHref: "/support/new",
      };
    default:
      return {
        title: "Registration status",
        message:
          "Your registration information is available here.",
        actionLabel: "Review registration",
        actionHref:
          "/onboarding/business?returnTo=%2Fdashboard%2Fregistration&registration=1",
      };
  }
}

export default function RegistrationCentrePage() {
  const router = useRouter();
  const supabase = useMemo(
    () => getSupabaseBrowser(),
    []
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [profile, setProfile] =
    useState<ProfileRow | null>(null);
  const [currentCase, setCurrentCase] =
    useState<CaseRow | null>(null);
  const [events, setEvents] =
    useState<EventRow[]>([]);
  const [businessEvidence, setBusinessEvidence] =
    useState<BusinessEvidenceRow | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          throw userError;
        }

        if (!user) {
          router.replace(
            "/login?next=/dashboard/registration"
          );
          return;
        }

        const [
          profileRes,
          caseRes,
          eventsRes,
          evidenceRes,
        ] = await Promise.all([
            supabase
              .from("profiles")
              .select(
                [
                  "full_name",
                  "role",
                  "onboarding_completed",
                  "registration_verification_status",
                  "registration_verification_score",
                  "registration_verified_at",
                  "dashboard_activation_status",
                  "admin_review_reason",
                ].join(",")
              )
              .eq("id", user.id)
              .maybeSingle(),
            supabase
              .from(
                "registration_verification_cases"
              )
              .select(
                "id,status,confidence,created_at"
              )
              .eq("user_id", user.id)
              .order("created_at", {
                ascending: false,
              })
              .limit(1)
              .maybeSingle(),
            supabase
              .from(
                "registration_verification_events"
              )
              .select(
                "id,event_type,previous_status,next_status,score,decision_source,created_at"
              )
              .eq("user_id", user.id)
              .order("created_at", {
                ascending: false,
              })
              .limit(50),
            supabase
              .from("business_profiles")
              .select(
                [
                  "selfie_capture_status",
                  "workplace_evidence_status",
                  "selfie_media_json",
                  "workplace_media_json",
                  "automated_verification_json",
                ].join(",")
              )
              .eq("user_id", user.id)
              .maybeSingle(),
          ]);

        if (profileRes.error) {
          throw profileRes.error;
        }

        if (caseRes.error) {
          throw caseRes.error;
        }

        if (eventsRes.error) {
          throw eventsRes.error;
        }

        if (evidenceRes.error) {
          throw evidenceRes.error;
        }

        if (!active) {
          return;
        }

        setProfile(
          (profileRes.data || null) as ProfileRow | null
        );
        setCurrentCase(
          (caseRes.data || null) as CaseRow | null
        );
        setEvents(
          (eventsRes.data || []) as EventRow[]
        );
        setBusinessEvidence(
          (evidenceRes.data || null) as BusinessEvidenceRow | null
        );
      } catch (cause) {
        if (!active) {
          return;
        }

        setError(
          cause instanceof Error
            ? cause.message
            : "Registration information could not be loaded."
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [router, supabase]);

  const status = clean(
    profile?.registration_verification_status ||
      currentCase?.status ||
      "draft"
  );
  const statusCopy = resolveStatusCopy(status);
  const progress = resolveProgress(status);
  const correctionReason = clean(
    profile?.admin_review_reason
  );

  if (loading) {
    return (
      <main style={{ padding: 24 }}>
        <p>Loading registration centre…</p>
      </main>
    );
  }

  if (error) {
    return (
      <main style={{ padding: 24 }}>
        <h1>Registration Centre</h1>
        <div
          role="alert"
          style={{
            marginTop: 14,
            padding: 14,
            border: "1px solid #fecaca",
            borderRadius: 12,
            background: "#fef2f2",
            color: "#991b1b",
          }}
        >
          {error}
        </div>
      </main>
    );
  }

  return (
    <main
      style={{
        width: "100%",
        padding: 24,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
          alignItems: "flex-start",
        }}
      >
        <div>
          <div
            style={{
              color: "#0f766e",
              fontWeight: 950,
              fontSize: 12,
              letterSpacing: 0.6,
            }}
          >
            REG-OPS-04A
          </div>
          <h1
            style={{
              margin: "5px 0 6px",
            }}
          >
            Registration Centre
          </h1>
          <p
            style={{
              margin: 0,
              color: "#475569",
              maxWidth: 760,
            }}
          >
            Track your registration, understand the
            next step, and review the official history
            recorded for your account.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <Link href="/dashboard/workspace">
            Essential Workspace
          </Link>
          <Link href="/support/new">
            Get help
          </Link>
        </div>
      </div>

      <section
        style={{
          marginTop: 20,
          padding: 18,
          border: "1px solid #cbd5e1",
          borderRadius: 16,
          background: "white",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div
              style={{
                color: "#64748b",
                fontSize: 12,
                fontWeight: 850,
                textTransform: "uppercase",
              }}
            >
              Current status
            </div>
            <h2
              style={{
                margin: "6px 0",
              }}
            >
              {statusCopy.title}
            </h2>
            <p
              style={{
                margin: 0,
                color: "#475569",
                maxWidth: 760,
              }}
            >
              {statusCopy.message}
            </p>
          </div>

          <Link
            href={statusCopy.actionHref}
            style={{
              alignSelf: "flex-start",
              padding: "10px 14px",
              borderRadius: 10,
              background: "#0f766e",
              color: "white",
              textDecoration: "none",
              fontWeight: 900,
            }}
          >
            {statusCopy.actionLabel}
          </Link>
        </div>

        <div
          style={{
            marginTop: 18,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 10,
              marginBottom: 7,
              color: "#475569",
              fontSize: 13,
            }}
          >
            <span>
              {titleCase(status)}
            </span>
            <strong>{progress}%</strong>
          </div>

          <div
            style={{
              height: 10,
              borderRadius: 999,
              background: "#e2e8f0",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${progress}%`,
                height: "100%",
                background: "#0f766e",
                borderRadius: 999,
              }}
            />
          </div>
        </div>

        <div
          style={{
            marginTop: 18,
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 10,
          }}
        >
          {[
            [
              "Verification score",
              `${Number(
                profile?.registration_verification_score ||
                  currentCase?.confidence ||
                  0
              )}%`,
            ],
            [
              "Dashboard",
              titleCase(
                profile?.dashboard_activation_status ||
                  "not ready"
              ),
            ],
            [
              "Submitted",
              displayDate(currentCase?.created_at),
            ],
            [
              "Verified",
              displayDate(
                profile?.registration_verified_at
              ),
            ],
          ].map(([label, value]) => (
            <div
              key={label}
              style={{
                padding: 12,
                border: "1px solid #e2e8f0",
                borderRadius: 10,
                background: "#f8fafc",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  color: "#64748b",
                  fontWeight: 800,
                }}
              >
                {label}
              </div>
              <div
                style={{
                  marginTop: 4,
                  fontWeight: 900,
                }}
              >
                {value}
              </div>
            </div>
          ))}
        </div>
      </section>

      {status === "correction_required" ? (
        <section
          style={{
            marginTop: 18,
            padding: 16,
            border: "1px solid #fde68a",
            borderRadius: 14,
            background: "#fffbeb",
          }}
        >
          <h2 style={{ marginTop: 0 }}>
            Correction requested
          </h2>
          <p
            style={{
              marginBottom: 12,
              color: "#78350f",
            }}
          >
            {correctionReason ||
              "Please review your submitted information and update the requested evidence."}
          </p>
          <Link
            href="/onboarding/business?returnTo=%2Fdashboard%2Fregistration&registration=1"
            style={{
              display: "inline-block",
              padding: "9px 12px",
              borderRadius: 9,
              background: "#92400e",
              color: "white",
              textDecoration: "none",
              fontWeight: 850,
            }}
          >
            Update requested information
          </Link>
        </section>
      ) : null}

      <section
        style={{
          marginTop: 18,
          padding: 18,
          border: "1px solid #e2e8f0",
          borderRadius: 16,
          background: "white",
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
            <h2 style={{ margin: 0 }}>
              Submitted evidence
            </h2>
            <p
              style={{
                margin: "6px 0 0",
                color: "#64748b",
              }}
            >
              Applicant-safe evidence summary. Private file paths and
              internal review data are not displayed.
            </p>
          </div>

          <Link
            href="/onboarding/business?returnTo=%2Fdashboard%2Fregistration&registration=1"
          >
            Review submitted information
          </Link>
        </div>

        <div
          style={{
            marginTop: 14,
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 12,
          }}
        >
          {[
            {
              label: "Live selfie",
              status: clean(
                businessEvidence?.selfie_capture_status || "missing"
              ),
              count: mediaCount(
                businessEvidence?.selfie_media_json
              ),
              detail:
                "Identity-presence evidence captured during registration.",
            },
            {
              label: "Workplace evidence",
              status: clean(
                businessEvidence?.workplace_evidence_status || "missing"
              ),
              count: mediaCount(
                businessEvidence?.workplace_media_json
              ),
              detail:
                "Photos or media showing the declared business workplace.",
            },
            {
              label: "Automated evidence check",
              status:
                mediaCount(
                  businessEvidence?.automated_verification_json
                ) > 0
                  ? "completed"
                  : "pending",
              count: mediaCount(
                businessEvidence?.automated_verification_json
              ),
              detail:
                "Structured verification result recorded for the submitted evidence.",
            },
          ].map((item) => {
            const tone = evidenceTone(item.status);

            return (
              <article
                key={item.label}
                style={{
                  padding: 14,
                  border: `1px solid ${tone.border}`,
                  borderRadius: 12,
                  background: tone.background,
                }}
              >
                <div
                  style={{
                    color: "#64748b",
                    fontSize: 12,
                    fontWeight: 850,
                    textTransform: "uppercase",
                  }}
                >
                  {item.label}
                </div>
                <div
                  style={{
                    marginTop: 5,
                    color: tone.color,
                    fontSize: 18,
                    fontWeight: 950,
                  }}
                >
                  {titleCase(item.status)}
                </div>
                <div
                  style={{
                    marginTop: 4,
                    color: "#475569",
                    fontSize: 13,
                  }}
                >
                  {item.detail}
                </div>
                <div
                  style={{
                    marginTop: 8,
                    color: "#64748b",
                    fontSize: 12,
                  }}
                >
                  Recorded item count: {item.count}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section
        style={{
          marginTop: 18,
          padding: 18,
          border: "1px solid #e2e8f0",
          borderRadius: 16,
          background: "white",
        }}
      >
        <h2 style={{ marginTop: 0 }}>
          Registration history
        </h2>

        <div
          style={{
            display: "grid",
            gap: 10,
          }}
        >
          {events.map((event) => (
            <article
              key={event.id}
              style={{
                padding: 13,
                borderLeft: "4px solid #0f766e",
                background: "#f8fafc",
                borderRadius: 8,
              }}
            >
              <strong>
                {publicEventTitle(event)}
              </strong>
              <div
                style={{
                  marginTop: 4,
                  color: "#475569",
                  fontSize: 13,
                }}
              >
                {publicEventDetail(event)}
              </div>
              <div
                style={{
                  marginTop: 4,
                  color: "#64748b",
                  fontSize: 12,
                }}
              >
                {displayDate(event.created_at)}
                {" · "}
                {titleCase(
                  event.decision_source || "system"
                )}
              </div>
            </article>
          ))}

          {!events.length ? (
            <div
              style={{
                padding: 14,
                border: "1px solid #e2e8f0",
                borderRadius: 10,
                color: "#64748b",
              }}
            >
              No registration event has been recorded
              yet.
            </div>
          ) : null}
        </div>
      </section>

      {["auto_verified", "admin_verified"].includes(status) ? (
        <section
          style={{
            marginTop: 18,
            padding: 18,
            border: "1px solid #bbf7d0",
            borderRadius: 16,
            background: "#f0fdf4",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 14,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <div>
              <h2 style={{ margin: 0 }}>
                Verification certificate
              </h2>
              <p
                style={{
                  margin: "6px 0 0",
                  color: "#166534",
                }}
              >
                Your verified registration is eligible for
                a permanent 3Bigha Verification ID and a
                printable certificate.
              </p>
            </div>

            <Link
              href="/dashboard/registration/certificate"
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                background: "#166534",
                color: "white",
                textDecoration: "none",
                fontWeight: 900,
              }}
            >
              Open certificate
            </Link>
          </div>
        </section>
      ) : null}

      <section
        style={{
          marginTop: 18,
          padding: 16,
          border: "1px solid #cbd5e1",
          borderRadius: 14,
          background: "#f8fafc",
        }}
      >
        <strong>What this page shows</strong>
        <p
          style={{
            margin: "6px 0 0",
            color: "#475569",
          }}
        >
          This page presents the canonical registration
          status and official event history already used
          by 3Bigha. It does not create another
          registration process and does not expose
          confidential reviewer notes or internal AI
          reasoning.
        </p>
      </section>
    </main>
  );
}
