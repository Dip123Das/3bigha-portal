"use client";

import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

async function ensureSessionOrRedirect(
  supabase: any,
  nextPath: string
) {
  try {
    // First try user fetch (usually more reliable in browser)
    const userRes = await supabase.auth.getUser();
    const user = userRes?.data?.user ?? null;

    if (user?.id) {
      return { user };
    }

    // Fallback to session check
    const sessRes = await supabase.auth.getSession();
    const session = sessRes?.data?.session ?? null;

    if (session?.user?.id) {
      return session;
    }

    window.location.href = `/login?next=${encodeURIComponent(nextPath)}`;
    return null;
  } catch {
    window.location.href = `/login?next=${encodeURIComponent(nextPath)}`;
    return null;
  }
}

type BusinessProfile = {
  user_id: string;

  business_name: string | null;
  business_type: string | null;
  nature_of_business: string[];
  gstin: string | null;
  pan: string | null;
  trade_license_no: string | null;
  udyam_no: string | null;

  contact_person: string | null;
  phone_primary: string | null;
  phone_whatsapp: string | null;
  email_business: string | null;

  address_line1: string | null;
  address_line2: string | null;
  landmark: string | null;
  city: string | null;
  district: string | null;
  state: string | null;
  pincode: string | null;

  rera_registration_no: string | null;
  rera_state: string | null;
  rera_expiry_date: string | null;

  author_display_name: string | null;
  author_bio: string | null;
  author_category: string | null;
  author_portfolio_url: string | null;

  is_complete: boolean;
  completion_score: number;
  missing_fields: string[];
};

type VendorCompletenessRow = {
  user_id: string;
  business_profile_user_id: string | null;
  registration_complete: boolean;
  is_complete: boolean;
  completion_score: number;
  missing_fields: string[] | null;
  updated_at: string | null;
};

const NATURE_OPTIONS = [
  { key: "property", label: "Property (Broker/Developer)" },
  { key: "materials", label: "Materials (Seller/Supplier)" },
  { key: "services", label: "Services (Professional/Skilled)" },
  { key: "rentals", label: "Rentals (Equipment/Space/Vehicles)" },
  { key: "blog", label: "Blog / Writer / Author" },
] as const;

function safeArr(v: any): string[] {
  return Array.isArray(v) ? v.filter(Boolean) : [];
}

/**
 * IMPORTANT CHANGE:
 * RERA is OPTIONAL for everyone.
 * (You requested: "Don't make rera number required for everyone.")
 */
function computeCompletion(bp: Partial<BusinessProfile>) {
  const nature = safeArr(bp.nature_of_business);
  const hasBlog = nature.includes("blog");

  const natureOk = nature.length > 0;

  // At least one name (business OR author)
  const businessOrAuthorNameOk =
    !!(bp.business_name && bp.business_name.trim()) ||
    !!(bp.author_display_name && bp.author_display_name.trim());

  const contactOk = !!(bp.contact_person && bp.contact_person.trim());

  const commOk =
    !!(bp.phone_primary && bp.phone_primary.trim()) ||
    !!(bp.email_business && bp.email_business.trim());

  const locationOk =
    !!(bp.district && bp.district.trim()) && !!(bp.state && bp.state.trim());

  // Author required only if blog selected
  const authorOk = !hasBlog
    ? true
    : !!(bp.author_display_name && bp.author_display_name.trim());

  const missing: string[] = [];
  if (!natureOk) missing.push("Select at least one Nature of Business");
  if (!businessOrAuthorNameOk)
    missing.push("Business Name or Author Display Name");
  if (!contactOk) missing.push("Contact Person");
  if (!commOk) missing.push("Phone or Email");
  if (!locationOk) missing.push("District and State");
  if (hasBlog) {
    if (!(bp.author_display_name && bp.author_display_name.trim()))
      missing.push("Author Display Name (Blog)");
  }

  const checks = [natureOk, businessOrAuthorNameOk, contactOk, commOk, locationOk, authorOk];
  const passed = checks.filter(Boolean).length;
  const score = Math.round((passed / checks.length) * 100);

  const isComplete = checks.every(Boolean);
  return { isComplete, score, missing };
}

