export type ProcurementReadinessInput = {
  builtUpAreaSqFt: number;
  floorCount: number;
  estimatedRooms: number;
  estimatedBathrooms: number;
  estimatedKitchenCount: number;
};

export function calculateProcurementReadiness(
  input: ProcurementReadinessInput,
) {
  let score = 55;

  if (input.builtUpAreaSqFt >= 500) score += 10;
  if (input.floorCount >= 1) score += 8;
  if (input.estimatedRooms >= 2) score += 8;
  if (input.estimatedBathrooms >= 1) score += 7;
  if (input.estimatedKitchenCount >= 1) score += 7;

  const finalScore = Math.min(95, score);

  return {
    score: finalScore,
    status:
      finalScore >= 85
        ? "Ready for RFQ"
        : finalScore >= 70
        ? "Almost Ready"
        : "Needs Details",
    notes: [
      "Structural materials should be requested first.",
      "Electrical and plumbing RFQs should be prepared before plastering.",
      "Finishing materials can be finalized later based on budget and design.",
    ],
  };
}
