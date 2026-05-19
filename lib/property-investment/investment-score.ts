export type PropertyInvestmentInput = {
  price?: number | null;
  propertyType?: string | null;
  category?: string | null;
  listingType?: string | null;
  city?: string | null;
  district?: string | null;
  locality?: string | null;
};

function textHas(text: string, words: string[]) {
  return words.some((w) => text.includes(w));
}

function investmentScorePreview(
  appreciationPotential: number,
  investorConfidenceIndex: number,
  bargainOpportunityIndex: number,
  resaleLiquidityScore: number,
  marketTimingScore: number,
  hyperlocalDesirabilityIndex: number
) {
  return Math.min(
    99,
    appreciationPotential * 0.24 +
      investorConfidenceIndex * 0.2 +
      bargainOpportunityIndex * 0.18 +
      resaleLiquidityScore * 0.16 +
      marketTimingScore * 0.12 +
      hyperlocalDesirabilityIndex * 0.1
  );
}

export function buildPropertyInvestmentIntel(input: PropertyInvestmentInput) {
  const price = Number(input.price || 0);
  const hasPrice = Number.isFinite(price) && price > 0;

  const locationText = [input.locality, input.city, input.district]
    .filter(Boolean)
    .join(", ");

  const categoryText = String(input.propertyType || input.category || "").toLowerCase();
  const locationLower = locationText.toLowerCase();

  const localityBoost = input.locality ? 10 : 4;
  const cityBoost = input.city ? 8 : 3;
  const landBoost = categoryText.includes("land") || categoryText.includes("plot") ? 10 : 5;
  const residentialBoost = categoryText.includes("residential") ? 8 : 4;

  const highwayScore = textHas(locationLower, ["highway", "nh", "bypass", "main road", "road"])
    ? 88
    : input.city
      ? 62
      : 48;

  const railwayScore = textHas(locationLower, ["rail", "station", "junction"])
    ? 84
    : input.city
      ? 56
      : 42;

  const demandHotspotScore = Math.min(
    95,
    42 +
      localityBoost +
      cityBoost +
      (textHas(locationLower, ["market", "bazaar", "town", "school", "college", "hospital"]) ? 16 : 6) +
      (categoryText.includes("commercial") || categoryText.includes("shop") ? 12 : 5)
  );

  const urbanExpansionScore = Math.min(
    95,
    38 +
      cityBoost +
      localityBoost +
      (categoryText.includes("land") || categoryText.includes("plot") ? 16 : 7) +
      (textHas(locationLower, ["bypass", "highway", "town", "new", "extension"]) ? 12 : 4)
  );

  const infrastructureGrowthScore = Math.round(
    highwayScore * 0.34 +
      railwayScore * 0.22 +
      demandHotspotScore * 0.22 +
      urbanExpansionScore * 0.22
  );

  const emergingAreaScore = Math.min(
    95,
    Math.round(
      urbanExpansionScore * 0.45 +
        infrastructureGrowthScore * 0.35 +
        (hasPrice && price <= 5000000 ? 14 : 6)
    )
  );

  const investorConfidenceIndex = Math.min(
    99,
    Math.round(
      demandHotspotScore * 0.32 +
        infrastructureGrowthScore * 0.28 +
        emergingAreaScore * 0.22 +
        (localityBoost + cityBoost) * 0.9
    )
  );

  const localityGrowthRating =
    investorConfidenceIndex >= 82
      ? "High Growth"
      : investorConfidenceIndex >= 68
        ? "Emerging"
        : investorConfidenceIndex >= 54
          ? "Stable"
          : "Early Signal";

  const affordabilityScore = hasPrice
    ? price <= 2500000
      ? 22
      : price <= 5000000
        ? 18
        : price <= 10000000
          ? 12
          : 7
    : 10;

  const appreciationPotential = Math.min(
    95,
    Math.round(
      38 +
        localityBoost +
        cityBoost +
        landBoost +
        residentialBoost +
        infrastructureGrowthScore * 0.18
    )
  );

  const rentalYieldPercent = hasPrice
    ? categoryText.includes("commercial")
      ? 4.8
      : categoryText.includes("shop") || categoryText.includes("office")
        ? 5.2
        : 3.2
    : 0;

  const estimatedMonthlyRent = hasPrice
    ? Math.round((price * rentalYieldPercent) / 100 / 12)
    : 0;

  const loanAmount = hasPrice ? price * 0.8 : 0;
  const monthlyRate = 0.085 / 12;
  const months = 20 * 12;

  const estimatedEmi = hasPrice
    ? Math.round(
        (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, months)) /
          (Math.pow(1 + monthlyRate, months) - 1)
      )
    : 0;

  const safeSalaryRequired = estimatedEmi
    ? Math.round(estimatedEmi / 0.4)
    : 0;

  const betterThanRent =
    estimatedEmi > 0 && estimatedMonthlyRent > estimatedEmi * 0.35;

  const emiStress =
    estimatedEmi <= 20000
      ? "Low"
      : estimatedEmi <= 45000
        ? "Moderate"
        : "High";

  const benchmarkMultiplier =
    categoryText.includes("commercial") || categoryText.includes("shop")
      ? 1.18
      : categoryText.includes("land") || categoryText.includes("plot")
        ? 1.1
        : 1.04;

  const growthPremium = 1 + investorConfidenceIndex / 1000;
  const fairValueEstimate = hasPrice
    ? Math.round(price * benchmarkMultiplier * growthPremium)
    : 0;

  const priceGapPercent =
    hasPrice && fairValueEstimate > 0
      ? Math.round(((fairValueEstimate - price) / fairValueEstimate) * 100)
      : 0;

  const bargainOpportunityIndex = hasPrice
    ? Math.min(
        99,
        Math.max(
          25,
          Math.round(
            48 +
              Math.max(0, priceGapPercent) * 1.25 +
              investorConfidenceIndex * 0.22 +
              infrastructureGrowthScore * 0.12
          )
        )
      )
    : 45;

  const fastSellingProbability = hasPrice
    ? Math.min(
        95,
        Math.round(
          demandHotspotScore * 0.42 +
            bargainOpportunityIndex * 0.35 +
            investorConfidenceIndex * 0.23
        )
      )
    : Math.round(demandHotspotScore * 0.72);

  const priceConfidenceScore = Math.min(
    96,
    Math.round(
      48 +
        (input.locality ? 14 : 4) +
        (input.city ? 10 : 4) +
        investorConfidenceIndex * 0.22
    )
  );

  const pricePosition =
    !hasPrice
      ? "Price Not Available"
      : priceGapPercent >= 14
        ? "Underpriced"
        : priceGapPercent >= 6
          ? "Slightly Underpriced"
          : priceGapPercent <= -12
            ? "Overpriced"
            : "Fairly Priced";

  const hotDealLabel =
    hasPrice && bargainOpportunityIndex >= 78 && priceGapPercent >= 6
      ? "Hot Deal"
      : hasPrice && bargainOpportunityIndex >= 65
        ? "Good Bargain"
        : pricePosition;

  const familyFriendlyScore = Math.min(
    95,
    Math.round(
      42 +
        residentialBoost * 2.2 +
        (textHas(locationLower, ["school", "college", "hospital", "market", "town"]) ? 18 : 7) +
        localityBoost +
        cityBoost
    )
  );

  const commercialActivityScore = Math.min(
    95,
    Math.round(
      38 +
        (categoryText.includes("commercial") || categoryText.includes("shop") || categoryText.includes("office") ? 22 : 7) +
        (textHas(locationLower, ["market", "bazaar", "main road", "highway", "bypass", "town"]) ? 20 : 6) +
        demandHotspotScore * 0.18
    )
  );

  const buyerDemandIntensity = Math.min(
    99,
    Math.round(
      demandHotspotScore * 0.34 +
        familyFriendlyScore * 0.22 +
        commercialActivityScore * 0.18 +
        investorConfidenceIndex * 0.16 +
        bargainOpportunityIndex * 0.1
    )
  );

  const resaleLiquidityScore = Math.min(
    99,
    Math.round(
      buyerDemandIntensity * 0.36 +
        infrastructureGrowthScore * 0.24 +
        fastSellingProbability * 0.22 +
        priceConfidenceScore * 0.18
    )
  );

  const investorExitProbability = Math.min(
    95,
    Math.round(
      resaleLiquidityScore * 0.42 +
        buyerDemandIntensity * 0.28 +
        investorConfidenceIndex * 0.18 +
        Math.max(0, priceGapPercent) * 0.5
    )
  );

  const rentalAbsorptionScore = Math.min(
    95,
    Math.round(
      demandHotspotScore * 0.38 +
        familyFriendlyScore * 0.22 +
        commercialActivityScore * 0.18 +
        infrastructureGrowthScore * 0.22
    )
  );

  const appreciationVelocityScore = Math.min(
    95,
    Math.round(
      appreciationPotential * 0.36 +
        emergingAreaScore * 0.26 +
        infrastructureGrowthScore * 0.22 +
        investorConfidenceIndex * 0.16
    )
  );

  const longTermHoldingStrength = Math.min(
    99,
    Math.round(
      appreciationVelocityScore * 0.3 +
        resaleLiquidityScore * 0.25 +
        investorConfidenceIndex * 0.25 +
        priceConfidenceScore * 0.2
    )
  );

  const wealthCompounderLabel =
    longTermHoldingStrength >= 82 && resaleLiquidityScore >= 76
      ? "Wealth Compounder"
      : buyerDemandIntensity >= 76
        ? "High Demand"
        : resaleLiquidityScore >= 65
          ? "Liquid Asset"
          : "Hold & Watch";

  const areaHeatIndex = Math.min(
    99,
    Math.round(
      buyerDemandIntensity * 0.3 +
        investorConfidenceIndex * 0.24 +
        infrastructureGrowthScore * 0.18 +
        appreciationVelocityScore * 0.16 +
        commercialActivityScore * 0.12
    )
  );

  const supplyDemandImbalance = Math.min(
    95,
    Math.round(
      buyerDemandIntensity * 0.4 +
        Math.max(0, priceGapPercent) * 0.7 +
        demandHotspotScore * 0.24 +
        resaleLiquidityScore * 0.18
    )
  );

  const buyerActivityMomentum = Math.min(
    95,
    Math.round(
      demandHotspotScore * 0.32 +
        fastSellingProbability * 0.28 +
        resaleLiquidityScore * 0.22 +
        areaHeatIndex * 0.18
    )
  );

  const sellerCompetitionPressure = Math.min(
    95,
    Math.round(
      Math.max(18, 82 - bargainOpportunityIndex * 0.35) +
        (pricePosition === "Overpriced" ? 12 : 0) +
        (pricePosition === "Underpriced" ? -8 : 0)
    )
  );

  const marketTimingScore = Math.min(
    99,
    Math.round(
      areaHeatIndex * 0.32 +
        bargainOpportunityIndex * 0.26 +
        buyerActivityMomentum * 0.22 +
        resaleLiquidityScore * 0.2
    )
  );

  const inventorySaturationScore = Math.min(
    95,
    Math.round(
      sellerCompetitionPressure * 0.44 +
        Math.max(0, 88 - buyerDemandIntensity) * 0.28 +
        Math.max(0, 80 - resaleLiquidityScore) * 0.28
    )
  );

  const priceTrendMomentum = Math.min(
    95,
    Math.round(
      appreciationVelocityScore * 0.34 +
        areaHeatIndex * 0.28 +
        infrastructureGrowthScore * 0.2 +
        investorConfidenceIndex * 0.18
    )
  );

  const negotiationLeverageIndex = Math.min(
    99,
    Math.round(
      Math.max(0, 95 - marketTimingScore) * 0.22 +
        inventorySaturationScore * 0.38 +
        (pricePosition === "Overpriced" ? 24 : pricePosition === "Fairly Priced" ? 10 : 4) +
        (hasPrice && price > 10000000 ? 8 : 0)
    )
  );

  const marketPulseLabel =
    areaHeatIndex >= 82 && buyerActivityMomentum >= 76
      ? "Hot Market"
      : marketTimingScore >= 74
        ? "Good Time"
        : negotiationLeverageIndex >= 68
          ? "Negotiate Hard"
          : "Balanced Market";

  const schoolAccessibilityScore = Math.min(
    95,
    Math.round(
      44 +
        (textHas(locationLower, ["school", "college", "university", "academy"]) ? 28 : 8) +
        cityBoost +
        localityBoost
    )
  );

  const hospitalAccessibilityScore = Math.min(
    95,
    Math.round(
      42 +
        (textHas(locationLower, ["hospital", "medical", "clinic", "health"]) ? 30 : 8) +
        cityBoost +
        localityBoost
    )
  );

  const marketConvenienceIndex = Math.min(
    95,
    Math.round(
      40 +
        (textHas(locationLower, ["market", "bazaar", "town", "main road", "mall"]) ? 30 : 9) +
        commercialActivityScore * 0.18 +
        localityBoost
    )
  );

  const transportConnectivityScore = Math.min(
    99,
    Math.round(
      highwayScore * 0.34 +
        railwayScore * 0.28 +
        (textHas(locationLower, ["bus", "stand", "auto", "road", "junction"]) ? 18 : 8) +
        cityBoost
    )
  );

  const livabilityIndex = Math.min(
    99,
    Math.round(
      familyFriendlyScore * 0.28 +
        schoolAccessibilityScore * 0.18 +
        hospitalAccessibilityScore * 0.18 +
        marketConvenienceIndex * 0.18 +
        transportConnectivityScore * 0.18
    )
  );

  const familySettlementScore = Math.min(
    99,
    Math.round(
      livabilityIndex * 0.42 +
        familyFriendlyScore * 0.28 +
        schoolAccessibilityScore * 0.18 +
        hospitalAccessibilityScore * 0.12
    )
  );

  const studentRentalSuitability = Math.min(
    95,
    Math.round(
      schoolAccessibilityScore * 0.34 +
        transportConnectivityScore * 0.28 +
        marketConvenienceIndex * 0.2 +
        rentalAbsorptionScore * 0.18
    )
  );

  const retirementSuitability = Math.min(
    95,
    Math.round(
      hospitalAccessibilityScore * 0.32 +
        marketConvenienceIndex * 0.24 +
        familySettlementScore * 0.24 +
        transportConnectivityScore * 0.2
    )
  );

  const commercialViabilityScore = Math.min(
    99,
    Math.round(
      commercialActivityScore * 0.34 +
        marketConvenienceIndex * 0.26 +
        transportConnectivityScore * 0.22 +
        buyerDemandIntensity * 0.18
    )
  );

  const smartCityGrowthProbability = Math.min(
    95,
    Math.round(
      infrastructureGrowthScore * 0.28 +
        urbanExpansionScore * 0.24 +
        areaHeatIndex * 0.2 +
        transportConnectivityScore * 0.16 +
        investorConfidenceIndex * 0.12
    )
  );

  const hyperlocalDesirabilityIndex = Math.min(
    99,
    Math.round(
      livabilityIndex * 0.24 +
        transportConnectivityScore * 0.18 +
        marketConvenienceIndex * 0.16 +
        familySettlementScore * 0.14 +
        commercialViabilityScore * 0.14 +
        smartCityGrowthProbability * 0.14
    )
  );

  const hyperlocalProfileLabel =
    hyperlocalDesirabilityIndex >= 82
      ? "Prime Locality"
      : familySettlementScore >= 76
        ? "Family Zone"
        : commercialViabilityScore >= 76
          ? "Business Friendly"
          : transportConnectivityScore >= 74
            ? "Well Connected"
            : "Developing Locality";

  const familyMatchScore = Math.min(
    99,
    Math.round(
      familySettlementScore * 0.34 +
        livabilityIndex * 0.26 +
        schoolAccessibilityScore * 0.18 +
        hospitalAccessibilityScore * 0.14 +
        marketConvenienceIndex * 0.08
    )
  );

  const investorMatchScore = Math.min(
    99,
    Math.round(
      investmentScorePreview(
        appreciationPotential,
        investorConfidenceIndex,
        bargainOpportunityIndex,
        resaleLiquidityScore,
        marketTimingScore,
        hyperlocalDesirabilityIndex
      )
    )
  );

  const budgetFitScore = hasPrice
    ? price <= 2500000
      ? 94
      : price <= 5000000
        ? 84
        : price <= 10000000
          ? 68
          : 52
    : 62;

  const rentalIncomeMatchScore = Math.min(
    95,
    Math.round(
      rentalAbsorptionScore * 0.38 +
        studentRentalSuitability * 0.24 +
        commercialViabilityScore * 0.2 +
        rentalYieldPercent * 5
    )
  );

  const lifestyleMatchScore = Math.min(
    99,
    Math.round(
      livabilityIndex * 0.34 +
        transportConnectivityScore * 0.22 +
        marketConvenienceIndex * 0.18 +
        familySettlementScore * 0.16 +
        retirementSuitability * 0.1
    )
  );

  const endUserMatchScore = Math.min(
    99,
    Math.round(
      familyMatchScore * 0.34 +
        lifestyleMatchScore * 0.28 +
        budgetFitScore * 0.18 +
        hyperlocalDesirabilityIndex * 0.2
    )
  );

  const overallRecommendationScore = Math.min(
    99,
    Math.round(
      investorMatchScore * 0.28 +
        endUserMatchScore * 0.24 +
        budgetFitScore * 0.16 +
        rentalIncomeMatchScore * 0.14 +
        marketTimingScore * 0.1 +
        hyperlocalDesirabilityIndex * 0.08
    )
  );

  const bestForLabel =
    investorMatchScore >= endUserMatchScore && investorMatchScore >= rentalIncomeMatchScore
      ? "Best for Investors"
      : rentalIncomeMatchScore >= 76
        ? "Best for Rental Income"
        : familyMatchScore >= 76
          ? "Best for Families"
          : "Balanced Buyer Fit";

  const recommendationLabel =
    overallRecommendationScore >= 84
      ? "Top AI Match"
      : overallRecommendationScore >= 72
        ? "Recommended"
        : overallRecommendationScore >= 60
          ? "Good Fit"
          : "Selective Match";

  const investmentScore = Math.min(
    99,
    Math.round(
      affordabilityScore +
        appreciationPotential * 0.22 +
        investorConfidenceIndex * 0.11 +
        bargainOpportunityIndex * 0.08 +
        resaleLiquidityScore * 0.09 +
        marketTimingScore * 0.07 +
        hyperlocalDesirabilityIndex * 0.06 +
        overallRecommendationScore * 0.08 +
        (rentalYieldPercent ? rentalYieldPercent * 3 : 6)
    )
  );

  const rating =
    investmentScore >= 80
      ? "Strong"
      : investmentScore >= 65
        ? "Good"
        : investmentScore >= 50
          ? "Balanced"
          : "Cautious";

  return {
    investmentScore,
    rating,
    appreciationPotential,
    rentalYieldPercent,
    estimatedMonthlyRent,
    estimatedEmi,
    emiStress,
    safeSalaryRequired,
    betterThanRent,
    locationText,

    highwayScore,
    railwayScore,
    demandHotspotScore,
    urbanExpansionScore,
    infrastructureGrowthScore,
    emergingAreaScore,
    investorConfidenceIndex,
    localityGrowthRating,

    fairValueEstimate,
    priceGapPercent,
    bargainOpportunityIndex,
    fastSellingProbability,
    priceConfidenceScore,
    pricePosition,
    hotDealLabel,

    familyFriendlyScore,
    commercialActivityScore,
    buyerDemandIntensity,
    resaleLiquidityScore,
    investorExitProbability,
    rentalAbsorptionScore,
    appreciationVelocityScore,
    longTermHoldingStrength,
    wealthCompounderLabel,

    areaHeatIndex,
    supplyDemandImbalance,
    buyerActivityMomentum,
    sellerCompetitionPressure,
    marketTimingScore,
    inventorySaturationScore,
    priceTrendMomentum,
    negotiationLeverageIndex,
    marketPulseLabel,

    schoolAccessibilityScore,
    hospitalAccessibilityScore,
    marketConvenienceIndex,
    transportConnectivityScore,
    livabilityIndex,
    familySettlementScore,
    studentRentalSuitability,
    retirementSuitability,
    commercialViabilityScore,
    smartCityGrowthProbability,
    hyperlocalDesirabilityIndex,
    hyperlocalProfileLabel,

    familyMatchScore,
    investorMatchScore,
    budgetFitScore,
    rentalIncomeMatchScore,
    lifestyleMatchScore,
    endUserMatchScore,
    overallRecommendationScore,
    bestForLabel,
    recommendationLabel,
  };
}