function clampPct(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

type StepKey =
  | "nature"
  | "identity"
  | "contact"
  | "address"
  | "property"
  | "author"
  | "review";

function groupMissingByStep(
  missing: string[],
  opts: { hasProperty: boolean; hasBlog: boolean }
) {
  const buckets: Record<StepKey, string[]> = {
    nature: [],
    identity: [],
    contact: [],
    address: [],
    property: [],
    author: [],
    review: [],
  };

  const push = (k: StepKey, m: string) => buckets[k].push(m);

  for (const m of missing) {
    const s = (m || "").toLowerCase();

    if (s.includes("nature")) {
      push("nature", m);
      continue;
    }

    if (s.includes("author")) {
      push("author", m);
      continue;
    }

    if (
      s.includes("contact") ||
      s.includes("phone") ||
      s.includes("email") ||
      s.includes("whatsapp")
    ) {
      push("contact", m);
      continue;
    }

    if (
      s.includes("address") ||
      s.includes("city") ||
      s.includes("district") ||
      s.includes("state") ||
      s.includes("pincode") ||
      s.includes("pin")
    ) {
      push("address", m);
      continue;
    }

    if (
      s.includes("business name") ||
      s.includes("business type") ||
      s.includes("gst") ||
      s.includes("pan") ||
      s.includes("trade license") ||
      s.includes("udyam")
    ) {
      push("identity", m);
      continue;
    }

    push("review", m);
  }

  // Property bucket is not used as required anymore (RERA optional)
  buckets.property = [];

  if (!opts.hasBlog) buckets.author = [];
  return buckets;
}

function scrollToId(id: string) {
  if (typeof document === "undefined") return;
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
}

function Field({
  label,
  required,
  missing,
  children,
  hint,
}: {
  label: string;
  required?: boolean;
  missing?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
        <div style={{ fontWeight: 700 }}>
          {label} {required ? <span style={{ color: "crimson" }}>*</span> : null}
          {hint ? <div style={{ opacity: 0.7, fontSize: 12 }}>{hint}</div> : null}
        </div>
        {missing ? (
          <div style={{ color: "crimson", fontWeight: 800, fontSize: 12 }}>
            Required
          </div>
        ) : null}
      </div>
      <div
        style={{
          border: missing ? "2px solid crimson" : "1px solid #ddd",
          borderRadius: 8,
          padding: 0,
        }}
      >
        {children}
      </div>
    </label>
  );
}

export default function BusinessOnboardingPage() {
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const router = useRouter();
  const sp = useSearchParams();

  const returnTo = sp.get("returnTo") || "/dashboard";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [userId, setUserId] = useState<string | null>(null);

  const [bp, setBp] = useState<Partial<BusinessProfile>>({
    nature_of_business: [],
  });

  const [vc, setVc] = useState<VendorCompletenessRow | null>(null);
  const [vcLoading, setVcLoading] = useState(false);

  const nature = safeArr(bp.nature_of_business);
  const hasBlog = nature.includes("blog");

  async function fetchCompleteness(uid: string) {
    setVcLoading(true);
    const { data, error } = await supabase
      .from("v_vendor_profile_completeness")
      .select("*")
      .eq("user_id", uid)
      .maybeSingle();

    setVcLoading(false);

    if (error) {
      setMsg((m) => m ?? error.message);
      setVc(null);
      return;
    }

    if (!data) {
      setVc(null);
      return;
    }

    setVc({
      user_id: data.user_id,
      business_profile_user_id: data.business_profile_user_id ?? null,
      registration_complete: !!data.registration_complete,
      is_complete: !!data.is_complete,
      completion_score:
        typeof data.completion_score === "number" ? data.completion_score : 0,
      missing_fields: safeArr(data.missing_fields),
      updated_at: data.updated_at ?? null,
    });
  }

    useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);
      setMsg(null);

      try {
        const sessionOrUser = await ensureSessionOrRedirect(
          supabase,
          `/onboarding/business?returnTo=${encodeURIComponent(returnTo)}`
        );

        if (!alive || !sessionOrUser) return;

        const uid =
          sessionOrUser?.user?.id ||
          sessionOrUser?.data?.user?.id ||
          null;

        if (!uid) {
          window.location.href = `/login?next=${encodeURIComponent(
            `/onboarding/business?returnTo=${encodeURIComponent(returnTo)}`
          )}`;
          return;
        }

        setUserId(uid);

        const { data, error } = await supabase
          .from("business_profiles")
          .select("*")
          .eq("user_id", uid)
          .maybeSingle();

        if (!alive) return;

        if (error) {
          setMsg(error.message);
          setLoading(false);
          return;
        }

        if (!data) {
          const { error: insErr } = await supabase
            .from("business_profiles")
            .insert({ user_id: uid });

          if (!alive) return;

          if (insErr) {
            setMsg(insErr.message);
            setLoading(false);
            return;
          }

          setBp({ user_id: uid, nature_of_business: [] });
        } else {
          setBp({
            ...data,
            nature_of_business: safeArr(data.nature_of_business),
            missing_fields: safeArr(data.missing_fields),
          });
        }

        await fetchCompleteness(uid);

        if (!alive) return;
        setLoading(false);
      } catch (e: any) {
        if (!alive) return;
        setMsg(e?.message || "Failed to load business profile.");
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [supabase, returnTo]);

  function toggleNature(key: string) {
    const curr = safeArr(bp.nature_of_business);
    const next = curr.includes(key)
      ? curr.filter((x) => x !== key)
      : [...curr, key];
    setBp((p) => ({ ...p, nature_of_business: next }));
  }

  function setField<K extends keyof BusinessProfile>(key: K, value: any) {
    setBp((p) => ({ ...p, [key]: value }));
  }

  // Prefer view for display. Fall back to local compute if view not available.
  const localCompletion = computeCompletion(bp);
  const isCompleteUI = vc?.is_complete ?? localCompletion.isComplete;
  const scoreUI = clampPct(vc?.completion_score ?? localCompletion.score);
  const missingUI = vc ? safeArr(vc.missing_fields) : localCompletion.missing;
  const registrationCompleteUI = vc?.registration_complete ?? false;

  const missingByStep = groupMissingByStep(missingUI, { hasProperty: false, hasBlog });

  // Field-level missing mapping (simple + clear)
  const missingBusinessOrAuthor = missingUI.some((m) =>
    m.toLowerCase().includes("business name or author")
  );
  const missingContactPerson = missingUI.some((m) =>
    m.toLowerCase().includes("contact person")
  );
  const missingPhoneOrEmail = missingUI.some((m) =>
    m.toLowerCase().includes("phone or email")
  );
  const missingDistrictState = missingUI.some((m) =>
    m.toLowerCase().includes("district and state")
  );
  const missingNature = missingUI.some((m) =>
    m.toLowerCase().includes("nature")
  );
  const missingAuthorName = missingUI.some((m) =>
    m.toLowerCase().includes("author display name")
  );

  type StepDef = {
    key: StepKey;
    title: string;
    subtitle?: string;
    show?: boolean;
    targetId?: string;
  };

  const stepsAll: StepDef[] = [
    { key: "nature", title: "Step 1 — Nature", subtitle: "Choose what you do", show: true, targetId: "sec-nature" },
    { key: "identity", title: "Step 2 — Identity", subtitle: "Business / Legal info", show: true, targetId: "sec-identity" },
    { key: "contact", title: "Step 3 — Contact", subtitle: "Phone / email", show: true, targetId: "sec-contact" },
    { key: "address", title: "Step 4 — Address", subtitle: "District + state required", show: true, targetId: "sec-address" },
    { key: "property", title: "Step 5 — Property Compliance", subtitle: "RERA details (optional)", show: nature.includes("property"), targetId: "sec-property" },
    { key: "author", title: "Step 6 — Author Identity", subtitle: "Blog profile", show: hasBlog, targetId: "sec-author" },
    { key: "review", title: "Step 7 — Review & Finish", subtitle: "Confirm completion", show: true, targetId: "sec-review" },
  ];

  const steps: StepDef[] = stepsAll.filter((s): s is StepDef => !!s.show);

  function stepDone(k: StepKey) {
    const misses = missingByStep[k] || [];
    if (k === "review") return isCompleteUI;
    return misses.length === 0;
  }

  const firstPendingStep = useMemo(() => {
    const pending = steps.find((s) => !stepDone(s.key));
    return pending ?? steps[steps.length - 1];
  }, [steps, missingByStep, isCompleteUI]);

  async function saveCommon() {
    if (!userId) return { ok: false };

    // Refresh session BEFORE write (fixes your JWT expired problem)
    const authOk = await ensureSessionOrRedirect(
      supabase,
      `/onboarding/business?returnTo=${encodeURIComponent(returnTo)}`
    );
    if (!authOk) return { ok: false };

    const { isComplete, score, missing } = computeCompletion(bp);

    const payload: any = {
      ...bp,
      user_id: userId,
      nature_of_business: safeArr(bp.nature_of_business),
      is_complete: isComplete,
      completion_score: score,
      missing_fields: missing,
    };

    Object.keys(payload).forEach((k) => {
      if (payload[k] === undefined) delete payload[k];
    });

    const { error } = await supabase
      .from("business_profiles")
      .update(payload)
      .eq("user_id", userId);

    if (error) {
      setMsg(error.message);
      return { ok: false };
    }

    await fetchCompleteness(userId);
    return { ok: true, isComplete };
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    const res = await saveCommon();
    setSaving(false);

    if (!res.ok) return;
    setMsg(res.isComplete ? "Profile saved ✅ (Complete)" : "Saved ✅ Please complete missing required fields.");
  }

  async function onSaveAndContinue() {
    setSaving(true);
    setMsg(null);

    const res = await saveCommon();
    setSaving(false);

    if (!res.ok) return;

    if (!res.isComplete) {
      setMsg("Saved ✅ Please complete the highlighted required fields to continue.");
      // auto jump to first pending section
      scrollToId(firstPendingStep.targetId || "sec-review");
      return;
    }

    router.push(returnTo);
    router.refresh();
  }

  async function onFinishRegistration() {
    if (!userId) return;

    setSaving(true);
    setMsg(null);

    const res = await saveCommon();
    if (!res.ok) {
      setSaving(false);
      return;
    }
    if (!res.isComplete) {
      setSaving(false);
      setMsg("Please complete the highlighted required fields before finishing registration.");
      scrollToId(firstPendingStep.targetId || "sec-review");
      return;
    }

    const { data, error } = await supabase.rpc("vendor_registration_complete", {
      p_vendor_id: userId,
    });

    setSaving(false);

    if (error) {
      setMsg(error.message);
      return;
    }

    const ok = !!data;
    if (!ok) {
      setMsg("Profile complete, but registration is still not marked complete. Try again.");
      await fetchCompleteness(userId);
      return;
    }

    setMsg("✅ Registration Complete. Redirecting...");
    await fetchCompleteness(userId);
    router.push(returnTo);
    router.refresh();
  }

  if (loading) {
    return (
      <div style={{ maxWidth: 900, margin: "40px auto", padding: 16 }}>
        Loading business profile...
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 900, margin: "40px auto", padding: 16 }}>
      <h1 style={{ fontSize: 26, fontWeight: 800 }}>Business / Author Profile</h1>
      <p style={{ opacity: 0.8 }}>
        This single profile is required before you can <b>final submit</b> listings or{" "}
        <b>publish</b> blog posts.
      </p>

      <div style={{ marginTop: 12, padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div>
              Status:{" "}
              <b style={{ color: isCompleteUI ? "green" : "crimson" }}>
                {isCompleteUI ? "Complete" : "Incomplete"}
              </b>{" "}
              | Score: <b>{scoreUI}%</b>
              {vcLoading && <span style={{ marginLeft: 10, opacity: 0.7 }}>(updating…)</span>}
            </div>
            <div style={{ marginTop: 6, opacity: 0.8 }}>
              Registration:{" "}
              <b style={{ color: registrationCompleteUI ? "green" : "crimson" }}>
                {registrationCompleteUI ? "Complete" : "Not Complete"}
              </b>
              {vc?.updated_at ? (
                <span style={{ marginLeft: 10, opacity: 0.7 }}>
                  Updated: {new Date(vc.updated_at).toLocaleString()}
                </span>
              ) : null}
            </div>

            <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => scrollToId(firstPendingStep.targetId || "sec-review")}
                style={{ padding: 10, fontWeight: 700 }}
              >
                Go to Next Pending Step
              </button>
            </div>
          </div>

          <div style={{ minWidth: 220 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Progress</div>
            <div style={{ height: 10, background: "#eee", borderRadius: 999 }}>
              <div
                style={{
                  height: 10,
                  width: `${scoreUI}%`,
                  background: scoreUI >= 100 ? "green" : "#333",
                  borderRadius: 999,
                }}
              />
            </div>
          </div>
        </div>

        {!isCompleteUI && missingUI.length > 0 ? (
          <div style={{ marginTop: 12, padding: 10, borderRadius: 8, background: "#fff7ed", border: "1px solid #fed7aa" }}>
            <div style={{ fontWeight: 900, marginBottom: 6, color: "#9a3412" }}>
              Please complete the highlighted required fields:
            </div>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {missingUI.map((m) => (
                <li key={m} style={{ marginBottom: 4 }}>{m}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <div id="sec-review" style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          {registrationCompleteUI ? (
            <>
              <div style={{ fontWeight: 800, color: "green" }}>✅ Registration Complete</div>
              <button type="button" onClick={() => router.push(returnTo)} style={{ padding: 10, fontWeight: 700 }}>
                Go to Dashboard
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                disabled={saving || !isCompleteUI}
                onClick={onFinishRegistration}
                style={{ padding: 10, fontWeight: 700 }}
              >
                {saving ? "Finishing..." : "Finish Registration"}
              </button>
              {!isCompleteUI && <span style={{ opacity: 0.8 }}>Complete highlighted fields to enable finishing.</span>}
            </>
          )}
        </div>
      </div>

      <form onSubmit={onSave} style={{ marginTop: 20, display: "grid", gap: 16 }}>
        {/* Nature */}
        <section id="sec-nature" style={{ padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
          <h3 style={{ marginTop: 0 }}>Nature of Business</h3>
          <p style={{ marginTop: 0, opacity: 0.8 }}>Select all that apply.</p>

          <div style={{ padding: missingNature ? 10 : 0, borderRadius: 8, border: missingNature ? "2px solid crimson" : "none" }}>
            {missingNature ? <div style={{ color: "crimson", fontWeight: 800, marginBottom: 8 }}>Required: select at least one</div> : null}
            <div style={{ display: "grid", gap: 8 }}>
              {NATURE_OPTIONS.map((o) => (
                <label key={o.key} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input type="checkbox" checked={nature.includes(o.key)} onChange={() => toggleNature(o.key)} />
                  <span>{o.label}</span>
                </label>
              ))}
            </div>
          </div>
        </section>

        {/* Identity */}
        <section id="sec-identity" style={{ padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
          <h3 style={{ marginTop: 0 }}>Business Identity</h3>

          <div style={{ display: "grid", gap: 10 }}>
            <Field label="Business Name (or use Author Display Name if only blog)" required missing={missingBusinessOrAuthor}>
              <input
                value={bp.business_name ?? ""}
                onChange={(e) => setField("business_name", e.target.value)}
                style={{ width: "100%", padding: 10, border: "none", outline: "none" }}
              />
            </Field>

            <Field label="Business Type">
              <select
                value={bp.business_type ?? ""}
                onChange={(e) => setField("business_type", e.target.value)}
                style={{ width: "100%", padding: 10, border: "none", outline: "none" }}
              >
                <option value="">Select</option>
                <option value="individual">Individual</option>
                <option value="proprietor">Proprietor</option>
                <option value="partnership">Partnership</option>
                <option value="llp">LLP</option>
                <option value="pvt_ltd">Private Limited</option>
                <option value="other">Other</option>
              </select>
            </Field>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <Field label="GSTIN (optional)">
                <input
                  value={bp.gstin ?? ""}
                  onChange={(e) => setField("gstin", e.target.value)}
                  style={{ width: "100%", padding: 10, border: "none", outline: "none" }}
                />
              </Field>
              <Field label="PAN (optional)">
                <input
                  value={bp.pan ?? ""}
                  onChange={(e) => setField("pan", e.target.value)}
                  style={{ width: "100%", padding: 10, border: "none", outline: "none" }}
                />
              </Field>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <Field label="Trade License No (optional)">
                <input
                  value={bp.trade_license_no ?? ""}
                  onChange={(e) => setField("trade_license_no", e.target.value)}
                  style={{ width: "100%", padding: 10, border: "none", outline: "none" }}
                />
              </Field>
              <Field label="UDYAM No (optional)">
                <input
                  value={bp.udyam_no ?? ""}
                  onChange={(e) => setField("udyam_no", e.target.value)}
                  style={{ width: "100%", padding: 10, border: "none", outline: "none" }}
                />
              </Field>
            </div>
          </div>
        </section>

        {/* Contact */}
        <section id="sec-contact" style={{ padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
          <h3 style={{ marginTop: 0 }}>Contact</h3>

          <div style={{ display: "grid", gap: 10 }}>
            <Field label="Contact Person" required missing={missingContactPerson}>
              <input
                value={bp.contact_person ?? ""}
                onChange={(e) => setField("contact_person", e.target.value)}
                style={{ width: "100%", padding: 10, border: "none", outline: "none" }}
              />
            </Field>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <Field label="Phone (required OR Email)" required missing={missingPhoneOrEmail}>
                <input
                  value={bp.phone_primary ?? ""}
                  onChange={(e) => setField("phone_primary", e.target.value)}
                  style={{ width: "100%", padding: 10, border: "none", outline: "none" }}
                />
              </Field>
              <Field label="Business Email (required OR Phone)" required missing={missingPhoneOrEmail}>
                <input
                  type="email"
                  value={bp.email_business ?? ""}
                  onChange={(e) => setField("email_business", e.target.value)}
                  style={{ width: "100%", padding: 10, border: "none", outline: "none" }}
                />
              </Field>
            </div>

            <Field label="WhatsApp (optional)">
              <input
                value={bp.phone_whatsapp ?? ""}
                onChange={(e) => setField("phone_whatsapp", e.target.value)}
                style={{ width: "100%", padding: 10, border: "none", outline: "none" }}
              />
            </Field>
          </div>
        </section>

        {/* Address */}
        <section id="sec-address" style={{ padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
          <h3 style={{ marginTop: 0 }}>Address</h3>

          <div style={{ display: "grid", gap: 10 }}>
            <Field label="Address Line 1 (optional)">
              <input
                value={bp.address_line1 ?? ""}
                onChange={(e) => setField("address_line1", e.target.value)}
                style={{ width: "100%", padding: 10, border: "none", outline: "none" }}
              />
            </Field>

            <Field label="Address Line 2 (optional)">
              <input
                value={bp.address_line2 ?? ""}
                onChange={(e) => setField("address_line2", e.target.value)}
                style={{ width: "100%", padding: 10, border: "none", outline: "none" }}
              />
            </Field>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <Field label="City (optional)">
                <input
                  value={bp.city ?? ""}
                  onChange={(e) => setField("city", e.target.value)}
                  style={{ width: "100%", padding: 10, border: "none", outline: "none" }}
                />
              </Field>

              <Field label="District" required missing={missingDistrictState}>
                <input
                  value={bp.district ?? ""}
                  onChange={(e) => setField("district", e.target.value)}
                  style={{ width: "100%", padding: 10, border: "none", outline: "none" }}
                />
              </Field>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <Field label="State" required missing={missingDistrictState}>
                <input
                  value={bp.state ?? ""}
                  onChange={(e) => setField("state", e.target.value)}
                  style={{ width: "100%", padding: 10, border: "none", outline: "none" }}
                />
              </Field>
              <Field label="Pincode (optional)">
                <input
                  value={bp.pincode ?? ""}
                  onChange={(e) => setField("pincode", e.target.value)}
                  style={{ width: "100%", padding: 10, border: "none", outline: "none" }}
                />
              </Field>
            </div>
          </div>
        </section>

        {/* Property: RERA (optional) */}
        {nature.includes("property") ? (
          <section id="sec-property" style={{ padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
            <h3 style={{ marginTop: 0 }}>Property Compliance (RERA)</h3>
            <p style={{ marginTop: 0, opacity: 0.8 }}>
              Optional now (you can fill later).
            </p>

            <div style={{ display: "grid", gap: 10 }}>
              <Field label="RERA Registration No (optional)">
                <input
                  value={bp.rera_registration_no ?? ""}
                  onChange={(e) => setField("rera_registration_no", e.target.value)}
                  style={{ width: "100%", padding: 10, border: "none", outline: "none" }}
                />
              </Field>

              <Field label="RERA State (optional)">
                <input
                  value={bp.rera_state ?? ""}
                  onChange={(e) => setField("rera_state", e.target.value)}
                  style={{ width: "100%", padding: 10, border: "none", outline: "none" }}
                />
              </Field>

              <Field label="RERA Expiry Date (optional)" hint="Earliest allowed: 2000-01-01">
                <input
                  type="date"
                  min="2000-01-01"
                  value={bp.rera_expiry_date ?? ""}
                  onChange={(e) => setField("rera_expiry_date", e.target.value)}
                  style={{ width: "100%", padding: 10, border: "none", outline: "none" }}
                />
              </Field>
            </div>
          </section>
        ) : null}

        {/* Blog: Author */}
        {hasBlog ? (
          <section id="sec-author" style={{ padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
            <h3 style={{ marginTop: 0 }}>Author / Writer Identity (Blog)</h3>

            <div style={{ display: "grid", gap: 10 }}>
              <Field label="Author Display Name" required missing={missingAuthorName}>
                <input
                  value={bp.author_display_name ?? ""}
                  onChange={(e) => setField("author_display_name", e.target.value)}
                  style={{ width: "100%", padding: 10, border: "none", outline: "none" }}
                />
              </Field>

              <Field label="Author Category (optional)">
                <select
                  value={bp.author_category ?? ""}
                  onChange={(e) => setField("author_category", e.target.value)}
                  style={{ width: "100%", padding: 10, border: "none", outline: "none" }}
                >
                  <option value="">Select</option>
                  <option value="writer">Writer</option>
                  <option value="journalist">Journalist</option>
                  <option value="blogger">Blogger</option>
                  <option value="company">Company</option>
                  <option value="agency">Agency</option>
                </select>
              </Field>

              <Field label="Short Bio (optional)">
                <textarea
                  value={bp.author_bio ?? ""}
                  onChange={(e) => setField("author_bio", e.target.value)}
                  rows={4}
                  style={{ width: "100%", padding: 10, border: "none", outline: "none" }}
                />
              </Field>

              <Field label="Portfolio URL (optional)">
                <input
                  value={bp.author_portfolio_url ?? ""}
                  onChange={(e) => setField("author_portfolio_url", e.target.value)}
                  style={{ width: "100%", padding: 10, border: "none", outline: "none" }}
                />
              </Field>
            </div>
          </section>
        ) : null}

        {msg && <div style={{ color: msg.includes("✅") ? "green" : "crimson", fontWeight: 800 }}>{msg}</div>}

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button type="submit" disabled={saving} style={{ padding: 10, fontWeight: 700 }}>
            {saving ? "Saving..." : "Save"}
          </button>

          <button type="button" disabled={saving} onClick={onSaveAndContinue} style={{ padding: 10, fontWeight: 700 }}>
            Save & Continue
          </button>

          <button type="button" onClick={() => router.push(returnTo)} style={{ padding: 10 }}>
            Back
          </button>
        </div>
      </form>
            <style jsx global>{`
        header,
        footer {
          display: none !important;
        }
        body {
          background: #f8fafc;
        }
      `}</style>
    </div>
  );
}
