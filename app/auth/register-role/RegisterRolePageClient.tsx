"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
import { trackVendorConversionClient } from "@/components/marketplace/vendor-conversion-client";
import GeoSelector, { type GeoSelection } from "@/components/geography/GeoSelector";
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

function safeNextPath(raw: string | null) {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "";
  return raw;
}

function normalizePhone(raw: string) {
  return raw.replace(/[^\d+]/g, "").trim();
}

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
  const [geography, setGeography] = useState<GeoSelection>({});
  const [pincode, setPincode] = useState("");
  const [locating, setLocating] = useState(false);
  const [locationMsg, setLocationMsg] = useState("");
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
        : managedIdentities.filter((item) => item.is_featured);
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
    if (!geography.state?.id) return "Please select your State from the official LGD list.";
    if (!geography.district?.id) return "Please select your District from the official LGD list.";
    if (pincode.trim() && !/^\d{6}$/.test(pincode.trim())) return "Please enter a valid 6-digit PIN code.";
    if (!identityKey) return "Please choose at least one work category.";
    if (operatingProfile === "multi_service_professional" && identityKeys.length < 2) return "Please choose at least two categories for a Multi-Service Professional profile.";
    if (operatingDefinition.limit && identityKeys.length > operatingDefinition.limit) return `Please choose no more than ${operatingDefinition.limit} categories.`;
    return "";
  }

  async function useCurrentLocation() {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setLocationMsg("Current location is not supported by this browser. Please select your LGD location below.");
      return;
    }

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
            throw new Error("We detected your area, but could not safely match it to an official LGD location. Please select it below.");
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
          setLocationMsg("Location suggested from your device. Please check the official LGD selection before continuing.");
        } catch (error: any) {
          setLocationMsg(error?.message || "Could not use your current location. Please select it below.");
        } finally {
          setLocating(false);
        }
      },
      (error) => {
        setLocating(false);
        setLocationMsg(error?.message || "Location permission was not available. Please select your location below.");
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 }
    );
  }

  async function saveModuleGrants(userId: string, modules: LegacyModuleKey[]) {
    const { error: deleteError } = await supabase.from("vendor_module_grants").delete().eq("user_id", userId);
    if (deleteError) return deleteError;
    if (!modules.length) return null;
    const { error } = await supabase.from("vendor_module_grants").insert(
      modules.map((moduleKey) => ({ user_id: userId, module_key: moduleKey, is_active: true }))
    );
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
      const effectiveRole = operatingProfile === "multi_business_organisation" ? "hub_vendor" : bridge.role;
      const requiresBusinessOnboarding = operatingProfile === "multi_business_organisation" || selectedBridges.some((item) => item.requiresBusinessOnboarding);
      const requiresProfessionalVerification = selectedBridges.some((item) => item.requiresProfessionalVerification);
      const isBusinessRole = effectiveRole !== "buyer" || requiresBusinessOnboarding;

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

      const { error: profileError } = await supabase.from("profiles").upsert({
        id: user.id,
        email: user.email ?? null,
        full_name: fullName.trim(),
        phone: normalizePhone(phone),
        city: cityName,
        state: stateName,
        requested_role: effectiveRole,
        role: effectiveRole,
        is_vendor: isBusinessRole,
        onboarding_version: 3,
        onboarding_completed: !requiresBusinessOnboarding,
        portal_use_reason: bridge.portalUseReason,
        role_display_label: displayLabel,
      }, { onConflict: "id" });
      if (profileError) throw profileError;

      const grantsError = await saveModuleGrants(user.id, allModules);
      if (grantsError) throw grantsError;

      const { error: declarationError } = await supabase.rpc("declare_operating_profile", {
        p_operating_profile: operatingProfile,
        p_identity_keys: identityKeys,
        p_primary_identity_key: identityKey,
      });
      if (declarationError) throw declarationError;

      if (requiresBusinessOnboarding) {
        const natureOfBusiness = Array.from(new Set(allModules.map((key) =>
          key === "property_owner" || key === "property_builder" ? "property" :
          key === "blog_author" ? "blog" : key
        )));
        const { error: businessError } = await supabase.from("business_profiles").upsert({
          user_id: user.id,
          business_name: null,
          business_type: effectiveRole === "builder" ? "builder" : effectiveRole === "blogger" ? "blogger" : effectiveRole === "hub_vendor" ? "multi_business" : "vendor",
          nature_of_business: natureOfBusiness,
          gstin: null,
          trade_license_no: null,
          contact_person: fullName.trim(),
          phone_primary: normalizePhone(phone),
          city: cityName,
          district: districtName,
          locality: localityName || null,
          state: stateName,
          address_line1: null,
          pincode: pincode.trim() || geography.place?.pincode || null,
        }, { onConflict: "user_id" });
        if (businessError) throw businessError;
      }

      trackVendorConversionClient({
        eventType: "registration_completed",
        source: "human_identity_declaration",
        label: "3Bigha Member Identity Declared",
        metadata: { identityKey, identityKeys, operatingProfile, legacyRole: effectiveRole, modules: allModules },
      });

      if (requiresBusinessOnboarding) {
        const qs = new URLSearchParams({ returnTo: next || "/dashboard", role: effectiveRole });
        router.replace(`/onboarding/business?${qs.toString()}`);
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
        <div style={{ color: "#1d4ed8", fontWeight: 900, fontSize: 13, letterSpacing: ".06em", textTransform: "uppercase" }}>Welcome, 3Bigha Member</div>
        <h1 style={{ margin: "8px 0", fontSize: "clamp(24px,4vw,34px)", lineHeight: 1.15 }}>How would you like to use 3Bigha?</h1>
        <p style={{ margin: "0 0 22px", color: "#475569", maxWidth: 760 }}>
          First tell us how you operate, then choose what work you do. Your primary category prepares the default workspace; your Growth Plan governs how many categories you may use.
        </p>

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 20 }}>
          <section style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))" }}>
            <label style={{ fontWeight: 800 }}>Full Name *<input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your full name" style={inputStyle} /></label>
            <label style={{ fontWeight: 800 }}>Phone *<input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Your phone number" inputMode="tel" style={inputStyle} /></label>
          </section>

          <section>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontWeight: 900, fontSize: 18 }}>Your official location *</div>
                <div style={{ color: "#64748b", fontSize: 14, marginTop: 4 }}>State and District are required. Add the deeper rural or urban LGD location whenever available.</div>
              </div>
              <button type="button" onClick={useCurrentLocation} disabled={locating} style={locationButtonStyle}>
                {locating ? "Finding location…" : "Use my current location"}
              </button>
            </div>
            {locationMsg ? <div role="status" style={{ marginTop: 10, color: "#475569", fontSize: 13 }}>{locationMsg}</div> : null}
            <GeoSelector
              value={geography}
              onChange={(selection) => {
                setGeography(selection);
                setPincode(selection.place?.pincode || "");
                setLocationMsg("");
              }}
              includeSubdivision
              includeBlock
              includePlace
              disabled={loading}
            />
            <label style={{ display: "block", fontWeight: 800, marginTop: 12, maxWidth: 320 }}>
              PIN code <span style={{ color: "#64748b", fontWeight: 600 }}>(if available)</span>
              <input value={pincode} onChange={(e) => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="6-digit PIN code" inputMode="numeric" autoComplete="postal-code" style={inputStyle} />
            </label>
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
            <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 4 }}>Choose your work {operatingProfile === "individual_professional" ? "category" : "categories"} *</div>
            <div style={{ color: "#64748b", fontSize: 14, marginBottom: 12 }}>The first selection is your primary category and determines your default workspace. {operatingDefinition.limit ? `You may select up to ${operatingDefinition.limit}.` : "You may select any number."}</div>
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
                placeholder="Search all identities: developer, contractor, banker, Amin, mason..."
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
                {showAllIdentities && !family ? "Show main choices" : "See all identities"}
              </button>
            </div>
            <div style={{ color: "#475569", fontSize: 13, marginBottom: 12 }}>
              Can’t see your identity? Search above, choose a category, or see the complete identity list.
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

          {identityKey ? <div style={{ padding: 14, borderRadius: 12, background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534" }}><strong>Primary category:</strong> {identityLabel}<br /><span style={{ fontSize: 13 }}>{identityKeys.length} {identityKeys.length === 1 ? "category" : "categories"} selected · Recommended: {operatingDefinition.plan}. Adding a category outside your active entitlement will be stopped and you will be guided to the appropriate upgrade.</span></div> : null}
          {msg ? <div role="alert" style={{ border: "1px solid #fecaca", background: "#fff1f2", color: "#9f1239", borderRadius: 10, padding: 11 }}>{msg}</div> : null}
          <button type="submit" disabled={loading} style={{ justifySelf: "start", padding: "12px 20px", borderRadius: 11, border: 0, background: loading ? "#94a3b8" : "#2563eb", color: "white", fontWeight: 900, cursor: loading ? "wait" : "pointer" }}>{loading ? "Preparing your workspace..." : "Confirm identity and continue"}</button>
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
