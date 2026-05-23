import type {
  WorkflowGuidanceInput,
  WorkflowGuidanceItem,
} from "./types";

export function buildWorkflowGuidance(
  input: WorkflowGuidanceInput = {}
): WorkflowGuidanceItem[] {
  const items: WorkflowGuidanceItem[] = [];

  if ((input.pendingFollowups || 0) > 0) {
    items.push({
      id: "followup",
      severity: "attention",
      message: `${input.pendingFollowups} conversation may need follow-up today.`,
      actionLabel: "Open Inbox",
      href: "/dashboard/inbox-v2",
    });
  }

  if ((input.pendingSuppliers || 0) > 0) {
    items.push({
      id: "supplier",
      severity: "watch",
      message: "Supplier response timing is slowing in some workflows.",
      actionLabel: "Check Procurement",
      href: "/dashboard/procurement-health",
    });
  }

  if ((input.delayedDeliveries || 0) > 0) {
    items.push({
      id: "delivery",
      severity: "watch",
      message: "Delivery coordination may help avoid execution delay.",
      actionLabel: "View Dispatch",
      href: "/dashboard/vendor/dispatch",
    });
  }

  if ((input.blockedExecution || 0) > 0) {
    items.push({
      id: "execution",
      severity: "priority",
      message: "Some execution activities may require coordination.",
      actionLabel: "Review Execution",
      href: "/dashboard/procurement-execution",
    });
  }

  if (items.length === 0) {
    items.push({
      id: "stable",
      severity: "calm",
      message: "Operations look stable. No immediate attention required.",
    });
  }

  return items;
}
