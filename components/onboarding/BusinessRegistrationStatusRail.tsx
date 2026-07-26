"use client";

import type {
  BusinessProofStatus,
  RegistrationReadiness,
} from "@/lib/registration/resolveRegistrationReadiness";

type Props = {
  readiness: RegistrationReadiness;
  registrationComplete: boolean;
  verificationLoading: boolean;
  verificationConfidence: number;
  updatedAt?: string | null;
  termsAccepted: boolean;
  saving: boolean;
  onGoNext: () => void;
  onFinish: () => void;
  onOpenDashboard: () => void;
};

const PROOF_STATUS: Record<
  BusinessProofStatus,
  {
    label: string;
    explanation: string;
    tone: "success" | "warning" | "danger" | "neutral";
  }
> = {
  not_uploaded: {
    label: "Business proof required",
    explanation:
      "Add one valid legal certificate before business verification can begin.",
    tone: "neutral",
  },
  ready_to_verify: {
    label: "Ready for verification",
    explanation:
      "Your evidence is saved. Run the business-proof check when the entered details are correct.",
    tone: "warning",
  },
  verifying: {
    label: "Verification in progress",
    explanation:
      "3Bigha is comparing the entered details with the uploaded certificate.",
    tone: "warning",
  },
  under_review: {
    label: "Human review pending",
    explanation:
      "Your evidence has been received. You do not need to upload it again unless a reviewer requests a correction.",
    tone: "warning",
  },
  needs_correction: {
    label: "Correction required",
    explanation:
      "Review the highlighted certificate information and correct only the stated issue.",
    tone: "danger",
  },
  verified: {
    label: "Business proof verified",
    explanation:
      "The legal-document check is complete. Continue with the remaining registration step.",
    tone: "success",
  },
};

function toneStyle(
  tone: "success" | "warning" | "danger" | "neutral"
) {
  if (tone === "success") {
    return {
      background: "#ecfdf5",
      borderColor: "#a7f3d0",
      color: "#065f46",
    };
  }

  if (tone === "warning") {
    return {
      background: "#fffbeb",
      borderColor: "#fde68a",
      color: "#92400e",
    };
  }

  if (tone === "danger") {
    return {
      background: "#fef2f2",
      borderColor: "#fecaca",
      color: "#991b1b",
    };
  }

  return {
    background: "#f8fafc",
    borderColor: "#e2e8f0",
    color: "#334155",
  };
}

export default function BusinessRegistrationStatusRail({
  readiness,
  registrationComplete,
  verificationLoading,
  verificationConfidence,
  updatedAt,
  termsAccepted,
  saving,
  onGoNext,
  onFinish,
  onOpenDashboard,
}: Props) {
  const proof = PROOF_STATUS[readiness.businessProofStatus];
  const next = readiness.nextRequiredStep;

  const primaryLabel = registrationComplete
    ? "Open My Workspace"
    : readiness.registrationReady
      ? termsAccepted
        ? "Activate My Dashboard"
        : "Accept declaration to continue"
      : "Continue Registration";

  const primaryDisabled =
    saving ||
    (!registrationComplete &&
      readiness.registrationReady &&
      !termsAccepted);

  function primaryAction() {
    if (registrationComplete) {
      onOpenDashboard();
      return;
    }

    if (readiness.registrationReady && termsAccepted) {
      onFinish();
      return;
    }

    onGoNext();
  }

  return (
    <div className="registration-status-rail">
      <section className="registration-status-card">
        <div className="registration-status-eyebrow">
          Registration status
        </div>

        <div className="registration-status-heading-row">
          <div>
            <h2>
              {registrationComplete
                ? "Registration complete"
                : readiness.registrationReady
                  ? "Ready to finish"
                  : "Complete your business setup"}
            </h2>

            <p>
              {registrationComplete
                ? "Your workspace is ready."
                : next
                  ? next.label
                  : "Review your information and finish registration."}
            </p>
          </div>

          <strong>{readiness.progressPercent}%</strong>
        </div>

        <div className="registration-progress-track">
          <div
            className="registration-progress-fill"
            style={{
              width: `${readiness.progressPercent}%`,
            }}
          />
        </div>

        <div className="registration-status-facts">
          <div>
            <span>Required steps</span>
            <b>
              {readiness.completedRequiredSteps}/
              {readiness.requiredStepCount}
            </b>
          </div>

          <div>
            <span>Evidence</span>
            <b>{readiness.evidenceCollectionProgress}%</b>
          </div>
        </div>
      </section>

      <section
        className="registration-status-card"
        style={toneStyle(proof.tone)}
      >
        <div className="registration-status-eyebrow">
          Business verification
        </div>

        <h3 style={{ margin: "6px 0" }}>
          {verificationLoading
            ? "Checking your documents"
            : proof.label}
        </h3>

        <p style={{ margin: 0, lineHeight: 1.55 }}>
          {verificationLoading
            ? "Please keep this page open. Your saved evidence will not be lost."
            : proof.explanation}
        </p>

        {verificationConfidence > 0 ? (
          <div className="registration-confidence">
            AI confidence: {Math.round(verificationConfidence)}%
          </div>
        ) : null}

        {updatedAt ? (
          <div className="registration-updated">
            Updated{" "}
            {new Date(updatedAt).toLocaleString("en-IN")}
          </div>
        ) : null}
      </section>

      <section className="registration-status-card">
        <div className="registration-status-eyebrow">
          What happens next?
        </div>

        <h3 style={{ margin: "6px 0" }}>
          {registrationComplete
            ? "Use your unified workspace"
            : readiness.businessProofStatus === "under_review"
              ? "Wait for human review"
              : next
                ? next.label
                : "Review and finish"}
        </h3>

        <p style={{ color: "#475569", lineHeight: 1.55 }}>
          {readiness.businessProofStatus === "under_review"
            ? "Your uploaded proof is already saved. No re-upload is required unless a reviewer asks for a specific correction."
            : registrationComplete
              ? "Your registration is complete and your authorised workspace is available."
              : "Complete only the next required item. Finished information remains saved."}
        </p>

        <button
          type="button"
          disabled={primaryDisabled}
          onClick={primaryAction}
          className="registration-primary-action"
        >
          {saving ? "Please wait..." : primaryLabel}
        </button>
      </section>

      <details className="registration-help-card">
        <summary>Continue on your mobile phone</summary>
        <p>
          Sign in to 3Bigha on your phone using the same
          account. Your completed work is already saved.
        </p>
        <p>
          Use the mobile continuation tools inside Business
          Proof only when you need to capture live photos.
        </p>
      </details>
    </div>
  );
}
