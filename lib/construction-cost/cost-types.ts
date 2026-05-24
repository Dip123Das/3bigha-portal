import type {
  ConstructionGrade,
  ConstructionRegionKey,
} from "./cost-config";

export type ConstructionProjectType =
  | "residential"
  | "commercial"
  | "rental"
  | "villa"
  | "apartment"
  | "warehouse";

export type ConstructionScheduleMode =
  | "indicative"
  | "pwd_sor"
  | "cpwd_dsr"
  | "price_today";

export type ConstructionEstimateRequest = {
  builtUpAreaSqFt: number;
  floorCount?: number;
  basementCount?: number;
  floorWiseAreaSqFt?: number[];
  scheduleMode?: ConstructionScheduleMode;
  priceTodayLinked?: boolean;
  grade?: ConstructionGrade;
  region?: ConstructionRegionKey;

  projectType?: ConstructionProjectType;

  includeFinishing?: boolean;
  includeElectrical?: boolean;
  includePlumbing?: boolean;
  includeInterior?: boolean;

  customRatePerSqFt?: number;
};

export type ConstructionEstimateMeta = {
  generatedAt: string;
  aiReady: boolean;
  boqReady: boolean;
  seoReady: boolean;
  procurementReady: boolean;
};

export type ConstructionEstimateResponse = {
  success: boolean;

  estimateId: string;

  request: ConstructionEstimateRequest;

  summary: {
    estimatedBudget: number;
    estimatedBudgetMin: number;
    estimatedBudgetMax: number;

    estimatedRatePerSqFt: number;

    suggestedGrade: ConstructionGrade;

    recommendedContingencyPercent: number;
  };

  costing: {
    civilCost: number;
    finishingCost: number;
    electricalCost: number;
    plumbingCost: number;
    interiorCost: number;
  };

  analytics: {
    highriseClassification?: string;
    areaEfficiencyScore: number;
    pricingConfidenceScore: number;
    regionalAdjustmentApplied: boolean;
    premiumFactorApplied: boolean;
    highriseEscalationPercent?: number;
    highriseNotes?: string[];
  };

  pwdSchedule?: {
    enabled: boolean;
    mode: ConstructionScheduleMode;
    districtKey: string;
    lines: {
      code: string;
      label: string;
      domain: string;
      unit: string;
      quantity: number;
      rate: number;
      amount: number;
      sourceNote: string;
    }[];
    summary: {
      subtotal: number;
      gst: number;
      labourWelfareCess: number;
      contingency: number;
      grandTotal: number;
    };
    notes: string[];
  };

  structuralQuantities?: {
    slabConcreteCum: number;
    beamConcreteCum: number;
    columnConcreteCum: number;
    footingConcreteCum: number;
    brickworkCum: number;
    plasterAreaSqFt: number;
    paintAreaSqFt: number;
    flooringAreaSqFt: number;
    tilePurchaseAreaSqFt: number;
    staircaseFactor: number;
    liftCoreFactor: number;
    assumptions: string[];
  };

  roomPlanning?: {
    estimatedBedrooms: number;
    estimatedBathrooms: number;
    estimatedLivingRooms: number;
    estimatedKitchens: number;
    estimatedBalconies: number;
    estimatedParkingSlots: number;
    staircaseAreaSqFt: number;
    liftLobbyAreaSqFt: number;
    circulationAreaSqFt: number;
    usableAreaSqFt: number;
    efficiencyPercent: number;
    planningNotes: string[];
  };

  pwdItemization?: {
    civilItems: Array<{
      chapter: string;
      itemCode: string;
      description: string;
      quantity: number;
      unit: string;
      rate: number;
      amount: number;
    }>;

    plumbingItems: Array<{
      chapter: string;
      itemCode: string;
      description: string;
      quantity: number;
      unit: string;
      rate: number;
      amount: number;
    }>;

    electricalItems: Array<{
      chapter: string;
      itemCode: string;
      description: string;
      quantity: number;
      unit: string;
      rate: number;
      amount: number;
    }>;

    finishingItems: Array<{
      chapter: string;
      itemCode: string;
      description: string;
      quantity: number;
      unit: string;
      rate: number;
      amount: number;
    }>;

    totalEstimatedCost: number;

    notes: string[];
  };

  dprReport?: {
    title: string;
    generatedAt: string;

    executiveSummary: string[];

    sections: Array<{
      title: string;
      content: string[];
    }>;

    financialSummary: {
      estimatedProjectCost: number;
      estimatedCivilCost: number;
      estimatedElectricalCost: number;
      estimatedPlumbingCost: number;
      estimatedFinishingCost: number;
      recommendedContingency: number;
    };

    recommendations: string[];
  };

  meta: ConstructionEstimateMeta;
};