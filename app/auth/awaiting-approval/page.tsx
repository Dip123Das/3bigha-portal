"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
import {
  resolveRegistrationStatusPresentation,
  type RegistrationStatusPresentation,
  type RegistrationStatusTone,
} from "@/lib/registration/resolveRegistrationStatusPresentation";

type RegistrationRecord = {
  approvalStatus: string;
  rejectionReason: string | null;
  subscriptionPlan: string;
  subscriptionStatus: string;
  gatewayReady: boolean;
};

const EMPTY_RECORD: RegistrationRecord = {
  approvalStatus: "pending",
  rejectionReason: null,
  subscriptionPlan: "free",
  subscriptionStatus: "free",
  gatewayReady: false,
};

function toneStyles(tone: RegistrationStatusTone) {
  if (tone === "positive") {
    return {
      color: "#166534",
      background: "#f0fdf4",
      borderColor: "#bbf7d0",
    };
  }

  if (tone === "critical") {
    return {
      color: "#991b1b",
      background: "#fef2f2",
      borderColor: "#fecaca",
    };
  }

  if (tone === "attention") {
    return {
      color: "#92400e",
      background: "#fffbeb",
      borderColor: "#fde68a",
    };
  }

  return {
    color: "#334155",
    background: "#f8fafc",
    borderColor: "#e2e8f0",
  };
}

