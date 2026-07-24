import type {
  BtceAssessmentDecision,
  BtceEvidenceAssessment,
  BtceEvidenceSignal,
} from "@/lib/btce/shared/btce-types";

export type BtcePhysicalObservation = {
  imageQuality?: number | null;
  signboardDetected?: boolean | null;
  detectedBusinessName?: string | null;
  declaredBusinessName?: string | null;
  workplaceDetected?: boolean | null;
  machineryDetected?: boolean | null;
  stockDetected?: boolean | null;
  activityDetected?: boolean | null;
  suspiciousImage?: boolean | null;
  unrelatedImage?: boolean | null;
  modelConfidence?: number | null;
  notes?: string[];
};

function clamp(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.min(100, Math.max(0, Math.round(value)));
}

function normalise(value: string | null | undefined) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function businessNameMatches(
  detected: string | null | undefined,
  declared: string | null | undefined
) {
  const left = normalise(detected);
  const right = normalise(declared);
  if (!left || !right) return null;
  return left === right || left.includes(right) || right.includes(left);
}

function signal(
  key: string,
  label: string,
  detected: boolean | null,
  confidence: number | null,
  explanation?: string
): BtceEvidenceSignal {
  return {
    key,
    label,
    detected,
    confidence,
    explanation: explanation ?? null,
  };
}

export function assessPhysicalEvidenceObservation(
  observation: BtcePhysicalObservation,
  assessedAt = new Date().toISOString()
): BtceEvidenceAssessment {
  const modelConfidence = clamp(observation.modelConfidence);
  const imageQuality = clamp(observation.imageQuality);
  const nameMatch = businessNameMatches(
    observation.detectedBusinessName,
    observation.declaredBusinessName
  );

  const positiveSignals = [
    observation.signboardDetected,
    observation.workplaceDetected,
    observation.machineryDetected,
    observation.stockDetected,
    observation.activityDetected,
    nameMatch,
  ].filter((value) => value === true).length;

  const seriousConcern =
    observation.suspiciousImage === true || observation.unrelatedImage === true;

  let decision: BtceAssessmentDecision = "neutral";
  if (seriousConcern) decision = "review";
  else if (positiveSignals >= 2) decision = "support";
  else if (positiveSignals === 0) decision = "review";

  const reasons: string[] = [...(observation.notes ?? [])];

  if (imageQuality != null && imageQuality < 45) {
    reasons.push("Image quality is too low for reliable automated observation.");
  }
  if (nameMatch === false) {
    reasons.push("Observed business name does not clearly match the declared name.");
  }
  if (observation.suspiciousImage) {
    reasons.push("The image contains signals that require authenticity review.");
  }
  if (observation.unrelatedImage) {
    reasons.push("The image may be unrelated to the declared business.");
  }
  if (positiveSignals === 0) {
    reasons.push("No strong physical-business signal was observed.");
  }

  const requiresHumanReview =
    seriousConcern ||
    nameMatch === false ||
    positiveSignals === 0 ||
    (imageQuality != null && imageQuality < 45) ||
    modelConfidence == null ||
    modelConfidence < 65;

  return {
    authority: "ai",
    decision,
    confidence: modelConfidence,
    assessedAt,
    assessor: "btce-physical-observation-v1",
    summary:
      decision === "support"
        ? "Automated observation found physical-business signals supporting this evidence."
        : "Automated observation is advisory and this evidence needs further review.",
    reasons,
    signals: [
      signal("image_quality", "Image quality acceptable", imageQuality == null ? null : imageQuality >= 45, imageQuality),
      signal("signboard", "Business signboard detected", observation.signboardDetected ?? null, modelConfidence),
      signal("business_name_match", "Business name matches declaration", nameMatch, modelConfidence),
      signal("workplace", "Workplace context detected", observation.workplaceDetected ?? null, modelConfidence),
      signal("machinery", "Machinery or equipment detected", observation.machineryDetected ?? null, modelConfidence),
      signal("stock", "Stock or products detected", observation.stockDetected ?? null, modelConfidence),
      signal("activity", "Business activity detected", observation.activityDetected ?? null, modelConfidence),
      signal("suspicious_image", "Suspicious image signal", observation.suspiciousImage ?? null, modelConfidence),
      signal("unrelated_image", "Possibly unrelated image", observation.unrelatedImage ?? null, modelConfidence),
    ],
    requiresHumanReview,
  };
}
