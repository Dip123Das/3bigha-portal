import type {
  BtceAssessmentDecision,
  BtceEvidenceSignal,
  BtceReviewAuthority,
} from "@/lib/btce/shared/btce-types";

export type BieAnalyzerKind =
  | "image"
  | "document"
  | "ocr"
  | "geography"
  | "activity"
  | "reputation"
  | "custom";

export type BieAnalysisStatus =
  | "queued"
  | "processing"
  | "completed"
  | "needs_review"
  | "failed";

export type BieSourceAsset = {
  id: string;
  businessId: string;
  url?: string | null;
  mimeType?: string | null;
  name?: string | null;
  storagePath?: string | null;
  capturedAt?: string | null;
  metadata?: Record<string, unknown>;
};

export type BieAnalyzerContext = {
  businessId: string;
  declaredBusinessName?: string | null;
  declaredCapabilities?: string[];
  declaredLocation?: {
    latitude?: number | null;
    longitude?: number | null;
    lgdCode?: string | null;
    formattedAddress?: string | null;
  } | null;
  metadata?: Record<string, unknown>;
};

export type BieAnalyzerInput = {
  asset: BieSourceAsset;
  context: BieAnalyzerContext;
};

export type BieAnalyzerOutput = {
  analyzer: string;
  analyzerKind: BieAnalyzerKind;
  authority: BtceReviewAuthority;
  status: BieAnalysisStatus;
  decision: BtceAssessmentDecision;
  confidence: number | null;
  summary: string;
  reasons: string[];
  signals: BtceEvidenceSignal[];
  capabilityTags?: string[];
  businessTags?: string[];
  requiresHumanReview: boolean;
  generatedAt: string;
  raw?: Record<string, unknown>;
};

export interface BieAnalyzer {
  name: string;
  kind: BieAnalyzerKind;
  supports(input: BieAnalyzerInput): boolean;
  analyze(input: BieAnalyzerInput): Promise<BieAnalyzerOutput>;
}

export type BiePipelineResult = {
  assetId: string;
  businessId: string;
  status: BieAnalysisStatus;
  outputs: BieAnalyzerOutput[];
  signals: BtceEvidenceSignal[];
  capabilityTags: string[];
  businessTags: string[];
  requiresHumanReview: boolean;
  generatedAt: string;
};