export default function AwaitingApprovalPage() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowser(), []);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [record, setRecord] =
    useState<RegistrationRecord>(EMPTY_RECORD);

  useEffect(() => {
    let alive = true;

    async function loadStatus() {
      setLoading(true);
      setLoadError(null);

      try {
        const { data: sessionData, error: sessionError } =
          await supabase.auth.getSession();

        if (sessionError) {
          throw new Error(
            sessionError.message || "Could not read your session."
          );
        }

        const user = sessionData.session?.user ?? null;

        if (!user?.id) {
          router.replace("/login");
          return;
        }

        const [
          profileResult,
          businessProfileResult,
          readinessResponse,
        ] = await Promise.all([
          supabase
            .from("profiles")
            .select(
              "role,approval_status,rejection_reason,account_status"
            )
            .eq("id", user.id)
            .maybeSingle(),
          supabase
            .from("business_profiles")
            .select("subscription_plan,subscription_status")
            .eq("user_id", user.id)
            .maybeSingle(),
          fetch("/api/payments/sbi/readiness", {
            method: "GET",
            cache: "no-store",
          }),
        ]);

        if (!alive) return;

        if (profileResult.error) {
          throw new Error(
            profileResult.error.message ||
              "Could not read your registration status."
          );
        }

        const profile = profileResult.data;
        const businessProfile = businessProfileResult.data;

        if (!profile?.role) {
          router.replace("/auth/register-role");
          return;
        }

        if (
          profile.account_status &&
          profile.account_status !== "active"
        ) {
          router.replace("/auth/account-disabled");
          return;
        }

        const readiness = await readinessResponse
          .json()
          .catch(() => null);

        if (!alive) return;

        setRecord({
          approvalStatus: String(
            profile.approval_status || "pending"
          ).toLowerCase(),
          rejectionReason:
            profile.rejection_reason || null,
          subscriptionPlan: String(
            businessProfile?.subscription_plan || "free"
          ).toLowerCase(),
          subscriptionStatus: String(
            businessProfile?.subscription_status || "free"
          ).toLowerCase(),
          gatewayReady:
            readinessResponse.ok &&
            readiness?.gatewayReady === true,
        });
      } catch (error: any) {
        console.error(
          "HUMAN_FIRST_REGISTRATION_STATUS_LOAD_FAILED",
          error
        );

        if (alive) {
          setLoadError(
            error?.message ||
              "We could not check your registration status."
          );
        }
      } finally {
        if (alive) setLoading(false);
      }
    }

    loadStatus();

    return () => {
      alive = false;
    };
  }, [router, supabase]);

  const presentation: RegistrationStatusPresentation =
    resolveRegistrationStatusPresentation(record);

  return (
    <main className="registrationStatusPage">
      <section className="registrationStatusShell">
        <div className="registrationEyebrow">
          {presentation.eyebrow}
        </div>

        <h1>{presentation.title}</h1>

        <p className="registrationLead">
          {presentation.message}
        </p>

        {loading ? (
          <div className="registrationNotice">
            Checking your registration status…
          </div>
        ) : null}

        {loadError ? (
          <div className="registrationError">
            <strong>We could not load the latest status.</strong>
            <span>{loadError}</span>
            <button
              type="button"
              onClick={() => window.location.reload()}
            >
              Try again
            </button>
          </div>
        ) : null}

        {!loading && !loadError ? (
          <>
            <div className="registrationSteps">
              {presentation.steps.map((step, index) => {
                const colors = toneStyles(step.tone);

                return (
                  <article
                    key={step.key}
                    className="registrationStep"
                    style={{
                      borderColor: colors.borderColor,
                      background: colors.background,
                    }}
                  >
                    <div
                      className="registrationStepNumber"
                      style={{
                        color: colors.color,
                        borderColor: colors.borderColor,
                      }}
                    >
                      {index + 1}
                    </div>

                    <div className="registrationStepBody">
                      <h2>{step.label}</h2>
                      <p>{step.detail}</p>
                    </div>

                    <div
                      className="registrationStepStatus"
                      style={{
                        color: colors.color,
                        borderColor: colors.borderColor,
                      }}
                    >
                      {step.status}
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="registrationPrinciple">
              <strong>Human First. AI Second.</strong>
              <span>
                Identity review, Essential Workspace access and
                optional paid Growth features are shown separately
                so that you always know what is available and what
                action, if any, is required.
              </span>
            </div>

            <div className="registrationActions">
              {presentation.actions.map((action) => (
                <button
                  key={`${action.href}-${action.label}`}
                  type="button"
                  className={
                    action.kind === "primary"
                      ? "registrationPrimaryAction"
                      : "registrationSecondaryAction"
                  }
                  onClick={() => router.push(action.href)}
                >
                  {action.label}
                </button>
              ))}
            </div>
          </>
        ) : null}
      </section>

      <style jsx>{`
        .registrationStatusPage {
          min-height: 72vh;
          padding: 40px clamp(16px, 3vw, 44px) 72px;
          background:
            radial-gradient(
              circle at top left,
              rgba(37, 99, 235, 0.08),
              transparent 34%
            ),
            #f8fafc;
        }

        .registrationStatusShell {
          width: 100%;
          max-width: 1180px;
          margin: 0 auto;
          padding: clamp(22px, 4vw, 42px);
          border: 1px solid #e2e8f0;
          border-radius: 24px;
          background: #ffffff;
          box-shadow: 0 20px 55px rgba(15, 23, 42, 0.08);
        }

        .registrationEyebrow {
          color: #1d4ed8;
          font-size: 13px;
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        h1 {
          margin: 10px 0 0;
          max-width: 850px;
          color: #0f172a;
          font-size: clamp(30px, 4vw, 48px);
          line-height: 1.08;
          letter-spacing: -0.035em;
        }

        .registrationLead {
          max-width: 820px;
          margin: 16px 0 0;
          color: #475569;
          font-size: 17px;
          line-height: 1.7;
        }

        .registrationNotice {
          margin-top: 28px;
          padding: 16px 18px;
          border: 1px solid #bfdbfe;
          border-radius: 14px;
          background: #eff6ff;
          color: #1e3a8a;
          font-weight: 800;
        }

        .registrationError {
          display: grid;
          gap: 8px;
          margin-top: 28px;
          padding: 18px;
          border: 1px solid #fecaca;
          border-radius: 14px;
          background: #fef2f2;
          color: #991b1b;
        }

        .registrationError button {
          width: fit-content;
          margin-top: 4px;
          padding: 9px 14px;
          border: 1px solid #991b1b;
          border-radius: 10px;
          background: #ffffff;
          color: #991b1b;
          font-weight: 900;
          cursor: pointer;
        }

        .registrationSteps {
          display: grid;
          gap: 14px;
          margin-top: 32px;
        }

        .registrationStep {
          display: grid;
          grid-template-columns: 46px minmax(0, 1fr) auto;
          gap: 16px;
          align-items: center;
          padding: 18px;
          border: 1px solid;
          border-radius: 16px;
        }

        .registrationStepNumber {
          display: grid;
          width: 42px;
          height: 42px;
          place-items: center;
          border: 1px solid;
          border-radius: 999px;
          background: #ffffff;
          font-weight: 950;
        }

        .registrationStepBody h2 {
          margin: 0;
          color: #0f172a;
          font-size: 17px;
        }

        .registrationStepBody p {
          margin: 6px 0 0;
          color: #475569;
          font-size: 14px;
          line-height: 1.55;
        }

        .registrationStepStatus {
          padding: 7px 11px;
          border: 1px solid;
          border-radius: 999px;
          background: #ffffff;
          font-size: 12px;
          font-weight: 950;
          text-align: center;
          white-space: nowrap;
        }

        .registrationPrinciple {
          display: grid;
          gap: 6px;
          margin-top: 24px;
          padding: 18px;
          border: 1px solid #dbeafe;
          border-radius: 16px;
          background: #f8fbff;
        }

        .registrationPrinciple strong {
          color: #1e3a8a;
          font-size: 15px;
        }

        .registrationPrinciple span {
          color: #475569;
          font-size: 14px;
          line-height: 1.6;
        }

        .registrationActions {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 26px;
        }

        .registrationActions button {
          min-height: 46px;
          padding: 11px 17px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 900;
          cursor: pointer;
        }

        .registrationPrimaryAction {
          border: 1px solid #1d4ed8;
          background: #1d4ed8;
          color: #ffffff;
        }

        .registrationSecondaryAction {
          border: 1px solid #cbd5e1;
          background: #ffffff;
          color: #0f172a;
        }

        @media (max-width: 720px) {
          .registrationStatusPage {
            padding: 20px 12px 48px;
          }

          .registrationStatusShell {
            padding: 22px 16px;
            border-radius: 18px;
          }

          .registrationStep {
            grid-template-columns: 40px minmax(0, 1fr);
            align-items: start;
          }

          .registrationStepNumber {
            width: 38px;
            height: 38px;
          }

          .registrationStepStatus {
            grid-column: 2;
            justify-self: start;
            white-space: normal;
          }

          .registrationActions {
            display: grid;
          }

          .registrationActions button {
            width: 100%;
          }
        }
      `}</style>
    </main>
  );
}
