export type BtceTrustDomain =
  | "identity"
  | "legal"
  | "physical"
  | "capability"
  | "geographic"
  | "operational"
  | "reputation";

export type BtceEvidenceSource =
  | "user_upload"
  | "platform_activity"
  | "government_registry"
  | "location_signal"
  | "human_review"
  | "ai_assessment"
  | "system_rule";

export type BtceEvidenceStatus =
  | "submitted"
  | "processing"
  | "needs_review"
  | "accepted"
  | "rejected"
  | "expired";

export type BtceAssessmentDecision =
  | "support"
  | "neutral"
  | "review"
  | "contradict";

export type BtceReviewAuthority = "ai" | "system" | "human" | "external";

export type BtceConfidenceBand =
  | "unavailable"
  | "very_low"
  | "low"
  | "moderate"
  | "high"
  | "very_high";

export type BtceCapabilityClaim = {
  code: string;
  label: string;
  description?: string | null;
  declaredAt?: string | null;
  tags?: string[];
};

export type BtceEvidenceLocation = {
  latitude?: number | null;
  longitude?: number | null;
  accuracyMetres?: number | null;
  lgdCode?: string | null;
  formattedAddress?: string | null;
};

export type BtceEvidenceSignal = {
  key: string;
  label: string;
  detected: boolean | null;
  confidence: number | null;
  value?: string | number | boolean | null;
  explanation?: string | null;
};

export type BtceEvidenceAssessment = {
  authority: BtceReviewAuthority;
  decision: BtceAssessmentDecision;
  confidence: number | null;
  assessedAt: string;
  assessor?: string | null;
  summary: string;
  reasons: string[];
  signals?: BtceEvidenceSignal[];
  requiresHumanReview: boolean;
};

export type BtceEvidence = {
  id: string;
  businessId: string;
  domain: BtceTrustDomain;
  type: string;
  source: BtceEvidenceSource;
  status: BtceEvidenceStatus;
  title: string;
  description?: string | null;
  assetUrl?: string | null;
  mimeType?: string | null;
  capturedAt?: string | null;
  submittedAt: string;
  expiresAt?: string | null;
  location?: BtceEvidenceLocation | null;
  capabilityTags?: string[];
  businessTags?: string[];
  metadata?: Record<string, unknown>;
  assessments?: BtceEvidenceAssessment[];
};

export type BtceDomainWeight = {
  domain: BtceTrustDomain;
  weight: number;
};

export type BtceDomainScore = {
  domain: BtceTrustDomain;
  rawScore: number;
  weightedScore: number;
  maximumWeightedScore: number;
  confidence: number;
  confidenceBand: BtceConfidenceBand;
  evidenceCount: number;
  acceptedEvidenceCount: number;
  reviewEvidenceCount: number;
  explanation: string[];
};

export type BtceTrustResult = {
  version: "btce-v1";
  businessId: string;
  generatedAt: string;
  score: number;
  confidence: number;
  confidenceBand: BtceConfidenceBand;
  domains: BtceDomainScore[];
  capabilityClaims: BtceCapabilityClaim[];
  explanation: string[];
  requiresHumanReview: boolean;
  evidenceSummary: {
    total: number;
    accepted: number;
    needsReview: number;
    rejected: number;
    expired: number;
  };
};

export type BtceEvaluationInput = {
  businessId: string;
  evidence: BtceEvidence[];
  capabilityClaims?: BtceCapabilityClaim[];
  weights?: Partial<Record<BtceTrustDomain, number>>;
  generatedAt?: string;
};
