"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
import { trackVendorConversionClient } from "@/components/marketplace/vendor-conversion-client";
import type { GeoSelection } from "@/components/geography/GeoSelector";
import UniversalMediaUploader from "@/app/components/media/UniversalMediaUploader";
import type { UploadedMediaAsset } from "@/lib/media/media-config";
import { validateGstin } from "@/lib/vendor-verification/gstin";
import {
  DECLARABLE_IDENTITY_FAMILIES,
  DECLARABLE_IDENTITIES,
  DEFAULT_DECLARABLE_IDENTITIES,
  getHumanIdentity,
  getIdentityDeclarationBridge,
  getIdentityFamilyLabel,
  getIdentityFamilyOptions,
  getLocalIdentityLabel,
  type HumanIdentityKey,
  type IdentityFamilyKey,
  type LegacyModuleKey,
} from "@/lib/3bos/identity";

type ManagedIdentity = {
  identity_key: string;
  label: string;
  family_key: string;
  workspace_label: string;
  description: string;
  aliases: string[];
  legacy_role: "buyer" | "vendor" | "builder" | "hub_vendor" | "blogger" | "banker" | "investor";
  legacy_modules: LegacyModuleKey[];
  requires_business_onboarding: boolean;
  requires_professional_verification: boolean;
  is_featured: boolean;
  sort_order: number;
};

type OperatingProfile = "individual_professional" | "multi_service_professional" | "multi_business_organisation";

const OPERATING_PROFILES: Array<{
  key: OperatingProfile;
  label: string;
  description: string;
  limit: number | null;
  plan: string;
}> = [
  { key: "individual_professional", label: "Individual Professional", description: "One profession, trade or business category.", limit: 1, plan: "Individual Growth Plan" },
  { key: "multi_service_professional", label: "Multi-Service Professional", description: "Several related services under one professional or business identity.", limit: 5, plan: "Multi-Service Growth Plan" },
  { key: "multi_business_organisation", label: "Multi-Business Organisation", description: "Separate businesses, brands or establishments with no category limit.", limit: null, plan: "Multi-Business Operating Plan" },
];

const BUSINESS_EVIDENCE_IDENTITIES = new Set([
  "property_owner", "land_owner", "builder", "real_estate_developer", "housing_society",
  "construction_business", "contractor", "civil_contractor", "electrical_contractor",
  "plumbing_contractor", "interior_contractor", "road_contractor", "infrastructure_contractor",
  "material_business", "manufacturer", "dealer", "distributor", "wholesaler", "retail_business",
  "rental_business", "transport_business", "fleet_owner", "financial_institution",
  "agriculture_business", "institution", "multi_business_operator",
]);

function safeNextPath(raw: string | null) {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "";
  return raw;
}

function normalizePhone(raw: string) {
  return raw.replace(/[^\d+]/g, "").trim();
}

function lgdCode(raw: string | null | undefined) {
  const value = Number(raw);
  return Number.isInteger(value) && value > 0 ? value : null;
}

function resolvePermittedRole(
  operatingProfile: OperatingProfile,
  roles: ManagedIdentity["legacy_role"][]
): ManagedIdentity["legacy_role"] {
  const uniqueRoles = Array.from(new Set(roles));
  if (operatingProfile === "multi_business_organisation") {
    if (uniqueRoles.length === 1 && uniqueRoles[0] === "investor") return "investor";
    if (uniqueRoles.length === 1 && uniqueRoles[0] === "buyer") return "buyer";
    return "hub_vendor";
  }
  if (uniqueRoles.length === 1) return uniqueRoles[0];
  if (uniqueRoles.every((role) => ["vendor", "builder", "hub_vendor", "blogger"].includes(role))) {
    return "hub_vendor";
  }
  return roles[0] || "buyer";
}

const PERMITTED_ROLE_LABELS: Record<string, string> = {
  buyer: "Buyer",
  vendor: "Vendor / Professional",
  builder: "Builder / Real Estate Developer",
  hub_vendor: "Multi-Business Operator",
  blogger: "Author / Publisher",
  investor: "Investor",
  banker: "Banking Professional",
  finance_banker: "Finance Banker",
  blog_admin: "Blog Admin",
  admin: "Admin",
  master_admin: "Master Admin",
};

