export type BankerVerificationStatus =
  | "pending"
  | "ai_checked"
  | "needs_manual_review"
  | "verified"
  | "rejected";

export type FinanceBankerProfile = {
  id: string;
  user_id?: string | null;

  full_name: string;
  bank_name: string;
  branch_name: string;
  ifsc_code: string;
  branch_code?: string | null;
  employee_id: string;
  designation: string;

  official_email?: string | null;
  official_mobile?: string | null;

  employee_card_url?: string | null;
  id_card_ocr_text?: string | null;

  ai_verification_status: BankerVerificationStatus;
  ai_verification_notes?: string | null;

  manual_verification_status: BankerVerificationStatus;
  manual_verification_notes?: string | null;

  final_status: BankerVerificationStatus;

  verified_by?: string | null;
  verified_at?: string | null;

  created_at: string;
  updated_at: string;
};