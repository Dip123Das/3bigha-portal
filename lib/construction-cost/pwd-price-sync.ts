import type { PwdCostLine } from "./pwd-sor-types";

export type PriceTodayAdjustmentInput = {
  materialKey: string;
  pwdBaseRate: number;
};

export type PriceTodayAdjustmentResult = {
  marketRate: number;
  adjustmentPercent: number;
  confidence: number;
  source: string;
};

const MARKET_ADJUSTMENT_TABLE: Record<
  string,
  {
    multiplier: number;
    confidence: number;
    source: string;
  }
> = {
  cement: {
    multiplier: 1.08,
    confidence: 84,
    source: "Price Today market intelligence",
  },

  tmt: {
    multiplier: 1.12,
    confidence: 88,
    source: "Price Today steel intelligence",
  },

  aggregate: {
    multiplier: 1.04,
    confidence: 78,
    source: "Regional aggregate intelligence",
  },

  sand: {
    multiplier: 1.09,
    confidence: 81,
    source: "Regional sand intelligence",
  },

  bricks: {
    multiplier: 1.06,
    confidence: 79,
    source: "Brick supplier intelligence",
  },

  tiles: {
    multiplier: 1.11,
    confidence: 76,
    source: "Flooring marketplace intelligence",
  },

  pipe: {
    multiplier: 1.07,
    confidence: 80,
    source: "Sanitary supplier intelligence",
  },

  wire: {
    multiplier: 1.13,
    confidence: 85,
    source: "Electrical marketplace intelligence",
  },
};

export function applyPriceTodayAdjustment(
  input: PriceTodayAdjustmentInput,
): PriceTodayAdjustmentResult {
  const adjustment =
    MARKET_ADJUSTMENT_TABLE[input.materialKey];

  if (!adjustment) {
    return {
      marketRate: input.pwdBaseRate,
      adjustmentPercent: 0,
      confidence: 55,
      source: "PWD base schedule",
    };
  }

  const marketRate =
    input.pwdBaseRate * adjustment.multiplier;

  return {
    marketRate: Math.round(marketRate),

    adjustmentPercent: Math.round(
      (adjustment.multiplier - 1) * 100,
    ),

    confidence: adjustment.confidence,

    source: adjustment.source,
  };
}

export function applyLiveMarketAdjustmentToLine(
  line: PwdCostLine,
): PwdCostLine & {
  originalRate: number;
  marketAdjusted: boolean;
  marketConfidence: number;
  adjustmentPercent: number;
} {
  const label = line.label.toLowerCase();

  let materialKey = "";

  if (label.includes("cement")) materialKey = "cement";
  else if (label.includes("steel")) materialKey = "tmt";
  else if (label.includes("rcc")) materialKey = "tmt";
  else if (label.includes("brick")) materialKey = "bricks";
  else if (label.includes("tile")) materialKey = "tiles";
  else if (label.includes("pipe")) materialKey = "pipe";
  else if (label.includes("wire")) materialKey = "wire";
  else if (label.includes("aggregate")) materialKey = "aggregate";
  else if (label.includes("sand")) materialKey = "sand";

  if (!materialKey) {
    return {
      ...line,
      originalRate: line.rate,
      marketAdjusted: false,
      marketConfidence: 50,
      adjustmentPercent: 0,
    };
  }

  const adjusted = applyPriceTodayAdjustment({
    materialKey,
    pwdBaseRate: line.rate,
  });

  return {
    ...line,
    originalRate: line.rate,
    rate: adjusted.marketRate,
    amount: Math.round(
      adjusted.marketRate * line.quantity,
    ),
    marketAdjusted: true,
    marketConfidence: adjusted.confidence,
    adjustmentPercent: adjusted.adjustmentPercent,
  };
}
