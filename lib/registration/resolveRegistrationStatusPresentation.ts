export type RegistrationStatusTone =
  | "positive"
  | "attention"
  | "neutral"
  | "critical";

export type RegistrationStatusStep = {
  key:
    | "identity"
    | "review"
    | "workspace"
    | "growth";
  label: string;
  status: string;
  detail: string;
  tone: RegistrationStatusTone;
};

export type RegistrationStatusAction = {
  label: string;
  href: string;
  kind: "primary" | "secondary";
};

export type RegistrationStatusPresentation = {
  eyebrow: string;
  title: string;
  message: string;
  steps: RegistrationStatusStep[];
  actions: RegistrationStatusAction[];
};

export type RegistrationStatusInput = {
  approvalStatus?: string | null;
  rejectionReason?: string | null;
  subscriptionPlan?: string | null;
  subscriptionStatus?: string | null;
  gatewayReady: boolean;
};

const PAID_PLAN_STATUSES = new Set([
  "active",
  "approved",
  "paid",
  "trialing",
]);

const PAYMENT_WAITING_STATUSES = new Set([
  "payment_pending",
  "requested",
  "gateway_order_created",
]);

function clean(value: string | null | undefined) {
  return String(value || "").trim().toLowerCase();
}

function isPaidPlan(plan: string) {
  return plan !== "" && plan !== "free";
}

export function hasActivePaidGrowthPlan(
  input: RegistrationStatusInput
) {
  const plan = clean(input.subscriptionPlan);
  const status = clean(input.subscriptionStatus);

  return isPaidPlan(plan) && PAID_PLAN_STATUSES.has(status);
}

export function resolveRegistrationStatusPresentation(
  input: RegistrationStatusInput
): RegistrationStatusPresentation {
  const approvalStatus = clean(input.approvalStatus || "pending");
  const plan = clean(input.subscriptionPlan || "free");
  const subscriptionStatus = clean(
    input.subscriptionStatus || "free"
  );

  const approved = ["approved", "active"].includes(approvalStatus);
  const rejected = approvalStatus === "rejected";
  const paidPlanSelected = isPaidPlan(plan);
  const paidGrowthActive = hasActivePaidGrowthPlan(input);
  const paymentWaiting =
    paidPlanSelected &&
    PAYMENT_WAITING_STATUSES.has(subscriptionStatus);

  const identityStep: RegistrationStatusStep = {
    key: "identity",
    label: "Business profile information",
    status: approved ? "Received" : "Continue anytime",
    detail: approved
      ? "Your submitted business information has been received. You may review and improve it from your Business Profile."
      : "Your business information has been saved. Evidence collection and business-proof verification are shown separately.",
    tone: approved ? "positive" : "neutral",
  };

  let reviewStep: RegistrationStatusStep;

  if (rejected) {
    reviewStep = {
      key: "review",
      label: "Business verification",
      status: "Correction required",
      detail:
        input.rejectionReason?.trim() ||
        "Some submitted information needs correction before verification can be completed.",
      tone: "critical",
    };
  } else if (approved) {
    reviewStep = {
      key: "review",
      label: "Business verification",
      status: "Verified",
      detail:
        "The submitted business evidence has been reviewed. Verification remains separate from the Growth Plan you use.",
      tone: "positive",
    };
  } else {
    reviewStep = {
      key: "review",
      label: "Business verification",
      status: "Review pending",
      detail:
        "Your submitted evidence has been received. Business-proof verification is still in progress, while your Essential Workspace remains available.",
      tone: "attention",
    };
  }

  const workspaceStep: RegistrationStatusStep = {
    key: "workspace",
    label: "Essential Workspace",
    status: rejected ? "Limited" : "Available now",
    detail: rejected
      ? "You may review your submitted information while the requested correction is resolved."
      : "You do not need to wait for business verification or payment to use the Essential Workspace.",
    tone: rejected ? "attention" : "positive",
  };

  let growthStep: RegistrationStatusStep;

  if (paidGrowthActive) {
    growthStep = {
      key: "growth",
      label: "Paid Growth features",
      status: "Active",
      detail:
        "Your verified paid Growth Plan benefits are active.",
      tone: "positive",
    };
  } else if (!paidPlanSelected) {
    growthStep = {
      key: "growth",
      label: "Paid Growth features",
      status: "Optional",
      detail:
        "Start — Essential remains available. You may review paid Growth Plans whenever your business needs additional tools or visibility.",
      tone: "neutral",
    };
  } else if (!input.gatewayReady) {
    growthStep = {
      key: "growth",
      label: "Paid Growth features",
      status: "Waiting for SBI Gateway",
      detail:
        "Your selected Growth Plan is recorded, but SBI online payment is not available yet. No payment has been collected and no paid benefit has been activated.",
      tone: "attention",
    };
  } else if (paymentWaiting) {
    growthStep = {
      key: "growth",
      label: "Paid Growth features",
      status: "Payment pending",
      detail:
        "Complete the secure SBI payment when you are ready. Essential Workspace access remains separate.",
      tone: "attention",
    };
  } else {
    growthStep = {
      key: "growth",
      label: "Paid Growth features",
      status: "Not active",
      detail:
        "The selected paid Growth Plan has not yet been activated by verified SBI payment confirmation.",
      tone: "neutral",
    };
  }

  if (rejected) {
    return {
      eyebrow: "Registration status",
      title: "Some information needs correction",
      message:
        "Your account remains yours. Review the requested correction and resubmit accurate information.",
      steps: [
        identityStep,
        reviewStep,
        workspaceStep,
        growthStep,
      ],
      actions: [
        {
          label: "Review my information",
          href: "/auth/register-role",
          kind: "primary",
        },
        {
          label: "Get help",
          href: "/support/new",
          kind: "secondary",
        },
      ],
    };
  }

  if (approved) {
    return {
      eyebrow: "Registration status",
      title: "Your Essential Workspace is available",
      message:
        "Identity review and paid Growth Plans are separate. You may continue your work without waiting for an optional paid subscription.",
      steps: [
        identityStep,
        reviewStep,
        workspaceStep,
        growthStep,
      ],
      actions: [
        {
          label: "Open my Essential Workspace",
          href: "/dashboard/workspace",
          kind: "primary",
        },
        {
          label: "View Growth Plans",
          href: "/dashboard/subscription",
          kind: "secondary",
        },
      ],
    };
  }

  return {
    eyebrow: "Business setup",
    title: "Your saved information is safe",
    message:
      "Your business information is saved and your submitted evidence is awaiting a verification decision. This does not block your Essential Workspace.",
    steps: [
      identityStep,
      reviewStep,
      workspaceStep,
      growthStep,
    ],
    actions: [
      {
        label: "Review my Business Profile",
        href: "/onboarding/business?returnTo=%2Fdashboard%2Fworkspace&registration=1",
        kind: "primary",
      },
      {
        label: "Open my Essential Workspace",
        href: "/dashboard/workspace",
        kind: "secondary",
      },
      {
        label: "View Growth Plans",
        href: "/dashboard/subscription",
        kind: "secondary",
      },
    ],
  };
}
