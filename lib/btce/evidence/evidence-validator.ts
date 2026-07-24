import type {
  BtceEvidence,
  BtceEvidenceAssessment,
} from "@/lib/btce/shared/btce-types";

export type BtceValidationIssue = {
  path: string;
  message: string;
};

function validIsoDate(value: string | null | undefined) {
  if (!value) return true;
  return Number.isFinite(Date.parse(value));
}

function validateAssessment(
  assessment: BtceEvidenceAssessment,
  index: number
): BtceValidationIssue[] {
  const issues: BtceValidationIssue[] = [];

  if (!validIsoDate(assessment.assessedAt)) {
    issues.push({
      path: `assessments.${index}.assessedAt`,
      message: "Assessment date must be a valid ISO date.",
    });
  }

  if (
    assessment.confidence != null &&
    (assessment.confidence < 0 || assessment.confidence > 100)
  ) {
    issues.push({
      path: `assessments.${index}.confidence`,
      message: "Assessment confidence must be between 0 and 100.",
    });
  }

  if (!assessment.summary.trim()) {
    issues.push({
      path: `assessments.${index}.summary`,
      message: "Assessment summary is required.",
    });
  }

  return issues;
}

export function validateBtceEvidence(
  evidence: BtceEvidence
): BtceValidationIssue[] {
  const issues: BtceValidationIssue[] = [];

  if (!evidence.id.trim()) {
    issues.push({ path: "id", message: "Evidence id is required." });
  }

  if (!evidence.businessId.trim()) {
    issues.push({
      path: "businessId",
      message: "Business id is required.",
    });
  }

  if (!evidence.type.trim()) {
    issues.push({ path: "type", message: "Evidence type is required." });
  }

  if (!evidence.title.trim()) {
    issues.push({ path: "title", message: "Evidence title is required." });
  }

  if (!validIsoDate(evidence.submittedAt)) {
    issues.push({
      path: "submittedAt",
      message: "Submitted date must be a valid ISO date.",
    });
  }

  if (!validIsoDate(evidence.capturedAt)) {
    issues.push({
      path: "capturedAt",
      message: "Captured date must be a valid ISO date.",
    });
  }

  if (!validIsoDate(evidence.expiresAt)) {
    issues.push({
      path: "expiresAt",
      message: "Expiry date must be a valid ISO date.",
    });
  }

  if (
    evidence.location?.latitude != null &&
    (evidence.location.latitude < -90 || evidence.location.latitude > 90)
  ) {
    issues.push({
      path: "location.latitude",
      message: "Latitude must be between -90 and 90.",
    });
  }

  if (
    evidence.location?.longitude != null &&
    (evidence.location.longitude < -180 ||
      evidence.location.longitude > 180)
  ) {
    issues.push({
      path: "location.longitude",
      message: "Longitude must be between -180 and 180.",
    });
  }

  (evidence.assessments ?? []).forEach((assessment, index) => {
    issues.push(...validateAssessment(assessment, index));
  });

  return issues;
}