export default function RegisterRolePageClient() {
  const router = useRouter();
  const sp = useSearchParams();
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const next = safeNextPath(sp.get("next"));
  const isMasterAdminRequest = (sp.get("role") || "").toLowerCase() === "master_admin";

  const [operatingProfile, setOperatingProfile] = useState<OperatingProfile>("individual_professional");
  const [identityKeys, setIdentityKeys] = useState<string[]>([]);
  const identityKey = identityKeys[0] || "";
  const [managedIdentities, setManagedIdentities] = useState<ManagedIdentity[]>([]);
  const [family, setFamily] = useState<IdentityFamilyKey | "">("");
  const [search, setSearch] = useState("");
  const [showAllIdentities, setShowAllIdentities] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [gstin, setGstin] = useState("");
  const [tradeLicenseNo, setTradeLicenseNo] = useState("");
  const [udyamNo, setUdyamNo] = useState("");
  const [evidenceFiles, setEvidenceFiles] = useState<UploadedMediaAsset[]>([]);
  const [geography, setGeography] = useState<GeoSelection>({});
  const [pincode, setPincode] = useState("");
  const [locating, setLocating] = useState(false);
  const [locationMsg, setLocationMsg] = useState("");
  const [locationCaptured, setLocationCaptured] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const stateName = geography.state?.name || "";
  const districtName = geography.district?.name || "";
  const localityName = geography.place?.name || geography.block?.name || "";
  const cityName = localityName || districtName;

  useEffect(() => {
    trackVendorConversionClient({
      eventType: "registration_started",
      source: "human_identity_declaration",
      label: "3Bigha Member Identity Declaration Started",
    });
  }, []);

  useEffect(() => {
    let alive = true;
    supabase
      .from("identity_master")
      .select("identity_key,label,family_key,workspace_label,description,aliases,legacy_role,legacy_modules,requires_business_onboarding,requires_professional_verification,is_featured,sort_order")
      .eq("is_active", true)
      .order("sort_order")
      .order("label")
      .then(({ data, error }) => {
        // Registration continues with the constitutional code registry until
        // the managed identity migration has been applied successfully.
        if (alive && !error && data) setManagedIdentities(data as ManagedIdentity[]);
      });
    return () => { alive = false; };
  }, [supabase]);

  const identityOptions = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (managedIdentities.length) {
      const source = family || query || showAllIdentities
        ? managedIdentities
        : managedIdentities
            .filter((item) => item.is_featured)
            .slice(0, 9);
      return source.filter((item) => {
        if (item.identity_key === "multi_business_operator") return false;
        const matchesFamily = !family || item.family_key === family;
        const text = `${item.label} ${item.description} ${(item.aliases || []).join(" ")}`.toLowerCase();
        return matchesFamily && (!query || text.includes(query));
      }).map((item) => ({ ...item, key: item.identity_key }));
    }

    const allIdentities = DECLARABLE_IDENTITIES.map(getHumanIdentity).filter((item) => item.key !== "multi_business_operator");
    const source = family
      ? getIdentityFamilyOptions(family)
      : search.trim() || showAllIdentities
        ? allIdentities
        : DEFAULT_DECLARABLE_IDENTITIES.map(getHumanIdentity);
    if (!query) return source;
    return source.filter((item) =>
      `${item.label} ${item.description} ${getLocalIdentityLabel(item.key, stateName)}`
        .toLowerCase()
        .includes(query)
    );
  }, [family, managedIdentities, search, showAllIdentities, stateName]);

  const managedSelection = managedIdentities.find((item) => item.identity_key === identityKey);
  const identityLabel = managedSelection?.label || (identityKey ? getLocalIdentityLabel(identityKey as HumanIdentityKey, stateName) : "");
  const operatingDefinition = OPERATING_PROFILES.find((item) => item.key === operatingProfile)!;
  const selectedLegacyRoles = identityKeys.map((key) => {
    const managed = managedIdentities.find((item) => item.identity_key === key);
    return managed?.legacy_role || getIdentityDeclarationBridge(key as HumanIdentityKey).role;
  });
  const protectedSelectedRole = selectedLegacyRoles.find((role) =>
    ["master_admin", "admin", "blog_admin", "banker", "finance_banker"].includes(role)
  );
  const recommendedPermittedRole = identityKeys.length
    ? protectedSelectedRole || resolvePermittedRole(operatingProfile, selectedLegacyRoles)
    : "";
  const recommendedRoleLabel = recommendedPermittedRole
    ? PERMITTED_ROLE_LABELS[recommendedPermittedRole] || recommendedPermittedRole
    : "";
  const needsBusinessProfile = operatingProfile === "multi_business_organisation" || identityKeys.some((key) => {
    const managed = managedIdentities.find((item) => item.identity_key === key);
    return managed?.requires_business_onboarding ?? getIdentityDeclarationBridge(key as HumanIdentityKey).requiresBusinessOnboarding;
  });
  const requiresBusinessEvidence = operatingProfile === "multi_business_organisation" || identityKeys.some((key) => BUSINESS_EVIDENCE_IDENTITIES.has(key));

  function selectIdentity(key: string) {
    setMsg("");
    setIdentityKeys((current) => {
      if (current.includes(key)) {
        if (current[0] === key && current.length > 1) return [current[1], ...current.slice(2)];
        return current.filter((item) => item !== key);
      }
      if (operatingDefinition.limit && current.length >= operatingDefinition.limit) {
        setMsg(`Your ${operatingDefinition.label} profile supports ${operatingDefinition.limit} ${operatingDefinition.limit === 1 ? "category" : "categories"}. Choose the appropriate Growth Plan to add more.`);
        return current;
      }
      return [...current, key];
    });
  }

  function changeOperatingProfile(nextProfile: OperatingProfile) {
    const definition = OPERATING_PROFILES.find((item) => item.key === nextProfile)!;
    setOperatingProfile(nextProfile);
    setIdentityKeys((current) => definition.limit ? current.slice(0, definition.limit) : current);
    setMsg("");
  }

  if (isMasterAdminRequest) {
    return (
      <main style={{ padding: "40px 20px", textAlign: "center" }}>
        <div style={{ fontWeight: 900, fontSize: 18 }}>Master Admin access is already configured.</div>
        <a href="/admin/dashboard" style={{ display: "inline-flex", marginTop: 16, padding: "10px 16px", borderRadius: 10, background: "#2563eb", color: "white", fontWeight: 800, textDecoration: "none" }}>
          Open Master Admin Workspace
        </a>
      </main>
    );
  }

  function validateForm() {
    if (!fullName.trim()) return "Please enter your full name.";
    if (normalizePhone(phone).length < 10) return "Please enter a valid phone number.";
    if (
      !locationCaptured ||
      !geography.state?.id ||
      !geography.district?.id
    ) {
      return "Please use your current location before continuing.";
    }
    if (!identityKey) return "Please choose at least one work category.";
    if (needsBusinessProfile && !businessName.trim()) return "Please enter your business or professional name.";
    if (requiresBusinessEvidence && !gstin.trim() && !tradeLicenseNo.trim() && !udyamNo.trim()) return "Please provide GSTIN, Trade Licence or Udyam registration.";
    if (requiresBusinessEvidence && evidenceFiles.length === 0) return "Please upload one supporting registration document.";
    if (gstin.trim() && !validateGstin(gstin).valid) return "The GSTIN format does not appear valid. Please check it and try again.";
    if (operatingProfile === "multi_service_professional" && identityKeys.length < 2) return "Please choose at least two categories for a Multi-Service Professional profile.";
    if (operatingDefinition.limit && identityKeys.length > operatingDefinition.limit) return `Please choose no more than ${operatingDefinition.limit} categories.`;
    return "";
  }

  async function useCurrentLocation() {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setLocationCaptured(false);
      setLocationMsg(
        "Current location is required, but this browser does not support it. Please use a supported browser and allow location access."
      );
      return;
    }

    setLocationCaptured(false);
    setLocating(true);
    setLocationMsg("Checking your current location…");
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const response = await fetch("/api/onboarding/verify-location", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              lat: coords.latitude,
              lng: coords.longitude,
              accuracy: coords.accuracy,
            }),
          });
          const detected = await response.json().catch(() => null);
          if (!response.ok || !detected?.ok) throw new Error(detected?.error || "Could not identify this location.");

          const query = detected.postcode || detected.locality || detected.district;
          if (!query) throw new Error("No LGD match was found for the detected location.");
          const optionsResponse = await fetch(`/api/geography/options?type=search&q=${encodeURIComponent(query)}&limit=25`, { cache: "no-store" });
          const optionsJson = await optionsResponse.json().catch(() => null);
          const options = Array.isArray(optionsJson?.options) ? optionsJson.options : [];
          const normalizedDistrict = String(detected.district || "").toLowerCase();
          const match = options.find((item: any) =>
            !normalizedDistrict || String(item.district_name || "").toLowerCase() === normalizedDistrict
          ) || options[0];
          if (!match?.state_id || !match?.district_id) {
            throw new Error("We detected your area, but could not safely match it to an official LGD location. You can complete the exact official address in the next step.");
          }

          const isUrban = Boolean(match.local_body_id || match.ward_id);
          setGeography({
            state: { id: match.state_id, name: match.state_name || detected.state || "" },
            district: { id: match.district_id, name: match.district_name || detected.district || "" },
            subdivision: match.subdivision_id
              ? { id: match.subdivision_id, name: match.subdivision_name || "" }
              : null,
            block: isUrban
              ? match.local_body_id
                ? { id: match.local_body_id, name: match.local_body_name || "", place_type: "LOCAL_BODY" }
                : null
              : match.block_id
                ? { id: match.block_id, name: match.block_name || "" }
                : null,
            place: {
              id: isUrban ? match.ward_id || match.local_body_id || match.id : match.village_id || match.id,
              name: match.ward_name || match.name,
              pincode: match.pincode || detected.postcode || null,
              place_type: match.place_type || null,
            },
          });
          setPincode(String(match.pincode || detected.postcode || ""));
          setLocationCaptured(true);
          setLocationMsg(
            "Current location verified successfully. Your complete official address will be confirmed in the next Business Profile step."
          );
        } catch (error: any) {
          setLocationCaptured(false);
          setLocationMsg(
            error?.message ||
              "Current location could not be verified. Please allow location access and try again."
          );
        } finally {
          setLocating(false);
        }
      },
      (error) => {
        setLocationCaptured(false);
        setLocating(false);

        const denied =
          typeof error?.code === "number" && error.code === 1;

        setLocationMsg(
          denied
            ? "Location permission is required. Please allow location access in your browser and try again."
            : error?.message ||
                "Current location could not be verified. Please try again."
        );
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 }
    );
  }

  async function syncModuleGrants() {
    const { error } = await supabase.rpc("sync_member_module_grants");
    return error;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const validationError = validateForm();
    if (validationError) return setMsg(validationError);
    if (!identityKey) return;

    setLoading(true);
    setMsg("");
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      if (!user?.id) throw new Error("No active session found. Please login again.");

      let documentVerification: Record<string, unknown> | null = null;
      if (requiresBusinessEvidence && (gstin.trim() || tradeLicenseNo.trim() || udyamNo.trim())) {
        const verificationResponse = await fetch("/api/ai/vendor-document-verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({
            gstin: gstin.trim(),
            tradeLicenseNo: tradeLicenseNo.trim() || udyamNo.trim(),
            businessName: businessName.trim(),
            businessAddress: [cityName, districtName, stateName, pincode.trim()].filter(Boolean).join(", "),
            mediaAssets: evidenceFiles,
          }),
        });
        const verificationJson = await verificationResponse.json().catch(() => null);
        if (!verificationResponse.ok || !verificationJson?.ok) {
          throw new Error(verificationJson?.error || "The registration document could not be checked. Please try again.");
        }
        documentVerification = verificationJson.verification;
        const status = String(verificationJson?.verification?.status || "");
        if (status === "format_invalid" || status === "format_valid_document_mismatch") {
          window.alert("The registration number and uploaded document do not match. Please correct the number or upload the matching document.");
          throw new Error("Registration document mismatch. Please review the highlighted business evidence.");
        }
      }

      const identity = managedSelection || getHumanIdentity(identityKey as HumanIdentityKey);
      const bridge = managedSelection ? {
        role: managedSelection.legacy_role,
        modules: managedSelection.legacy_modules || [],
        portalUseReason: managedSelection.legacy_role === "buyer" ? "buy_property_or_materials" : "offer_services",
        requiresBusinessOnboarding: managedSelection.requires_business_onboarding,
        requiresProfessionalVerification: managedSelection.requires_professional_verification,
      } : getIdentityDeclarationBridge(identityKey as HumanIdentityKey);
      const displayLabel = managedSelection?.label || getLocalIdentityLabel(identityKey as HumanIdentityKey, stateName);
      const selectedBridges = identityKeys.map((key) => {
        const managed = managedIdentities.find((item) => item.identity_key === key);
        return managed ? {
          modules: managed.legacy_modules || [],
          requiresBusinessOnboarding: managed.requires_business_onboarding,
          requiresProfessionalVerification: managed.requires_professional_verification,
        } : getIdentityDeclarationBridge(key as HumanIdentityKey);
      });
      const allModules = Array.from(new Set(selectedBridges.flatMap((item) => item.modules))) as LegacyModuleKey[];
      // Navigation and follow-on onboarding mirror the primary catalogue mapping;
      // the database remains authoritative and validates every selected identity.
      const effectiveRole = resolvePermittedRole(
        operatingProfile,
        identityKeys.map((key) => {
          const managed = managedIdentities.find((item) => item.identity_key === key);
          return managed?.legacy_role || getIdentityDeclarationBridge(key as HumanIdentityKey).role;
        })
      );
      const requiresBusinessOnboarding = operatingProfile === "multi_business_organisation" || selectedBridges.some((item) => item.requiresBusinessOnboarding);
      const requiresProfessionalVerification = selectedBridges.some((item) => item.requiresProfessionalVerification);

      const { error: authError } = await supabase.auth.updateUser({
        data: {
          ...(user.user_metadata || {}),
          member_identity_status: "declared",
          primary_human_identity: identityKey,
          human_identities: identityKeys,
          operating_profile: operatingProfile,
          category_limit: operatingDefinition.limit,
          recommended_growth_plan: operatingDefinition.plan,
          human_identity_label: identity.label,
          human_identity_local_label: displayLabel,
          human_identity_declared_at: new Date().toISOString(),
          professional_verification_required: requiresProfessionalVerification,
          lgd_location: {
            state_code: geography.state?.id || null,
            state_name: stateName,
            district_code: geography.district?.id || null,
            district_name: districtName,
            subdistrict_code: geography.subdivision?.id || null,
            subdistrict_name: geography.subdivision?.name || null,
            block_or_local_body_code: geography.block?.id || null,
            block_or_local_body_name: geography.block?.name || null,
            village_or_ward_code: geography.place?.id || null,
            village_or_ward_name: geography.place?.name || null,
            place_type: geography.place?.place_type || geography.block?.place_type || null,
            pincode: pincode.trim() || geography.place?.pincode || null,
            source: "LGD",
          },
        },
      });
      if (authError) throw authError;

      const placeType = String(geography.place?.place_type || "").toUpperCase();
      const blockType = String(geography.block?.place_type || "").toUpperCase();
      const isWard = placeType.includes("WARD");
      const isLocalBody = blockType.includes("LOCAL_BODY") || blockType.includes("MUNICIPAL");

      const { error: profileError } = await supabase.from("profiles").upsert({
        id: user.id,
        email: user.email ?? null,
        full_name: fullName.trim(),
        phone: normalizePhone(phone),
        city: cityName,
        state: stateName,
        onboarding_version: 3,
        onboarding_completed: true,
        portal_use_reason: bridge.portalUseReason,
        role_display_label: displayLabel,
        lgd_state_code: lgdCode(geography.state?.id),
        lgd_district_code: lgdCode(geography.district?.id),
        lgd_subdistrict_code: lgdCode(geography.subdivision?.id),
        lgd_block_code: isLocalBody ? null : lgdCode(geography.block?.id),
        lgd_village_code: isWard ? null : lgdCode(geography.place?.id),
        lgd_local_body_code: isLocalBody ? lgdCode(geography.block?.id) : null,
        lgd_ward_code: isWard ? lgdCode(geography.place?.id) : null,
      }, { onConflict: "id" });
      if (profileError) throw profileError;

      const { error: declarationError } = await supabase.rpc("declare_operating_profile", {
        p_operating_profile: operatingProfile,
        p_identity_keys: identityKeys,
        p_primary_identity_key: identityKey,
      });
      if (declarationError) throw declarationError;

      const { error: reRegistrationError } = await supabase.rpc("complete_required_re_registration");
      if (reRegistrationError) throw reRegistrationError;

      const grantsError = await syncModuleGrants();
      if (grantsError) throw grantsError;

      if (requiresBusinessOnboarding) {
        const natureOfBusiness = Array.from(new Set(allModules.map((key) =>
          key === "property_owner" || key === "property_builder" ? "property" :
          key === "blog_author" ? "blog" : key
        )));
        const { error: businessError } = await supabase.from("business_profiles").upsert({
          user_id: user.id,
          business_name: businessName.trim(),
          business_type: effectiveRole === "builder" ? "builder" : effectiveRole === "blogger" ? "blogger" : effectiveRole === "hub_vendor" ? "multi_business" : "vendor",
          nature_of_business: natureOfBusiness,
          gstin: gstin.trim() || null,
          trade_license_no: tradeLicenseNo.trim() || null,
          udyam_no: udyamNo.trim() || null,
          contact_person: fullName.trim(),
          phone_primary: normalizePhone(phone),
          city: cityName,
          district: districtName,
          locality: localityName || null,
          state: stateName,
          address_line1: null,
          pincode: pincode.trim() || geography.place?.pincode || null,
          business_media_json: evidenceFiles,
          vendor_document_verification_json: documentVerification,
        }, { onConflict: "user_id" });
        if (businessError) throw businessError;
      }

      trackVendorConversionClient({
        eventType: "registration_completed",
        source: "human_identity_declaration",
        label: "3Bigha Member Identity Declared",
        metadata: { identityKey, identityKeys, operatingProfile, legacyRole: effectiveRole, modules: allModules },
      });

      /*
       * Human-First Business Identity Builder
       *
       * Identity declaration is only the first stage. Business-facing
       * identities must continue into the canonical business onboarding
       * experience before registration can be completed or verification
       * status can be shown.
       *
       * The awaiting-approval page is a post-completion status destination,
       * not a substitute for business identity onboarding.
       */
      if (requiresBusinessOnboarding) {
        const onboardingReturnTo =
          next && next !== "/auth/awaiting-approval"
            ? next
            : "/dashboard";

        router.replace(
          `/onboarding/business?returnTo=${encodeURIComponent(
            onboardingReturnTo
          )}`
        );
      } else {
        router.replace(next || "/dashboard");
      }
    } catch (error: any) {
      setMsg(error?.message || "Could not save your identity. Please try again.");
      setLoading(false);
    }
  }

  return (
    <main style={{ padding: "32px 16px", background: "#f8fafc", minHeight: "100vh" }}>
      <div style={{ maxWidth: 1040, margin: "0 auto", border: "1px solid #e2e8f0", borderRadius: 18, padding: 24, background: "white", boxShadow: "0 12px 36px rgba(15,23,42,.06)" }}>
        <div style={{ color: "#1d4ed8", fontWeight: 900, fontSize: 13, letterSpacing: ".06em", textTransform: "uppercase" }}>Account created · Workspace setup</div>
        <h1 style={{ margin: "8px 0", fontSize: "clamp(24px,4vw,34px)", lineHeight: 1.15 }}>Set up your Business Workspace</h1>
        <p style={{ margin: "0 0 22px", color: "#475569", maxWidth: 760 }}>
          You are signed in. Now tell us how you operate and what work you do. This does not create another login; it prepares your identities inside one Business Workspace.
        </p>

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 20 }}>
          <section style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))" }}>
            <label style={{ fontWeight: 800 }}>Full Name *<input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your full name" style={inputStyle} /></label>
            <label style={{ fontWeight: 800 }}>Phone *<input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Your phone number" inputMode="tel" style={inputStyle} /></label>
          </section>

          <section
            style={{
              padding: 16,
              border: "1px solid #dbeafe",
              borderRadius: 14,
              background: "#f8fbff",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 14,
                flexWrap: "wrap",
              }}
            >
              <div style={{ minWidth: 0, flex: "1 1 420px" }}>
                <div style={{ fontWeight: 900, fontSize: 18 }}>
                  Current location *
                </div>

                <div
                  style={{
                    color: "#64748b",
                    fontSize: 14,
                    marginTop: 5,
                    lineHeight: 1.55,
                  }}
                >
                  Your current device location is required to establish the
                  correct State and District for your workspace. Your complete LGD
                  and official postal address will be entered once, in the next
                  Business Profile step.
                </div>
              </div>

              <button
                type="button"
                onClick={useCurrentLocation}
                disabled={locating || loading}
                style={locationButtonStyle}
              >
                {locating ? "Finding location…" : "Use my current location"}
              </button>
            </div>

            {locationMsg ? (
              <div
                role="status"
                style={{
                  marginTop: 12,
                  padding: "10px 12px",
                  borderRadius: 10,
                  color: geography.state?.id ? "#166534" : "#475569",
                  background: geography.state?.id ? "#f0fdf4" : "#f8fafc",
                  border: geography.state?.id
                    ? "1px solid #bbf7d0"
                    : "1px solid #e2e8f0",
                  fontSize: 13,
                  lineHeight: 1.5,
                  fontWeight: geography.state?.id ? 750 : 500,
                }}
              >
                {locationMsg}
              </div>
            ) : null}

            <div
              style={{
                marginTop: 10,
                color: "#64748b",
                fontSize: 12,
                lineHeight: 1.5,
              }}
            >
              Location verification is mandatory. Please allow location
              permission when your browser asks for it.
            </div>
          </section>

          <section>
            <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 4 }}>How do you operate? *</div>
            <div style={{ color: "#64748b", fontSize: 14, marginBottom: 12 }}>This is your operating structure, not your profession or business category.</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: 10 }}>
              {OPERATING_PROFILES.map((item) => {
                const selected = operatingProfile === item.key;
                return <button key={item.key} type="button" onClick={() => changeOperatingProfile(item.key)} style={{ textAlign: "left", border: `2px solid ${selected ? "#2563eb" : "#e2e8f0"}`, background: selected ? "#eff6ff" : "white", borderRadius: 14, padding: 14, cursor: "pointer" }}>
                  <div style={{ fontWeight: 900, color: "#0f172a" }}>{item.label}</div>
                  <div style={{ color: "#64748b", fontSize: 13, marginTop: 4 }}>{item.description}</div>
                  <div style={{ color: "#1d4ed8", fontSize: 12, fontWeight: 900, marginTop: 8 }}>{item.plan}</div>
                </button>;
              })}
            </div>
            <div style={{ marginTop: 10, padding: 11, borderRadius: 10, background: "#fffbeb", color: "#92400e", fontSize: 13 }}>
              Providing several related services does not make you a Multi-Business Organisation. Choose that option only when you manage separate businesses, brands or establishments.
            </div>
          </section>

          <section>
            <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 4 }}>
              What kind of work do you do? *
            </div>
            <div style={{ color: "#64748b", fontSize: 14, marginBottom: 12 }}>
              Start with the closest match. Your first choice becomes your main work area, and you can add other permitted work when needed. {operatingDefinition.limit ? `Your current plan allows up to ${operatingDefinition.limit}.` : "Your current plan allows multiple work areas."}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
              {DECLARABLE_IDENTITY_FAMILIES.map((item) => <button key={item} type="button" onClick={() => { setFamily(item); setSearch(""); setShowAllIdentities(false); }} style={chipStyle(family === item)}>{getIdentityFamilyLabel(item)}</button>)}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 10, alignItems: "stretch", marginBottom: 8 }}>
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  if (e.target.value) setFamily("");
                }}
                placeholder="Search your work: builder, contractor, Amin, mason, banker..."
                style={{ ...inputStyle, marginTop: 0 }}
              />
              <button
                type="button"
                onClick={() => {
                  setFamily("");
                  setSearch("");
                  setShowAllIdentities((current) => !current);
                }}
                style={viewAllButtonStyle(showAllIdentities && !family)}
              >
                {showAllIdentities && !family ? "Show main choices" : "Show all work types"}
              </button>
            </div>
            <div style={{ color: "#475569", fontSize: 13, marginBottom: 12 }}>
              {family || search.trim() || showAllIdentities
                ? "Choose the closest description of your work. Protected professions will still require the applicable verification."
                : "These are the main choices. Search, choose a work family, or open the complete list only when needed."}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 10 }}>
              {identityOptions.map((item) => {
                const selected = identityKeys.includes(item.key);
                const primary = identityKey === item.key;
                const bridge = "requires_professional_verification" in item
                  ? { requiresProfessionalVerification: item.requires_professional_verification }
                  : getIdentityDeclarationBridge(item.key as HumanIdentityKey);
                return <label key={item.key} style={{ border: `2px solid ${selected ? "#2563eb" : "#e2e8f0"}`, background: selected ? "#eff6ff" : "white", borderRadius: 14, padding: 13, cursor: "pointer" }}>
                  <div style={{ display: "flex", gap: 9, alignItems: "flex-start" }}><input type="checkbox" checked={selected} onChange={() => selectIdentity(item.key)} style={{ marginTop: 4 }} /><div><div style={{ fontWeight: 900 }}>{item.label} {primary ? <span style={{ color: "#1d4ed8", fontSize: 11 }}>PRIMARY</span> : null}</div><div style={{ color: "#64748b", fontSize: 13, marginTop: 3 }}>{item.description}</div>{bridge.requiresProfessionalVerification ? <div style={{ color: "#92400e", fontSize: 12, fontWeight: 800, marginTop: 5 }}>Professional verification required for protected access</div> : null}</div></div>
                </label>;
              })}
            </div>
          </section>

          {needsBusinessProfile ? (
            <section style={{ padding: 16, border: "1px solid #dbeafe", borderRadius: 14, background: "#f8fbff" }}>
              <label style={{ display: "block", fontWeight: 800 }}>
                Business or professional name *
                <input
                  value={businessName}
                  onChange={(event) => setBusinessName(event.target.value)}
                  placeholder="The name customers should see"
                  autoComplete="organization"
                  style={inputStyle}
                />
              </label>
              <div style={{ marginTop: 8, color: "#64748b", fontSize: 13 }}>
                Licences, tax details, media, service coverage and other optional information can be added later from Manage Business Profile.
              </div>
              {requiresBusinessEvidence ? (
                <div style={{ display: "grid", gap: 14, marginTop: 18 }}>
                  <div>
                    <div style={{ fontWeight: 900 }}>Business registration evidence *</div>
                    <div style={{ color: "#64748b", fontSize: 13, marginTop: 4 }}>
                      Contractors, builders, project or property businesses and companies must provide any one registration number and its supporting document.
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 12 }}>
                    <label style={{ fontWeight: 800 }}>GSTIN<input value={gstin} onChange={(event) => setGstin(event.target.value.toUpperCase())} placeholder="15-character GSTIN" style={inputStyle} /></label>
                    <label style={{ fontWeight: 800 }}>Trade Licence<input value={tradeLicenseNo} onChange={(event) => setTradeLicenseNo(event.target.value)} placeholder="Trade Licence number" style={inputStyle} /></label>
                    <label style={{ fontWeight: 800 }}>Udyam Registration<input value={udyamNo} onChange={(event) => setUdyamNo(event.target.value.toUpperCase())} placeholder="Udyam registration number" style={inputStyle} /></label>
                  </div>
                  <UniversalMediaUploader
                    module="vendor"
                    value={evidenceFiles}
                    onChange={setEvidenceFiles}
                    folder="registration-evidence"
                    label="Supporting registration document *"
                    helperText="Upload the certificate or licence that matches the number entered above. Submitted documents are checked for validity."
                    allowImages
                    allowVideos={false}
                    allowDocuments
                    maxFiles={3}
                  />
                </div>
              ) : (
                <div style={{ marginTop: 12, padding: 10, borderRadius: 10, background: "#f0fdf4", color: "#166534", fontSize: 13 }}>
                  Individual workers and tradespeople can continue without GSTIN, Trade Licence or Udyam registration.
                </div>
              )}
            </section>
          ) : null}

          {identityKey ? <div style={{ padding: 14, borderRadius: 12, background: protectedSelectedRole ? "#fff7ed" : "#f0fdf4", border: `1px solid ${protectedSelectedRole ? "#fdba74" : "#bbf7d0"}`, color: protectedSelectedRole ? "#9a3412" : "#166534" }}>
            <strong>Primary category:</strong> {identityLabel}<br />
            <strong>Recommended permitted role:</strong> {recommendedRoleLabel}
            {protectedSelectedRole ? " — Master Admin approval required" : " — assigned automatically after confirmation"}
            <br />
            <span style={{ fontSize: 13 }}>{identityKeys.length} {identityKeys.length === 1 ? "category" : "categories"} selected · Recommended plan: {operatingDefinition.plan}. Adding a category outside your active entitlement will be stopped and you will be guided to the appropriate upgrade.</span>
          </div> : null}
          {msg ? <div role="alert" style={{ border: "1px solid #fecaca", background: "#fff1f2", color: "#9f1239", borderRadius: 10, padding: 11 }}>{msg}</div> : null}
          <button type="submit" disabled={loading || !locationCaptured} style={{ justifySelf: "start", padding: "12px 20px", borderRadius: 11, border: 0, background: loading ? "#94a3b8" : "#2563eb", color: "white", fontWeight: 900, cursor: loading ? "wait" : "pointer" }}>
            {loading
              ? "Preparing your workspace..."
              : !locationCaptured
                ? "Use current location to continue"
                : "Continue with my choices"}
          </button>
        </form>
      </div>
    </main>
  );
}

const inputStyle: React.CSSProperties = { display: "block", width: "100%", marginTop: 7, borderRadius: 10, border: "1px solid #cbd5e1", padding: "11px 12px", background: "white", fontWeight: 500 };
const chipStyle = (active: boolean): React.CSSProperties => ({ border: `1px solid ${active ? "#2563eb" : "#cbd5e1"}`, background: active ? "#2563eb" : "white", color: active ? "white" : "#334155", borderRadius: 999, padding: "7px 11px", fontWeight: 800, fontSize: 12, cursor: "pointer" });
const locationButtonStyle: React.CSSProperties = { border: "1px solid #86efac", background: "#f0fdf4", color: "#166534", borderRadius: 10, padding: "9px 12px", fontWeight: 900, cursor: "pointer" };
const viewAllButtonStyle = (active: boolean): React.CSSProperties => ({
  border: `1px solid ${active ? "#1d4ed8" : "#2563eb"}`,
  background: active ? "#eff6ff" : "#2563eb",
  color: active ? "#1d4ed8" : "white",
  borderRadius: 10,
  padding: "10px 16px",
  minWidth: 145,
  fontWeight: 900,
  whiteSpace: "nowrap",
  cursor: "pointer",
});
