export function calculateFinanceLeadScore(input: {
  monthlyIncome: number;
  cibilScore: number;
  existingEmi: number;
  eligibleLoan: number;
}) {
  let score = 40;

  if (input.monthlyIncome >= 100000) score += 20;
  else if (input.monthlyIncome >= 50000) score += 12;

  if (input.cibilScore >= 780) score += 25;
  else if (input.cibilScore >= 720) score += 15;
  else if (input.cibilScore >= 650) score += 6;
  else score -= 10;

  if (input.existingEmi <= input.monthlyIncome * 0.25) score += 10;
  if (input.eligibleLoan >= 2500000) score += 10;

  return Math.max(0, Math.min(100, Math.round(score)));
}

export function getSanctionProbability(score: number) {
  if (score >= 85) return 88;
  if (score >= 70) return 74;
  if (score >= 55) return 58;
  if (score >= 40) return 42;
  return 25;
}

export function getLeadPriority(score: number) {
  if (score >= 80) return "high";
  if (score >= 55) return "normal";
  return "follow_up";
}

export function getLoanDocumentChecklist(loanPurpose: string) {
  const common = [
    "PAN card",
    "Aadhaar card",
    "Latest CIBIL report",
    "Bank statement - last 6 months",
    "Income proof / salary slip / ITR",
    "Property papers",
  ];

  if (loanPurpose === "construction") {
    return [...common, "Approved building plan", "Construction estimate", "Land ownership document"];
  }

  if (loanPurpose === "plot") {
    return [...common, "Land deed", "Mutation / land record", "Search report"];
  }

  return common;
}

export function getRegionalBorrowerGuidance(state: string) {
  return {
    language: state === "West Bengal" ? "Bengali support recommended" : "Local language support recommended",
    note: "Explain EMI, document requirement, bank process and repayment capacity in simple local language.",
  };
}