export { assessPhysicalEvidenceObservation } from "@/lib/btce/ai/physical-evidence-analysis";
export type { BtcePhysicalObservation } from "@/lib/btce/ai/physical-evidence-analysis";
export { evaluateCapabilityIntelligence } from "@/lib/btce/core/capability-intelligence-engine";
export type { BtceCapabilityIntelligence } from "@/lib/btce/core/capability-intelligence-engine";
export { adaptRegistrationEvidence } from "@/lib/btce/adapters/registration-evidence-adapter";
export type { RegistrationEvidenceAdapterInput } from "@/lib/btce/adapters/registration-evidence-adapter";
export { evaluateBusinessTrust } from "@/lib/btce/core/btce-engine";
export {
  buildTrustExplanation,
  summarizeTrustResult,
} from "@/lib/btce/core/explanation-engine";
export {
  confidenceBand,
  normalizeDomainWeights,
  scoreDomain,
} from "@/lib/btce/core/scoring-engine";
export { validateBtceEvidence } from "@/lib/btce/evidence/evidence-validator";
export {
  BTCE_DEFAULT_DOMAIN_WEIGHTS,
  BTCE_DOMAIN_ORDER,
  BTCE_EVIDENCE_STATUS_VALUE,
  BTCE_VERSION,
} from "@/lib/btce/shared/constants";
export type * from "@/lib/btce/shared/btce-types";
