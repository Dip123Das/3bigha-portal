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
import AIWritingImprovement from "../../../components/onboarding/AIWritingImprovement";
import BusinessIdentityJourney, {
  type BusinessIdentityJourneyStep,
} from "@/components/onboarding/BusinessIdentityJourney";
import BusinessVerificationPanel from "@/components/onboarding/BusinessVerificationPanel";

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

type LegalProofKind =
  | "gst"
  | "trade-license"
  | "udyam"
  | "other";

type LegalProofMeta = {
  documentType: LegalProofKind;
  certificateNumber: string;
  issuingAuthority: string;
  issueDate: string;
  validUntil: string;
  noExpiry: boolean;
};

type BusinessMediaAsset = UploadedMediaAsset & {
  legalProofMeta?: LegalProofMeta;
};

function normalizeLegalProofMeta(
  value: unknown
): LegalProofMeta | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const candidate = value as Record<string, unknown>;
  const documentType = String(
    candidate.documentType || ""
  ).trim() as LegalProofKind;

  if (
    ![
      "gst",
      "trade-license",
      "udyam",
      "other",
    ].includes(documentType)
  ) {
    return undefined;
  }

  return {
    documentType,
    certificateNumber: String(
      candidate.certificateNumber || ""
    ).trim(),
    issuingAuthority: String(
      candidate.issuingAuthority || ""
    ).trim(),
    issueDate: String(
      candidate.issueDate || ""
    ).trim(),
    validUntil: String(
      candidate.validUntil || ""
    ).trim(),
    noExpiry: Boolean(candidate.noExpiry),
  };
}

function legalProofMetaFor(
  asset: UploadedMediaAsset | undefined
) {
  return normalizeLegalProofMeta(
    (asset as BusinessMediaAsset | undefined)
      ?.legalProofMeta
  );
}

function legalProofDate(
  value: string,
  endOfDay = false
) {
  if (!value) return null;

  const parsed = new Date(
    `${value}T${
      endOfDay
        ? "23:59:59.999"
        : "00:00:00.000"
    }`
  );

  return Number.isFinite(parsed.getTime())
    ? parsed
    : null;
}

function legalProofIsExpired(
  meta: LegalProofMeta
) {
  if (meta.noExpiry) return false;

  const expiry = legalProofDate(
    meta.validUntil,
    true
  );

  return Boolean(
    expiry &&
      expiry.getTime() < Date.now()
  );
}

function legalProofIssueDateIsFuture(
  meta: LegalProofMeta
) {
  const issueDate = legalProofDate(
    meta.issueDate
  );

  if (!issueDate) return false;

  const today = new Date();
  today.setHours(23, 59, 59, 999);

  return issueDate.getTime() > today.getTime();
}

function legalProofValidityPrecedesIssue(
  meta: LegalProofMeta
) {
  if (
    meta.noExpiry ||
    !meta.issueDate ||
    !meta.validUntil
  ) {
    return false;
  }

  const issueDate = legalProofDate(
    meta.issueDate
  );
  const validUntil = legalProofDate(
    meta.validUntil,
    true
  );

  return Boolean(
    issueDate &&
      validUntil &&
      validUntil.getTime() <
        issueDate.getTime()
  );
}

