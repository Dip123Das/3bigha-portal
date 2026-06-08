import { AttentionSeverity } from "./attention-severity";

export type OrchestrationModule =
  | "procurement-live"
  | "vendor-workspace"
  | "inbox-v2"
  | "rfq"
  | "workflow-continuity"
  | "operational-events"
  | "recovery"
  | "memory"
  | "executive";

export type OrchestrationRegistryEntry = {
  module: OrchestrationModule;
  label: string;
  href?: string;
  priority: AttentionSeverity;
  participatesInTimeline: boolean;
  participatesInContinuity: boolean;
  participatesInAttentionRouting: boolean;
};

export const orchestrationRegistry: OrchestrationRegistryEntry[] = [
  {
    module: "procurement-live",
    label: "Procurement Live",
    href: "/dashboard/procurement-live",
    priority: "high",
    participatesInTimeline: true,
    participatesInContinuity: true,
    participatesInAttentionRouting: true,
  },
  {
    module: "vendor-workspace",
    label: "Vendor Workspace",
    href: "/dashboard/vendor/workspace",
    priority: "medium",
    participatesInTimeline: true,
    participatesInContinuity: true,
    participatesInAttentionRouting: true,
  },
  {
    module: "inbox-v2",
    label: "Unified Inbox",
    href: "/dashboard/inbox-v2",
    priority: "high",
    participatesInTimeline: true,
    participatesInContinuity: true,
    participatesInAttentionRouting: true,
  },
  {
    module: "workflow-continuity",
    label: "Workflow Continuity",
    priority: "medium",
    participatesInTimeline: true,
    participatesInContinuity: true,
    participatesInAttentionRouting: true,
  },
  {
    module: "operational-events",
    label: "Operational Events",
    priority: "watch",
    participatesInTimeline: true,
    participatesInContinuity: false,
    participatesInAttentionRouting: true,
  },
  {
    module: "recovery",
    label: "Recovery Systems",
    priority: "high",
    participatesInTimeline: true,
    participatesInContinuity: true,
    participatesInAttentionRouting: true,
  },
  {
    module: "memory",
    label: "Operational Memory",
    priority: "watch",
    participatesInTimeline: true,
    participatesInContinuity: true,
    participatesInAttentionRouting: false,
  },
  {
    module: "executive",
    label: "Executive Surface",
    priority: "medium",
    participatesInTimeline: false,
    participatesInContinuity: false,
    participatesInAttentionRouting: true,
  },
];

export function getOrchestrationRegistry() {
  return orchestrationRegistry;
}

export function findOrchestrationModule(module: string) {
  return orchestrationRegistry.find((entry) => entry.module === module);
}
