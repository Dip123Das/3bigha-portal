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

  const [identityKey, setIdentityKey] = useState<HumanIdentityKey | "">("");
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

  const identityOptions = useMemo(() => {
    const query = search.trim().toLowerCase();
    const allIdentities = DECLARABLE_IDENTITIES.map(getHumanIdentity);
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
  }, [family, search, showAllIdentities, stateName]);

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
    if (!identityKey) return "Please choose the identity that best describes your main work on 3Bigha.";
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

      const identity = getHumanIdentity(identityKey);
      const bridge = getIdentityDeclarationBridge(identityKey);
      const displayLabel = getLocalIdentityLabel(identityKey, stateName);
      const isBusinessRole = bridge.role !== "buyer" || bridge.requiresBusinessOnboarding;

      const { error: authError } = await supabase.auth.updateUser({
        data: {
          ...(user.user_metadata || {}),
          member_identity_status: "declared",
          primary_human_identity: identityKey,
          human_identities: [identityKey],
          human_identity_label: identity.label,
          human_identity_local_label: displayLabel,
          human_identity_declared_at: new Date().toISOString(),
          professional_verification_required: bridge.requiresProfessionalVerification,
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
        requested_role: bridge.role,
        role: bridge.role,
        is_vendor: isBusinessRole,
        onboarding_version: 3,
        onboarding_completed: !bridge.requiresBusinessOnboarding,
        portal_use_reason: bridge.portalUseReason,
        role_display_label: displayLabel,
      }, { onConflict: "id" });
      if (profileError) throw profileError;

      const grantsError = await saveModuleGrants(user.id, bridge.modules);
      if (grantsError) throw grantsError;

      if (bridge.requiresBusinessOnboarding) {
        const natureOfBusiness = Array.from(new Set(bridge.modules.map((key) =>
          key === "property_owner" || key === "property_builder" ? "property" :
          key === "blog_author" ? "blog" : key
        )));
        const { error: businessError } = await supabase.from("business_profiles").upsert({
          user_id: user.id,
          business_name: null,
          business_type: bridge.role === "builder" ? "builder" : bridge.role === "blogger" ? "blogger" : "vendor",
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
        metadata: { identityKey, legacyRole: bridge.role, modules: bridge.modules },
      });

      if (bridge.requiresBusinessOnboarding) {
        const qs = new URLSearchParams({ returnTo: next || "/dashboard", role: bridge.role });
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
          We do not assume who you are. Tell us your main professional, business or personal identity so we can prepare the right workspace. You can add more identities later.
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
            <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 4 }}>Choose your primary identity *</div>
            <div style={{ color: "#64748b", fontSize: 14, marginBottom: 12 }}>Choose the identity that best describes your main purpose today. This determines your default workspace—not all you are allowed to do.</div>
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
                const selected = identityKey === item.key;
                const bridge = getIdentityDeclarationBridge(item.key);
                return <label key={item.key} style={{ border: `2px solid ${selected ? "#2563eb" : "#e2e8f0"}`, background: selected ? "#eff6ff" : "white", borderRadius: 14, padding: 13, cursor: "pointer" }}>
                  <div style={{ display: "flex", gap: 9, alignItems: "flex-start" }}><input type="radio" name="identity" checked={selected} onChange={() => setIdentityKey(item.key)} style={{ marginTop: 4 }} /><div><div style={{ fontWeight: 900 }}>{getLocalIdentityLabel(item.key, stateName)}</div><div style={{ color: "#64748b", fontSize: 13, marginTop: 3 }}>{item.description}</div>{bridge.requiresProfessionalVerification ? <div style={{ color: "#92400e", fontSize: 12, fontWeight: 800, marginTop: 5 }}>Professional verification required for protected access</div> : null}</div></div>
                </label>;
              })}
            </div>
          </section>

          {identityKey ? <div style={{ padding: 14, borderRadius: 12, background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534" }}><strong>Primary identity:</strong> {getLocalIdentityLabel(identityKey, stateName)}<br /><span style={{ fontSize: 13 }}>You remain a 3Bigha Member and can add other identities later. Secondary capabilities will not replace this primary workspace.</span></div> : null}
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
