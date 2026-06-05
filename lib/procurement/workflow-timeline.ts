import type { OperationalEvent, OperationalEventTone } from "@/lib/operational-events/types";
import type { WorkflowContinuityState, WorkflowModule, WorkflowStage } from "@/lib/workflow-continuity/types";
import {
  resolveProcurementWorkflowState,
  type ProcurementWorkflowResolveInput,
} from "@/lib/procurement/workflow-state";

export type ProcurementTimelineInput = ProcurementWorkflowResolveInput & {
  id: string;
  title?: string | null;
  href: string;
  module?: "rfq" | "quote" | "procurement" | "inbox" | "vendor" | "buyer";
  createdAt?: number;
};

function eventToneFromHealth(health: string): OperationalEventTone {
  if (health === "critical") return "danger";
  if (health === "attention") return "warning";
  if (health === "completed") return "success";
  if (health === "healthy") return "info";
  return "normal";
}

function continuityModuleFromTimelineModule(
  module?: ProcurementTimelineInput["module"]
): WorkflowModule {
  if (module === "quote") return "rfq";
  return module || "procurement";
}

function continuityStageFromWorkflow(stage: string): WorkflowStage {
  if (stage === "draft") return "draft";
  if (stage === "quotes_received" || stage === "quote_review") return "comparison";
  if (stage === "negotiation" || stage === "shortlisting") return "negotiation";
  if (stage === "vendor_selected" || stage === "purchase_confirmed") return "accepted";
  if (stage === "delivery_in_progress" || stage === "partially_delivered") return "dispatch";
  if (stage === "completed") return "completed";
  if (stage === "cancelled" || stage === "stalled" || stage === "attention_required") return "paused";
  return "submitted";
}

export function buildProcurementOperationalEvent(
  input: ProcurementTimelineInput
): OperationalEvent {
  const workflow = resolveProcurementWorkflowState(input);

  return {
    id: `procurement-${input.id}-${workflow.stage}`,
    module: input.module || "procurement",
    title: input.title || workflow.label,
    detail: workflow.operationalMessage,
    href: input.href,
    tone: eventToneFromHealth(workflow.health),
    createdAt: input.createdAt || Date.now(),
  };
}

export function buildProcurementWorkflowContinuity(
  input: ProcurementTimelineInput
): WorkflowContinuityState {
  const workflow = resolveProcurementWorkflowState(input);

  return {
    id: input.id,
    module: continuityModuleFromTimelineModule(input.module),
    stage: continuityStageFromWorkflow(workflow.stage),
    title: input.title || workflow.label,
    summary: workflow.continuitySummary,
    href: input.href,
    primaryActionLabel: workflow.primaryAction,
    updatedAt: Date.now(),
  };
}
