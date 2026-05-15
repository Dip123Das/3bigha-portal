import type { ConstructionEstimateResponse } from "./cost-types";

export function buildConstructionCostAIPrompt(
  estimate: ConstructionEstimateResponse,
): string {
  return `
You are an AI Construction Cost Consultant for 3bigha.

Analyze this construction estimate:

Project Type:
${estimate.request.projectType ?? "residential"}

Built-up Area:
${estimate.request.builtUpAreaSqFt} sq.ft

Floor Count:
${estimate.request.floorCount ?? 1}

Construction Grade:
${estimate.request.grade ?? "standard"}

Estimated Budget:
₹${estimate.summary.estimatedBudget}

Budget Range:
₹${estimate.summary.estimatedBudgetMin} - ₹${estimate.summary.estimatedBudgetMax}

Civil Cost:
₹${estimate.costing.civilCost}

Finishing Cost:
₹${estimate.costing.finishingCost}

Electrical Cost:
₹${estimate.costing.electricalCost}

Plumbing Cost:
₹${estimate.costing.plumbingCost}

Interior Cost:
₹${estimate.costing.interiorCost}

Provide:
1. Cost analysis
2. Budget optimization suggestions
3. Material upgrade suggestions
4. Regional market insights
5. RFQ recommendation
6. Procurement recommendation
7. Future BOQ preparation guidance

Keep response practical and marketplace-focused.
`.trim();
}