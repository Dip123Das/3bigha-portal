export type LiveLenderOffer = {
  id: string;

  lender_name: string;
  lender_type: string;

  state?: string | null;
  district?: string | null;

  product_type: string;

  min_roi: number;
  max_roi?: number | null;

  processing_fee_percent?: number | null;

  min_cibil?: number | null;
  max_foir_percent?: number | null;

  max_tenure_years?: number | null;
  ltv_percent?: number | null;

  terms_note?: string | null;

  updated_at?: string | null;
};