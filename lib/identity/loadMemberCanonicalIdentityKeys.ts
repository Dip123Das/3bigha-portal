import type { SupabaseClient } from "@supabase/supabase-js";

function cleanKeys(values: unknown): string[] {
  if (!Array.isArray(values)) return [];

  return Array.from(
    new Set(
      values
        .map((value) => String(value || "").trim())
        .filter(Boolean)
    )
  );
}

export type MemberCanonicalIdentitySources = {
  businessIdentityKeys: string[];
  businessPersonalRoleKeys: string[];
  individualProfessionalIdentityKeys: string[];
  allIdentityKeys: string[];
};

export async function loadMemberCanonicalIdentityKeys(
  supabase: SupabaseClient,
  userId: string
): Promise<MemberCanonicalIdentitySources> {
  const [
    businessResult,
    individualProfessionalResult,
  ] = await Promise.all([
    supabase
      .from("business_profiles")
      .select(
        "business_identities,individual_identities"
      )
      .eq("user_id", userId)
      .maybeSingle(),

    supabase
      .from("individual_professional_profiles")
      .select("primary_skill_key")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  /*
   * A missing row is normal:
   *
   * - buyers may have neither profile,
   * - business members normally use business_profiles,
   * - individual skilled professionals normally use
   *   individual_professional_profiles.
   *
   * Actual database errors must still surface.
   */
  if (
    businessResult.error &&
    businessResult.error.code !== "PGRST116"
  ) {
    throw new Error(
      `Business canonical identity lookup failed: ${businessResult.error.message}`
    );
  }

  if (
    individualProfessionalResult.error &&
    individualProfessionalResult.error.code !== "PGRST116"
  ) {
    throw new Error(
      `Individual canonical identity lookup failed: ${individualProfessionalResult.error.message}`
    );
  }

  const businessIdentityKeys = cleanKeys(
    businessResult.data?.business_identities
  );

  const businessPersonalRoleKeys = cleanKeys(
    businessResult.data?.individual_identities
  );

  const primarySkillKey = String(
    individualProfessionalResult.data
      ?.primary_skill_key || ""
  ).trim();

  const individualProfessionalIdentityKeys =
    primarySkillKey
      ? [primarySkillKey]
      : [];

  const allIdentityKeys = Array.from(
    new Set([
      ...businessIdentityKeys,
      ...businessPersonalRoleKeys,
      ...individualProfessionalIdentityKeys,
    ])
  );

  return {
    businessIdentityKeys,
    businessPersonalRoleKeys,
    individualProfessionalIdentityKeys,
    allIdentityKeys,
  };
}
