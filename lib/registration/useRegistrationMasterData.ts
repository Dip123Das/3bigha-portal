"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

export type RegistrationIdentityOption = {
  identity_key: string;
  label: string;
  registration_scopes: string[];
  lifetime_free_candidate: boolean;
  redirect_to_business: boolean;
  requires_professional_verification: boolean;
  is_active: boolean;
  sort_order: number;
};

export type RegistrationLegalConstitution = {
  key: string;
  label: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
};

export type RegistrationBusinessSector = {
  key: string;
  title: string;
  description: string | null;
  symbol: string | null;
  sort_order: number;
  is_active: boolean;
};

export type RegistrationSectorMapping = {
  identity_key: string;
  sector_key: string;
  nature_modules: string[];
  sort_order: number;
  is_active: boolean;
};

export type RegistrationRedirectRule = {
  id: number;
  trigger_key: string;
  display_text: string;
  description: string | null;
  target_registration_path: string;
  redirect_after_selection: boolean;
  business_reason: string | null;
  target_business_identity_key: string | null;
  sort_order: number;
  is_active: boolean;
};

export function useRegistrationMasterData() {
  const supabase = useMemo(() => getSupabaseBrowser(), []);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [identities, setIdentities] =
    useState<RegistrationIdentityOption[]>([]);
  const [legalConstitutions, setLegalConstitutions] =
    useState<RegistrationLegalConstitution[]>([]);
  const [businessSectors, setBusinessSectors] =
    useState<RegistrationBusinessSector[]>([]);
  const [sectorMappings, setSectorMappings] =
    useState<RegistrationSectorMapping[]>([]);
  const [redirectRules, setRedirectRules] =
    useState<RegistrationRedirectRule[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    const [
      identityResult,
      legalResult,
      sectorResult,
      mappingResult,
      redirectResult,
    ] = await Promise.all([
      supabase
        .from("identity_master")
        .select(
          "identity_key,label,registration_scopes,lifetime_free_candidate,redirect_to_business,requires_professional_verification,is_active,sort_order"
        )
        .eq("is_active", true)
        .order("sort_order")
        .order("label"),

      supabase
        .from("registration_legal_constitutions")
        .select("key,label,description,sort_order,is_active")
        .eq("is_active", true)
        .order("sort_order")
        .order("label"),

      supabase
        .from("registration_business_sectors")
        .select("key,title,description,symbol,sort_order,is_active")
        .eq("is_active", true)
        .order("sort_order")
        .order("title"),

      supabase
        .from("registration_identity_sector_map")
        .select(
          "identity_key,sector_key,nature_modules,sort_order,is_active"
        )
        .eq("is_active", true)
        .order("sort_order"),

      supabase
        .from("registration_redirect_rules")
        .select(
          "id,trigger_key,display_text,description,target_registration_path,redirect_after_selection,business_reason,target_business_identity_key,sort_order,is_active"
        )
        .eq("is_active", true)
        .order("sort_order")
        .order("display_text"),
    ]);

    const firstError =
      identityResult.error ||
      legalResult.error ||
      sectorResult.error ||
      mappingResult.error ||
      redirectResult.error;

    if (firstError) {
      setError(firstError.message);
      setLoading(false);
      return;
    }

    setIdentities(
      (identityResult.data || []).map((row: any) => ({
        ...row,
        registration_scopes: Array.isArray(row.registration_scopes)
          ? row.registration_scopes
          : [],
      }))
    );

    setLegalConstitutions(
      (legalResult.data || []) as RegistrationLegalConstitution[]
    );

    setBusinessSectors(
      (sectorResult.data || []) as RegistrationBusinessSector[]
    );

    setSectorMappings(
      (mappingResult.data || []).map((row: any) => ({
        ...row,
        nature_modules: Array.isArray(row.nature_modules)
          ? row.nature_modules
          : [],
      }))
    );

    setRedirectRules(
      (redirectResult.data || []) as RegistrationRedirectRule[]
    );

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  const identityIndex = useMemo(
    () =>
      new Map(
        identities.map((identity) => [
          identity.identity_key,
          identity,
        ])
      ),
    [identities]
  );

  const businessIdentities = useMemo(
    () =>
      identities.filter((identity) =>
        identity.registration_scopes.includes("business_identity")
      ),
    [identities]
  );

  const businessPersonalRoles = useMemo(
    () =>
      identities.filter((identity) =>
        identity.registration_scopes.includes(
          "business_personal_role"
        )
      ),
    [identities]
  );

  const individualSkills = useMemo(
    () =>
      identities.filter(
        (identity) =>
          identity.registration_scopes.includes("individual_skill") &&
          identity.lifetime_free_candidate &&
          !identity.redirect_to_business
      ),
    [identities]
  );

  const mappingsBySector = useMemo(() => {
    const map = new Map<string, RegistrationSectorMapping[]>();

    for (const row of sectorMappings) {
      const rows = map.get(row.sector_key) || [];
      rows.push(row);
      map.set(row.sector_key, rows);
    }

    return map;
  }, [sectorMappings]);

  const mappingsByIdentity = useMemo(() => {
    const map = new Map<string, RegistrationSectorMapping[]>();

    for (const row of sectorMappings) {
      const rows = map.get(row.identity_key) || [];
      rows.push(row);
      map.set(row.identity_key, rows);
    }

    return map;
  }, [sectorMappings]);

  const businessIdentitiesForSector = useCallback(
    (sectorKey: string) =>
      (mappingsBySector.get(sectorKey) || [])
        .map((mapping) => {
          const identity = identityIndex.get(mapping.identity_key);

          if (!identity) return null;

          return {
            key: identity.identity_key,
            label: identity.label,
            nature: mapping.nature_modules,
            sort_order: mapping.sort_order,
          };
        })
        .filter(Boolean)
        .sort(
          (a: any, b: any) =>
            a.sort_order - b.sort_order ||
            a.label.localeCompare(b.label)
        ) as Array<{
        key: string;
        label: string;
        nature: string[];
        sort_order: number;
      }>,
    [identityIndex, mappingsBySector]
  );

  const natureForBusinessIdentities = useCallback(
    (keys: string[]) =>
      Array.from(
        new Set(
          keys.flatMap((key) =>
            (mappingsByIdentity.get(key) || []).flatMap(
              (mapping) => mapping.nature_modules
            )
          )
        )
      ),
    [mappingsByIdentity]
  );

  const identityLabel = useCallback(
    (key: string) => identityIndex.get(key)?.label || key,
    [identityIndex]
  );

  return {
    loading,
    error,
    reload: load,

    identities,
    legalConstitutions,
    businessSectors,
    sectorMappings,
    redirectRules,

    businessIdentities,
    businessPersonalRoles,
    individualSkills,

    businessIdentitiesForSector,
    natureForBusinessIdentities,
    identityLabel,
  };
}
