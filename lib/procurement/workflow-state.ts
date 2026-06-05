export type ProcurementWorkflowStage =
  | "draft"
  | "rfq_created"
  | "vendor_discovery"
  | "vendor_engaged"
  | "quotes_received"
  | "quote_review"
  | "negotiation"
  | "shortlisting"
  | "vendor_selected"
  | "purchase_confirmed"
  | "delivery_in_progress"
  | "partially_delivered"
  | "completed"
  | "cancelled"
  | "stalled"
  | "attention_required";

export type WorkflowHealth =
  | "healthy"
  | "active"
  | "warning"
  | "critical"
  | "completed";

export type WorkflowStageDefinition = {
  key: ProcurementWorkflowStage;
  label: string;
  shortLabel: string;
  description: string;
  health: WorkflowHealth;
  progress: number;
  buyerAction?: string;
  vendorAction?: string;
  operationalMessage: string;
};

export const PROCUREMENT_WORKFLOW_STAGES: Record<
  ProcurementWorkflowStage,
  WorkflowStageDefinition
> = {
  draft: {
    key: "draft",
    label: "Draft RFQ",
    shortLabel: "Draft",
    description: "RFQ is being prepared.",
    health: "active",
    progress: 5,
    buyerAction: "Complete RFQ details",
    operationalMessage:
      "Procurement request is still being prepared.",
  },

  rfq_created: {
    key: "rfq_created",
    label: "RFQ Created",
    shortLabel: "Created",
    description: "RFQ successfully created.",
    health: "active",
    progress: 10,
    buyerAction: "Start vendor discovery",
    operationalMessage:
      "RFQ created successfully and ready for vendor engagement.",
  },

  vendor_discovery: {
    key: "vendor_discovery",
    label: "Vendor Discovery",
    shortLabel: "Discovery",
    description: "Searching for suitable vendors.",
    health: "active",
    progress: 20,
    buyerAction: "Review matching vendors",
    operationalMessage:
      "Vendor matching and procurement discovery ongoing.",
  },

  vendor_engaged: {
    key: "vendor_engaged",
    label: "Vendor Engagement",
    shortLabel: "Engaged",
    description: "Vendors have been contacted.",
    health: "active",
    progress: 30,
    buyerAction: "Wait for vendor responses",
    vendorAction: "Submit quotations",
    operationalMessage:
      "Vendors are actively engaging with this RFQ.",
  },

  quotes_received: {
    key: "quotes_received",
    label: "Quotes Received",
    shortLabel: "Quotes",
    description: "Quotations received from vendors.",
    health: "healthy",
    progress: 45,
    buyerAction: "Review quotations",
    operationalMessage:
      "Vendor quotations are now available for review.",
  },

  quote_review: {
    key: "quote_review",
    label: "Quote Review",
    shortLabel: "Review",
    description: "Buyer reviewing quotations.",
    health: "healthy",
    progress: 55,
    buyerAction: "Compare vendors",
    operationalMessage:
      "Procurement comparison and review in progress.",
  },

  negotiation: {
    key: "negotiation",
    label: "Negotiation",
    shortLabel: "Negotiation",
    description: "Price or delivery negotiation ongoing.",
    health: "healthy",
    progress: 65,
    buyerAction: "Continue negotiation",
    vendorAction: "Respond to buyer negotiation",
    operationalMessage:
      "Commercial negotiation currently active.",
  },

  shortlisting: {
    key: "shortlisting",
    label: "Vendor Shortlisting",
    shortLabel: "Shortlist",
    description: "Preferred vendors shortlisted.",
    health: "healthy",
    progress: 72,
    buyerAction: "Finalize vendor",
    operationalMessage:
      "Buyer is finalizing preferred procurement partner.",
  },

  vendor_selected: {
    key: "vendor_selected",
    label: "Vendor Selected",
    shortLabel: "Selected",
    description: "Vendor selected successfully.",
    health: "healthy",
    progress: 82,
    buyerAction: "Confirm procurement",
    vendorAction: "Prepare fulfillment",
    operationalMessage:
      "Vendor selected and procurement nearing confirmation.",
  },

  purchase_confirmed: {
    key: "purchase_confirmed",
    label: "Purchase Confirmed",
    shortLabel: "Confirmed",
    description: "Procurement officially confirmed.",
    health: "healthy",
    progress: 90,
    vendorAction: "Start fulfillment",
    operationalMessage:
      "Procurement confirmed and operational execution started.",
  },

  delivery_in_progress: {
    key: "delivery_in_progress",
    label: "Delivery In Progress",
    shortLabel: "Delivery",
    description: "Materials/services are being delivered.",
    health: "active",
    progress: 94,
    operationalMessage:
      "Delivery and fulfillment currently in progress.",
  },

  partially_delivered: {
    key: "partially_delivered",
    label: "Partially Delivered",
    shortLabel: "Partial",
    description: "Partial delivery completed.",
    health: "warning",
    progress: 96,
    buyerAction: "Review pending delivery",
    operationalMessage:
      "Partial delivery completed. Pending items still active.",
  },

  completed: {
    key: "completed",
    label: "Completed",
    shortLabel: "Completed",
    description: "Procurement completed successfully.",
    health: "completed",
    progress: 100,
    operationalMessage:
      "Procurement workflow completed successfully.",
  },

  cancelled: {
    key: "cancelled",
    label: "Cancelled",
    shortLabel: "Cancelled",
    description: "Procurement cancelled.",
    health: "critical",
    progress: 0,
    operationalMessage:
      "Procurement workflow has been cancelled.",
  },

  stalled: {
    key: "stalled",
    label: "Workflow Stalled",
    shortLabel: "Stalled",
    description: "Workflow inactive for extended period.",
    health: "warning",
    progress: 40,
    buyerAction: "Resume workflow",
    operationalMessage:
      "Procurement workflow requires operational recovery.",
  },

  attention_required: {
    key: "attention_required",
    label: "Attention Required",
    shortLabel: "Attention",
    description: "Workflow requires urgent attention.",
    health: "critical",
    progress: 50,
    buyerAction: "Resolve operational issue",
    operationalMessage:
      "Operational intervention required immediately.",
  },
};

