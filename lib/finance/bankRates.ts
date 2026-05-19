export type BankOffer = {
  bank: string;
  shortName: string;
  type: "public" | "private" | "cooperative" | "rrb" | "small_finance";
  state?: string;
  indicativeRate: number;
};

export const nationalBankOffers: BankOffer[] = [
  { bank: "State Bank of India", shortName: "SBI", type: "public", indicativeRate: 8.5 },
  { bank: "HDFC Bank", shortName: "HDFC", type: "private", indicativeRate: 8.75 },
  { bank: "ICICI Bank", shortName: "ICICI", type: "private", indicativeRate: 8.75 },
  { bank: "Axis Bank", shortName: "Axis", type: "private", indicativeRate: 8.75 },
  { bank: "Punjab National Bank", shortName: "PNB", type: "public", indicativeRate: 8.5 },
  { bank: "Bank of Baroda", shortName: "BOB", type: "public", indicativeRate: 8.5 },
  { bank: "Canara Bank", shortName: "Canara", type: "public", indicativeRate: 8.55 },
  { bank: "Union Bank of India", shortName: "Union", type: "public", indicativeRate: 8.55 },
  { bank: "Bank of India", shortName: "BOI", type: "public", indicativeRate: 8.6 },
  { bank: "Indian Bank", shortName: "Indian Bank", type: "public", indicativeRate: 8.6 },
  { bank: "UCO Bank", shortName: "UCO", type: "public", indicativeRate: 8.65 },
  { bank: "Central Bank of India", shortName: "CBI", type: "public", indicativeRate: 8.65 },
  { bank: "IDBI Bank", shortName: "IDBI", type: "private", indicativeRate: 8.75 },
  { bank: "Kotak Mahindra Bank", shortName: "Kotak", type: "private", indicativeRate: 8.85 },
  { bank: "Federal Bank", shortName: "Federal", type: "private", indicativeRate: 8.9 },
];

export const regionalBankOffers: BankOffer[] = [
  { bank: "West Bengal Gramin Bank", shortName: "WBGB", type: "rrb", state: "West Bengal", indicativeRate: 9.0 },
  { bank: "Bangiya Gramin Vikash Bank", shortName: "BGVB", type: "rrb", state: "West Bengal", indicativeRate: 9.0 },
  { bank: "The West Bengal State Co-operative Bank", shortName: "WBSCB", type: "cooperative", state: "West Bengal", indicativeRate: 9.25 },

  { bank: "Assam Gramin Vikash Bank", shortName: "AGVB", type: "rrb", state: "Assam", indicativeRate: 9.0 },
  { bank: "Kerala Gramin Bank", shortName: "KGB", type: "rrb", state: "Kerala", indicativeRate: 9.0 },
  { bank: "Karnataka Gramin Bank", shortName: "KGB Karnataka", type: "rrb", state: "Karnataka", indicativeRate: 9.0 },
  { bank: "Maharashtra Gramin Bank", shortName: "MGB", type: "rrb", state: "Maharashtra", indicativeRate: 9.0 },
  { bank: "Punjab Gramin Bank", shortName: "PGB", type: "rrb", state: "Punjab", indicativeRate: 9.0 },
  { bank: "Rajasthan Marudhara Gramin Bank", shortName: "RMGB", type: "rrb", state: "Rajasthan", indicativeRate: 9.0 },
  { bank: "Madhya Pradesh Gramin Bank", shortName: "MPGB", type: "rrb", state: "Madhya Pradesh", indicativeRate: 9.0 },
  { bank: "Uttarbanga Kshetriya Gramin Bank", shortName: "UBKGB", type: "rrb", state: "West Bengal", indicativeRate: 9.0 },
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