import type { SupabaseClient } from "@supabase/supabase-js";

import { resolveCanonicalTrust } from "./resolveCanonicalTrust";
import type {
  CanonicalTrustModel,
  CanonicalTrustSubject,
} from "./types";

export type LoadCanonicalTrustOptions = {
  subject?: CanonicalTrustSubject;
};

async function optionalSingle(
  query: PromiseLike<{
    data: unknown;
    error: { message?: string } | null;
  }>
): Promise<Record<string, unknown>> {
  const result = await query;

  if (result.error) return {};

  return (
    (result.data as Record<string, unknown> | null) ??
    {}
  );
}

/**
 * REG-INT-01A
 *
 * Loads existing canonical trust inputs and resolves one
 * presentation-safe trust model. It creates no new verification
 * state and does not replace registration authority.
 */
export async function loadCanonicalTrust(
  supabase: SupabaseClient,
  userId: string,
  options: LoadCanonicalTrustOptions = {}
): Promise<CanonicalTrustModel> {
  const [
    profile,
    businessProfile,
    professionalProfile,
    certificate,
  ] = await Promise.all([
    optionalSingle(
      supabase
        .from("profiles")
        .select(
          [
            "id",
            "approval_status",
            "registration_verification_status",
            "registration_verification_score",
            "registration_verified_at",
          ].join(",")
        )
        .eq("id", userId)
        .maybeSingle()
    ),
    optionalSingle(
      supabase
        .from("business_profiles")
        .select(
          [
            "user_id",
            "business_verification_status",
            "verification_status",
            "approval_status",
            "location_verification_status",
            "business_profile_complete",
            "is_complete",
            "registration_complete",
          ].join(",")
        )
        .eq("user_id", userId)
        .maybeSingle()
    ),
    optionalSingle(
      supabase
        .from("individual_professional_profiles")
        .select("user_id,verification_status")
        .eq("user_id", userId)
        .maybeSingle()
    ),
    optionalSingle(
      supabase
        .from("registration_verification_certificates")
        .select(
          "certificate_number,status,issued_at"
        )
        .eq("user_id", userId)
        .maybeSingle()
    ),
  ]);

  return resolveCanonicalTrust({
    userId,
    subject: options.subject,
    profile,
    businessProfile,
    professionalProfile,
    certificate,
  });
}
