export type BankOffer = {
  bank: string;
  shortName: string;
  type: "public" | "private" | "cooperative" | "rrb" | "small_finance" | "foreign" | "hfc" | "nbfc";
  state?: string;
  indicativeRate: number;
  processingFeePercent?: number;
  lastUpdated?: string;
  termsNote?: string;
};

export const nationalBankOffers: BankOffer[] = [
  { bank: "State Bank of India", shortName: "SBI", type: "public", indicativeRate: 8.5 },
  { bank: "Bank of Baroda", shortName: "BOB", type: "public", indicativeRate: 8.5 },
  { bank: "Punjab National Bank", shortName: "PNB", type: "public", indicativeRate: 8.5 },
  { bank: "Canara Bank", shortName: "Canara", type: "public", indicativeRate: 8.55 },
  { bank: "Union Bank of India", shortName: "Union", type: "public", indicativeRate: 8.55 },
  { bank: "Bank of India", shortName: "BOI", type: "public", indicativeRate: 8.6 },
  { bank: "Indian Bank", shortName: "Indian Bank", type: "public", indicativeRate: 8.6 },
  { bank: "Central Bank of India", shortName: "CBI", type: "public", indicativeRate: 8.65 },
  { bank: "UCO Bank", shortName: "UCO", type: "public", indicativeRate: 8.65 },
  { bank: "Bank of Maharashtra", shortName: "BOM", type: "public", indicativeRate: 8.65 },
  { bank: "Indian Overseas Bank", shortName: "IOB", type: "public", indicativeRate: 8.7 },
  { bank: "Punjab & Sind Bank", shortName: "PSB", type: "public", indicativeRate: 8.75 },

  { bank: "HDFC Bank", shortName: "HDFC", type: "private", indicativeRate: 8.75 },
  { bank: "ICICI Bank", shortName: "ICICI", type: "private", indicativeRate: 8.75 },
  { bank: "Axis Bank", shortName: "Axis", type: "private", indicativeRate: 8.75 },
  { bank: "Kotak Mahindra Bank", shortName: "Kotak", type: "private", indicativeRate: 8.85 },
  { bank: "Federal Bank", shortName: "Federal", type: "private", indicativeRate: 8.9 },
  { bank: "IDFC FIRST Bank", shortName: "IDFC FIRST", type: "private", indicativeRate: 8.9 },
  { bank: "IndusInd Bank", shortName: "IndusInd", type: "private", indicativeRate: 8.95 },
  { bank: "Bandhan Bank", shortName: "Bandhan", type: "private", indicativeRate: 8.95 },
  { bank: "Yes Bank", shortName: "YES", type: "private", indicativeRate: 9.0 },
  { bank: "RBL Bank", shortName: "RBL", type: "private", indicativeRate: 9.1 },
  { bank: "South Indian Bank", shortName: "SIB", type: "private", indicativeRate: 9.0 },
  { bank: "Karur Vysya Bank", shortName: "KVB", type: "private", indicativeRate: 9.0 },
  { bank: "Tamilnad Mercantile Bank", shortName: "TMB", type: "private", indicativeRate: 9.0 },
  { bank: "City Union Bank", shortName: "CUB", type: "private", indicativeRate: 9.05 },
  { bank: "Karnataka Bank", shortName: "Karnataka", type: "private", indicativeRate: 9.05 },
  { bank: "DCB Bank", shortName: "DCB", type: "private", indicativeRate: 9.15 },
  { bank: "CSB Bank", shortName: "CSB", type: "private", indicativeRate: 9.15 },
  { bank: "Dhanlaxmi Bank", shortName: "Dhanlaxmi", type: "private", indicativeRate: 9.25 },
  { bank: "Jammu & Kashmir Bank", shortName: "J&K Bank", type: "private", indicativeRate: 9.0 },
  { bank: "Nainital Bank", shortName: "Nainital", type: "private", indicativeRate: 9.15 },

  { bank: "AU Small Finance Bank", shortName: "AU SFB", type: "small_finance", indicativeRate: 9.25 },
  { bank: "Ujjivan Small Finance Bank", shortName: "Ujjivan SFB", type: "small_finance", indicativeRate: 9.35 },
  { bank: "Equitas Small Finance Bank", shortName: "Equitas SFB", type: "small_finance", indicativeRate: 9.35 },
  { bank: "Suryoday Small Finance Bank", shortName: "Suryoday SFB", type: "small_finance", indicativeRate: 9.5 },
  { bank: "Utkarsh Small Finance Bank", shortName: "Utkarsh SFB", type: "small_finance", indicativeRate: 9.5 },
  { bank: "ESAF Small Finance Bank", shortName: "ESAF SFB", type: "small_finance", indicativeRate: 9.5 },
  { bank: "Jana Small Finance Bank", shortName: "Jana SFB", type: "small_finance", indicativeRate: 9.5 },
  { bank: "North East Small Finance Bank", shortName: "NESFB", type: "small_finance", indicativeRate: 9.75 },
  { bank: "Capital Small Finance Bank", shortName: "Capital SFB", type: "small_finance", indicativeRate: 9.5 },
  { bank: "Shivalik Small Finance Bank", shortName: "Shivalik SFB", type: "small_finance", indicativeRate: 9.5 },

  { bank: "LIC Housing Finance Limited", shortName: "LIC HFL", type: "hfc", indicativeRate: 8.75 },
  { bank: "PNB Housing Finance Limited", shortName: "PNB HFL", type: "hfc", indicativeRate: 8.85 },
  { bank: "HDFC Home Loans", shortName: "HDFC Home", type: "hfc", indicativeRate: 8.75 },
  { bank: "ICICI Home Finance Company Limited", shortName: "ICICI HFC", type: "hfc", indicativeRate: 8.95 },
  { bank: "Bajaj Housing Finance Limited", shortName: "Bajaj HFL", type: "hfc", indicativeRate: 8.85 },
  { bank: "Tata Capital Housing Finance Limited", shortName: "Tata HFC", type: "hfc", indicativeRate: 8.95 },
  { bank: "Piramal Capital & Housing Finance Limited", shortName: "Piramal HFC", type: "hfc", indicativeRate: 9.1 },
  { bank: "Can Fin Homes Limited", shortName: "Can Fin", type: "hfc", indicativeRate: 8.95 },
  { bank: "Aadhar Housing Finance Limited", shortName: "Aadhar HFC", type: "hfc", indicativeRate: 9.25 },
  { bank: "IIFL Home Finance Limited", shortName: "IIFL HFC", type: "hfc", indicativeRate: 9.25 },
  { bank: "HUDCO", shortName: "HUDCO", type: "hfc", indicativeRate: 9.0 },
];

