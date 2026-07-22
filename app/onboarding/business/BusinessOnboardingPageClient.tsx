"use client";

import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
import UniversalMediaUploader from "@/app/components/media/UniversalMediaUploader";
import type { UploadedMediaAsset } from "@/lib/media/media-config";
import { validateGstin } from "@/lib/vendor-verification/gstin";
import AddressEngine, { type AddressEngineValue } from "@/components/geography/AddressEngine";
import { addressEngineToBusinessPayload, legacyBusinessToAddressEngine } from "@/lib/geography/addressAdapters";

async function ensureSessionOrRedirect(
  supabase: any,
  nextPath: string
) {
  try {
    const userRes = await supabase.auth.getUser();
    const user = userRes?.data?.user ?? null;

    if (user?.id) {
      return { user };
    }

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

  location_verification_status: string | null;
  verified_country: string | null;
  verified_state: string | null;
  verified_district: string | null;
  verified_locality: string | null;
  verified_postcode: string | null;
  eligible_free: boolean | null;

  delivery_radius_km: number | string | null;
  preferred_service_area: string | null;
  statewide_service: boolean | null;
  nationwide_service: boolean | null;
  preferred_geo_districts: string[] | null;
  preferred_geo_subdivisions: string[] | null;
  preferred_geo_blocks: string[] | null;
  preferred_geo_places: string[] | null;

  is_complete: boolean;
  completion_score: number;
  missing_fields: string[];
  business_media_json?: UploadedMediaAsset[] | null;
  vendor_document_verification_json?: VendorDocumentVerification | null;
};

type VendorDocumentVerification = {
  status: string;
  confidence: number;
  gstinValidation?: {
    valid: boolean;
    normalized: string;
    errors: string[];
  };
  documentType?: string;
  extractedGstin?: string;
  extractedTradeLicenseNo?: string;
  extractedBusinessName?: string;
  extractedAddress?: string;
  gstinMatchedInDocument?: boolean;
  tradeLicenseMatchedInDocument?: boolean;
  businessNameMatched?: boolean;
  addressMatched?: boolean;
  summary?: string;
  warnings?: string[];
};

type GeoOption = {
  id: string;
  name: string;
  district_id?: string | null;
  block_id?: string | null;
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

function computeCompletion(bp: Partial<BusinessProfile>) {
  const nature = safeArr(bp.nature_of_business);
  const hasBlog = nature.includes("blog");
  const hasNonBlogBusiness = nature.some((x) =>
    ["property", "materials", "services", "rentals"].includes(x)
  );
  const isPureBlogOnly = hasBlog && !hasNonBlogBusiness;

  const natureOk = nature.length > 0;
  const businessNameOk = !!(bp.business_name && bp.business_name.trim());
  const authorNameOk = !!(bp.author_display_name && bp.author_display_name.trim());
  const identityOk = isPureBlogOnly ? authorNameOk : businessNameOk;
  const contactOk = !!(bp.contact_person && bp.contact_person.trim());

  const commOk =
    !!(bp.phone_primary && bp.phone_primary.trim()) ||
    !!(bp.email_business && bp.email_business.trim());

  const locationOk =
    (bp.location_verification_status || "").trim().toLowerCase() === "verified";

  const businessProofOk = isPureBlogOnly
    ? true
    : !!(bp.gstin && bp.gstin.trim()) ||
      !!(bp.trade_license_no && bp.trade_license_no.trim());

  const authorOk = !hasBlog ? true : authorNameOk;

  const missing: string[] = [];
  if (!natureOk) missing.push("Select at least one Nature of Business");
  if (!identityOk) {
    missing.push(isPureBlogOnly ? "Author Display Name" : "Business Name");
  }
  if (!contactOk) missing.push("Contact Person");
  if (!commOk) missing.push("Phone or Email");
  if (!locationOk) missing.push("Live Location Verification");
  if (!businessProofOk) missing.push("GSTIN or Trade License No");
  if (hasBlog && !authorNameOk) {
    missing.push("Author Display Name (Blog)");
  }

  const checks = [
    natureOk,
    identityOk,
    contactOk,
    commOk,
    locationOk,
    businessProofOk,
    authorOk,
  ];

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
      s.includes("pin") ||
      s.includes("location verification") ||
      s.includes("live location")
    ) {
      push("address", m);
      continue;
    }

    if (
      s.includes("business name") ||
      s.includes("business type") ||
      s.includes("gst") ||
      s.includes("gstin") ||
      s.includes("pan") ||
      s.includes("trade license") ||
      s.includes("udyam")
    ) {
      push("identity", m);
      continue;
    }

    push("review", m);
  }

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

function getRoleDisplayLabelFromNature(nature: string[]) {
  const items = safeArr(nature);

  if (items.length === 1) {
    const one = items[0];
    if (one === "materials") return "Materials Vendor";
    if (one === "services") return "Service Vendor";
    if (one === "rentals") return "Rental Vendor";
    if (one === "property") return "Property Vendor / Seller";
    if (one === "blog") return "Blogger / Author";
  }

  if (
    items.includes("property") &&
    items.includes("materials") &&
    items.includes("services") &&
    items.includes("rentals")
  ) {
    return "Vendor Hub";
  }

  if (items.includes("property") && items.length === 1) {
    return "Property Vendor / Seller";
  }

  return "Multi-Service Vendor";
}

export default function BusinessOnboardingPageClient() {
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const router = useRouter();
  const sp = useSearchParams();

  const rawReturnTo = sp.get("returnTo") || "/dashboard/vendor";
  const streamlinedRegistration = sp.get("registration") === "1";
  const returnTo =
    rawReturnTo === "/dashboard" ? "/dashboard/vendor" : rawReturnTo;
  const roleFromQuery = (sp.get("role") || "").trim().toLowerCase();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [locationVerifying, setLocationVerifying] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [userId, setUserId] = useState<string | null>(null);

  const [bp, setBp] = useState<Partial<BusinessProfile>>({
    nature_of_business: [],
  });
  const [addressEngineValue, setAddressEngineValue] = useState<AddressEngineValue>({});

  const [geoDistricts, setGeoDistricts] = useState<GeoOption[]>([]);
  const [geoBlocks, setGeoBlocks] = useState<GeoOption[]>([]);
  const [geoPlaces, setGeoPlaces] = useState<GeoOption[]>([]);


  const [vc, setVc] = useState<VendorCompletenessRow | null>(null);
  const [vcLoading, setVcLoading] = useState(false);
  const [mediaAssets, setMediaAssets] = useState<UploadedMediaAsset[]>([]);
  const [documentVerifyLoading, setDocumentVerifyLoading] = useState(false);
  const [documentVerification, setDocumentVerification] = useState<VendorDocumentVerification | null>(null);

  const nature = safeArr(bp.nature_of_business);
  const hasBlog = nature.includes("blog");
  const gstinFormatCheck = validateGstin(String(bp.gstin || ""));

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

    const loadingSafetyTimer = window.setTimeout(() => {
      if (!alive) return;
      setLoading(false);
      setMsg((m) => m ?? "Profile loading took longer than expected. You can still review and save your details.");
    }, 12000);

    const finishLoading = () => {
      window.clearTimeout(loadingSafetyTimer);
      setLoading(false);
    };

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
          finishLoading();
          return;
        }

        if (!data) {
          const initialNature =
            roleFromQuery === "builder"
              ? ["property"]
              : roleFromQuery === "hub_vendor"
              ? ["property", "materials", "services", "rentals", "blog"]
              : roleFromQuery === "blogger"
              ? ["blog"]
              : [];

          const initialBusinessType =
            roleFromQuery === "builder"
              ? "builder"
              : roleFromQuery === "hub_vendor"
              ? "hub"
              : roleFromQuery === "blogger"
              ? "blogger"
              : roleFromQuery === "vendor"
              ? "vendor"
              : null;

          const { error: insErr } = await supabase
            .from("business_profiles")
            .insert({
              user_id: uid,
              nature_of_business: initialNature,
              business_type: initialBusinessType,
            });

          if (!alive) return;

          if (insErr) {
            setMsg(insErr.message);
            finishLoading();
            return;
          }

          setBp({
            user_id: uid,
            nature_of_business: initialNature,
            business_type: initialBusinessType,
          });
        } else {
          const existingNature = safeArr(data.nature_of_business);
          const seededNature =
            existingNature.length > 0
              ? existingNature
              : roleFromQuery === "builder"
              ? ["property"]
              : roleFromQuery === "hub_vendor"
              ? ["property", "materials", "services", "rentals", "blog"]
              : roleFromQuery === "blogger"
              ? ["blog"]
              : existingNature;

          const seededBusinessType =
            data.business_type ??
            (roleFromQuery === "builder"
              ? "builder"
              : roleFromQuery === "hub_vendor"
              ? "hub"
              : roleFromQuery === "blogger"
              ? "blogger"
              : roleFromQuery === "vendor"
              ? "vendor"
              : null);

          const restoredMedia: UploadedMediaAsset[] = Array.isArray((data as any).business_media_json)
            ? (data as any).business_media_json
                .map((x: any, idx: number): UploadedMediaAsset => {
                  const rawKind = String(x?.kind || "").toLowerCase();
                  const kind: UploadedMediaAsset["kind"] =
                    rawKind === "video" ? "video" : rawKind === "document" ? "document" : "image";

                  return {
                    id: String(x?.id || `${Date.now()}_${idx}`),
                    url: String(x?.url || x?.public_url || ""),
                    bucket: String(x?.bucket || "vendor-media"),
                    path: String(x?.path || x?.object_path || ""),
                    name: String(x?.name || x?.file_name || `Business media ${idx + 1}`),
                    size: Number(x?.size || x?.file_size || 0),
                    mimeType: String(x?.mimeType || x?.mime_type || ""),
                    kind,
                  };
                })
                .filter((x: UploadedMediaAsset) => Boolean(x.url))
            : [];

          setMediaAssets(restoredMedia);
          setDocumentVerification((data as any).vendor_document_verification_json ?? null);

          setBp({
            ...data,
            business_type: seededBusinessType,
            nature_of_business: seededNature,
            missing_fields: safeArr(data.missing_fields),
          });
        }

        if (!alive) return;
        finishLoading();

        fetchCompleteness(uid).catch((e) => {
          console.error("fetchCompleteness failed", e);
        });
      } catch (e: any) {
        if (!alive) return;
        setMsg(e?.message || "Failed to load business profile.");
        finishLoading();
      }
    })();

    return () => {
      alive = false;
      window.clearTimeout(loadingSafetyTimer);
    };
  }, [supabase, returnTo, roleFromQuery]);

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

  function toggleArrayField(key: keyof BusinessProfile, id: string) {
    setBp((p) => {
      const current = Array.isArray((p as any)[key]) ? ((p as any)[key] as string[]) : [];
      const next = current.includes(id)
        ? current.filter((x) => x !== id)
        : [...current, id];

      return { ...p, [key]: next };
    });
  }

  useEffect(() => {
    let alive = true;

    async function loadGeographyOptions() {
      try {
        const res = await fetch("/api/admin/geography");
        const json = await res.json().catch(() => null);
        const data = json?.data || {};

        if (!alive) return;

        setGeoDistricts(Array.isArray(data.districts) ? data.districts : []);
        setGeoBlocks(Array.isArray(data.blocks) ? data.blocks : []);
        setGeoPlaces(Array.isArray(data.places) ? data.places : []);
      } catch {
        if (!alive) return;
        setGeoDistricts([]);
        setGeoBlocks([]);
        setGeoPlaces([]);
      }
    }

    loadGeographyOptions();

    return () => {
      alive = false;
    };
  }, []);

  async function runVendorDocumentVerification() {
    const gstin = String(bp.gstin || "").trim();
    const tradeLicenseNo = String(bp.trade_license_no || "").trim();

    if (!gstin && !tradeLicenseNo) {
      setMsg("Please enter GSTIN or Trade License No before AI document check.");
      return;
    }

    if (!mediaAssets.length) {
      setMsg("Please upload GST certificate or Trade License document/photo first.");
      return;
    }

    setDocumentVerifyLoading(true);
    setMsg("AI is checking GSTIN / Trade License against uploaded document...");

    try {
      const res = await fetch("/api/ai/vendor-document-verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
        body: JSON.stringify({
          gstin,
          tradeLicenseNo,
          businessName: bp.business_name || "",
          businessAddress: [
            bp.address_line1,
            bp.address_line2,
            bp.landmark,
            bp.city,
            bp.district,
            bp.state,
            bp.pincode,
          ]
            .filter(Boolean)
            .join(", "),
          mediaAssets,
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "AI document verification failed.");
      }

      const verification = json.verification as VendorDocumentVerification;
      setDocumentVerification(verification);
      setBp((p) => ({
        ...p,
        vendor_document_verification_json: verification,
      }));

      setMsg("✅ AI-assisted document tally completed. Please review the result below.");
    } catch (e: any) {
      setMsg(e?.message || "AI document verification failed.");
    } finally {
      setDocumentVerifyLoading(false);
    }
  }

  const localCompletion = computeCompletion(bp);
  const isCompleteUI = localCompletion.isComplete;
  const scoreUI = clampPct(localCompletion.score);
  const missingUI = localCompletion.missing;
  const registrationCompleteUI = vc?.registration_complete ?? false;

  const missingByStep = groupMissingByStep(missingUI, { hasProperty: false, hasBlog });

  const missingBusinessOrAuthor = missingUI.some((m) => {
    const s = m.toLowerCase();
    return s.includes("business name") || s.includes("author display name");
  });

  const missingContactPerson = missingUI.some((m) =>
    m.toLowerCase().includes("contact person")
  );

  const missingPhoneOrEmail = missingUI.some((m) =>
    m.toLowerCase().includes("phone or email")
  );

  const missingLocationVerification = missingUI.some((m) =>
    m.toLowerCase().includes("location verification")
  );

  const missingNature = missingUI.some((m) =>
    m.toLowerCase().includes("nature")
  );

  const missingAuthorName = missingUI.some((m) =>
    m.toLowerCase().includes("author display name")
  );

  const missingBusinessProof = missingUI.some((m) => {
    const s = m.toLowerCase();
    return s.includes("gstin") || s.includes("trade license");
  });

  type StepDef = {
    key: StepKey;
    title: string;
    subtitle?: string;
    show?: boolean;
    targetId?: string;
  };

  const stepsAll: StepDef[] = [
    { key: "nature", title: "Step 1 — Nature", subtitle: "Choose what you do", show: !streamlinedRegistration, targetId: "sec-nature" },
    { key: "identity", title: streamlinedRegistration ? "Business details" : "Step 2 — Identity", subtitle: "Business / Legal info", show: true, targetId: "sec-identity" },
    { key: "contact", title: "Step 3 — Contact", subtitle: "Phone / email", show: !streamlinedRegistration, targetId: "sec-contact" },
    { key: "address", title: "Step 4 — Address", subtitle: "Device live location required", show: true, targetId: "sec-address" },
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
      business_media_json: mediaAssets.map((asset) => ({
        id: asset.id,
        url: asset.url,
        bucket: asset.bucket,
        path: asset.path,
        name: asset.name,
        size: asset.size,
        mimeType: asset.mimeType,
        kind: asset.kind,
      })),
      vendor_document_verification_json: documentVerification,
    };

    try {
      const geoRes = await fetch("/api/admin/geography/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          state: payload.state,
          district: payload.district,
          city: payload.city,
          locality:
            payload.locality ||
            payload.verified_locality ||
            payload.address_line2 ||
            payload.address_line1,
          pincode: payload.pincode || payload.verified_postcode,
        }),
      });

      const geoJson = await geoRes.json().catch(() => null);
      const geography = geoJson?.result;

      if (geography) {
        payload.geo_state_id = geography.geo_state_id;
        payload.geo_district_id = geography.geo_district_id;
        payload.geo_subdivision_id = geography.geo_subdivision_id;
        payload.geo_block_id = geography.geo_block_id;
        payload.geo_place_id = geography.geo_place_id;
      }
    } catch {
      // Geography resolver is best-effort and must not block business onboarding.
    }

    Object.keys(payload).forEach((k) => {
      if (payload[k] === undefined) delete payload[k];
    });

    let attemptPayload: Record<string, any> = { ...payload };
    let saveError: any = null;

    for (let i = 0; i < 6; i++) {
      const { error } = await supabase
        .from("business_profiles")
        .update(attemptPayload)
        .eq("user_id", userId);

      if (!error) {
        saveError = null;
        break;
      }

      saveError = error;

      const msg = String(error.message || "");
      const missing =
        msg.match(/could not find the '([^']+)' column/i)?.[1] ||
        msg.match(/column\s+"([^"]+)"\s+.*does not exist/i)?.[1] ||
        msg.match(/column\s+([a-z0-9_]+\.[a-z0-9_]+)\s+does not exist/i)?.[1]?.split(".").pop() ||
        null;

      if (!missing || !(missing in attemptPayload)) break;

      const nextPayload = { ...attemptPayload };
      delete nextPayload[missing];
      attemptPayload = nextPayload;
    }

    if (saveError) {
      setMsg(saveError.message);
      return { ok: false };
    }

    await fetchCompleteness(userId);

    setBp((prev) => ({
      ...prev,
      is_complete: isComplete,
      completion_score: score,
      missing_fields: missing,
    }));

    return { ok: true, isComplete };
  }

  async function verifyLiveLocation() {
    if (!userId) {
      setMsg("Please login first.");
      return;
    }

    if (typeof window === "undefined" || typeof navigator === "undefined") {
      setMsg("Live location is not available here. Please open this page in your browser.");
      return;
    }

    if (!window.isSecureContext) {
      setMsg("Live location works only on HTTPS. Please open https://www.3bigha.com.");
      return;
    }

    if (!navigator.geolocation) {
      setMsg("Live location is not supported on this device or browser.");
      return;
    }

    setLocationVerifying(true);
    setMsg("Please allow location permission in your browser popup...");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const latitude = position.coords.latitude;
          const longitude = position.coords.longitude;

          setMsg(`Device GPS captured. Verifying location: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}...`);

          const res = await fetch("/api/onboarding/verify-location", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              latitude,
              longitude,
              lat: latitude,
              lng: longitude,
            }),
          });

          const json = await res.json().catch(() => null);

          if (!res.ok || !json?.ok) {
            setLocationVerifying(false);
            setMsg(json?.error || "Could not verify your live location.");
            return;
          }

          let geography: any = null;

          try {
            const geoRes = await fetch("/api/admin/geography/resolve", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                state: json.state || bp.state,
                district: json.district || bp.district,
                city: json.locality || bp.city,
                locality: json.locality || bp.city,
                pincode: json.postcode || bp.pincode,
              }),
            });

            const geoJson = await geoRes.json().catch(() => null);
            geography = geoJson?.result || null;
          } catch {
            geography = null;
          }

          const nextBp = {
            ...bp,
            location_verification_status: "verified",
            verified_country: json.country ?? null,
            verified_state: json.state ?? null,
            verified_district: json.district ?? null,
            verified_locality: json.locality ?? null,
            verified_postcode: json.postcode ?? null,
            eligible_free: !!json.eligible_free,
            district: json.district || bp.district || null,
            state: json.state || bp.state || null,
            city: json.locality || bp.city || null,
            pincode: json.postcode || bp.pincode || null,
            geo_state_id: geography?.geo_state_id || null,
            geo_district_id: geography?.geo_district_id || null,
            geo_subdivision_id: geography?.geo_subdivision_id || null,
            geo_block_id: geography?.geo_block_id || null,
            geo_place_id: geography?.geo_place_id || null,
          };

          setBp(nextBp);

          const completion = computeCompletion(nextBp);

          const { error } = await supabase
            .from("business_profiles")
            .update({
              location_verification_status: "verified",
              verified_country: json.country ?? null,
              verified_state: json.state ?? null,
              verified_district: json.district ?? null,
              verified_locality: json.locality ?? null,
              verified_postcode: json.postcode ?? null,
              eligible_free: !!json.eligible_free,
              district: json.district || bp.district || null,
              state: json.state || bp.state || null,
              city: json.locality || bp.city || null,
              pincode: json.postcode || bp.pincode || null,
              geo_state_id: geography?.geo_state_id || null,
              geo_district_id: geography?.geo_district_id || null,
              geo_subdivision_id: geography?.geo_subdivision_id || null,
              geo_block_id: geography?.geo_block_id || null,
              geo_place_id: geography?.geo_place_id || null,
              is_complete: completion.isComplete,
              completion_score: completion.score,
              missing_fields: completion.missing,
            })
            .eq("user_id", userId);

          setLocationVerifying(false);

          if (error) {
            setMsg(error.message);
            return;
          }

          await fetchCompleteness(userId);

          setMsg(
            `✅ Device location verified: ${
              json.locality || json.district || "Location detected"
            }${json.eligible_free ? " • Free district eligible" : ""}`
          );
        } catch (e: any) {
          setLocationVerifying(false);
          setMsg(e?.message || "Location verification failed.");
        }
      },
      (error) => {
        setLocationVerifying(false);

        if (error.code === error.PERMISSION_DENIED) {
          setMsg(
            "Location permission is blocked. Tap the lock/site icon beside the browser address bar, open Site settings, allow Location, reload this page, then try again."
          );
          return;
        }

        if (error.code === error.TIMEOUT) {
          setMsg("Location request timed out. Please turn on GPS/location and try again.");
          return;
        }

        setMsg("Could not get your device location. Please turn on GPS/location and try again.");
      },
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 0,
      }
    );
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
      scrollToId(firstPendingStep.targetId || "sec-review");
      return;
    }

    if (userId) {
      const { data: latestVc } = await supabase
        .from("v_vendor_profile_completeness")
        .select("registration_complete")
        .eq("user_id", userId)
        .maybeSingle();

      await fetchCompleteness(userId);

      setMsg(
        latestVc?.registration_complete
          ? "Saved ✅ Registration already complete. You can go to the dashboard."
          : "Saved ✅ Profile is complete. Now click 'Activate My Dashboard' to finish setup."
      );
    } else {
      setMsg("Saved ✅ Profile is complete. Now click 'Activate My Dashboard' to finish setup.");
    }

    scrollToId("sec-review");
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

    if (error) {
      setSaving(false);
      setMsg(error.message);
      return;
    }

    const ok = !!data;
    if (!ok) {
      setSaving(false);
      setMsg("Profile complete, but registration is still not marked complete. Try again.");
      await fetchCompleteness(userId);
      return;
    }

    const roleDisplayLabel =
      roleFromQuery === "builder"
        ? "Builder / Developer"
        : roleFromQuery === "hub_vendor"
        ? "Vendor Hub"
        : roleFromQuery === "blogger"
        ? "Blogger / Author"
        : getRoleDisplayLabelFromNature(safeArr(bp.nature_of_business));

    const fallbackUseReason =
      roleFromQuery === "builder"
        ? "manage_builder_projects"
        : roleFromQuery === "hub_vendor"
        ? "operate_multiple_businesses"
        : roleFromQuery === "blogger"
        ? "publish_blog_or_news"
        : safeArr(bp.nature_of_business).includes("materials")
        ? "sell_materials"
        : safeArr(bp.nature_of_business).includes("services")
        ? "offer_services"
        : safeArr(bp.nature_of_business).includes("rentals")
        ? "provide_rentals"
        : safeArr(bp.nature_of_business).includes("property")
        ? "list_property_for_sale"
        : "operate_multiple_businesses";

    const sessionRes = await supabase.auth.getSession();
    const sessionUser = sessionRes.data.session?.user ?? null;

    const profilePayload = {
      id: userId,
      email: sessionUser?.email ?? null,
      requested_role: roleFromQuery || null,
      role:
        roleFromQuery === "builder"
          ? "builder"
          : roleFromQuery === "hub_vendor"
          ? "hub_vendor"
          : roleFromQuery === "blogger"
          ? "blogger"
          : "vendor",
      is_vendor:
        roleFromQuery === "builder" ||
        roleFromQuery === "hub_vendor" ||
        roleFromQuery === "blogger" ||
        roleFromQuery === "vendor",
      onboarding_version: 2,
      onboarding_completed: true,
      portal_use_reason: fallbackUseReason,
      role_display_label: roleDisplayLabel,
      full_name: bp.contact_person ?? null,
      phone: bp.phone_primary ?? null,
      city: bp.city ?? null,
      state: bp.state ?? null,
    };

    const { error: profileUpdateError } = await supabase
      .from("profiles")
      .upsert(profilePayload, { onConflict: "id" });

    if (profileUpdateError) {
      setSaving(false);
      setMsg(profileUpdateError.message);
      await fetchCompleteness(userId);
      return;
    }

    // Rebuild grants from final onboarding selection
    const finalRole =
      roleFromQuery === "builder"
        ? "builder"
        : roleFromQuery === "hub_vendor"
        ? "hub_vendor"
        : roleFromQuery === "blogger"
        ? "blogger"
        : "vendor";

    const grantRows =
      finalRole === "hub_vendor"
        ? [
            "materials",
            "services",
            "rentals",
            "property_owner",
            "property_builder",
            "blog_author",
            "investor",
          ]
        : finalRole === "builder"
        ? ["property_builder"]
        : finalRole === "blogger"
        ? ["blog_author"]
        : safeArr(bp.nature_of_business).flatMap((x) => {
            if (x === "materials") return ["materials"];
            if (x === "services") return ["services"];
            if (x === "rentals") return ["rentals"];
            if (x === "property") return ["property_owner"];
            if (x === "blog") return ["blog_author"];
            return [];
          });

    const uniqueGrantRows = Array.from(new Set(grantRows)).map((module_key) => ({
      user_id: userId,
      module_key,
      is_active: true,
    }));

    const { error: deleteGrantError } = await supabase
      .from("vendor_module_grants")
      .delete()
      .eq("user_id", userId);

    if (deleteGrantError) {
      setSaving(false);
      setMsg(deleteGrantError.message);
      await fetchCompleteness(userId);
      return;
    }

    if (uniqueGrantRows.length > 0) {
      const { error: insertGrantError } = await supabase
        .from("vendor_module_grants")
        .insert(uniqueGrantRows);

      if (insertGrantError) {
        setSaving(false);
        setMsg(insertGrantError.message);
        await fetchCompleteness(userId);
        return;
      }
    }

    setSaving(false);

    setMsg("✅ Registration Complete. Redirecting...");
    await fetchCompleteness(userId);
    router.replace(returnTo);
    router.refresh();
  }

  if (loading) {
    return (
      <div style={{ maxWidth: 900, margin: "40px auto", padding: 12 }}>
        Loading business profile...
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 900, margin: "40px auto", padding: 12 }}>
      <div style={{ color: "#1d4ed8", fontWeight: 900, fontSize: 13, letterSpacing: ".06em", textTransform: "uppercase" }}>
        {streamlinedRegistration ? "Workspace setup · Business details" : "Business profile"}
      </div>
      <h1 style={{ fontSize: 26, fontWeight: 800, marginTop: 8 }}>
        {streamlinedRegistration ? "Complete your registration" : "Manage your Business Profile"}
      </h1>
      <p style={{ opacity: 0.8 }}>
        {streamlinedRegistration
          ? "Your identity, contact and official location are already saved. Add only the business details required for your selected work, then open your unified workspace."
          : "Update your business details, verification and service coverage. Your account identity and workspace remain unchanged."}
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
            <div style={{ height: 10, background: "#eee", borderRadius: 12 }}>
              <div
                style={{
                  height: 10,
                  width: `${scoreUI}%`,
                  background: scoreUI >= 100 ? "green" : "#333",
                  borderRadius: 12,
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

        <div
          id="sec-review"
          style={{
            marginTop: 14,
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          {registrationCompleteUI ? (
            <>
              <div style={{ fontWeight: 800, color: "green" }}>
                ✅ Registration Complete
              </div>

              <button
                type="button"
                onClick={() => router.replace(returnTo)}
                style={{
                  padding: "10px 14px",
                  fontWeight: 800,
                  borderRadius: 10,
                  border: "1px solid #16a34a",
                  background: "#16a34a",
                  color: "#fff",
                  cursor: "pointer",
                }}
              >
                Open Dashboard
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                disabled={saving || !isCompleteUI}
                onClick={onFinishRegistration}
                style={{
                  padding: "10px 14px",
                  fontWeight: 800,
                  borderRadius: 10,
                  border: "1px solid #16a34a",
                  background: saving || !isCompleteUI ? "#cbd5e1" : "#16a34a",
                  color: "#fff",
                  cursor: saving || !isCompleteUI ? "not-allowed" : "pointer",
                  opacity: saving || !isCompleteUI ? 0.8 : 1,
                }}
              >
                {saving ? "Activating..." : "🚀 Activate My Dashboard"}
              </button>

              {!isCompleteUI && (
                <span style={{ opacity: 0.8 }}>
                  Complete the highlighted fields, then activate your dashboard.
                </span>
              )}
            </>
          )}
        </div>
      </div>

      <form onSubmit={onSave} style={{ marginTop: 20, display: "grid", gap: 16 }}>
        {!streamlinedRegistration ? <section id="sec-nature" style={{ padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
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
        </section> : null}

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
              <Field
                label="GSTIN"
                required
                missing={missingBusinessProof}
                hint="Provide GSTIN or Trade License No"
              >
                <input
                  value={bp.gstin ?? ""}
                  onChange={(e) => setField("gstin", e.target.value.toUpperCase())}
                  maxLength={15}
                  placeholder="15-character GSTIN"
                  style={{ width: "100%", padding: 10, border: "none", outline: "none" }}
                />
                {bp.gstin ? (
                  <div
                    style={{
                      padding: "0 10px 10px",
                      fontSize: 12,
                      color: gstinFormatCheck.valid ? "#047857" : "#b91c1c",
                      fontWeight: 800,
                      lineHeight: 1.5,
                    }}
                  >
                    {gstinFormatCheck.valid ? (
                      <>✅ GSTIN format valid: {gstinFormatCheck.normalized}</>
                    ) : (
                      <>
                        ⚠️ {gstinFormatCheck.errors.slice(0, 2).join(" ")}
                      </>
                    )}
                  </div>
                ) : null}
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
              <Field
                label="Trade License No"
                required
                missing={missingBusinessProof}
                hint="For business operators, provide GSTIN or Trade License No"
              >
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

            <div
              style={{
                padding: 10,
                borderRadius: 8,
                background: "#eff6ff",
                border: "1px solid #bfdbfe",
                color: "#1d4ed8",
                fontSize: 13,
              }}
            >
              For all business activities on 3bigha, at least one proof is required:
              <b> GSTIN or Trade License No</b>.
              Pure blog-only profiles may complete without business proof.
            </div>

            <UniversalMediaUploader
              module="vendor"
              value={mediaAssets}
              onChange={setMediaAssets}
              label="Business proof / shop photos / certificates"
              helperText="Upload shop photos, office photos, GST certificate, trade license, visiting card, completed work photos, or business proof documents."
              allowImages
              allowVideos
              allowDocuments
              maxFiles={10}
            />

            <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>
              These uploads help verification and trust. If your database does not yet have
              <b> business_media_json</b>, the form will still save safely and we can add the column later.
            </div>

            <div
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 12,
                padding: 12,
                background: "#fff",
                display: "grid",
                gap: 10,
              }}
            >
              <div style={{ fontWeight: 900 }}>
                🤖 AI-assisted GST / Trade License document tally
              </div>

              <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.5 }}>
                AI will compare typed GSTIN / Trade License No with uploaded certificate or license.
                This is not official government verification; admin/manual review may still be required.
              </div>

              <button
                type="button"
                onClick={runVendorDocumentVerification}
                disabled={documentVerifyLoading || saving}
                style={{
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid #111827",
                  background: documentVerifyLoading ? "#f1f5f9" : "#111827",
                  color: documentVerifyLoading ? "#64748b" : "#fff",
                  fontWeight: 900,
                  cursor: documentVerifyLoading || saving ? "not-allowed" : "pointer",
                }}
              >
                {documentVerifyLoading ? "AI checking document..." : "AI Check GST / Trade License Document"}
              </button>

              {documentVerification ? (
                <div
                  style={{
                    borderRadius: 12,
                    padding: 12,
                    border:
                      documentVerification.status === "verified_by_ai"
                        ? "1px solid #bbf7d0"
                        : documentVerification.status === "format_invalid" ||
                          documentVerification.status === "format_valid_document_mismatch"
                        ? "1px solid #fecaca"
                        : "1px solid #fed7aa",
                    background:
                      documentVerification.status === "verified_by_ai"
                        ? "#f0fdf4"
                        : documentVerification.status === "format_invalid" ||
                          documentVerification.status === "format_valid_document_mismatch"
                        ? "#fff1f2"
                        : "#fff7ed",
                    color:
                      documentVerification.status === "verified_by_ai"
                        ? "#166534"
                        : documentVerification.status === "format_invalid" ||
                          documentVerification.status === "format_valid_document_mismatch"
                        ? "#9f1239"
                        : "#9a3412",
                    fontSize: 13,
                    lineHeight: 1.6,
                    fontWeight: 800,
                  }}
                >
                  <div style={{ fontWeight: 950 }}>
                    Status: {documentVerification.status.replace(/_/g, " ")} • Confidence:{" "}
                    {documentVerification.confidence ?? 0}%
                  </div>

                  <div style={{ marginTop: 6 }}>
                    GSTIN format: {documentVerification.gstinValidation?.valid ? "✅ Valid" : "⚠️ Not valid / not provided"}
                  </div>

                  <div>
                    GSTIN matched in document: {documentVerification.gstinMatchedInDocument ? "✅ Yes" : "⚠️ No"}
                  </div>

                  <div>
                    Trade License matched in document:{" "}
                    {documentVerification.tradeLicenseMatchedInDocument ? "✅ Yes" : "⚠️ No"}
                  </div>

                  <div>
                    Business name match: {documentVerification.businessNameMatched ? "✅ Likely" : "⚠️ Needs review"}
                  </div>

                  {documentVerification.summary ? (
                    <div style={{ marginTop: 6 }}>{documentVerification.summary}</div>
                  ) : null}

                  {Array.isArray(documentVerification.warnings) && documentVerification.warnings.length ? (
                    <div style={{ marginTop: 6 }}>
                      Warnings: {documentVerification.warnings.slice(0, 3).join(" ")}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </section>

        {!streamlinedRegistration ? <section id="sec-contact" style={{ padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
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
        </section> : null}

        <section id="sec-address" style={{ padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
          <h3 style={{ marginTop: 0 }}>Address</h3>

          <div style={{ display: "grid", gap: 10 }}>
                        <div
              style={{
                padding: 12,
                borderRadius: 10,
                background: missingLocationVerification ? "#fff1f2" : "#f0fdf4",
                border: `1px solid ${missingLocationVerification ? "#fecdd3" : "#bbf7d0"}`,
                color: missingLocationVerification ? "#9f1239" : "#166534",
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              {missingLocationVerification
                ? "Device live location verification is mandatory. Manual address or copied district will not activate dashboard access."
                : `Device location verified: ${
                    bp.verified_locality ||
                    bp.verified_district ||
                    "Verified"
                  }${bp.eligible_free ? " • Free district eligible" : ""}`}
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                verifyLiveLocation();
              }}
              disabled={locationVerifying}
              style={{
                padding: 12,
                borderRadius: 10,
                border: "1px solid #2563eb",
                background: "#2563eb",
                color: "#ffffff",
                fontWeight: 900,
                cursor: locationVerifying ? "not-allowed" : "pointer",
              }}
            >
              {locationVerifying
                ? "Verifying live location..."
                : missingLocationVerification
                ? "📍 Use My Live Location to Verify"
                : "✅ Location Verified (Tap to re-check)"}
            </button>

            {missingLocationVerification ? (
              <div
                style={{
                  padding: 10,
                  borderRadius: 8,
                  background: "#fff7ed",
                  border: "1px solid #fed7aa",
                  color: "#9a3412",
                  fontSize: 12,
                  lineHeight: 1.5,
                }}
              >
                Mobile help: If the button does not open the location popup,
                tap the lock/site icon beside the browser address bar, allow
                Location permission, reload this page, then try again.
              </div>
            ) : null}

            <div
              style={{
                marginTop: 12,
                padding: 12,
                borderRadius: 10,
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
              }}
            >
              <h4 style={{ margin: "0 0 8px", fontSize: 15 }}>
                Vendor Service Radius
              </h4>

              <p style={{ marginTop: 0, fontSize: 12, opacity: 0.75 }}>
                This helps 3Bigha route RFQs to vendors who can actually serve the buyer location.
              </p>

              <div style={{ display: "grid", gap: 10 }}>
                <Field label="Delivery / Service Radius in KM">
                  <input
                    type="number"
                    min="0"
                    value={bp.delivery_radius_km ?? ""}
                    onChange={(e) => setField("delivery_radius_km", e.target.value)}
                    placeholder="Example: 25"
                    style={{ width: "100%", padding: 10, border: "none", outline: "none" }}
                  />
                </Field>

                <Field label="Preferred Service Area">
                  <input
                    value={bp.preferred_service_area ?? ""}
                    onChange={(e) => setField("preferred_service_area", e.target.value)}
                    placeholder="Example: Cooch Behar II, Khagrabari, Pundibari"
                    style={{ width: "100%", padding: 10, border: "none", outline: "none" }}
                  />
                </Field>

                <label style={{ display: "flex", gap: 8, alignItems: "center", fontWeight: 700 }}>
                  <input
                    type="checkbox"
                    checked={!!bp.statewide_service}
                    onChange={(e) => setField("statewide_service", e.target.checked)}
                  />
                  I can serve across my state
                </label>

                <label style={{ display: "flex", gap: 8, alignItems: "center", fontWeight: 700 }}>
                  <input
                    type="checkbox"
                    checked={!!bp.nationwide_service}
                    onChange={(e) => setField("nationwide_service", e.target.checked)}
                  />
                  I can serve across India
                </label>

                <div
                  style={{
                    padding: 12,
                    borderRadius: 10,
                    background: "#ecfdf5",
                    border: "1px solid #bbf7d0",
                  }}
                >
                  <div style={{ fontSize: 14, fontWeight: 950, marginBottom: 6 }}>
                    Service Coverage
                  </div>

                  <p style={{ margin: "0 0 10px", fontSize: 12, opacity: 0.78, lineHeight: 1.5 }}>
                    Your primary service area is linked with the official LGD location selected below.
                    Use radius for nearby RFQs, or select Statewide / Nationwide service above.
                    Detailed multi-location service coverage will be added through a clean hierarchy in the next data phase.
                  </p>

                  <div
                    style={{
                      display: "grid",
                      gap: 8,
                      padding: 10,
                      borderRadius: 8,
                      background: "#fff",
                      border: "1px solid #d1fae5",
                      fontSize: 13,
                    }}
                  >
                    <div>
                      <b>Primary service area:</b>{" "}
                      {bp.preferred_service_area ||
                        bp.city ||
                        bp.district ||
                        "Select your official location below"}
                    </div>

                    <div>
                      <b>Coverage mode:</b>{" "}
                      {bp.nationwide_service
                        ? "Across India"
                        : bp.statewide_service
                        ? "Across my state"
                        : bp.delivery_radius_km
                        ? `Within ${bp.delivery_radius_km} KM radius`
                        : "Local service area"}
                    </div>

                    <div style={{ opacity: 0.75 }}>
                      To add multiple districts, blocks or places, use the service area text field for now.
                      Avoid selecting from long unfiltered lists.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {!missingLocationVerification ? (
              <div
                style={{
                  padding: 10,
                  borderRadius: 8,
                  background: "#eff6ff",
                  border: "1px solid #bfdbfe",
                  color: "#1d4ed8",
                  fontSize: 12,
                  lineHeight: 1.5,
                }}
              >
                Verified from device GPS:
                <br />
                District: <b>{bp.verified_locality || bp.verified_district || "Detected"}</b>
                <br />
                Locality: <b>{bp.verified_locality || "Detected"}</b>
                <br />
                State: <b>{bp.verified_state || "Detected"}</b>
                <br />
                Pincode: <b>{bp.verified_postcode || "Detected"}</b>
              </div>
            ) : null}

            <AddressEngine
              value={
                Object.keys(addressEngineValue || {}).length
                  ? addressEngineValue
                  : legacyBusinessToAddressEngine(bp)
              }
              disabled={saving}
              onChange={(nextAddress) => {
                setAddressEngineValue(nextAddress);

                const mapped = addressEngineToBusinessPayload(nextAddress);
                const {
                  formatted_address,
                  short_address,
                  ...businessAddressPayload
                } = mapped;

                setBp((prev) => ({
                  ...prev,
                  ...businessAddressPayload,
                }));
              }}
            />
          </div>
        </section>

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
            Save & Go to Review
          </button>

          <button type="button" onClick={() => router.replace(returnTo)} style={{ padding: 10 }}>
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
