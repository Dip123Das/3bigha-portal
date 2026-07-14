import type { HumanAccessContext } from "../access-context";
import {
  getActionPolicyForPlan,
} from "./action-policy-matrix";
import type { EntitlementActionKey } from "./action-catalogue";
import {
  presentEntitlementDecision,
  type AccessPresentation,
} from "./access-presentation";
import {
  resolveEntitlement,
} from "./resolve-entitlement";
import type {
  EntitlementDecision,
  EntitlementUsage,
} from "./types";

export type ServerEntitlementMode =
  | "observe_only"
  | "enforce";

export type ServerEntitlementObservation = {
  version: 1;
  mode: ServerEntitlementMode;
  action: EntitlementActionKey;
  decision: EntitlementDecision;
  presentation: AccessPresentation;

  /**
   * Compatibility guarantee:
   * observe-only evaluation never blocks the existing production workflow.
   */
  proceed: boolean;
  wouldBlockUnderEnforcement: boolean;

  actor: {
    userId: string | null;
    identity: string | null;
    workspace: string | null;
    commercialPlan: string;
    growthPlan: string;
  };

  request: {
    route: string | null;
    method: string | null;
    requestId: string | null;
  };

  metadata: Readonly<Record<string, unknown>>;
  observedAt: string;
};

export type ServerEntitlementLogger = (
  observation: ServerEntitlementObservation
) => void | Promise<void>;

export type ObserveServerEntitlementInput = {
  action: EntitlementActionKey;
  context: HumanAccessContext;
  usage?: EntitlementUsage;

  userId?: string | null;
  route?: string | null;
  method?: string | null;
  requestId?: string | null;
  metadata?: Readonly<Record<string, unknown>>;

  /**
   * N-3G must remain observe_only.
   * "enforce" exists for the later progressive rollout and is not the default.
   */
  mode?: ServerEntitlementMode;
  logger?: ServerEntitlementLogger;
};

function freezeMetadata(
  metadata: Readonly<Record<string, unknown>> | undefined
): Readonly<Record<string, unknown>> {
  return Object.freeze({ ...(metadata ?? {}) });
}

export async function observeServerEntitlement(
  input: ObserveServerEntitlementInput
): Promise<ServerEntitlementObservation> {
  const mode = input.mode ?? "observe_only";

  const policy = getActionPolicyForPlan({
    action: input.action,
    plan: input.context.growthPlan,
  });

  const decision = resolveEntitlement({
    context: input.context,
    policy,
    usage: input.usage,
  });

  const presentation = presentEntitlementDecision(decision);
  const wouldBlockUnderEnforcement = !decision.allowed;

  const observation: ServerEntitlementObservation = Object.freeze({
    version: 1,
    mode,
    action: input.action,
    decision,
    presentation,

    proceed:
      mode === "observe_only"
        ? true
        : decision.allowed,
    wouldBlockUnderEnforcement,

    actor: Object.freeze({
      userId: input.userId ?? null,
      identity: input.context.primaryIdentity?.key ?? null,
      workspace: input.context.activeWorkspace?.key ?? null,
      commercialPlan: input.context.commercialPlan,
      growthPlan: input.context.growthPlan,
    }),

    request: Object.freeze({
      route: input.route ?? null,
      method: input.method ?? null,
      requestId: input.requestId ?? null,
    }),

    metadata: freezeMetadata(input.metadata),
    observedAt: new Date().toISOString(),
  });

  if (input.logger) {
    try {
      await input.logger(observation);
    } catch {
      /**
       * Observability must never break an existing production workflow.
       * Logging failures are deliberately swallowed in compatibility mode.
       */
    }
  }

  return observation;
}

export function createConsoleEntitlementLogger(
  namespace = "3bos.entitlement"
): ServerEntitlementLogger {
  return (observation) => {
    console.info(
      `[${namespace}]`,
      JSON.stringify({
        version: observation.version,
        mode: observation.mode,
        action: observation.action,
        decision: observation.decision.decision,
        allowed: observation.decision.allowed,
        proceed: observation.proceed,
        wouldBlockUnderEnforcement:
          observation.wouldBlockUnderEnforcement,
        actor: observation.actor,
        request: observation.request,
        observedAt: observation.observedAt,
      })
    );
  };
}

export type ObserveLegacyServerActionInput = Omit<
  ObserveServerEntitlementInput,
  "mode"
>;

/**
 * Explicit compatibility helper for gradual adoption in existing APIs
 * and server actions. It always continues the legacy workflow.
 */
export async function observeLegacyServerAction(
  input: ObserveLegacyServerActionInput
): Promise<ServerEntitlementObservation> {
  return observeServerEntitlement({
    ...input,
    mode: "observe_only",
  });
}

export type EntitlementResponseHeaders = {
  "x-3bos-entitlement-mode": ServerEntitlementMode;
  "x-3bos-entitlement-action": string;
  "x-3bos-entitlement-decision": string;
};

/**
 * Optional non-sensitive response headers for local/staging inspection.
 * Do not expose identity, plan, usage, or verification details in headers.
 */
export function getEntitlementObservationHeaders(
  observation: ServerEntitlementObservation
): EntitlementResponseHeaders {
  return {
    "x-3bos-entitlement-mode": observation.mode,
    "x-3bos-entitlement-action": observation.action,
    "x-3bos-entitlement-decision":
      observation.decision.decision,
  };
}