function legalProofAssetIsComplete(
  asset: UploadedMediaAsset
) {
  const meta = legalProofMetaFor(asset);

  if (!meta) return false;

  return Boolean(
    meta.certificateNumber &&
      meta.issuingAuthority &&
      meta.issueDate &&
      (
        meta.noExpiry ||
        meta.validUntil
      ) &&
      !legalProofIssueDateIsFuture(meta) &&
      !legalProofValidityPrecedesIssue(meta) &&
      !legalProofIsExpired(meta)
  );
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
  about_person: string | null;
  about_business: string | null;

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

type VendorDocumentVerificationItem = {
  documentType: string;
  label?: string;
  enteredNumber?: string;
  extractedNumber?: string;
  matched?: boolean;
  readable?: boolean;
  confidence?: number;
  status?: string;
  enteredIssuingAuthority?: string;
  extractedIssuingAuthority?: string;
  authorityMatched?: boolean;
  enteredIssueDate?: string;
  extractedIssueDate?: string;
  issueDateMatched?: boolean;
  enteredValidUntil?: string;
  extractedValidUntil?: string;
  expiryMatched?: boolean;
  noExpiry?: boolean;
  extractedNoExpiry?: boolean;
  noExpiryMatched?: boolean;
  documentExpired?: boolean;
  extractedBusinessName?: string;
  extractedAddress?: string;
  businessNameMatched?: boolean;
  addressMatched?: boolean;
  summary?: string;
  warnings?: string[];
};

type VendorDocumentVerification = {
  status: string;
  confidence: number;
  documents?: VendorDocumentVerificationItem[];
  compatibility?: {
    gstinValidation?: {
      valid: boolean;
      normalized: string;
      errors: string[];
    };
    gstinMatchedInDocument?: boolean;
    tradeLicenseMatchedInDocument?: boolean;
  };
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
  const onboardingPath = `/onboarding/business?${new URLSearchParams({
    returnTo: rawReturnTo,
    ...(streamlinedRegistration ? { registration: "1" } : {}),
    ...(roleFromQuery ? { role: roleFromQuery } : {}),
  }).toString()}`;

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
  const [
    selectedJourneyKey,
    setSelectedJourneyKey,
  ] = useState<BusinessIdentityJourneyStep["key"] | null>(
    null
  );

  const [termsAccepted, setTermsAccepted] =
    useState(false);

  const nature = safeArr(bp.nature_of_business);
  const hasBlog = nature.includes("blog");
  const hasNonBlogBusiness = nature.some((item) =>
    ["property", "materials", "services", "rentals"].includes(item)
  );
  const isPureBlogOnly =
    hasBlog && !hasNonBlogBusiness;

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
          onboardingPath
        );

        if (!alive || !sessionOrUser) return;

        const uid =
          sessionOrUser?.user?.id ||
          sessionOrUser?.data?.user?.id ||
          null;

        if (!uid) {
          window.location.href = `/login?next=${encodeURIComponent(
            onboardingPath
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

          const restoredMedia: BusinessMediaAsset[] =
            Array.isArray(
              (data as any).business_media_json
            )
              ? (data as any).business_media_json
                  .map(
                    (
                      x: any,
                      idx: number
                    ): BusinessMediaAsset => {
                      const rawKind = String(
                        x?.kind || ""
                      ).toLowerCase();

                      const kind:
                        UploadedMediaAsset["kind"] =
                        rawKind === "video"
                          ? "video"
                          : rawKind === "document"
                          ? "document"
                          : "image";

                      const legalProofMeta =
                        normalizeLegalProofMeta(
                          x?.legalProofMeta ??
                            x?.legal_proof_meta
                        );

                      return {
                        id: String(
                          x?.id ||
                            `${Date.now()}_${idx}`
                        ),
                        url: String(
                          x?.url ||
                            x?.public_url ||
                            ""
                        ),
                        bucket: String(
                          x?.bucket ||
                            "vendor-media"
                        ),
                        path: String(
                          x?.path ||
                            x?.object_path ||
                            ""
                        ),
                        name: String(
                          x?.name ||
                            x?.file_name ||
                            `Business media ${
                              idx + 1
                            }`
                        ),
                        size: Number(
                          x?.size ||
                            x?.file_size ||
                            0
                        ),
                        mimeType: String(
                          x?.mimeType ||
                            x?.mime_type ||
                            ""
                        ),
                        kind,
                        ...(legalProofMeta
                          ? { legalProofMeta }
                          : {}),
                      };
                    }
                  )
                  .filter(
                    (x: BusinessMediaAsset) =>
                      Boolean(x.url)
                  )
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
    const udyamNo = String(bp.udyam_no || "").trim();
    const pan = String(bp.pan || "").trim();

    const assetsFor = (kind: string) =>
      mediaAssets.filter((asset) =>
        String(asset.path || "").includes(
          `/legal-proof/${kind}/`
        )
      );

    const verificationDocument = ({
      documentType,
      enteredNumber,
      label,
      assetKind,
      fallbackAssets = [],
    }: {
      documentType:
        | "gst"
        | "trade_license"
        | "udyam"
        | "pan";
      enteredNumber: string;
      label: string;
      assetKind:
        | "gst"
        | "trade-license"
        | "udyam"
        | "other";
      fallbackAssets?: UploadedMediaAsset[];
    }) => {
      const matchingAssets =
        assetsFor(assetKind);

      const mediaAssetsForDocument =
        matchingAssets.length
          ? matchingAssets
          : fallbackAssets;

      const meta = legalProofMetaFor(
        mediaAssetsForDocument[0]
      );

      return {
        documentType,
        enteredNumber:
          enteredNumber ||
          meta?.certificateNumber ||
          "",
        label,
        issuingAuthority:
          meta?.issuingAuthority || "",
        issueDate:
          meta?.issueDate || "",
        validUntil:
          meta?.validUntil || "",
        noExpiry:
          meta?.noExpiry || false,
        legalProofMeta: meta,
        mediaAssets:
          mediaAssetsForDocument,
      };
    };

    const legacyLegalAssets = mediaAssets.filter(
      (asset) =>
        String(asset.path || "").includes("/legal-proof/") &&
        !["gst", "trade-license", "udyam", "other"].some((kind) =>
          String(asset.path || "").includes(`/legal-proof/${kind}/`)
        )
    );

    const documents = [
      verificationDocument({
        documentType: "gst",
        enteredNumber: gstin,
        label: "GST Registration",
        assetKind: "gst",
      }),
      verificationDocument({
        documentType: "trade_license",
        enteredNumber: tradeLicenseNo,
        label: "Trade Licence",
        assetKind: "trade-license",
      }),
      verificationDocument({
        documentType: "udyam",
        enteredNumber: udyamNo,
        label: "UDYAM Registration",
        assetKind: "udyam",
      }),
      verificationDocument({
        documentType: "pan",
        enteredNumber: pan,
        label: "PAN",
        assetKind: "other",
      }),
    ].filter(
      (document) =>
        document.enteredNumber ||
        document.mediaAssets.length > 0
    );

    if (!documents.length && legacyLegalAssets.length) {
      if (gstin) {
        documents.push(
          verificationDocument({
            documentType: "gst",
            enteredNumber: gstin,
            label: "GST Registration",
            assetKind: "gst",
            fallbackAssets:
              legacyLegalAssets,
          })
        );
      } else if (tradeLicenseNo) {
        documents.push(
          verificationDocument({
            documentType:
              "trade_license",
            enteredNumber:
              tradeLicenseNo,
            label: "Trade Licence",
            assetKind:
              "trade-license",
            fallbackAssets:
              legacyLegalAssets,
          })
        );
      }
    }

    if (!documents.length) {
      setMsg(
        "Enter at least one registration number and upload its matching legal certificate."
      );
      return;
    }

    const missingCertificate = documents.find(
      (document) =>
        document.enteredNumber && document.mediaAssets.length === 0
    );

    if (missingCertificate) {
      setMsg(
        `Please upload the ${missingCertificate.label} certificate before checking it.`
      );
      return;
    }

    setDocumentVerifyLoading(true);
    setMsg(
      "Checking each registration number against its own legal certificate..."
    );

    try {
      const res = await fetch("/api/ai/vendor-document-verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
        body: JSON.stringify({
          documents,
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
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.ok) {
        throw new Error(
          json?.error || "Document verification failed."
        );
      }

      const verification =
        json.verification as VendorDocumentVerification;

      setDocumentVerification(verification);
      setBp((current) => ({
        ...current,
        vendor_document_verification_json: verification,
      }));

      setMsg(
        "✅ Legal-document checks completed. Review the status shown for every registration."
      );
    } catch (error: any) {
      setMsg(
        error?.message || "Document verification failed."
      );
    } finally {
      setDocumentVerifyLoading(false);
    }
  }

  const localCompletion = computeCompletion(bp);
  const isCompleteUI = localCompletion.isComplete;
  const scoreUI = clampPct(localCompletion.score);
  const missingUI = localCompletion.missing;
  const registrationCompleteUI = vc?.registration_complete ?? false;

  const legalProofAssets = mediaAssets.filter((asset) =>
    String(asset.path || "").includes("/legal-proof/")
  );

  const practicalProofAssets = mediaAssets.filter((asset) =>
    String(asset.path || "").includes("/practical-proof/")
  );

  const liveSelfieAssets = mediaAssets.filter((asset) =>
    String(asset.path || "").includes("/live-selfie/")
  );

  const identityReady = Boolean(
    nature.length > 0 &&
      String(bp.contact_person || "").trim() &&
      (
        String(bp.business_name || "").trim() ||
        String(bp.author_display_name || "").trim()
      ) &&
      (
        String(bp.phone_primary || "").trim() ||
        String(bp.email_business || "").trim()
      )
  );

  const addressReady =
    String(bp.location_verification_status || "")
      .trim()
      .toLowerCase() === "verified" &&
    Boolean(
      String(bp.address_line1 || "").trim() ||
        String(bp.address_line2 || "").trim() ||
        String(bp.city || "").trim() ||
        String(bp.district || "").trim() ||
        String(bp.pincode || "").trim()
    );

  const aboutReady = Boolean(
    String(bp.about_person || "").trim() &&
      (
        String(bp.about_business || "").trim() ||
        (hasBlog && String(bp.author_bio || "").trim())
      )
  );

  const coverageReady = Boolean(
    Number(bp.delivery_radius_km || 0) > 0 ||
      String(bp.preferred_service_area || "").trim() ||
      bp.statewide_service ||
      bp.nationwide_service
  );

  const structuredLegalProofAssets =
    legalProofAssets.filter(
      legalProofAssetIsComplete
    );

  const legacyLegalProofAssets =
    legalProofAssets.filter(
      (asset) =>
        !legalProofMetaFor(asset)
    );

  /*
   * Existing vendors remain loadable, but legacy files do not
   * unlock a new registration. The user must complete the
   * structured certificate details before activation.
   */
  const legalProofReady =
    isPureBlogOnly ||
    structuredLegalProofAssets.length > 0;

  const practicalProofReady =
    isPureBlogOnly ||
    practicalProofAssets.length > 0;

  const liveSelfieReady =
    isPureBlogOnly ||
    liveSelfieAssets.length > 0;

  /*
   * Registration readiness must represent the complete human journey.
   *
   * The legacy computeCompletion() result remains the compatibility value
   * saved to business_profiles, but it must not independently unlock final
   * registration or dashboard activation.
   */
  const documentVerificationStatus = String(
    documentVerification?.status || ""
  )
    .trim()
    .toLowerCase();

  const failedDocumentStatuses = new Set([
    "failed",
    "rejected",
    "invalid",
    "unreadable",
    "mismatch",
    "document_mismatch",
    "format_invalid",
    "needs_document",
    "correction_required",
  ]);

  const verifiedDocumentStatuses = new Set([
    "verified",
    "accepted",
    "approved",
    "passed",
    "complete",
    "completed",
    "good_attachment",
    "reviewed",
    "verified_by_ai",
    "needs_manual_review",
    "manual_review_required",
    "verification_complete",
    "checks_completed",
  ]);

  const verificationDocuments =
    Array.isArray(documentVerification?.documents)
      ? documentVerification.documents
      : [];

  const verificationHasFailure =
    failedDocumentStatuses.has(documentVerificationStatus) ||
    verificationDocuments.some((document) => {
      const status = String(document.status || "")
        .trim()
        .toLowerCase();

      return (
        document.readable === false ||
        document.matched === false ||
        document.authorityMatched === false ||
        document.issueDateMatched === false ||
        document.expiryMatched === false ||
        document.noExpiryMatched === false ||
        document.documentExpired === true ||
        document.businessNameMatched === false ||
        document.addressMatched === false ||
        failedDocumentStatuses.has(status)
      );
    });

  const documentVerificationReady =
    isPureBlogOnly ||
    Boolean(
      documentVerification &&
        !verificationHasFailure &&
        (
          verifiedDocumentStatuses.has(
            documentVerificationStatus
          ) ||
          verificationDocuments.some(
            (document) =>
              document.readable === true &&
              document.matched !== false
          )
        )
    );

  const registrationReadinessChecks = [
    {
      key: "identity",
      label: "Complete your identity and contact details",
      targetId: "sec-identity",
      complete: identityReady,
    },
    {
      key: "address",
      label: "Verify your official and live business address",
      targetId: "sec-address",
      complete: addressReady,
    },
    {
      key: "about-you",
      label: "Add truthful information about yourself",
      targetId: "sec-about-you",
      complete: aboutReady,
    },
    {
      key: "coverage",
      label: "Define where you provide your service",
      targetId: "sec-service-area",
      complete: coverageReady,
    },
    {
      key: "legal-proof",
      label: "Upload legal business proof matching your registration number",
      targetId: "sec-documents",
      complete: legalProofReady,
    },
    {
      key: "practical-proof",
      label: "Add practical workplace or project evidence",
      targetId: "sec-gallery",
      complete: practicalProofReady,
    },
    {
      key: "live-selfie",
      label: "Add the required live identity or workplace selfie",
      targetId: "sec-selfie",
      complete: liveSelfieReady,
    },
    {
      key: "document-verification",
      label: "Run and complete legal-document verification",
      targetId: "sec-documents",
      complete: documentVerificationReady,
    },
  ];

  const registrationPendingChecks =
    registrationReadinessChecks.filter(
      (check) => !check.complete
    );

  const registrationReadyUI =
    registrationPendingChecks.length === 0;

  const firstRegistrationPendingCheck =
    registrationPendingChecks[0] || null;

  /*
   * One canonical readiness percentage.
   *
   * The same eight checks now govern:
   * - profile readiness,
   * - pending-step guidance,
   * - Review & Finish,
   * - dashboard activation.
   *
   * This prevents the percentage from drifting away
   * from the actual registration requirements.
   */
  const completedRegistrationChecks =
    registrationReadinessChecks.filter(
      (check) => check.complete
    ).length;

  const weightedCompletionScore =
    registrationReadinessChecks.length > 0
      ? Math.round(
          (
            completedRegistrationChecks /
            registrationReadinessChecks.length
          ) * 100
        )
      : 0;

  /*
   * Human-First Business Identity Journey
   *
   * These steps project the existing onboarding state into one understandable
   * human journey. They do not replace the current completion engine,
   * verification engine, persistence contract, or registration orchestration.
   */
  const journeySteps: BusinessIdentityJourneyStep[] = [
    {
      key: "identity",
      title: "Your Identity",
      description: "Name, role and contact",
      targetId: "sec-identity",
      complete: Boolean(
        nature.length > 0 &&
          String(bp.contact_person || "").trim() &&
          (
            String(bp.business_name || "").trim() ||
            String(bp.author_display_name || "").trim()
          ) &&
          (
            String(bp.phone_primary || "").trim() ||
            String(bp.email_business || "").trim()
          )
      ),
    },
    {
      key: "address",
      title: "Exact Address",
      description: "Official and live location",
      targetId: "sec-address",
      complete:
        String(bp.location_verification_status || "")
          .trim()
          .toLowerCase() === "verified",
    },
    {
      key: "about-you",
      title: "About You",
      description: "Experience, skills and values",
      targetId: "sec-about-you",
      complete: Boolean(String(bp.about_person || "").trim()),
    },
    {
      key: "about-business",
      title: "About Business",
      description: "What your business does",
      targetId: "sec-about-business",
      complete: Boolean(
        String(bp.about_business || "").trim() ||
          (hasBlog && String(bp.author_bio || "").trim())
      ),
    },
    {
      key: "coverage",
      title: "Coverage",
      description: "Areas where you work",
      targetId: "sec-service-area",
      complete: Boolean(
        Number(bp.delivery_radius_km || 0) > 0 ||
          String(bp.preferred_service_area || "").trim() ||
          bp.statewide_service ||
          bp.nationwide_service ||
          safeArr(bp.preferred_geo_districts).length > 0 ||
          safeArr(bp.preferred_geo_blocks).length > 0 ||
          safeArr(bp.preferred_geo_places).length > 0
      ),
    },
    {
      key: "gallery",
      title: "Gallery",
      description: "Workplace and project photos",
      targetId: "sec-gallery",
      complete: practicalProofReady,
    },
    {
      key: "documents",
      title: "Documents",
      description: "Business proof and verification",
      targetId: "sec-documents",
      complete:
        legalProofReady &&
        liveSelfieReady &&
        documentVerificationReady,
    },
    {
      key: "review",
      title: "Review & Finish",
      description: "Check and submit",
      targetId: "sec-review",
      complete: registrationCompleteUI,
    },
  ];

  const calculatedActiveJourneyKey =
    journeySteps.find(
      (step) => !step.complete && !step.optional
    )?.key ??
    journeySteps.find(
      (step) => !step.complete
    )?.key ??
    "review";

  const activeJourneyKey =
    selectedJourneyKey ??
    calculatedActiveJourneyKey;

  const subscriptionIdentityFocus =
    nature.length > 1
      ? "vendor-hub"
      : nature[0] ||
        String(bp.business_type || "business")
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-");

  const subscriptionAfterRegistrationUrl =
    `/dashboard/subscription?source=registration` +
    `&focus=${encodeURIComponent(
      subscriptionIdentityFocus
    )}` +
    `&return=${encodeURIComponent(returnTo)}`;

  function openJourneyStep(
    key: BusinessIdentityJourneyStep["key"],
    targetId: string
  ) {
    setSelectedJourneyKey(key);

    window.setTimeout(() => {
      scrollToId(targetId);
    }, 80);
  }

  function journeyKeyForTarget(
    targetId: string
  ): BusinessIdentityJourneyStep["key"] {
    if (
      targetId === "sec-identity" ||
      targetId === "sec-contact"
    ) {
      return "identity";
    }

    if (targetId === "sec-address") {
      return "address";
    }

    if (targetId === "sec-about-you") {
      return "about-you";
    }

    if (targetId === "sec-about-business") {
      return "about-business";
    }

    if (targetId === "sec-service-area") {
      return "coverage";
    }

    if (targetId === "sec-gallery") {
      return "gallery";
    }

    if (
      targetId === "sec-documents" ||
      targetId === "sec-legal-proof" ||
      targetId === "sec-selfie"
    ) {
      return "documents";
    }

    return "review";
  }

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
      onboardingPath
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
      business_media_json: mediaAssets.map(
        (asset) => {
          const legalProofMeta =
            legalProofMetaFor(asset);

          return {
            id: asset.id,
            url: asset.url,
            bucket: asset.bucket,
            path: asset.path,
            name: asset.name,
            size: asset.size,
            mimeType: asset.mimeType,
            kind: asset.kind,
            ...(legalProofMeta
              ? { legalProofMeta }
              : {}),
          };
        }
      ),
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
      setMsg(
        "Saved ✅ Please complete the highlighted required fields to continue."
      );
      scrollToId(
        firstPendingStep.targetId || "sec-review"
      );
      return;
    }

    if (!registrationReadyUI) {
      setMsg(
        firstRegistrationPendingCheck
          ? `Saved ✅ Next required step: ${firstRegistrationPendingCheck.label}.`
          : "Saved ✅ Please complete the remaining registration steps."
      );

      const targetId =
        firstRegistrationPendingCheck?.targetId ||
        "sec-review";

      openJourneyStep(
        journeyKeyForTarget(targetId),
        targetId
      );
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

    if (!termsAccepted) {
      setMsg(
        "Please read and agree to the Terms & Conditions and Privacy Policy before activating your dashboard."
      );
      scrollToId("sec-review");
      return;
    }

    setSaving(true);
    setMsg(null);

    const res = await saveCommon();

    if (!res.ok) {
      setSaving(false);
      return;
    }

    if (!res.isComplete) {
      setSaving(false);
      setMsg(
        "Please complete the highlighted required fields before finishing registration."
      );
      scrollToId(
        firstPendingStep.targetId || "sec-review"
      );
      return;
    }

    if (!registrationReadyUI) {
      setSaving(false);
      setMsg(
        firstRegistrationPendingCheck
          ? `Registration cannot be finished yet. ${firstRegistrationPendingCheck.label}.`
          : "Registration cannot be finished until every required step is complete."
      );

      const targetId =
        firstRegistrationPendingCheck?.targetId ||
        "sec-review";

      openJourneyStep(
        journeyKeyForTarget(targetId),
        targetId
      );
      return;
    }

    try {
      const response = await fetch(
        "/api/onboarding/complete-registration",
        {
          method: "POST",
          headers: {
            Accept: "application/json",
          },
          credentials: "include",
          cache: "no-store",
        }
      );

      const payload = await response
        .json()
        .catch(() => null);

      if (!response.ok || payload?.ok !== true) {
        const code = String(
          payload?.code || "REGISTRATION_COMPLETION_FAILED"
        );

        const message =
          typeof payload?.error === "string" &&
          payload.error.trim()
            ? payload.error
            : code === "BUSINESS_PROFILE_INCOMPLETE"
            ? "Please complete the required business information before activating your dashboard."
            : code === "LOCATION_VERIFICATION_REQUIRED"
            ? "Please verify your live business location before activating your dashboard."
            : code === "ACCOUNT_RESTRICTED"
            ? "This account cannot complete registration in its current state."
            : code === "PERMITTED_ROLE_REQUIRED"
            ? "Please complete your identity declaration before activating your dashboard."
            : "Registration could not be completed safely. Please try again.";

        setSaving(false);
        setMsg(message);
        await fetchCompleteness(userId);
        return;
      }

      /*
       * P04-E4E
       *
       * Registration verification is decided exclusively by
       * the authenticated server orchestration.
       *
       * The browser consumes the canonical result only. It does
       * not calculate verification, approval, dashboard readiness,
       * subscription state or role assignment.
       */
      const acceptedCompletionCodes = new Set([
        "REGISTRATION_COMPLETION_AND_VERIFICATION_EVALUATED",
        "REGISTRATION_COMPLETION_VERIFICATION_AND_INTELLIGENCE_EVALUATED",
      ]);

      if (
        !acceptedCompletionCodes.has(
          String(payload?.code || "")
        )
      ) {
        throw new Error(
          "The registration server returned an unexpected completion contract."
        );
      }

      const verificationStatus = String(
        payload?.verification?.status || ""
      );

      const canonicalVerificationStatuses = new Set([
        "auto_verified",
        "evidence_incomplete",
        "correction_required",
        "admin_review_required",
        "restricted",
      ]);

      if (
        !canonicalVerificationStatuses.has(
          verificationStatus
        )
      ) {
        throw new Error(
          "The registration server returned an invalid verification status."
        );
      }

      await fetchCompleteness(userId);

      switch (verificationStatus) {
        case "auto_verified": {
          setMsg(
            "✅ Registration completed and automatically verified. Your workspace readiness has been confirmed. Redirecting..."
          );

          router.replace(
            subscriptionAfterRegistrationUrl
          );
          router.refresh();
          return;
        }

        case "evidence_incomplete": {
          setMsg(
            "Registration is saved, but some required verification evidence is still incomplete. Please review and complete the highlighted information."
          );
          scrollToId("sec-review");
          return;
        }

        case "correction_required": {
          setMsg(
            "Registration is saved, but some submitted information requires correction before verification can continue. Please review the details below."
          );
          scrollToId("sec-review");
          return;
        }

        case "admin_review_required": {
          setMsg(
            "Registration is complete and has been submitted for administrative review. You can now review the workspace and growth plans suitable for your identity."
          );

          router.replace(
            subscriptionAfterRegistrationUrl
          );
          router.refresh();
          return;
        }

        case "restricted": {
          setMsg(
            "Registration is complete, but this account is currently restricted. Dashboard access has not been activated."
          );
          scrollToId("sec-review");
          return;
        }
      }
    } catch (error) {
      console.error(
        "REGISTRATION_COMPLETION_REQUEST_FAILED",
        error
      );

      setMsg(
        "Registration could not be completed because the server could not be reached. Please try again."
      );
    } finally {
      setSaving(false);
    }
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

      <div style={{ marginTop: 22 }}>
        <BusinessIdentityJourney
          steps={journeySteps}
          activeKey={activeJourneyKey}
          completionScore={weightedCompletionScore}
          onStepSelect={(step) => {
            setSelectedJourneyKey(step.key);

            if (step.key !== "review") {
              setMsg(null);
              return;
            }

            if (!registrationReadyUI) {
              const pending =
                firstRegistrationPendingCheck;

              setMsg(
                pending
                  ? `Before Review & Finish: ${pending.label}.`
                  : "Please complete all required registration steps before finishing."
              );

              if (pending) {
                openJourneyStep(
                  journeyKeyForTarget(
                    pending.targetId
                  ),
                  pending.targetId
                );
              }

              return;
            }

            setMsg(
              "All required steps are ready. Review the summary below and finish registration."
            );

            window.setTimeout(() => {
              scrollToId("sec-review");
            }, 60);
          }}
        />
      </div>

      <div style={{ marginTop: 18, padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div>
              Status:{" "}
              <b
                style={{
                  color: registrationReadyUI
                    ? "green"
                    : "crimson",
                }}
              >
                {registrationReadyUI
                  ? "Ready for Review"
                  : "Needs Attention"}
              </b>{" "}
              | Profile readiness: <b>{weightedCompletionScore}%</b>
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
                onClick={() => {
                  const targetId =
                    firstRegistrationPendingCheck?.targetId ||
                    firstPendingStep.targetId ||
                    "sec-review";

                  openJourneyStep(
                    journeyKeyForTarget(targetId),
                    targetId
                  );
                }}
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
                  width: `${weightedCompletionScore}%`,
                  background:
                    weightedCompletionScore >= 100 ? "green" : "#2563eb",
                  borderRadius: 12,
                }}
              />
            </div>
          </div>
        </div>

        {!registrationReadyUI ? (
          <div
            style={{
              marginTop: 12,
              padding: 10,
              borderRadius: 8,
              background: "#fff7ed",
              border: "1px solid #fed7aa",
            }}
          >
            <div
              style={{
                fontWeight: 900,
                marginBottom: 6,
                color: "#9a3412",
              }}
            >
              Complete these steps before Review & Finish:
            </div>

            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {registrationPendingChecks.map((check) => (
                <li
                  key={check.key}
                  style={{ marginBottom: 4 }}
                >
                  <button
                    type="button"
                    onClick={() =>
                      openJourneyStep(
                        journeyKeyForTarget(
                          check.targetId
                        ),
                        check.targetId
                      )
                    }
                    style={{
                      border: 0,
                      padding: 0,
                      background: "transparent",
                      color: "#9a3412",
                      fontWeight: 750,
                      textAlign: "left",
                      cursor: "pointer",
                    }}
                  >
                    {check.label}
                  </button>
                </li>
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
          {!registrationCompleteUI ? (
            <div
              style={{
                width: "100%",
                padding: 12,
                borderRadius: 12,
                border: termsAccepted
                  ? "1px solid #86efac"
                  : "1px solid #fed7aa",
                background: termsAccepted
                  ? "#f0fdf4"
                  : "#fff7ed",
              }}
            >
              <label
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  fontWeight: 750,
                  lineHeight: 1.55,
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(event) =>
                    setTermsAccepted(
                      event.target.checked
                    )
                  }
                  style={{
                    marginTop: 4,
                    width: 18,
                    height: 18,
                  }}
                />

                <span>
                  I have reviewed my submitted
                  information and agree to the{" "}
                  <a
                    href="/terms-and-conditions"
                    target="_blank"
                    rel="noreferrer"
                    onClick={(event) =>
                      event.stopPropagation()
                    }
                  >
                    Terms & Conditions
                  </a>{" "}
                  and{" "}
                  <a
                    href="/privacy-policy"
                    target="_blank"
                    rel="noreferrer"
                    onClick={(event) =>
                      event.stopPropagation()
                    }
                  >
                    Privacy Policy
                  </a>
                  .
                </span>
              </label>
            </div>
          ) : null}

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
                disabled={
                  saving ||
                  !registrationReadyUI ||
                  !termsAccepted
                }
                onClick={onFinishRegistration}
                style={{
                  padding: "10px 14px",
                  fontWeight: 800,
                  borderRadius: 10,
                  border: "1px solid #16a34a",
                  background:
                    saving ||
                    !registrationReadyUI ||
                    !termsAccepted
                      ? "#cbd5e1"
                      : "#16a34a",
                  color: "#fff",
                  cursor:
                    saving ||
                    !registrationReadyUI ||
                    !termsAccepted
                      ? "not-allowed"
                      : "pointer",
                  opacity:
                    saving ||
                    !registrationReadyUI ||
                    !termsAccepted
                      ? 0.8
                      : 1,
                }}
              >
                {saving ? "Activating..." : "🚀 Activate My Dashboard"}
              </button>

              {!registrationReadyUI && (
                <span style={{ opacity: 0.8 }}>
                  Complete every required identity,
                  address, coverage and verification
                  step before finishing registration.
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

        <section
          id="sec-story"
          style={{
            padding: 18,
            border: "1px solid #bfdbfe",
            borderRadius: 18,
            background: "#f8fbff",
          }}
        >
          <div
            style={{
              color: "#1d4ed8",
              fontWeight: 900,
              fontSize: 12,
              letterSpacing: ".06em",
              textTransform: "uppercase",
            }}
          >
            Human identity and business story
          </div>

          <h3
            style={{
              margin: "7px 0 5px",
              fontSize: 22,
              lineHeight: 1.25,
            }}
          >
            Tell people who you are and why they should trust your work
          </h3>

          <p
            style={{
              margin: "0 0 16px",
              color: "#475569",
              lineHeight: 1.65,
            }}
          >
            You do not need to write perfect sentences. Enter a few truthful
            words about yourself or your business. AI can improve the
            presentation, but nothing will be used without your approval.
          </p>

          <div style={{ display: "grid", gap: 16 }}>
            <div id="sec-about-you" style={{ scrollMarginTop: 190 }}>
            <AIWritingImprovement
              target="about_person"
              value={bp.about_person ?? ""}
              onChange={(value: string) => setField("about_person", value)}
              title="About you"
              helpText="Mention your experience, skills, values, languages or the kind of people you help."
              placeholder="Example: 12 years experience, honest service, speak Bengali and Hindi, help local builders..."
              disabled={saving}
            />
            </div>

            <div id="sec-about-business" style={{ scrollMarginTop: 190 }}>
            <AIWritingImprovement
              target="about_business"
              value={bp.about_business ?? ""}
              onChange={(value: string) => setField("about_business", value)}
              title="About your business"
              helpText="Mention what you sell or provide, how long you have operated, who you serve and what makes your business dependable."
              placeholder="Example: hardware shop, cement and steel, home delivery, Cooch Behar, established 2014..."
              disabled={saving}
            />
            </div>

            {hasBlog ? (
              <AIWritingImprovement
                target="author_bio"
                value={bp.author_bio ?? ""}
                onChange={(value: string) => setField("author_bio", value)}
                title="Author or professional biography"
                helpText="Mention your subjects, knowledge, experience and the purpose of your writing or professional work."
                placeholder="Example: write about property law, 8 years field experience, explain complex topics simply..."
                disabled={saving}
              />
            ) : null}
          </div>
        </section>

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

          </div>
        </section>

        <BusinessVerificationPanel
          assets={mediaAssets}
          onChange={setMediaAssets}
          disabled={saving}
          documentVerification={documentVerification}
          documentVerifyLoading={documentVerifyLoading}
          onRunDocumentVerification={runVendorDocumentVerification}
                registrationNumbers={{
          gstin: String(bp.gstin || ""),
          tradeLicenseNo: String(
            bp.trade_license_no || ""
          ),
          udyamNo: String(bp.udyam_no || ""),
          otherRegistrationNo: String(
            bp.pan || ""
          ),
        }}
        onRegistrationNumberChange={(
          key,
          value
        ) => {
          if (key === "gstin") {
            setField("gstin", value);
            return;
          }

          if (key === "tradeLicenseNo") {
            setField(
              "trade_license_no",
              value
            );
            return;
          }

          if (key === "udyamNo") {
            setField("udyam_no", value);
            return;
          }

          setField("pan", value);
        }}
      />

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
              id="sec-service-area"
              style={{
                marginTop: 12,
                padding: 12,
                borderRadius: 10,
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                scrollMarginTop: 190,
              }}
            >
              <h4 style={{ margin: "0 0 8px", fontSize: 15 }}>
                Service Coverage
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
