import type {
  WorkspaceCapabilityKey,
  WorkspaceDefinition,
  WorkspaceKey,
} from "./types";
import type {
  ResolvedRfqWorkspace,
  RfqWorkspaceRouteId,
} from "./resolve-workspace";

export type RfqJourneyStage =
  | "capture"
  | "review"
  | "professional-preparation"
  | "submitted"
  | "waiting-for-vendors"
  | "compare-quotes"
  | "negotiate"
  | "respond"
  | "accepted"
  | "closed";

export type RfqMarketplaceState =
  | "not-started"
  | "matching"
  | "active"
  | "completed";

export type RfqTrustState =
  | "unknown"
  | "human-reviewed"
  | "authenticated"
  | "verified";

export type RfqAiState =
  | "not-used"
  | "available"
  | "prepared"
  | "reviewed";

export type RfqWorkspaceOperationalContext = {
  routeWorkspaceId: RfqWorkspaceRouteId;
  workspaceKey: WorkspaceKey;
  workspace: WorkspaceDefinition;
  pathname: string;
  purpose: ResolvedRfqWorkspace["binding"]["purpose"];
  journeyStage: RfqJourneyStage;
  humanRole: "public" | "buyer" | "vendor" | "admin" | null;
  rfqId: string | null;
  rfqModule: string | null;
  rfqStatus: string | null;
  marketplaceState: RfqMarketplaceState | null;
  trustState: RfqTrustState;
  aiState: RfqAiState;
  availableCapabilities: readonly WorkspaceCapabilityKey[];
  metadata?: Readonly<Record<string, unknown>>;
  readOnly: true;
};

export type BuildRfqWorkspaceContextInput = {
  resolved: ResolvedRfqWorkspace;
  pathname: string;
  journeyStage?: RfqJourneyStage;
  humanRole?: RfqWorkspaceOperationalContext["humanRole"];
  rfqId?: string | null;
  rfqModule?: string | null;
  rfqStatus?: string | null;
  marketplaceState?: RfqMarketplaceState | null;
  trustState?: RfqTrustState;
  aiState?: RfqAiState;
  metadata?: Readonly<Record<string, unknown>>;
};

export function buildRfqWorkspaceContext(
  input: BuildRfqWorkspaceContextInput
): RfqWorkspaceOperationalContext {
  return Object.freeze({
    routeWorkspaceId: input.resolved.binding.id,
    workspaceKey: input.resolved.workspace.key,
    workspace: input.resolved.workspace,
    pathname: input.pathname,
    purpose: input.resolved.binding.purpose,
    journeyStage:
      input.journeyStage ??
      input.resolved.binding.journeyStage,
    humanRole: input.humanRole ?? null,
    rfqId: input.rfqId ?? null,
    rfqModule: input.rfqModule ?? null,
    rfqStatus: input.rfqStatus ?? null,
    marketplaceState: input.marketplaceState ?? null,
    trustState: input.trustState ?? "unknown",
    aiState: input.aiState ?? "not-used",
    availableCapabilities: Object.freeze([
      ...input.resolved.workspace.capabilities,
    ]),
    metadata: input.metadata
      ? Object.freeze({ ...input.metadata })
      : undefined,
    readOnly: true,
  });
}
