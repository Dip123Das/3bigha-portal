"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
import { trackVendorConversionClient } from "@/components/marketplace/vendor-conversion-client";
import {
  DECLARABLE_IDENTITY_FAMILIES,
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
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [stateName, setStateName] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    trackVendorConversionClient({
      eventType: "registration_started",
      source: "human_identity_declaration",
      label: "3Bigha Member Identity Declaration Started",
    });
  }, []);

  const identityOptions = useMemo(() => {
    const query = search.trim().toLowerCase();
    const source = family
      ? getIdentityFamilyOptions(family)
      : DECLARABLE_IDENTITY_FAMILIES.flatMap(getIdentityFamilyOptions);
    if (!query) return source;
    return source.filter((item) =>
      `${item.label} ${item.description} ${getLocalIdentityLabel(item.key, stateName)}`
        .toLowerCase()
        .includes(query)
    );
  }, [family, search, stateName]);

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
    if (!city.trim()) return "Please enter your city.";
    if (!stateName.trim()) return "Please enter your state.";
    if (!identityKey) return "Please choose the identity that best describes your main work on 3Bigha.";
    return "";
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
        },
      });
      if (authError) throw authError;

      const { error: profileError } = await supabase.from("profiles").upsert({
        id: user.id,
        email: user.email ?? null,
        full_name: fullName.trim(),
        phone: normalizePhone(phone),
        city: city.trim(),
        state: stateName.trim(),
        requested_role: bridge.role,
        role: bridge.role,
        approval_status: "active",
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
          city: city.trim(),
          state: stateName.trim(),
          address_line1: null,
          pincode: null,
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
            <label style={{ fontWeight: 800 }}>City *<input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Your city" style={inputStyle} /></label>
            <label style={{ fontWeight: 800 }}>State *<input value={stateName} onChange={(e) => setStateName(e.target.value)} placeholder="For example, West Bengal" style={inputStyle} /></label>
          </section>

          <section>
            <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 4 }}>Choose your primary identity *</div>
            <div style={{ color: "#64748b", fontSize: 14, marginBottom: 12 }}>Choose the identity that best describes your main purpose today. This determines your default workspace—not all you are allowed to do.</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
              <button type="button" onClick={() => setFamily("")} style={chipStyle(!family)}>All</button>
              {DECLARABLE_IDENTITY_FAMILIES.map((item) => <button key={item} type="button" onClick={() => setFamily(item)} style={chipStyle(family === item)}>{getIdentityFamilyLabel(item)}</button>)}
            </div>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search: developer, contractor, banker, Amin, mason..." style={{ ...inputStyle, marginTop: 0, marginBottom: 12 }} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 10, maxHeight: 450, overflowY: "auto", paddingRight: 4 }}>
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
