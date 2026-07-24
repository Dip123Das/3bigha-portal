import type {
  BtceDomainWeight,
  BtceEvidenceStatus,
  BtceTrustDomain,
} from "@/lib/btce/shared/btce-types";

export const BTCE_VERSION = "btce-v1" as const;

export const BTCE_DEFAULT_DOMAIN_WEIGHTS: readonly BtceDomainWeight[] = [
  { domain: "identity", weight: 20 },
  { domain: "legal", weight: 20 },
  { domain: "physical", weight: 20 },
  { domain: "capability", weight: 15 },
  { domain: "geographic", weight: 10 },
  { domain: "operational", weight: 10 },
  { domain: "reputation", weight: 5 },
] as const;

export const BTCE_EVIDENCE_STATUS_VALUE: Readonly<
  Record<BtceEvidenceStatus, number>
> = {
  submitted: 0.35,
  processing: 0.4,
  needs_review: 0.5,
  accepted: 1,
  rejected: 0,
  expired: 0,
};

export const BTCE_DOMAIN_ORDER: readonly BtceTrustDomain[] =
  BTCE_DEFAULT_DOMAIN_WEIGHTS.map((item) => item.domain);
