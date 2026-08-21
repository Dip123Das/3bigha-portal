import type { SupabaseClient } from "@supabase/supabase-js";

import { resolveCanonicalTrust } from "./resolveCanonicalTrust";
import type {
  CanonicalTrustModel,
  CanonicalTrustSubject,
} from "./types";

export type LoadCanonicalTrustBulkOptions = {
  subject?: CanonicalTrustSubject;
};

type Row = Record<string, unknown>;

function normalizeUserIds(userIds: readonly string[]) {
  return Array.from(
    new Set(
      userIds
        .map((value) => String(value ?? "").trim())
        .filter(Boolean)
    )
  );
}

async function optionalRows(
  query: PromiseLike<{
    data: unknown;
    error: { message?: string } | null;
  }>
): Promise<Row[]> {
  const result = await query;

  if (result.error || !Array.isArray(result.data)) {
    return [];
  }

  return result.data as Row[];
}

function mapRows(rows: Row[], key: string) {
  const output = new Map<string, Row>();

  for (const row of rows) {
    const value = String(row[key] ?? "").trim();
    if (value) output.set(value, row);
  }

  return output;
}

/**
 * REG-INT-01D.1
 *
 * Loads canonical trust inputs for many marketplace owners in four
 * database queries instead of calling loadCanonicalTrust once per card.
 */
export async function loadCanonicalTrustBulk(
  supabase: SupabaseClient,
  userIds: readonly string[],
  options: LoadCanonicalTrustBulkOptions = {}
): Promise<Map<string, CanonicalTrustModel>> {
  const ids = normalizeUserIds(userIds);
  const output = new Map<string, CanonicalTrustModel>();

  if (ids.length === 0) return output;

  const [
    profiles,
    businessProfiles,
    professionalProfiles,
    certificates,
  ] = await Promise.all([
    optionalRows(
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
        .in("id", ids)
    ),
    optionalRows(
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
        .in("user_id", ids)
    ),
    optionalRows(
      supabase
        .from("individual_professional_profiles")
        .select("user_id,verification_status")
        .in("user_id", ids)
    ),
    optionalRows(
      supabase
        .from("registration_verification_certificates")
        .select("user_id,certificate_number,status,issued_at")
        .in("user_id", ids)
    ),
  ]);

  const profileByUser = mapRows(profiles, "id");
  const businessByUser = mapRows(businessProfiles, "user_id");
  const professionalByUser = mapRows(
    professionalProfiles,
    "user_id"
  );
  const certificateByUser = mapRows(certificates, "user_id");

  for (const userId of ids) {
    output.set(
      userId,
      resolveCanonicalTrust({
        userId,
        subject: options.subject,
        profile: profileByUser.get(userId) ?? null,
        businessProfile: businessByUser.get(userId) ?? null,
        professionalProfile:
          professionalByUser.get(userId) ?? null,
        certificate: certificateByUser.get(userId) ?? null,
      })
    );
  }

  return output;
}