export function getWorkflowStage(
  stage?: string | null
): WorkflowStageDefinition {
  if (!stage) {
    return PROCUREMENT_WORKFLOW_STAGES.rfq_created;
  }

  return (
    PROCUREMENT_WORKFLOW_STAGES[
      stage as ProcurementWorkflowStage
    ] || PROCUREMENT_WORKFLOW_STAGES.rfq_created
  );
}

export function getWorkflowProgress(stage?: string | null) {
  return getWorkflowStage(stage).progress;
}

export function getWorkflowHealth(stage?: string | null) {
  return getWorkflowStage(stage).health;
}

export function getWorkflowLabel(stage?: string | null) {
  return getWorkflowStage(stage).label;
}

export function getOperationalMessage(stage?: string | null) {
  return getWorkflowStage(stage).operationalMessage;
}

export type ProcurementWorkflowResolveInput = {
  rfqStatus?: string | null;
  quoteStatus?: string | null;
  targetStatus?: string | null;
  workflowStage?: string | null;
  vendorCount?: number | null;
  quoteCount?: number | null;
  selectedVendorId?: string | null;
  acceptedQuoteId?: string | null;
  deliveryStatus?: string | null;
  workflowRisk?: string | null;
};

function cleanStatus(value?: string | null) {
  return String(value || "").trim().toLowerCase();
}

export function normalizeProcurementWorkflowStage(
  input: ProcurementWorkflowResolveInput = {}
): ProcurementWorkflowStage {
  const explicit = cleanStatus(input.workflowStage);
  if (explicit && PROCUREMENT_WORKFLOW_STAGES[explicit as ProcurementWorkflowStage]) {
    return explicit as ProcurementWorkflowStage;
  }

  const rfqStatus = cleanStatus(input.rfqStatus);
  const quoteStatus = cleanStatus(input.quoteStatus);
  const targetStatus = cleanStatus(input.targetStatus);
  const deliveryStatus = cleanStatus(input.deliveryStatus);
  const workflowRisk = cleanStatus(input.workflowRisk);

  if (rfqStatus === "cancelled" || targetStatus === "cancelled") return "cancelled";

  if (
    deliveryStatus === "delivered" ||
    deliveryStatus === "completed" ||
    rfqStatus === "completed"
  ) {
    return "completed";
  }

  if (
    deliveryStatus === "in_transit" ||
    deliveryStatus === "loaded" ||
    deliveryStatus === "dispatch" ||
    deliveryStatus === "dispatched"
  ) {
    return "delivery_in_progress";
  }

  if (deliveryStatus === "partial" || deliveryStatus === "partially_delivered") {
    return "partially_delivered";
  }

  if (
    rfqStatus === "closed" ||
    rfqStatus === "accepted" ||
    quoteStatus === "accepted" ||
    targetStatus === "accepted" ||
    targetStatus === "won" ||
    input.acceptedQuoteId
  ) {
    return "vendor_selected";
  }

  if (
    quoteStatus === "negotiation" ||
    quoteStatus === "price_negotiation" ||
    targetStatus === "negotiation"
  ) {
    return "negotiation";
  }

  if ((input.quoteCount || 0) > 1) return "quote_review";
  if ((input.quoteCount || 0) === 1) return "quotes_received";

  if ((input.vendorCount || 0) > 0 || rfqStatus === "open") {
    return "vendor_engaged";
  }

  if (rfqStatus === "pending") return "vendor_discovery";
  if (rfqStatus === "draft") return "draft";

  if (workflowRisk === "high" || workflowRisk === "critical") {
    return "attention_required";
  }

  return "rfq_created";
}

