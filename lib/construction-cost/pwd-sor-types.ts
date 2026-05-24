export type PwdSorDomain = "building" | "sanitary" | "electrical";

export type PwdSorMode = "indicative" | "wb_pwd_2015" | "wb_pwd_2017" | "price_today";

export type PwdSorUnit =
  | "sqft"
  | "sqm"
  | "cum"
  | "metre"
  | "kg"
  | "mt"
  | "each"
  | "point"
  | "set"
  | "percent";

export type PwdSorItem = {
  code: string;
  domain: PwdSorDomain;
  section: string;
  label: string;
  description: string;
  unit: PwdSorUnit;
  baseRate: number;
  sourceYear: 2015 | 2017 | 2023;
  sourceNote: string;
  priceTodayKey?: string;
  isCoreItem?: boolean;
};

export type PwdDistrictChargeRule = {
  key: string;
  label: string;
  chargePercent: number;
  appliesTo: PwdSorDomain[];
};

export type PwdCostLine = {
  code: string;
  label: string;
  domain: PwdSorDomain;
  unit: PwdSorUnit;
  quantity: number;
  rate: number;
  amount: number;
  sourceNote: string;
};

export type PwdCostSummary = {
  subtotal: number;
  gst: number;
  labourWelfareCess: number;
  contingency: number;
  grandTotal: number;
};