export const regionalBankOffers: BankOffer[] = [
  { bank: "West Bengal Gramin Bank", shortName: "WBGB", type: "rrb", state: "West Bengal", indicativeRate: 9.0 },
  { bank: "Bangiya Gramin Vikash Bank", shortName: "BGVB", type: "rrb", state: "West Bengal", indicativeRate: 9.0 },
  { bank: "Uttarbanga Kshetriya Gramin Bank", shortName: "UBKGB", type: "rrb", state: "West Bengal", indicativeRate: 9.0 },
  { bank: "The West Bengal State Co-operative Bank", shortName: "WBSCB", type: "cooperative", state: "West Bengal", indicativeRate: 9.25 },

  { bank: "Andhra Pradesh Grameena Bank", shortName: "APGB", type: "rrb", state: "Andhra Pradesh", indicativeRate: 9.0 },
  { bank: "Arunachal Pradesh Rural Bank", shortName: "APRB", type: "rrb", state: "Arunachal Pradesh", indicativeRate: 9.1 },
  { bank: "Assam Gramin Bank", shortName: "AGB", type: "rrb", state: "Assam", indicativeRate: 9.0 },
  { bank: "Bihar Gramin Bank", shortName: "BGB", type: "rrb", state: "Bihar", indicativeRate: 9.0 },
  { bank: "Chhattisgarh Gramin Bank", shortName: "CGB", type: "rrb", state: "Chhattisgarh", indicativeRate: 9.0 },
  { bank: "Gujarat Gramin Bank", shortName: "GGB", type: "rrb", state: "Gujarat", indicativeRate: 9.0 },
  { bank: "Haryana Gramin Bank", shortName: "HGB", type: "rrb", state: "Haryana", indicativeRate: 9.0 },
  { bank: "Himachal Pradesh Gramin Bank", shortName: "HPGB", type: "rrb", state: "Himachal Pradesh", indicativeRate: 9.0 },
  { bank: "Jammu And Kashmir Grameen Bank", shortName: "JKGB", type: "rrb", state: "Jammu and Kashmir", indicativeRate: 9.1 },
  { bank: "Jharkhand Rajya Gramin Bank", shortName: "JRGB", type: "rrb", state: "Jharkhand", indicativeRate: 9.0 },
  { bank: "Karnataka Gramin Bank", shortName: "KGB", type: "rrb", state: "Karnataka", indicativeRate: 9.0 },
  { bank: "Kerala Gramin Bank", shortName: "KGB Kerala", type: "rrb", state: "Kerala", indicativeRate: 9.0 },
  { bank: "Madhya Pradesh Gramin Bank", shortName: "MPGB", type: "rrb", state: "Madhya Pradesh", indicativeRate: 9.0 },
  { bank: "Maharashtra Gramin Bank", shortName: "MGB", type: "rrb", state: "Maharashtra", indicativeRate: 9.0 },
  { bank: "Manipur Rural Bank", shortName: "MRB", type: "rrb", state: "Manipur", indicativeRate: 9.1 },
  { bank: "Meghalaya Rural Bank", shortName: "MRB Meghalaya", type: "rrb", state: "Meghalaya", indicativeRate: 9.1 },
  { bank: "Mizoram Rural Bank", shortName: "MRB Mizoram", type: "rrb", state: "Mizoram", indicativeRate: 9.1 },
  { bank: "Nagaland Rural Bank", shortName: "NRB", type: "rrb", state: "Nagaland", indicativeRate: 9.1 },
  { bank: "Odisha Gramya Bank", shortName: "OGB", type: "rrb", state: "Odisha", indicativeRate: 9.0 },
  { bank: "Utkal Grameen Bank", shortName: "UGB", type: "rrb", state: "Odisha", indicativeRate: 9.0 },
  { bank: "Puduvai Bharathiar Grama Bank", shortName: "PBGB", type: "rrb", state: "Puducherry", indicativeRate: 9.1 },
  { bank: "Punjab Gramin Bank", shortName: "PGB", type: "rrb", state: "Punjab", indicativeRate: 9.0 },
  { bank: "Rajasthan Marudhara Gramin Bank", shortName: "RMGB", type: "rrb", state: "Rajasthan", indicativeRate: 9.0 },
  { bank: "Saurashtra Gramin Bank", shortName: "SGB", type: "rrb", state: "Gujarat", indicativeRate: 9.0 },
  { bank: "Tamil Nadu Grama Bank", shortName: "TNGB", type: "rrb", state: "Tamil Nadu", indicativeRate: 9.0 },
  { bank: "Telangana Grameena Bank", shortName: "TGB", type: "rrb", state: "Telangana", indicativeRate: 9.0 },
  { bank: "Tripura Gramin Bank", shortName: "TGB Tripura", type: "rrb", state: "Tripura", indicativeRate: 9.1 },
  { bank: "Uttar Pradesh Gramin Bank", shortName: "UPGB", type: "rrb", state: "Uttar Pradesh", indicativeRate: 9.0 },
  { bank: "Uttarakhand Gramin Bank", shortName: "UKGB", type: "rrb", state: "Uttarakhand", indicativeRate: 9.0 },
];

export const indianStatesWithRegionalBanks = Array.from(
  new Set(regionalBankOffers.map((bank) => bank.state).filter(Boolean))
).sort() as string[];

export function getBankOffersByState(state: string) {
  return regionalBankOffers.filter((bank) => bank.state === state);
}

export const defaultBankOffers = [
  ...nationalBankOffers,
  ...regionalBankOffers.filter((bank) => bank.state === "West Bengal"),
];