export function resolveProcurementWorkflowState(
  input: ProcurementWorkflowResolveInput = {}
) {
  const stageKey = normalizeProcurementWorkflowStage(input);
  const stage = getWorkflowStage(stageKey);
  const risk = cleanStatus(input.workflowRisk);

  const health: WorkflowHealth =
    stage.health === "completed"
      ? "completed"
      : risk === "critical" || risk === "high"
        ? "critical"
        : risk === "medium" || stage.health === "warning"
          ? "warning"
          : stage.health;

  return {
    stage: stage.key,
    label: stage.label,
    shortLabel: stage.shortLabel,
    description: stage.description,
    progress: stage.progress,
    health,
    buyerAction: stage.buyerAction,
    vendorAction: stage.vendorAction,
    operationalMessage: stage.operationalMessage,
    continuitySummary: `${stage.shortLabel} • ${stage.progress}% • ${health}`,
    primaryAction:
      stage.buyerAction ||
      stage.vendorAction ||
      stage.operationalMessage,
  };
}

export type WorkflowHeartbeat = {
  level: "live" | "slowing" | "stale" | "critical";
  label: string;
  detail: string;
  inactivityMinutes: number;
};

function getMinutesSince(ts?: string | number | null) {
  if (!ts) return 999999;

  try {
    const value =
      typeof ts === "number"
        ? ts
        : new Date(ts).getTime();

    return Math.max(
      0,
      Math.round((Date.now() - value) / 60000)
    );
  } catch {
    return 999999;
  }
}

export function getWorkflowHeartbeat(
  updatedAt?: string | number | null
): WorkflowHeartbeat {
  const mins = getMinutesSince(updatedAt);

  if (mins <= 30) {
    return {
      level: "live",
      label: "Workflow Active",
      detail: "Operational activity is flowing normally.",
      inactivityMinutes: mins,
    };
  }

  if (mins <= 180) {
    return {
      level: "slowing",
      label: "Workflow Slowing",
      detail: "Workflow activity has reduced recently.",
      inactivityMinutes: mins,
    };
  }

  if (mins <= 1440) {
    return {
      level: "stale",
      label: "Workflow Becoming Stale",
      detail: "Procurement workflow may require follow-up.",
      inactivityMinutes: mins,
    };
  }

  return {
    level: "critical",
    label: "Workflow Needs Attention",
    detail: "Workflow appears inactive for a long duration.",
    inactivityMinutes: mins,
  };
}

export function isWorkflowStale(
  updatedAt?: string | number | null,
  thresholdMinutes = 180
) {
  return getMinutesSince(updatedAt) > thresholdMinutes;
}

export function getWorkflowAttentionLevel(input: {
  updatedAt?: string | number | null;
  workflowRisk?: string | null;
  stage?: string | null;
}) {
  const heartbeat = getWorkflowHeartbeat(input.updatedAt);

  const risk = String(input.workflowRisk || "")
    .trim()
    .toLowerCase();

  if (
    risk === "critical" ||
    risk === "high" ||
    heartbeat.level === "critical"
  ) {
    return {
      level: "critical",
      label: "Immediate Attention Required",
    };
  }

  if (
    heartbeat.level === "stale" ||
    risk === "medium"
  ) {
    return {
      level: "warning",
      label: "Operational Follow-up Recommended",
    };
  }

  return {
    level: "healthy",
    label: "Workflow Healthy",
  };
}
