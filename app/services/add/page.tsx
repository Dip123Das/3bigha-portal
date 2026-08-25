// app/services/add/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
import {
  loadVendorListingMemory,
  saveVendorListingMemory,
  type VendorListingMemoryRow,
} from "@/lib/vendors/vendorListingMemory";
import UniversalMediaUploader from "@/app/components/media/UniversalMediaUploader";
import type { UploadedMediaAsset } from "@/lib/media/media-config";
import {
  buildTrustedPublicationContext,
  TRUSTED_PUBLICATION_POLICY,
  validateTrustedPublication,
} from "@/lib/media/trusted-publication-gate";

import { Container } from "@/components/layout/Container";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { Card, CardBody, CardFooter } from "@/components/ui/Card";
import { Grid } from "@/components/ui/Grid";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ActionButton } from "@/components/ui/ActionButton";
import { trackVendorConversionClient } from "@/components/marketplace/vendor-conversion-client";

type CatalogRow = {
  category_id: string;
  category_name: string;
  category_slug: string;

  subcategory_id: string;
  subcategory_name: string;
  subcategory_slug: string;

  service_id: string;
  service_name: string;
  service_slug: string;

  full_path: string;
  full_slug_path: string;
};

type RateUnit = "per_sqft" | "per_day" | "per_visit" | "per_job" | "per_month" | "custom";
type RateType = "fixed" | "starting_from" | "range";

type SkillLevel = "skilled" | "semi_skilled" | "unskilled";
type Availability = "full_time" | "part_time" | "contract" | "on_call";
type MaterialSupply = "by_self" | "by_client" | "both";
type ToolsEquipment = "provided" | "need_from_client";
type PaymentMode = "cash" | "upi" | "bank_transfer" | "other";
type PaymentStage = "daily" | "after_completion" | "milestone";

type ServiceDraft = {
  key: string;

  // selection happens in step 1
  pickMode: "catalog" | "other";
  category_id?: string;
  subcategory_id?: string;
  service_id?: string;

  other_category?: string;
  other_subcategory?: string;
  other_service?: string;

  // headline/description
  headline: string;
  description: string;

  // your base price model (kept for DB mapping)
  rate_type: RateType;
  rate_min?: number;
  rate_max?: number;
  rate_value?: number;
  rate_unit: RateUnit;
  rate_unit_label?: string;

  // existing UI fields
  location: string;
  tags: string;

  // new: work profile fields (stored into service_description)
  skill_level: SkillLevel;
  experience_years?: number;
  availability: Availability[];
  work_area?: string;

  // new: pricing & terms (stored into service_description; also influences min/max_price)
  daily_rate?: number;
  hourly_rate?: number;
  package_rate?: number;
  site_visit_charge?: number;
  minimum_work_duration?: string; // "4 hours", "2 days"
  discount_pct?: number;

  gst_applicable: boolean;
  gst_pct?: number;

  material_supply: MaterialSupply;
  tools_equipment: ToolsEquipment;

  // commitments / safety
  expected_start_time?: string; // "24 hours", "2 days"
  warranty?: string;
  coverage_km?: number;
  emergency_service: boolean;
  safety_gear_provided: boolean;

  // payments
  payment_modes: PaymentMode[];
  payment_mode_other?: string;
  advance_requirement_pct?: number;
  payment_stage: PaymentStage;
  refund_policy?: string;

  // direct media uploads
  uploads_note?: string;
  media_assets: UploadedMediaAsset[];
};

type ProviderRow = {
  id: string;
  status: string | null;
  provider_kind?: string | null;
  name?: string | null;
  slug?: string | null;
};

type MyProviderServiceRow = {
  id: string;
  record_status: "draft" | "published" | "paused" | "archived";
  service_id: string | null;

  custom_category: string | null;
  custom_subcategory: string | null;
  custom_service: string | null;

  service_description: string | null;

  pricing_kind: string | null;
  min_price: number | null;
  max_price: number | null;
  currency: string | null;

  created_at: string;
  updated_at: string;
};

type TurnkeyTemplateRow = {
  template_code: string;
  grade: string | null;
  subgrade: number | null;
  public_label: string | null;
  marketing_title: string | null;
  guidance_rate_per_sqft: number | null;

  full_scope?: string | null;
  material_specification?: string | null;
};

type VendorTurnkeyDraft = {
  key: string;
  template_code: string;
  enabled: boolean;
  vendor_rate_per_sqft: number | null;
  currency: string; // "INR"
};

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

const DEFAULT_SERVICE_DRAFT = (): ServiceDraft => ({
  key: uid(),
  pickMode: "catalog",

  category_id: undefined,
  subcategory_id: undefined,
  service_id: undefined,

  other_category: "",
  other_subcategory: "",
  other_service: "",

  headline: "",
  description: "",

  rate_type: "starting_from",
  rate_value: undefined,
  rate_min: undefined,
  rate_max: undefined,
  rate_unit: "per_job",
  rate_unit_label: "",

  location: "Cooch Behar / Nearby",
  tags: "",

  // new defaults
  skill_level: "skilled",
  experience_years: undefined,
  availability: ["contract"],
  work_area: "",

  daily_rate: undefined,
  hourly_rate: undefined,
  package_rate: undefined,
  site_visit_charge: undefined,
  minimum_work_duration: "",
  discount_pct: undefined,

  gst_applicable: false,
  gst_pct: undefined,

  material_supply: "both",
  tools_equipment: "provided",

  expected_start_time: "",
  warranty: "",
  coverage_km: undefined,
  emergency_service: false,
  safety_gear_provided: false,

  payment_modes: ["cash", "upi"],
  payment_mode_other: "",
  advance_requirement_pct: undefined,
  payment_stage: "after_completion",
  refund_policy: "",

  uploads_note: "",
  media_assets: [],
});

function rateLabel(type: RateType) {
  if (type === "fixed") return "Fixed";
  if (type === "range") return "Range";
  return "Starting from";
}

function unitLabel(unit: RateUnit, custom?: string) {
  switch (unit) {
    case "per_sqft":
      return "per sqft";
    case "per_day":
      return "per day";
    case "per_visit":
      return "per visit";
    case "per_job":
      return "per job";
    case "per_month":
      return "per month";
    case "custom":
      return custom?.trim() ? custom : "custom unit";
    default:
      return unit;
  }
}

const styles = {
  toolbar: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "center",
    flexWrap: "wrap" as const,
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: 12,
    marginTop: 12,
  },
  field: { display: "block", width: "100%" },
  label: {
    fontSize: 12,
    color: "#5b6472",
    fontWeight: 700,
    marginBottom: 6,
    display: "block",
  },
  input: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    outline: "none",
    fontSize: 14,
    background: "#fff",
  },
  textarea: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    outline: "none",
    fontSize: 14,
    background: "#fff",
    resize: "vertical" as const,
  },
  segmentWrap: { display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" as const },
  segmentBtn: (active: boolean): React.CSSProperties => ({
    flex: 1,
    minWidth: 180,
    padding: "10px 12px",
    borderRadius: 12,
    border: active ? "2px solid #111827" : "1px solid #e5e7eb",
    background: "#fff",
    cursor: "pointer",
    fontWeight: 800,
  }),
  minor: { color: "#5b6472", fontSize: 12 },
  gateBox: {
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: 14,
    background: "#fff",
  },
  stepPill: (active: boolean): React.CSSProperties => ({
    padding: "8px 12px",
    borderRadius: 12,
    border: active ? "2px solid #111827" : "1px solid #e5e7eb",
    background: "#fff",
    fontWeight: 900,
    fontSize: 12,
  }),
  miniBtn: (active?: boolean): React.CSSProperties => ({
    border: active ? "2px solid #111827" : "1px solid #e5e7eb",
    background: "#fff",
    padding: "8px 10px",
    borderRadius: 12,
    cursor: "pointer",
    fontWeight: 900,
    fontSize: 13,
  }),
  box: {
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: 12,
    background: "#fff",
  },

  // ⭐ Turnkey highlight styles
  highlightCard: (on: boolean): React.CSSProperties => ({
    border: on ? "2px solid #111827" : "1px solid #e5e7eb",
    background: on ? "#fff7ed" : "#fff",
    borderRadius: 12,
    padding: 12,
  }),
  toggleRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "center",
    flexWrap: "wrap" as const,
  },
  toggleTitle: { fontWeight: 900, fontSize: 15 },
  toggleDesc: { color: "#5b6472", fontSize: 13, marginTop: 4 },
  pillOn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 12px",
    borderRadius: 12,
    border: "1px solid #111827",
    background: "#111827",
    color: "#fff",
    fontWeight: 900,
    cursor: "pointer",
  },
  pillOff: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 12px",
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    background: "#fff",
    color: "#111827",
    fontWeight: 900,
    cursor: "pointer",
  },
};

function getMissingColumnName(message: string): string | null {
  const m1 = message.match(/Could not find the '([^']+)' column/i);
  if (m1?.[1]) return m1[1];

  const m2 = message.match(/column\s+"([^"]+)"\s+.*does not exist/i);
  if (m2?.[1]) return m2[1];

  const m3 = message.match(/column\s+([a-z0-9_]+\.[a-z0-9_]+)\s+does not exist/i);
  if (m3?.[1]) return m3[1].split(".").pop() || m3[1];

  return null;
}

async function insertProviderServiceSafe(supabase: any, payload: Record<string, any>) {
  let attemptPayload = { ...payload };

  for (let i = 0; i < 8; i++) {
    const { count: existingServiceCount } = await supabase
      .from("provider_services")
      .select("id", { count: "exact", head: true })
      .eq("user_id", attemptPayload.user_id);

    const { error } = await supabase.from("provider_services").insert(attemptPayload);

    if (!error) return;

    const msg = String(error.message || "");
    const missing = getMissingColumnName(msg);

    if (!missing || !(missing in attemptPayload)) {
      throw error;
    }

    const nextPayload = { ...attemptPayload };
    delete nextPayload[missing];
    attemptPayload = nextPayload;
  }

  throw new Error("Failed to save provider service after removing missing schema columns.");
}

function parseOptionalNumber(v: string): number | undefined {
  const t = v.trim();
  if (!t) return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
}

function pickRateNumber(d: ServiceDraft) {
  if (d.rate_type === "range") return typeof d.rate_min === "number" ? d.rate_min : null;
  return typeof d.rate_value === "number" ? d.rate_value : null;
}

function buildPricingUnit(d: ServiceDraft) {
  if (d.rate_unit === "custom") return d.rate_unit_label?.trim() ? d.rate_unit_label.trim() : "custom";
  return d.rate_unit;
}

type WizardStep = 1 | 2 | 3;

export default function AddServicesPage() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowser(), []);

  const [step, setStep] = useState<WizardStep>(1);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [catalog, setCatalog] = useState<CatalogRow[]>([]);
  const [drafts, setDrafts] = useState<ServiceDraft[]>([DEFAULT_SERVICE_DRAFT()]);
  const [activeDraftKey, setActiveDraftKey] = useState<string>(() => DEFAULT_SERVICE_DRAFT().key);

  // Step 1 bulk selection
  const [bulkMode, setBulkMode] = useState(true);
  const [bulkCategoryId, setBulkCategoryId] = useState<string>("");
  const [bulkSubcategoryId, setBulkSubcategoryId] = useState<string>("");
  const [bulkSelectedServiceIds, setBulkSelectedServiceIds] = useState<Set<string>>(new Set());

  // Turnkey
  const [includeTurnkey, setIncludeTurnkey] = useState(true);
  const [turnkeyTemplates, setTurnkeyTemplates] = useState<TurnkeyTemplateRow[]>([]);
  const [turnkeyDrafts, setTurnkeyDrafts] = useState<VendorTurnkeyDraft[]>([]);

  const [userId, setUserId] = useState<string | null>(null);
  const [provider, setProvider] = useState<ProviderRow | null>(null);
  const [myProviderServices, setMyProviderServices] = useState<MyProviderServiceRow[]>([]);
  const [aiLoadingField, setAiLoadingField] = useState<null | "description" | "sla" | "refund">(null);
  const [recentServiceMemory, setRecentServiceMemory] = useState<
    VendorListingMemoryRow[]
  >([]);

  function applyServiceMemory(memory: VendorListingMemoryRow) {
    const payload = memory.payload ?? {};
    const active = drafts.find((d) => d.key === activeDraftKey);
    if (!active) return;

    setDraft(active.key, {
      availability: payload.availability ?? active.availability,
      payment_modes: payload.payment_modes ?? active.payment_modes,

      rate_type: payload.rate_type ?? active.rate_type,
      rate_unit: payload.rate_unit ?? active.rate_unit,

      daily_rate:
        typeof payload.daily_rate === "number"
          ? payload.daily_rate
          : active.daily_rate,

      hourly_rate:
        typeof payload.hourly_rate === "number"
          ? payload.hourly_rate
          : active.hourly_rate,

      package_rate:
        typeof payload.package_rate === "number"
          ? payload.package_rate
          : active.package_rate,

      site_visit_charge:
        typeof payload.site_visit_charge === "number"
          ? payload.site_visit_charge
          : active.site_visit_charge,

      description: payload.description_template ?? active.description,
    });
  }

  useEffect(() => {
    let alive = true;

    async function loadRecentServiceMemoryData() {
      if (!userId) return;

      const rows = await loadVendorListingMemory({
        userId,
        module: "services",
        memoryType: "workflow",
        limit: 8,
      });

      if (!alive) return;

      setRecentServiceMemory(rows);
    }

    loadRecentServiceMemoryData();

    return () => {
      alive = false;
    };
  }, [userId]);

  // ---------- draft helpers ----------
  function setDraft(key: string, patch: Partial<ServiceDraft>) {
    setDrafts((prev) => prev.map((d) => (d.key === key ? { ...d, ...patch } : d)));
  }

  function addDraft(prefill?: Partial<ServiceDraft>) {
    const nd: ServiceDraft = { ...DEFAULT_SERVICE_DRAFT(), ...prefill, key: uid() };
    setDrafts((prev) => [...prev, nd]);
    setActiveDraftKey(nd.key);
  }

  function removeDraft(key: string) {
    setDrafts((prev) => prev.filter((d) => d.key !== key));
    setActiveDraftKey((prevKey) => {
      if (prevKey !== key) return prevKey;
      const remaining = drafts.filter((d) => d.key !== key);
      return remaining[0]?.key ?? "";
    });
  }

  function clearAllDrafts() {
    setDrafts([DEFAULT_SERVICE_DRAFT()]);
    setActiveDraftKey("");
  }

  // ---------- catalog helpers ----------
  const categories = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    for (const r of catalog) map.set(r.category_id, { id: r.category_id, name: r.category_name });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [catalog]);

  function subcategoriesFor(categoryId?: string) {
    if (!categoryId) return [];
    const map = new Map<string, { id: string; name: string }>();
    for (const r of catalog) {
      if (r.category_id === categoryId) map.set(r.subcategory_id, { id: r.subcategory_id, name: r.subcategory_name });
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  function servicesFor(categoryId?: string, subcategoryId?: string) {
    if (!categoryId || !subcategoryId) return [];
    const map = new Map<string, { id: string; name: string }>();
    for (const r of catalog) {
      if (r.category_id === categoryId && r.subcategory_id === subcategoryId) {
        map.set(r.service_id, { id: r.service_id, name: r.service_name });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  function findCatalogRow(serviceId?: string) {
    if (!serviceId) return null;
    return catalog.find((r) => r.service_id === serviceId) ?? null;
  }

  async function generateServiceAI(target: "description" | "sla" | "refund", draft: ServiceDraft) {
  if (aiLoadingField) return;

  setAiLoadingField(target);
  setErr(null);

  try {
    const serviceName =
      draft.pickMode === "catalog"
        ? findCatalogRow(draft.service_id)?.service_name || "Service"
        : draft.other_service?.trim() || "Service";

    const categoryName =
      draft.pickMode === "catalog"
        ? findCatalogRow(draft.service_id)?.category_name || ""
        : draft.other_category?.trim() || "";

    const subcategoryName =
      draft.pickMode === "catalog"
        ? findCatalogRow(draft.service_id)?.subcategory_name || ""
        : draft.other_subcategory?.trim() || "";

    const targetField =
      target === "description" ? "scopeOfWork" : target === "sla" ? "sla" : "serviceRefundPolicy";

    const requiredOutputStyle =
  target === "description"
    ? `Write a unique, service-specific scope of work for "${serviceName}". Include exact work items, inclusions, exclusions, tools/material responsibility, work process, quality checks, and buyer instructions. Do not write a generic description.`
        : target === "sla"
          ? "Write a short practical SLA / warranty / quality assurance note. Include response time, workmanship responsibility, support period, and verification reminder. Do not make fake guarantees."
          : "Write a short refund and cancellation policy for a local service provider. Keep it fair, practical, and legally safe. Do not promise refunds unless conditions are stated.";

    const res = await fetch("/api/ai/smart-fill", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      credentials: "same-origin",
      body: JSON.stringify({
        module: "service",
        action: "refine",
        tone: "professional",
        input: {
          title: `${serviceName}${subcategoryName ? ` - ${subcategoryName}` : ""}${categoryName ? ` (${categoryName})` : ""}`,
          location: draft.location || draft.work_area || "",
          price:
            typeof draft.package_rate === "number"
              ? `Package ₹${draft.package_rate}`
              : typeof draft.daily_rate === "number"
                ? `Daily ₹${draft.daily_rate}`
                : typeof draft.hourly_rate === "number"
                  ? `Hourly ₹${draft.hourly_rate}`
                  : "",
          bullets: [
            `IMPORTANT: Generate content ONLY for this exact service: ${serviceName}.`,
            categoryName ? `Main category: ${categoryName}` : "",
            subcategoryName ? `Subcategory: ${subcategoryName}` : "",
            `Do not write a generic service provider description.`,
            `Do not reuse content from electrician/plumber/labour/architect unless that is the selected service.`,
            draft.skill_level ? `Skill level: ${draft.skill_level}` : "",
            typeof draft.experience_years === "number" ? `Experience: ${draft.experience_years} years` : "",
            draft.work_area ? `Work area: ${draft.work_area}` : "",
            draft.location ? `Coverage: ${draft.location}` : "",
            draft.material_supply ? `Material supply: ${draft.material_supply}` : "",
            draft.tools_equipment ? `Tools/equipment: ${draft.tools_equipment}` : "",
            draft.expected_start_time ? `Expected start: ${draft.expected_start_time}` : "",
            draft.minimum_work_duration ? `Minimum work duration: ${draft.minimum_work_duration}` : "",
          ].filter(Boolean),
          existingText:
            target === "description"
              ? draft.description
              : target === "sla"
                ? draft.warranty || ""
                : draft.refund_policy || "",
          attributes: {
            targetField,
            requiredOutputStyle,
          },
        },
      }),
    });

    const data = await res.json();

    if (!res.ok || !data?.ok) {
      throw new Error(data?.error || `AI failed with status ${res.status}`);
    }

    const output = String(data?.result?.description || "").trim();

    if (!output) {
      throw new Error("AI did not return content.");
    }

    if (target === "description") {
      setDraft(draft.key, { description: output });
    } else if (target === "sla") {
      setDraft(draft.key, { warranty: output });
    } else {
      setDraft(draft.key, { refund_policy: output });
    }
  } catch (e: any) {
    setErr(e?.message || "AI service failed.");
  } finally {
    setAiLoadingField(null);
  }
}

  function buildTitle(d: ServiceDraft) {
    const headline = d.headline?.trim();
    if (headline) return headline;
    if (d.pickMode === "catalog") return findCatalogRow(d.service_id)?.service_name?.trim() || "Service";
    return d.other_service?.trim() || "Service";
  }

  function keyForDraftDedup(d: ServiceDraft) {
    if (d.pickMode === "catalog") return `catalog:${d.service_id ?? ""}`;
    return `other:${(d.other_service ?? "").trim().toLowerCase()}`;
  }

  function keyForExistingDedup(s: MyProviderServiceRow) {
    if (s.service_id) return `catalog:${s.service_id}`;
    return `other:${(s.custom_service ?? "").trim().toLowerCase()}`;
  }

  const existingKeys = useMemo(() => {
    return new Set(myProviderServices.map(keyForExistingDedup).filter(Boolean));
  }, [myProviderServices]);

  // ---------- description builder (stores all extra fields without schema changes) ----------
  function prettySkill(v: SkillLevel) {
    if (v === "semi_skilled") return "Semi-skilled";
    if (v === "unskilled") return "Unskilled";
    return "Skilled";
  }
  function prettyAvail(v: Availability) {
    if (v === "full_time") return "Full-time";
    if (v === "part_time") return "Part-time";
    if (v === "contract") return "Contract basis";
    return "On-call";
  }
  function prettyPayMode(v: PaymentMode) {
    if (v === "upi") return "UPI";
    if (v === "bank_transfer") return "Bank transfer";
    if (v === "other") return "Other";
    return "Cash";
  }
  function prettyStage(v: PaymentStage) {
    if (v === "daily") return "Daily";
    if (v === "milestone") return "Milestone basis";
    return "After completion";
  }

  function buildRichDescription(d: ServiceDraft) {
    const parts: string[] = [];

    if (d.description?.trim()) parts.push(d.description.trim());

    // pricing summary (existing)
    const unit = unitLabel(d.rate_unit, d.rate_unit_label);
    if (pickRateNumber(d) != null) {
      if (d.rate_type === "range") {
        parts.push(`Pricing (primary): ${rateLabel(d.rate_type)} ₹${d.rate_min ?? "…"}–₹${d.rate_max ?? "…"} ${unit}`);
      } else {
        parts.push(`Pricing (primary): ${rateLabel(d.rate_type)} ₹${d.rate_value ?? "…"} ${unit}`);
      }
    }

    // new pricing terms
    const pricingLines: string[] = [];
    if (typeof d.daily_rate === "number") pricingLines.push(`Daily rate: ₹${d.daily_rate}`);
    if (typeof d.hourly_rate === "number") pricingLines.push(`Hourly rate: ₹${d.hourly_rate}`);
    if (typeof d.package_rate === "number") pricingLines.push(`Contract / package: ₹${d.package_rate}`);
    if (typeof d.site_visit_charge === "number") pricingLines.push(`Site visit charge: ₹${d.site_visit_charge}`);
    if (d.minimum_work_duration?.trim()) pricingLines.push(`Minimum work duration: ${d.minimum_work_duration.trim()}`);
    if (typeof d.discount_pct === "number") pricingLines.push(`Discount: ${d.discount_pct}%`);
    if (pricingLines.length) parts.push(pricingLines.join("\n"));

    // service profile
    const profileLines: string[] = [];
    profileLines.push(`Skill level: ${prettySkill(d.skill_level)}`);
    if (typeof d.experience_years === "number") profileLines.push(`Experience: ${d.experience_years} year(s)`);
    if (d.availability?.length) profileLines.push(`Availability: ${d.availability.map(prettyAvail).join(", ")}`);
    if (d.work_area?.trim()) profileLines.push(`Work area: ${d.work_area.trim()}`);
    if (d.location?.trim()) profileLines.push(`Coverage: ${d.location.trim()}`);
    if (typeof d.coverage_km === "number") profileLines.push(`Coverage radius: ${d.coverage_km} km`);
    if (profileLines.length) parts.push(profileLines.join("\n"));

    // materials/tools/gst
    const termsLines: string[] = [];
    termsLines.push(`Material supply: ${d.material_supply === "by_self" ? "By self" : d.material_supply === "by_client" ? "By client" : "Both"}`);
    termsLines.push(`Tools / equipment: ${d.tools_equipment === "provided" ? "Provided" : "Need from client"}`);
    termsLines.push(`Emergency service: ${d.emergency_service ? "Yes" : "No"}`);
    termsLines.push(`Safety gear provided: ${d.safety_gear_provided ? "Yes" : "No"}`);
    if (d.expected_start_time?.trim()) termsLines.push(`Expected start: ${d.expected_start_time.trim()}`);
    if (d.warranty?.trim()) termsLines.push(`Warranty / QA: ${d.warranty.trim()}`);
    if (d.gst_applicable) termsLines.push(`GST: Yes${typeof d.gst_pct === "number" ? ` (${d.gst_pct}%)` : ""}`);
    else termsLines.push("GST: No");
    if (termsLines.length) parts.push(termsLines.join("\n"));

    // payment
    const payLines: string[] = [];
    const pm = (d.payment_modes || []).slice();
    if (pm.includes("other") && d.payment_mode_other?.trim()) {
      payLines.push(`Payment modes: ${pm.map(prettyPayMode).join(", ")} (${d.payment_mode_other.trim()})`);
    } else if (pm.length) {
      payLines.push(`Payment modes: ${pm.map(prettyPayMode).join(", ")}`);
    }
    if (typeof d.advance_requirement_pct === "number") payLines.push(`Advance requirement: ${d.advance_requirement_pct}%`);
    payLines.push(`Payment stage: ${prettyStage(d.payment_stage)}`);
    if (d.refund_policy?.trim()) payLines.push(`Refund / cancellation: ${d.refund_policy.trim()}`);
    if (payLines.length) parts.push(payLines.join("\n"));

    // tags
    if (d.tags?.trim()) parts.push(`Tags: ${d.tags.trim()}`);

    // uploads / media
    if (d.uploads_note?.trim()) parts.push(`Uploads note: ${d.uploads_note.trim()}`);

    if (Array.isArray(d.media_assets) && d.media_assets.length) {
      const mediaLines = d.media_assets
        .map((asset, index) => `${index + 1}. ${asset.kind}: ${asset.url}`)
        .join("\n");

      parts.push(`Uploaded media:\n${mediaLines}`);
    }

    return parts.join("\n\n").trim() || null;
  }

  // ---------- provider: guarantee provider row exists ----------
  async function ensureProviderId(): Promise<string | null> {
    const { data: pid, error } = await supabase.rpc("upsert_service_provider_for_me");
    if (error) {
      console.error("upsert_service_provider_for_me failed:", error);
      setErr(error.message);
      return null;
    }
    return (pid ?? null) as string | null;
  }

  async function loadProviderById(providerId: string) {
    const { data, error } = await supabase
      .from("service_providers")
      .select("id,status,provider_kind,name,slug")
      .eq("id", providerId)
      .maybeSingle();

    if (error) {
      console.warn("service_providers select blocked/failed:", error.message);
      return { id: providerId, status: null } as ProviderRow;
    }

    return (data ?? { id: providerId, status: null }) as ProviderRow;
  }

  async function refreshMyProviderServices(providerId: string) {
    const q = supabase
      .from("provider_services")
      .select(
        [
          "id",
          "record_status",
          "service_id",
          "custom_category",
          "custom_subcategory",
          "custom_service",
          "service_description",
          "pricing_kind",
          "min_price",
          "max_price",
          "currency",
          "created_at",
          "updated_at",
        ].join(",")
      )
      .eq("provider_id", providerId)
      .order("updated_at", { ascending: false })
      .limit(50);

    const { data, error } = await q.returns<MyProviderServiceRow[]>();
    if (error) {
      console.error(error);
      setMyProviderServices([]);
      return;
    }

    setMyProviderServices(data ?? []);
  }

  async function loadCatalog() {
    const { data: c, error: cErr } = await supabase
      .from("v_service_catalog")
      .select(
        "category_id,category_name,category_slug,subcategory_id,subcategory_name,subcategory_slug,service_id,service_name,service_slug,full_path,full_slug_path"
      )
      .order("category_name", { ascending: true })
      .order("subcategory_name", { ascending: true })
      .order("service_name", { ascending: true });

    if (cErr) {
      console.error(cErr);
      setCatalog([]);
      return;
    }
    setCatalog((c || []) as CatalogRow[]);
  }

  async function loadTurnkeyTemplates() {
    const { data, error } = await supabase
      .from("turnkey_package_templates")
      .select("template_code,grade,subgrade,public_label,marketing_title,guidance_rate_per_sqft")
      .order("grade", { ascending: true })
      .order("subgrade", { ascending: true });

    if (error) {
      console.error(error);
      setTurnkeyTemplates([]);
      setTurnkeyDrafts([]);
      return;
    }

    const rows = (data || []) as TurnkeyTemplateRow[];
    setTurnkeyTemplates(rows);

    const defaults: VendorTurnkeyDraft[] = rows.map((t) => ({
      key: uid(),
      template_code: t.template_code,
      enabled: (t.public_label ?? "").toLowerCase() !== "luxury",
      vendor_rate_per_sqft: typeof t.guidance_rate_per_sqft === "number" ? Math.round(t.guidance_rate_per_sqft) : null,
      currency: "INR",
    }));
    setTurnkeyDrafts(defaults);
  }

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setErr(null);
      setLoading(true);

      const { data } = await supabase.auth.getSession();
      const session = data.session;
      if (!session) {
        router.replace(`/login?next=${encodeURIComponent("/services/add")}`);
        return;
      }

      const u = session.user.id;
      if (cancelled) return;
      setUserId(u);

      const pid = await ensureProviderId();
      if (cancelled) return;

      if (!pid) {
        setProvider(null);
        await Promise.all([loadCatalog(), loadTurnkeyTemplates()]);
        if (!cancelled) setLoading(false);
        return;
      }

      const p = await loadProviderById(pid);
      if (cancelled) return;
      setProvider(p);

      await Promise.all([loadCatalog(), loadTurnkeyTemplates()]);
      await refreshMyProviderServices(pid);

      if (!cancelled) setLoading(false);
    })();
function TurnkeyToggle() {
  return (
    <div style={{ marginTop: 12, ...styles.highlightCard(includeTurnkey) }}>
      <div style={styles.toggleRow}>
        <div>
          <div style={styles.toggleTitle}>⭐ Turnkey House Construction</div>
          <div style={styles.toggleDesc}>
            Offer complete house construction packages (template-based). Turn ON to include turnkey in this submission.
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <button
            type="button"
            onClick={() => setIncludeTurnkey((v) => !v)}
            style={includeTurnkey ? styles.pillOn : styles.pillOff}
          >
            {includeTurnkey ? "Enabled" : "Disabled"}
          </button>

          <ActionButton href="/services/turnkey/add" variant="secondary">
            Open Turnkey Wizard →
          </ActionButton>
        </div>
      </div>
    </div>
  );
}
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // keep activeDraftKey valid
  useEffect(() => {
    if (!drafts.length) return;
    if (!activeDraftKey || !drafts.some((d) => d.key === activeDraftKey)) {
      setActiveDraftKey(drafts[0].key);
    }
  }, [drafts, activeDraftKey]);

  const activeDraft = useMemo(() => drafts.find((d) => d.key === activeDraftKey) ?? drafts[0] ?? null, [
    drafts,
    activeDraftKey,
  ]);

  const activeServiceReadiness = useMemo(
    () =>
      buildTrustedPublicationContext(
        activeDraft?.media_assets ?? [],
      ),
    [activeDraft?.media_assets],
  );

  const serviceRequiredCaptures =
    TRUSTED_PUBLICATION_POLICY
      .services
      .requiredCaptures;

  const activeServicePublicationReady =
    activeServiceReadiness.completedCaptures >=
      serviceRequiredCaptures &&
    activeServiceReadiness.gpsVerified === true &&
    activeServiceReadiness.provenanceVerified === true &&
    activeServiceReadiness.captureSessionCompleted === true;

  function draftTitle(d: ServiceDraft) {
    const base =
      d.pickMode === "catalog"
        ? findCatalogRow(d.service_id)?.service_name ?? "Service"
        : d.other_service?.trim() || "Service";
    return base;
  }

  function goToStep(next: WizardStep) {
    // guard: step 2/3 require at least one selected draft OR turnkey
    if (next !== 1) {
      const hasAtLeastOne =
        drafts.some((d) => (d.pickMode === "catalog" ? !!d.service_id : !!d.other_service?.trim())) || includeTurnkey;
      if (!hasAtLeastOne) {
        setStep(1);
        return;
      }
    }
    setStep(next);
  }

  // ---------- Step 1 bulk helpers ----------
  function bulkList() {
    return servicesFor(bulkCategoryId || undefined, bulkSubcategoryId || undefined);
  }

  function toggleBulkService(serviceId: string) {
    setBulkSelectedServiceIds((prev) => {
      const next = new Set(prev);
      if (next.has(serviceId)) next.delete(serviceId);
      else next.add(serviceId);
      return next;
    });
  }

  function addBulkSelectedAsDrafts() {
    const ids = Array.from(bulkSelectedServiceIds.values());
    if (ids.length === 0) return;

    const toAdd = ids
      .map((sid) => {
        const row = findCatalogRow(sid);
        if (!row) return null;
        return {
          category_id: row.category_id,
          subcategory_id: row.subcategory_id,
          service_id: row.service_id,
          pickMode: "catalog" as const,
        };
      })
      .filter(Boolean) as Array<Pick<ServiceDraft, "pickMode" | "category_id" | "subcategory_id" | "service_id">>;

    if (toAdd.length === 0) return;

    setDrafts((prev) => {
      const prevKeys = new Set(prev.map(keyForDraftDedup));
      const next = [...prev];

      for (const x of toAdd) {
        const dd: ServiceDraft = { ...DEFAULT_SERVICE_DRAFT(), ...x, key: uid() };
        const k = keyForDraftDedup(dd);

        if (prevKeys.has(k)) continue; // already in drafts
        if (existingKeys.has(k)) continue; // already listed in DB

        prevKeys.add(k);
        next.push(dd);
      }
      return next.length ? next : prev;
    });

    setBulkSelectedServiceIds(new Set());
    setStep(2);
  }

  // ---------- Saving ----------
  function decideMinMaxPrice(d: ServiceDraft): { min_price: number | null; max_price: number | null } {
    // Prefer explicit daily/hourly/package if provided (single number -> min=max)
    const candidates = [d.package_rate, d.daily_rate, d.hourly_rate, d.site_visit_charge].filter(
      (x) => typeof x === "number" && Number.isFinite(x)
    ) as number[];

    if (candidates.length) {
      const n = candidates[0];
      return { min_price: n, max_price: n };
    }

    // fallback to primary rate fields (existing behavior)
    if (d.rate_type === "range") {
      const minp = typeof d.rate_min === "number" ? d.rate_min : null;
      const maxp = typeof d.rate_max === "number" ? d.rate_max : null;
      return { min_price: minp, max_price: maxp };
    }

    const v = typeof d.rate_value === "number" ? d.rate_value : null;
    return { min_price: v, max_price: v };
  }

  async function saveMany(record_status: "draft" | "published") {
    if (!userId) return;

    setErr(null);

    const providerId = provider?.id ?? (await ensureProviderId());
    if (!providerId) {
      router.push(`/onboarding/business?returnTo=${encodeURIComponent("/services/add")}`);
      return;
    }

    const validDrafts = drafts.filter((d) => {
      if (d.pickMode === "catalog") return !!d.service_id;
      return !!d.other_service?.trim();
    });

    // remove drafts that already exist in DB
    const dedupedDrafts = validDrafts.filter((d) => {
      const k = keyForDraftDedup(d);
      if (!k) return false;
      if (existingKeys.has(k)) return false;
      return true;
    });

    if (dedupedDrafts.length === 0 && !includeTurnkey) {
      alert("Please add at least one service OR enable turnkey packages.");
      return;
    }

    if (
      record_status === "published" &&
      dedupedDrafts.length > 0
    ) {
      const blockedServices: string[] = [];

      for (const draft of dedupedDrafts) {
        const trustedResult =
          await validateTrustedPublication(
            "services",
            draft.media_assets ?? [],
          );

        if (!trustedResult.ok) {
          blockedServices.push(
            `${buildTitle(draft)}: ${
              trustedResult.message ||
              "Trusted media verification failed."
            }`,
          );
        }
      }

      if (blockedServices.length > 0) {
        const message = [
          "Publication blocked. Complete the mandatory trusted live capture for every service:",
          "",
          ...blockedServices.map(
            (item, index) =>
              `${index + 1}. ${item}`,
          ),
        ].join("\n");

        setErr(message);
        alert(message);
        return;
      }
    }

    setSaving(true);
    try {
      let geography: any = null;

      try {
        const { data: vendorProfile } = await supabase
          .from("business_profiles")
          .select("state,district,city,locality,pincode,geo_state_id,geo_district_id,geo_subdivision_id,geo_block_id,geo_place_id")
          .eq("user_id", userId)
          .maybeSingle();

        if (vendorProfile?.geo_state_id) {
          geography = {
            geo_state_id: vendorProfile.geo_state_id,
            geo_district_id: vendorProfile.geo_district_id,
            geo_subdivision_id: vendorProfile.geo_subdivision_id,
            geo_block_id: vendorProfile.geo_block_id,
            geo_place_id: vendorProfile.geo_place_id,
          };
        } else if (vendorProfile) {
          const geoRes = await fetch("/api/admin/geography/resolve", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              state: vendorProfile.state,
              district: vendorProfile.district,
              city: vendorProfile.city,
              locality: vendorProfile.locality,
              pincode: vendorProfile.pincode,
            }),
          });

          const geoJson = await geoRes.json().catch(() => null);
          geography = geoJson?.result || null;
        }
      } catch {
        geography = null;
      }

      // 1) Normal services → provider_services
      for (const d of dedupedDrafts) {
        const cat = d.pickMode === "catalog" ? findCatalogRow(d.service_id) : null;

        const custom_category =
          d.pickMode === "catalog" ? (cat?.category_name ?? null) : d.other_category?.trim() || null;

        const custom_subcategory =
          d.pickMode === "catalog" ? (cat?.subcategory_name ?? null) : d.other_subcategory?.trim() || null;

        const custom_service =
          d.pickMode === "catalog" ? (cat?.service_name ?? null) : d.other_service?.trim() || null;

        const { min_price, max_price } = decideMinMaxPrice(d);

        const serviceTrustedReadiness =
          buildTrustedPublicationContext(
            d.media_assets ?? [],
          );

        const servicePublicationReady =
          serviceTrustedReadiness.completedCaptures >=
            serviceRequiredCaptures &&
          serviceTrustedReadiness.gpsVerified === true &&
          serviceTrustedReadiness.provenanceVerified === true &&
          serviceTrustedReadiness.captureSessionCompleted === true;

        const payload: any = {
          provider_id: providerId,
          record_status,
          is_active: true,

          service_id: d.pickMode === "catalog" ? d.service_id : null,

          custom_category,
          custom_subcategory,
          custom_service,

          service_description: buildRichDescription(d),

          pricing_kind: buildPricingUnit(d),
          min_price,
          max_price,
          currency: "INR",

          headline: buildTitle(d),
          coverage_area: d.location?.trim() ? d.location.trim() : null,
          tags: d.tags?.trim() ? d.tags.trim() : null,

          geo_state_id: geography?.geo_state_id || null,
          geo_district_id: geography?.geo_district_id || null,
          geo_subdivision_id: geography?.geo_subdivision_id || null,
          geo_block_id: geography?.geo_block_id || null,
          geo_place_id: geography?.geo_place_id || null,

          media_assets:
            (d.media_assets ?? []).map(
              (asset) => ({
                ...asset,
              }),
            ),

          trusted_publication: {
            module: "services",
            required_captures:
              serviceRequiredCaptures,
            completed_captures:
              serviceTrustedReadiness.completedCaptures,
            gps_verified:
              serviceTrustedReadiness.gpsVerified === true,
            provenance_verified:
              serviceTrustedReadiness.provenanceVerified === true,
            capture_session_completed:
              serviceTrustedReadiness.captureSessionCompleted === true,
            ai_verification_status:
              serviceTrustedReadiness.aiVerificationStatus ??
              "not_started",
            publication_ready:
              servicePublicationReady,
            evaluated_at:
              new Date().toISOString(),
          },
        };

        try {
          await insertProviderServiceSafe(supabase, payload);

      try {
        await saveVendorListingMemory({
          userId,
          module: "services",
          memoryType: "workflow",
          title:
            d.headline?.trim() ||
            d.description?.trim()?.slice(0, 80) ||
            "Service Workflow",
          payload: {
            availability: d.availability,
            payment_modes: d.payment_modes,

            rate_type: d.rate_type,
            rate_unit: d.rate_unit,

            daily_rate: d.daily_rate ?? null,
            hourly_rate: d.hourly_rate ?? null,
            package_rate: d.package_rate ?? null,
            site_visit_charge: d.site_visit_charge ?? null,

            description_template: d.description ?? null,

            saved_from: "services_add_page",
            saved_at: new Date().toISOString(),
          },
        });
      } catch (memoryErr) {
        console.error("Service memory save failed", memoryErr);
      }
        } catch (error: any) {
          console.error(error);
          setErr(error.message || "Failed to save provider service.");
          throw error;
        }
      }

      // 2) Turnkey → provider_turnkey_packages
      if (includeTurnkey) {
        const enabled = turnkeyDrafts.filter((t) => t.enabled && !!t.template_code);
        for (const t of enabled) {
          const payload: any = {
            provider_id: providerId,
            template_code: t.template_code,
            record_status,
            currency: t.currency || "INR",
            rate_unit: "per_sqft",
            rate_per_unit: typeof t.vendor_rate_per_sqft === "number" ? t.vendor_rate_per_sqft : null,
          };

          const { error } = await supabase
            .from("provider_turnkey_packages")
            .upsert(payload, { onConflict: "provider_id,template_code" });

          if (error) {
            console.error(error);
            setErr(error.message);
            throw error;
          }
        }
      }

      await refreshMyProviderServices(providerId);

      setDrafts([DEFAULT_SERVICE_DRAFT()]);
      setBulkSelectedServiceIds(new Set());
      setStep(1);

      alert(record_status === "published" ? "Published successfully!" : "Saved as draft!");
    } catch (e: any) {
      console.error(e);
      setErr(e?.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  // ---------- UI ----------
  if (loading) {
    return (
      <main>
        <Container>
          <SectionHeader title="Add / List Your Services" subtitle="Loading..." />
        </Container>

        <style jsx global>{`
          header,
          footer {
            display: none !important;
          }
          body {
            background: #f8fafc;
          }
        `}</style>
      </main>
    );
  }

  if (!provider?.id) {
    return (
      <main>
        <Container>
          <SectionHeader title="Add / List Your Services" subtitle="Please complete your provider profile first." />

          <div style={{ marginTop: 14 }}>
            <div style={styles.gateBox}>
              <div style={{ fontWeight: 900, marginBottom: 6 }}>Provider profile required</div>
              <div style={{ color: "#5b6472", fontSize: 13, marginBottom: 10 }}>
                To list services, you must have a Service Provider profile linked to your account.
              </div>

              {err ? (
                <div style={{ color: "crimson", fontWeight: 900, fontSize: 13, marginBottom: 10 }}>Error: {err}</div>
              ) : null}

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <ActionButton
                  href={`/onboarding/business?returnTo=${encodeURIComponent("/services/add")}`}
                  variant="primary"
                >
                  Complete Provider Profile →
                </ActionButton>
              </div>
            </div>
          </div>
        </Container>

        <style jsx global>{`
          header,
          footer {
            display: none !important;
          }
          body {
            background: #f8fafc;
          }
        `}</style>
      </main>
    );
  }

  const draftsCountValid = drafts.filter((d) => (d.pickMode === "catalog" ? !!d.service_id : !!d.other_service?.trim()))
    .length;

  return (
    <main>
      <Container>
        <SectionHeader
          title="Add / List Your Services"
          subtitle="Wizard: select services → fill details → review & save. Public visibility depends on provider status = published."
        />

        {err ? <div style={{ marginBottom: 12, color: "crimson", fontWeight: 900 }}>{err}</div> : null}

        {/* Provider + Stepper */}
        <Card>
          <CardBody>
            <div style={styles.toolbar}>
              <div>
                <div style={{ fontWeight: 900, fontSize: 16 }}>Your Provider Account</div>
                <div style={{ color: "#5b6472", fontSize: 13 }}>
                  Provider status: <b>{provider.status ?? "—"}</b>{" "}
                  {provider.status?.toLowerCase() !== "published" ? (
                    <span style={{ marginLeft: 8 }}>
                      (Public visibility requires <b>published</b>)
                    </span>
                  ) : null}
                </div>
                  <div
  style={{
    border: includeTurnkey ? "2px solid #111827" : "1px solid #e5e7eb",
    borderRadius: 12,
    padding: "8px 10px",
    background: "#fff",
    display: "flex",
    alignItems: "center",
    gap: 10,
  }}
>
  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
    <input
      type="checkbox"
      checked={includeTurnkey}
      onChange={(e) => setIncludeTurnkey(e.target.checked)}
    />
    <span style={{ fontWeight: 900, fontSize: 13 }}>Turnkey House Construction</span>
  </label>

  <ActionButton href="/services/turnkey/add" variant="secondary">
    Configure →
  </ActionButton>
</div>

                {/* Photo reminder (no schema change here) */}
                <div style={{ marginTop: 6, ...styles.minor }}>
                  Tip: For professional services, a provider photo helps customers choose faster. Update your provider profile if needed.
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <span style={styles.stepPill(step === 1)}>1) Select</span>
                <span style={styles.stepPill(step === 2)}>2) Details</span>
                <span style={styles.stepPill(step === 3)}>3) Review & Save</span>

                <ActionButton href="/services/my" variant="secondary">
                  Go to My Services →
                </ActionButton>
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              {myProviderServices.length === 0 ? (
                <EmptyState message="No provider services yet. Add your first listings using the wizard below." />
              ) : (
                <Grid min={260} gap={12}>
                  {myProviderServices.slice(0, 12).map((s) => (
                    <Card key={s.id}>
                      <CardBody>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                          <div style={{ fontWeight: 800 }}>{(s.custom_service ?? "Service").trim() || "Service"}</div>
                          <Badge>{s.record_status}</Badge>
                        </div>
                        <div style={{ marginTop: 8, color: "#5b6472", fontSize: 13 }}>
                          Category: {s.custom_category ?? "—"} • Sub: {s.custom_subcategory ?? "—"}
                        </div>
                        <div style={{ marginTop: 6, color: "#5b6472", fontSize: 13 }}>
                          Updated: {new Date(s.updated_at).toLocaleString()}
                        </div>
                      </CardBody>
                      <CardFooter>
                        <ActionButton href={`/services/${s.id}`} variant="secondary">
                          Preview →
                        </ActionButton>
                      </CardFooter>
                    </Card>
                  ))}
                </Grid>
              )}
                        </div>
          </CardBody>
        </Card>

        {/* STEP 1: SELECT */}
        {step === 1 ? (
          <div style={{ marginTop: 14 }}>
            <Card>
              <CardBody>
                <div style={styles.toolbar}>
                  <div>
                    <div style={{ fontWeight: 900, fontSize: 16 }}>Step 1: Select Services</div>
                    <div style={{ color: "#5b6472", fontSize: 13 }}>
                      Bulk-select multiple services (best for skilled workers with many skills), or add “Other (specify)”.
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                    <button onClick={() => setBulkMode(true)} style={styles.miniBtn(bulkMode)}>
                      Bulk select
                    </button>
                    <button onClick={() => setBulkMode(false)} style={styles.miniBtn(!bulkMode)}>
                      Add one-by-one
                    </button>
                    <button onClick={clearAllDrafts} style={styles.miniBtn()}>
                      Reset drafts
                    </button>
                  </div>
                </div>

                {/* Bulk select */}
                {bulkMode ? (
                  <div style={{ marginTop: 12 }}>
                    <div style={styles.formGrid}>
                      <div style={styles.field}>
                        <span style={styles.label}>Category</span>
                        <select
                          value={bulkCategoryId}
                          onChange={(e) => {
                            const v = e.target.value;
                            setBulkCategoryId(v);
                            setBulkSubcategoryId("");
                            setBulkSelectedServiceIds(new Set());
                          }}
                          style={styles.input}
                        >
                          <option value="">Select category…</option>
                          {categories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div style={styles.field}>
                        <span style={styles.label}>Subcategory</span>
                        <select
                          value={bulkSubcategoryId}
                          onChange={(e) => {
                            const v = e.target.value;
                            setBulkSubcategoryId(v);
                            setBulkSelectedServiceIds(new Set());
                          }}
                          disabled={!bulkCategoryId}
                          style={styles.input}
                        >
                          <option value="">{bulkCategoryId ? "Select subcategory…" : "Select category first"}</option>
                          {subcategoriesFor(bulkCategoryId || undefined).map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div style={{ marginTop: 12 }}>
                      {!bulkCategoryId || !bulkSubcategoryId ? (
                        <EmptyState message="Select Category + Subcategory to see services." />
                      ) : bulkList().length === 0 ? (
                        <EmptyState message="No services found under this subcategory." />
                      ) : (
                        <div style={styles.box}>
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                            <div style={{ fontWeight: 900 }}>
                              Choose services ({bulkSelectedServiceIds.size} selected)
                              <div style={{ ...styles.minor, marginTop: 4 }}>
                                Already-listed services are greyed out and cannot be selected.
                              </div>
                            </div>

                            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                              <button
                                onClick={() => {
                                  const all = bulkList()
                                    .map((x) => x.id)
                                    .filter((id) => !existingKeys.has(`catalog:${id}`));
                                  setBulkSelectedServiceIds(new Set(all));
                                }}
                                style={styles.miniBtn()}
                              >
                                Select all
                              </button>
                              <button onClick={() => setBulkSelectedServiceIds(new Set())} style={styles.miniBtn()}>
                                Clear
                              </button>
                              <button
                                onClick={addBulkSelectedAsDrafts}
                                style={{
                                  border: "1px solid #111827",
                                  background: "#111827",
                                  color: "#fff",
                                  padding: "10px 12px",
                                  borderRadius: 12,
                                  cursor: bulkSelectedServiceIds.size ? "pointer" : "not-allowed",
                                  fontWeight: 900,
                                  opacity: bulkSelectedServiceIds.size ? 1 : 0.6,
                                }}
                                disabled={!bulkSelectedServiceIds.size}
                              >
                                Add selected → Step 2
                              </button>
                            </div>
                          </div>

                          <div style={{ marginTop: 10 }}>
                            <Grid min={260} gap={10}>
                              {bulkList().map((s) => {
                                const isSelected = bulkSelectedServiceIds.has(s.id);
                                const dedupKey = `catalog:${s.id}`;
                                const alreadyListed = existingKeys.has(dedupKey);
                                const alreadyInDrafts = drafts.some(
                                  (d) => d.pickMode === "catalog" && d.service_id === s.id
                                );

                                return (
                                  <div
                                    key={s.id}
                                    style={{
                                      border: "1px solid #e5e7eb",
                                      borderRadius: 12,
                                      padding: 10,
                                      background: "#fff",
                                      opacity: alreadyListed ? 0.55 : 1,
                                    }}
                                  >
                                    <label style={{ display: "flex", gap: 10, alignItems: "center", cursor: "pointer" }}>
                                      <input
                                        type="checkbox"
                                        checked={isSelected}
                                        disabled={alreadyListed}
                                        onChange={() => toggleBulkService(s.id)}
                                      />
                                      <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 900 }}>{s.name}</div>
                                        <div style={{ ...styles.minor, marginTop: 2 }}>
                                          {alreadyListed
                                            ? "Already listed (skipped)"
                                            : alreadyInDrafts
                                            ? "Already in drafts"
                                            : " "}
                                        </div>
                                      </div>
                                    </label>
                                  </div>
                                );
                              })}
                            </Grid>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Add "Other" quick */}
                    <div style={{ marginTop: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                        <div style={{ fontWeight: 900 }}>Or add a custom service</div>
                        <button
                          onClick={() => {
                            addDraft({ pickMode: "other" });
                            setStep(2);
                          }}
                          style={styles.miniBtn()}
                        >
                          + Add “Other (specify)” → Step 2
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* One-by-one mode */
                  <div style={{ marginTop: 12 }}>
                    <div style={{ color: "#5b6472", fontSize: 13, marginBottom: 10 }}>
                      Add drafts here (selection happens only in Step 1). Then go to Step 2 to fill details.
                    </div>

                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <button onClick={() => addDraft()} style={styles.miniBtn()}>
                        + Add another (Catalog)
                      </button>
                      <button onClick={() => addDraft({ pickMode: "other" })} style={styles.miniBtn()}>
                        + Add “Other (specify)”
                      </button>
                      <button
                        onClick={() => goToStep(2)}
                        style={{
                          border: "1px solid #111827",
                          background: "#111827",
                          color: "#fff",
                          padding: "10px 12px",
                          borderRadius: 12,
                          cursor: "pointer",
                          fontWeight: 900,
                        }}
                      >
                        Next → Step 2
                      </button>
                    </div>

                    <div style={{ marginTop: 12 }}>
                      <Grid min={340} gap={12}>
                        {drafts.map((d, idx) => {
                          const subs = subcategoriesFor(d.category_id);
                          const svcs = servicesFor(d.category_id, d.subcategory_id);

                          return (
                            <Card key={d.key}>
                              <CardBody>
                                <div
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    gap: 10,
                                    alignItems: "center",
                                  }}
                                >
                                  <div style={{ fontWeight: 900 }}>
                                    Draft #{idx + 1}{" "}
                                    <span style={{ color: "#5b6472", fontWeight: 700 }}>
                                      ({d.pickMode === "catalog" ? "catalog" : "other"})
                                    </span>
                                  </div>

                                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                    <Badge>{d.pickMode === "catalog" ? "Catalog" : "Other"}</Badge>
                                    {drafts.length > 1 ? (
                                      <button onClick={() => removeDraft(d.key)} style={styles.miniBtn()}>
                                        Remove
                                      </button>
                                    ) : null}
                                  </div>
                                </div>

                                {/* Selection happens only in Step 1, but we keep the selectors here ONLY when step=1 and bulkMode=false */}
                                <div style={styles.segmentWrap}>
                                  <button
                                    onClick={() =>
                                      setDraft(d.key, {
                                        pickMode: "catalog",
                                        other_category: "",
                                        other_subcategory: "",
                                        other_service: "",
                                      })
                                    }
                                    style={styles.segmentBtn(d.pickMode === "catalog")}
                                  >
                                    Select from catalog
                                  </button>
                                  <button
                                    onClick={() =>
                                      setDraft(d.key, {
                                        pickMode: "other",
                                        category_id: undefined,
                                        subcategory_id: undefined,
                                        service_id: undefined,
                                      })
                                    }
                                    style={styles.segmentBtn(d.pickMode === "other")}
                                  >
                                    Other (specify)
                                  </button>
                                </div>

                                {d.pickMode === "catalog" ? (
                                  <div style={styles.formGrid}>
                                    <div style={styles.field}>
                                      <span style={styles.label}>Category</span>
                                      <select
                                        value={d.category_id || ""}
                                        onChange={(e) =>
                                          setDraft(d.key, {
                                            category_id: e.target.value || undefined,
                                            subcategory_id: undefined,
                                            service_id: undefined,
                                          })
                                        }
                                        style={styles.input}
                                      >
                                        <option value="">Select category…</option>
                                        {categories.map((c) => (
                                          <option key={c.id} value={c.id}>
                                            {c.name}
                                          </option>
                                        ))}
                                      </select>
                                    </div>

                                    <div style={styles.field}>
                                      <span style={styles.label}>Subcategory</span>
                                      <select
                                        value={d.subcategory_id || ""}
                                        onChange={(e) =>
                                          setDraft(d.key, {
                                            subcategory_id: e.target.value || undefined,
                                            service_id: undefined,
                                          })
                                        }
                                        disabled={!d.category_id}
                                        style={styles.input}
                                      >
                                        <option value="">
                                          {d.category_id ? "Select subcategory…" : "Select category first"}
                                        </option>
                                        {subs.map((s) => (
                                          <option key={s.id} value={s.id}>
                                            {s.name}
                                          </option>
                                        ))}
                                      </select>
                                    </div>

                                    <div style={styles.field}>
                                      <span style={styles.label}>Service</span>
                                      <select
                                        value={d.service_id || ""}
                                        onChange={(e) => setDraft(d.key, { service_id: e.target.value || undefined })}
                                        disabled={!d.category_id || !d.subcategory_id}
                                        style={styles.input}
                                      >
                                        <option value="">
                                          {d.category_id && d.subcategory_id
                                            ? "Select service…"
                                            : "Select category + subcategory first"}
                                        </option>
                                        {svcs.map((s) => (
                                          <option key={s.id} value={s.id}>
                                            {s.name}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                  </div>
                                ) : (
                                  <div style={styles.formGrid}>
                                    <div style={styles.field}>
                                      <span style={styles.label}>Category (Other)</span>
                                      <input
                                        value={d.other_category || ""}
                                        onChange={(e) => setDraft(d.key, { other_category: e.target.value })}
                                        placeholder='e.g. "Software / IT Services"'
                                        style={styles.input}
                                      />
                                    </div>

                                    <div style={styles.field}>
                                      <span style={styles.label}>Subcategory (Other)</span>
                                      <input
                                        value={d.other_subcategory || ""}
                                        onChange={(e) => setDraft(d.key, { other_subcategory: e.target.value })}
                                        placeholder='e.g. "Website / App"'
                                        style={styles.input}
                                      />
                                    </div>

                                    <div style={styles.field}>
                                      <span style={styles.label}>Service name (Other)</span>
                                      <input
                                        value={d.other_service || ""}
                                        onChange={(e) => setDraft(d.key, { other_service: e.target.value })}
                                        placeholder='e.g. "Real Estate Website Development"'
                                        style={styles.input}
                                      />
                                    </div>
                                  </div>
                                )}
                              </CardBody>
                            </Card>
                          );
                        })}
                      </Grid>
                    </div>
                  </div>
                )}
              </CardBody>

              <CardFooter>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    width: "100%",
                    gap: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ color: "#5b6472", fontSize: 13 }}>
                    Selected drafts: <b>{draftsCountValid}</b> {includeTurnkey ? "• Turnkey enabled" : ""}
                  </div>

                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button onClick={() => goToStep(2)} style={styles.miniBtn()}>
                      Next → Step 2
                    </button>
                  </div>
                </div>
              </CardFooter>
            </Card>
          </div>
        ) : null}

        {/* STEP 2: DETAILS (no re-select; selection is locked from Step 1) */}
        {step === 2 ? (
          <div style={{ marginTop: 14 }}>
            <Card>
              <CardBody>
                <div style={styles.toolbar}>
                  <div>
                    <div style={{ fontWeight: 900, fontSize: 16 }}>Step 2: Fill Details</div>
                    <div style={{ color: "#5b6472", fontSize: 13 }}>
                      Selection is already done in Step 1. Here you only fill work details, pricing, terms and payments.
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button onClick={() => goToStep(1)} style={styles.miniBtn()}>
                      ← Back to Step 1
                    </button>
                    <button onClick={() => addDraft()} style={styles.miniBtn()}>
                      + Add draft (Catalog)
                    </button>
                    <button onClick={() => addDraft({ pickMode: "other" })} style={styles.miniBtn()}>
                      + Add “Other”
                    </button>
                    <button
                      onClick={() => goToStep(3)}
                      style={{
                        border: "1px solid #111827",
                        background: "#111827",
                        color: "#fff",
                        padding: "10px 12px",
                        borderRadius: 12,
                        cursor: "pointer",
                        fontWeight: 900,
                      }}
                    >
                      Next → Step 3
                    </button>
                  </div>
                </div>

                {/* Draft picker */}
                <div style={{ marginTop: 12 }}>
                  {drafts.length === 0 ? (
                    <EmptyState message="No drafts. Go back to Step 1 to add services." />
                  ) : (
                    <Grid min={260} gap={10}>
                      {drafts.map((d) => {
                        const active = d.key === (activeDraft?.key ?? "");
                        const k = keyForDraftDedup(d);
                        const alreadyListed = k ? existingKeys.has(k) : false;
                        const path =
                          d.pickMode === "catalog"
                            ? findCatalogRow(d.service_id)?.full_path ?? "Catalog"
                            : `Other • ${(d.other_category || "—").trim()}`;

                        return (
                          <Card key={d.key}>
                            <CardBody>
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  gap: 10,
                                  alignItems: "center",
                                  flexWrap: "wrap",
                                }}
                              >
                                <div style={{ fontWeight: 900 }}>
                                  {draftTitle(d)}
                                  <div style={{ ...styles.minor, marginTop: 2 }}>{path}</div>
                                </div>

                                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                                  <Badge>{d.pickMode === "catalog" ? "Catalog" : "Other"}</Badge>
                                  {alreadyListed ? <Badge>Already listed</Badge> : null}
                                  <button onClick={() => setActiveDraftKey(d.key)} style={styles.miniBtn(active)}>
                                    {active ? "Editing" : "Edit"}
                                  </button>
                                  {drafts.length > 1 ? (
                                    <button onClick={() => removeDraft(d.key)} style={styles.miniBtn()}>
                                      Remove
                                    </button>
                                  ) : null}
                                </div>
                              </div>
                            </CardBody>
                          </Card>
                        );
                      })}
                    </Grid>
                  )}
                </div>

                {/* Active editor */}
                {activeDraft ? (
                  <div style={{ marginTop: 12 }}>
                    <Card>
                      <CardBody>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                          <div>
                            <div style={{ fontWeight: 900, fontSize: 15 }}>Editing: {draftTitle(activeDraft)}</div>
                            <div style={{ ...styles.minor, marginTop: 4 }}>
                              Tip: Leave “Headline” empty — it auto uses the service name.
                            </div>
                          </div>
                          <Badge>{activeDraft.pickMode === "catalog" ? "Catalog" : "Other"}</Badge>
                        </div>

                        {/* Locked selection summary */}
                        <div style={{ marginTop: 10, ...styles.box }}>
                          <div style={{ fontWeight: 900, marginBottom: 6 }}>Selected Service</div>
                          {activeDraft.pickMode === "catalog" ? (
                            <div style={{ color: "#5b6472", fontSize: 13 }}>
                              {findCatalogRow(activeDraft.service_id)?.full_path ?? "—"}
                            </div>
                          ) : (
                            <div style={{ color: "#5b6472", fontSize: 13 }}>
                              {[(activeDraft.other_category || "").trim(), (activeDraft.other_subcategory || "").trim()]
                                .filter(Boolean)
                                .join(" • ") || "—"}
                              {" • "}
                              <b>{(activeDraft.other_service || "").trim() || "—"}</b>
                            </div>
                          )}
                          <div style={{ marginTop: 8 }}>
                            <button onClick={() => goToStep(1)} style={styles.miniBtn()}>
                              Change selection in Step 1 →
                            </button>
                          </div>
                        </div>

                        {/* Basic + Work profile */}
                        <div style={styles.formGrid}>
                          <div style={styles.field}>
                            <span style={styles.label}>Headline (optional)</span>
                            <input
                              value={activeDraft.headline}
                              onChange={(e) => setDraft(activeDraft.key, { headline: e.target.value })}
                              placeholder="e.g. Reliable masonry with clean finishing"
                              style={styles.input}
                            />
                          </div>

                          <div style={styles.field}>
                            <span style={styles.label}>Skill Level</span>
                            <select
                              value={activeDraft.skill_level}
                              onChange={(e) =>
                                setDraft(activeDraft.key, { skill_level: e.target.value as SkillLevel })
                              }
                              style={styles.input}
                            >
                              <option value="skilled">Skilled</option>
                              <option value="semi_skilled">Semi-skilled</option>
                              <option value="unskilled">Unskilled</option>
                            </select>
                          </div>

                          <div style={styles.field}>
                            <span style={styles.label}>Experience (years)</span>
                            <input
                              type="number"
                              value={typeof activeDraft.experience_years === "number" ? activeDraft.experience_years : ""}
                              onChange={(e) =>
                                setDraft(activeDraft.key, { experience_years: parseOptionalNumber(e.target.value) })
                              }
                              placeholder="e.g. 6"
                              style={styles.input}
                            />
                          </div>
                        </div>

                        {/* Coverage & availability */}
                        <div style={styles.formGrid}>
                          <div style={styles.field}>
                            <span style={styles.label}>Work Area / Coverage (text)</span>
                            <input
                              value={activeDraft.work_area || ""}
                              onChange={(e) => setDraft(activeDraft.key, { work_area: e.target.value })}
                              placeholder="e.g. Cooch Behar, Tufanganj, Alipurduar"
                              style={styles.input}
                            />
                          </div>

                          <div style={styles.field}>
                            <span style={styles.label}>Coverage (short)</span>
                            <input
                              value={activeDraft.location}
                              onChange={(e) => setDraft(activeDraft.key, { location: e.target.value })}
                              placeholder="e.g. Cooch Behar / Nearby"
                              style={styles.input}
                            />
                          </div>

                          <div style={styles.field}>
                            <span style={styles.label}>Coverage radius (km)</span>
                            <input
                              type="number"
                              value={typeof activeDraft.coverage_km === "number" ? activeDraft.coverage_km : ""}
                              onChange={(e) =>
                                setDraft(activeDraft.key, { coverage_km: parseOptionalNumber(e.target.value) })
                              }
                              placeholder="e.g. 30"
                              style={styles.input}
                            />
                          </div>
                        </div>

                        <div style={{ marginTop: 12 }}>
                          <span style={styles.label}>Availability</span>
                          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                            {[
                              { k: "full_time", label: "Full-time" },
                              { k: "part_time", label: "Part-time" },
                              { k: "contract", label: "Contract basis" },
                              { k: "on_call", label: "On-call" },
                            ].map((x) => {
                              const checked = activeDraft.availability.includes(x.k as Availability);
                              return (
                                <label
                                  key={x.k}
                                  style={{
                                    display: "flex",
                                    gap: 8,
                                    alignItems: "center",
                                    border: "1px solid #e5e7eb",
                                    padding: "8px 10px",
                                    borderRadius: 12,
                                    background: "#fff",
                                    cursor: "pointer",
                                  }}
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => {
                                      const next = new Set(activeDraft.availability);
                                      if (next.has(x.k as Availability)) next.delete(x.k as Availability);
                                      else next.add(x.k as Availability);
                                      setDraft(activeDraft.key, { availability: Array.from(next) as Availability[] });
                                    }}
                                  />
                                  <span style={{ fontWeight: 800, fontSize: 13 }}>{x.label}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>

                        {/* Description */}
                        <div style={{ marginTop: 12 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                          <span style={styles.label}>Description / Scope of Work</span>
                          <button
                            type="button"
                            onClick={() => generateServiceAI("description", activeDraft)}
                            disabled={aiLoadingField !== null || saving}
                            style={styles.miniBtn(aiLoadingField === "description")}
                          >
                            {aiLoadingField === "description" ? "AI writing..." : "✨ Generate Scope"}
                          </button>
                        </div>

                        <textarea
                          value={activeDraft.description}
                          onChange={(e) => setDraft(activeDraft.key, { description: e.target.value })}
                          rows={5}
                          placeholder="Describe your work scope, brands, finishing quality, team size, etc."
                          style={styles.textarea}
                        />
                        </div>

                        {/* Pricing & terms */}
                        <div style={{ marginTop: 12, ...styles.box }}>
                          <div style={{ fontWeight: 900, marginBottom: 8 }}>Service Pricing & Work Terms</div>

                          <div style={styles.formGrid}>
                            <div style={styles.field}>
                              <span style={styles.label}>Daily Rate (₹)</span>
                              <input
                                type="number"
                                value={typeof activeDraft.daily_rate === "number" ? activeDraft.daily_rate : ""}
                                onChange={(e) => setDraft(activeDraft.key, { daily_rate: parseOptionalNumber(e.target.value) })}
                                style={styles.input}
                              />
                            </div>

                            <div style={styles.field}>
                              <span style={styles.label}>Hourly Rate (₹)</span>
                              <input
                                type="number"
                                value={typeof activeDraft.hourly_rate === "number" ? activeDraft.hourly_rate : ""}
                                onChange={(e) => setDraft(activeDraft.key, { hourly_rate: parseOptionalNumber(e.target.value) })}
                                style={styles.input}
                              />
                            </div>

                            <div style={styles.field}>
                              <span style={styles.label}>Contract / Package Rate (₹)</span>
                              <input
                                type="number"
                                value={typeof activeDraft.package_rate === "number" ? activeDraft.package_rate : ""}
                                onChange={(e) => setDraft(activeDraft.key, { package_rate: parseOptionalNumber(e.target.value) })}
                                style={styles.input}
                              />
                            </div>
                          </div>

                          <div style={styles.formGrid}>
                            <div style={styles.field}>
                              <span style={styles.label}>Site Visit Charge (₹)</span>
                              <input
                                type="number"
                                value={typeof activeDraft.site_visit_charge === "number" ? activeDraft.site_visit_charge : ""}
                                onChange={(e) =>
                                  setDraft(activeDraft.key, { site_visit_charge: parseOptionalNumber(e.target.value) })
                                }
                                style={styles.input}
                              />
                            </div>

                            <div style={styles.field}>
                              <span style={styles.label}>Minimum Work Duration</span>
                              <input
                                value={activeDraft.minimum_work_duration || ""}
                                onChange={(e) => setDraft(activeDraft.key, { minimum_work_duration: e.target.value })}
                                placeholder='e.g. "4 hours" / "2 days"'
                                style={styles.input}
                              />
                            </div>

                            <div style={styles.field}>
                              <span style={styles.label}>Discount (if any) %</span>
                              <input
                                type="number"
                                value={typeof activeDraft.discount_pct === "number" ? activeDraft.discount_pct : ""}
                                onChange={(e) => setDraft(activeDraft.key, { discount_pct: parseOptionalNumber(e.target.value) })}
                                style={styles.input}
                              />
                            </div>
                          </div>

                          <div style={styles.formGrid}>
                            <div style={styles.field}>
                              <span style={styles.label}>Material Supply</span>
                              <select
                                value={activeDraft.material_supply}
                                onChange={(e) =>
                                  setDraft(activeDraft.key, { material_supply: e.target.value as MaterialSupply })
                                }
                                style={styles.input}
                              >
                                <option value="by_self">By self</option>
                                <option value="by_client">By client</option>
                                <option value="both">Both</option>
                              </select>
                            </div>

                            <div style={styles.field}>
                              <span style={styles.label}>Tools / Equipment</span>
                              <select
                                value={activeDraft.tools_equipment}
                                onChange={(e) =>
                                  setDraft(activeDraft.key, { tools_equipment: e.target.value as ToolsEquipment })
                                }
                                style={styles.input}
                              >
                                <option value="provided">Provided</option>
                                <option value="need_from_client">Need from client</option>
                              </select>
                            </div>

                            <div style={styles.field}>
                              <span style={styles.label}>GST Applicable?</span>
                              <select
                                value={activeDraft.gst_applicable ? "yes" : "no"}
                                onChange={(e) =>
                                  setDraft(activeDraft.key, { gst_applicable: e.target.value === "yes" })
                                }
                                style={styles.input}
                              >
                                <option value="no">No</option>
                                <option value="yes">Yes</option>
                              </select>
                            </div>

                            {activeDraft.gst_applicable ? (
                              <div style={styles.field}>
                                <span style={styles.label}>GST %</span>
                                <input
                                  type="number"
                                  value={typeof activeDraft.gst_pct === "number" ? activeDraft.gst_pct : ""}
                                  onChange={(e) => setDraft(activeDraft.key, { gst_pct: parseOptionalNumber(e.target.value) })}
                                  style={styles.input}
                                />
                              </div>
                            ) : null}
                          </div>
                        </div>

                        {/* Commitment / Safety */}
                        <div style={{ marginTop: 12, ...styles.box }}>
                          <div style={{ fontWeight: 900, marginBottom: 8 }}>Delivery / Work Commitment</div>

                          <div style={styles.formGrid}>
                            <div style={styles.field}>
                              <span style={styles.label}>Expected Start Time After Order</span>
                              <input
                                value={activeDraft.expected_start_time || ""}
                                onChange={(e) => setDraft(activeDraft.key, { expected_start_time: e.target.value })}
                                placeholder='e.g. "24 hours" / "2 days"'
                                style={styles.input}
                              />
                            </div>

                            <div style={styles.field}>
                            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                              <span style={styles.label}>Work Warranty / SLA / Quality Assurance</span>
                              <button
                                type="button"
                                onClick={() => generateServiceAI("sla", activeDraft)}
                                disabled={aiLoadingField !== null || saving}
                                style={styles.miniBtn(aiLoadingField === "sla")}
                              >
                                {aiLoadingField === "sla" ? "AI..." : "✨ SLA"}
                              </button>
                            </div>

                            <input
                              value={activeDraft.warranty || ""}
                              onChange={(e) => setDraft(activeDraft.key, { warranty: e.target.value })}
                              placeholder='e.g. "6 months workmanship warranty"'
                              style={styles.input}
                            />
                            </div>
                          </div>

                          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 8 }}>
                            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                              <input
                                type="checkbox"
                                checked={activeDraft.emergency_service}
                                onChange={(e) => setDraft(activeDraft.key, { emergency_service: e.target.checked })}
                              />
                              Emergency service
                            </label>

                            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                              <input
                                type="checkbox"
                                checked={activeDraft.safety_gear_provided}
                                onChange={(e) => setDraft(activeDraft.key, { safety_gear_provided: e.target.checked })}
                              />
                              Safety gear provided
                            </label>
                          </div>
                        </div>

                        {/* Payments */}
                        <div style={{ marginTop: 12, ...styles.box }}>
                          <div style={{ fontWeight: 900, marginBottom: 8 }}>Payment Details</div>

                          <div style={{ marginTop: 6 }}>
                            <span style={styles.label}>Accepted Payment Modes</span>
                            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                              {[
                                { k: "cash", label: "Cash" },
                                { k: "upi", label: "UPI" },
                                { k: "bank_transfer", label: "Bank transfer" },
                                { k: "other", label: "Other" },
                              ].map((x) => {
                                const checked = activeDraft.payment_modes.includes(x.k as PaymentMode);
                                return (
                                  <label
                                    key={x.k}
                                    style={{
                                      display: "flex",
                                      gap: 8,
                                      alignItems: "center",
                                      border: "1px solid #e5e7eb",
                                      padding: "8px 10px",
                                      borderRadius: 12,
                                      background: "#fff",
                                      cursor: "pointer",
                                    }}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() => {
                                        const next = new Set(activeDraft.payment_modes);
                                        if (next.has(x.k as PaymentMode)) next.delete(x.k as PaymentMode);
                                        else next.add(x.k as PaymentMode);
                                        setDraft(activeDraft.key, {
                                          payment_modes: Array.from(next) as PaymentMode[],
                                        });
                                      }}
                                    />
                                    <span style={{ fontWeight: 800, fontSize: 13 }}>{x.label}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>

                          {activeDraft.payment_modes.includes("other") ? (
                            <div style={{ marginTop: 10 }}>
                              <span style={styles.label}>Other payment mode (write)</span>
                              <input
                                value={activeDraft.payment_mode_other || ""}
                                onChange={(e) => setDraft(activeDraft.key, { payment_mode_other: e.target.value })}
                                placeholder="e.g. cheque, card, wallet"
                                style={styles.input}
                              />
                            </div>
                          ) : null}

                          <div style={styles.formGrid}>
                            <div style={styles.field}>
                              <span style={styles.label}>Advance Requirement (%)</span>
                              <input
                                type="number"
                                value={
                                  typeof activeDraft.advance_requirement_pct === "number"
                                    ? activeDraft.advance_requirement_pct
                                    : ""
                                }
                                onChange={(e) =>
                                  setDraft(activeDraft.key, { advance_requirement_pct: parseOptionalNumber(e.target.value) })
                                }
                                style={styles.input}
                              />
                            </div>

                            <div style={styles.field}>
                              <span style={styles.label}>Payment Stage</span>
                              <select
                                value={activeDraft.payment_stage}
                                onChange={(e) =>
                                  setDraft(activeDraft.key, { payment_stage: e.target.value as PaymentStage })
                                }
                                style={styles.input}
                              >
                                <option value="daily">Daily</option>
                                <option value="after_completion">After completion</option>
                                <option value="milestone">Milestone basis</option>
                              </select>
                            </div>

                            <div style={styles.field}>
                            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                              <span style={styles.label}>Refund / Cancellation Policy</span>
                              <button
                                type="button"
                                onClick={() => generateServiceAI("refund", activeDraft)}
                                disabled={aiLoadingField !== null || saving}
                                style={styles.miniBtn(aiLoadingField === "refund")}
                              >
                                {aiLoadingField === "refund" ? "AI..." : "✨ Policy"}
                              </button>
                            </div>

                            <input
                              value={activeDraft.refund_policy || ""}
                              onChange={(e) => setDraft(activeDraft.key, { refund_policy: e.target.value })}
                              placeholder="Write your policy (optional)"
                              style={styles.input}
                            />
                            </div>
                          </div>
                        </div>

                        {/* Tags / Uploads note */}
                        <div style={styles.formGrid}>
                          <div style={styles.field}>
                            <span style={styles.label}>Tags (comma separated)</span>
                            <input
                              value={activeDraft.tags}
                              onChange={(e) => setDraft(activeDraft.key, { tags: e.target.value })}
                              placeholder="e.g. fast-delivery, branded-materials, warranty"
                              style={styles.input}
                            />
                          </div>

                          <div style={styles.field}>
                            <span style={styles.label}>Uploads note</span>
                            <input
                              value={activeDraft.uploads_note || ""}
                              onChange={(e) => setDraft(activeDraft.key, { uploads_note: e.target.value })}
                              placeholder="e.g. work photos, certificates, before/after images"
                              style={styles.input}
                            />
                          </div>
                        <div style={{ marginTop: 12 }}>
                          <UniversalMediaUploader
                            module="services"
                            value={activeDraft.media_assets || []}
                            onChange={(assets) =>
                              setDraft(activeDraft.key, {
                                media_assets: assets,
                              })
                            }
                            label="Service work photos / videos"
                            helperText="Capture one genuine live GPS-backed photo of your actual work, team, tools, equipment or work site first. Additional gallery photos and videos are available after the mandatory capture."
                            allowImages
                            allowVideos
                            allowDocuments={false}
                            maxFiles={10}
                            uploadStrategy="trusted"
                            mandatoryTrustedCaptures={1}
                            inlineCamera
                            cameraFacing="environment"
                            cameraOnly={false}
                          />

                          <div
                            style={{
                              marginTop: 12,
                              padding: 14,
                              borderRadius: 12,
                              border: activeServicePublicationReady
                                ? "1px solid #bbf7d0"
                                : "1px solid #fed7aa",
                              background: activeServicePublicationReady
                                ? "#f0fdf4"
                                : "#fff7ed",
                            }}
                          >
                            <div
                              style={{
                                fontWeight: 900,
                                color: activeServicePublicationReady
                                  ? "#166534"
                                  : "#9a3412",
                              }}
                            >
                              Service Trusted Publication Readiness
                            </div>

                            <div
                              style={{
                                display: "grid",
                                gridTemplateColumns:
                                  "repeat(auto-fit, minmax(180px, 1fr))",
                                gap: 8,
                                marginTop: 10,
                                fontSize: 13,
                              }}
                            >
                              <div>
                                Mandatory live captures:{" "}
                                <b>
                                  {activeServiceReadiness.completedCaptures}/
                                  {serviceRequiredCaptures}
                                </b>
                              </div>

                              <div>
                                GPS:{" "}
                                <b>
                                  {activeServiceReadiness.gpsVerified
                                    ? "Verified"
                                    : "Pending"}
                                </b>
                              </div>

                              <div>
                                Live provenance:{" "}
                                <b>
                                  {activeServiceReadiness.provenanceVerified
                                    ? "Verified"
                                    : "Pending"}
                                </b>
                              </div>

                              <div>
                                Capture session:{" "}
                                <b>
                                  {activeServiceReadiness.captureSessionCompleted
                                    ? "Completed"
                                    : "Pending"}
                                </b>
                              </div>

                              <div>
                                AI media review:{" "}
                                <b>
                                  {activeServiceReadiness.aiVerificationStatus ===
                                  "verified"
                                    ? "Verified"
                                    : "Pending"}
                                </b>
                              </div>
                            </div>

                            <div
                              style={{
                                marginTop: 12,
                                fontWeight: 900,
                                lineHeight: 1.5,
                                color: activeServicePublicationReady
                                  ? "#166534"
                                  : "#9a3412",
                              }}
                            >
                              {activeServicePublicationReady
                                ? "✓ Mandatory trusted evidence completed. This service can pass the trusted publication gate."
                                : "Draft saving remains available. Publish Now requires one genuine live GPS-backed service capture for this service."}
                            </div>
                          </div>
                        </div>
                        </div>

                        {/* Primary rate (kept for DB mapping) */}
                        <div style={{ marginTop: 12, ...styles.box }}>
                          <div style={{ fontWeight: 900, marginBottom: 8 }}>Primary Pricing Model (for sorting / filters)</div>

                          <div style={styles.formGrid}>
                            <div style={styles.field}>
                              <span style={styles.label}>Rate type</span>
                              <select
                                value={activeDraft.rate_type}
                                onChange={(e) => setDraft(activeDraft.key, { rate_type: e.target.value as RateType })}
                                style={styles.input}
                              >
                                <option value="starting_from">Starting from</option>
                                <option value="fixed">Fixed</option>
                                <option value="range">Range</option>
                              </select>
                            </div>

                            {activeDraft.rate_type === "range" ? (
                              <>
                                <div style={styles.field}>
                                  <span style={styles.label}>Min (₹)</span>
                                  <input
                                    type="number"
                                    value={typeof activeDraft.rate_min === "number" ? activeDraft.rate_min : ""}
                                    onChange={(e) =>
                                      setDraft(activeDraft.key, { rate_min: parseOptionalNumber(e.target.value) })
                                    }
                                    style={styles.input}
                                  />
                                </div>
                                <div style={styles.field}>
                                  <span style={styles.label}>Max (₹)</span>
                                  <input
                                    type="number"
                                    value={typeof activeDraft.rate_max === "number" ? activeDraft.rate_max : ""}
                                    onChange={(e) =>
                                      setDraft(activeDraft.key, { rate_max: parseOptionalNumber(e.target.value) })
                                    }
                                    style={styles.input}
                                  />
                                </div>
                              </>
                            ) : (
                              <div style={styles.field}>
                                <span style={styles.label}>Rate (₹)</span>
                                <input
                                  type="number"
                                  value={typeof activeDraft.rate_value === "number" ? activeDraft.rate_value : ""}
                                  onChange={(e) =>
                                    setDraft(activeDraft.key, { rate_value: parseOptionalNumber(e.target.value) })
                                  }
                                  style={styles.input}
                                />
                              </div>
                            )}

                            <div style={styles.field}>
                              <span style={styles.label}>Unit</span>
                              <select
                                value={activeDraft.rate_unit}
                                onChange={(e) => setDraft(activeDraft.key, { rate_unit: e.target.value as RateUnit })}
                                style={styles.input}
                              >
                                <option value="per_job">per job</option>
                                <option value="per_visit">per visit</option>
                                <option value="per_day">per day</option>
                                <option value="per_month">per month</option>
                                <option value="per_sqft">per sqft</option>
                                <option value="custom">custom</option>
                              </select>
                            </div>

                            {activeDraft.rate_unit === "custom" ? (
                              <div style={styles.field}>
                                <span style={styles.label}>Custom unit label</span>
                                <input
                                  value={activeDraft.rate_unit_label || ""}
                                  onChange={(e) => setDraft(activeDraft.key, { rate_unit_label: e.target.value })}
                                  placeholder='e.g. "per room" / "per file"'
                                  style={styles.input}
                                />
                              </div>
                            ) : null}
                          </div>

                          <div style={{ marginTop: 10, ...styles.minor }}>
                            Price preview: <b>{rateLabel(activeDraft.rate_type)}</b>{" "}
                            {activeDraft.rate_type === "range"
                              ? `₹${activeDraft.rate_min ?? "…"}–₹${activeDraft.rate_max ?? "…"}`
                              : `₹${activeDraft.rate_value ?? "…"}`}{" "}
                            <b>{unitLabel(activeDraft.rate_unit, activeDraft.rate_unit_label)}</b>
                          </div>
                        </div>
                      </CardBody>
                    </Card>
                  </div>
                ) : null}
              </CardBody>
            </Card>
          </div>
        ) : null}

        {/* STEP 3: REVIEW & SAVE */}
        {step === 3 ? (
          <div style={{ marginTop: 14 }}>
            {/* Turnkey */}
            <Card>
              <CardBody>
                <div style={styles.toolbar}>
                  <div>
                    <div style={{ fontWeight: 900, fontSize: 16 }}>⭐ Turnkey House Construction</div>
                    <div style={{ color: "#5b6472", fontSize: 13 }}>
                      Choose admin templates and set your own price per sqft. Scope/spec is template-driven.
                    </div>
                  </div>

                  <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14 }}>
                    <input
                      type="checkbox"
                      checked={includeTurnkey}
                      onChange={(e) => setIncludeTurnkey(e.target.checked)}
                    />
                    Include Turnkey Packages
                  </label>
                </div>

                {includeTurnkey ? (
                  turnkeyTemplates.length === 0 ? (
                    <div style={{ marginTop: 12 }}>
                      <EmptyState message="No turnkey templates found yet." />
                    </div>
                  ) : (
                    <div style={{ marginTop: 12 }}>
                      <Grid min={280} gap={12}>
                        {turnkeyTemplates.map((t) => {
                          const d = turnkeyDrafts.find((x) => x.template_code === t.template_code);
                          const enabled = !!d?.enabled;
                          const guidance =
                            typeof t.guidance_rate_per_sqft === "number" ? `₹${t.guidance_rate_per_sqft}/sqft` : "—";
                          const vendorRate = typeof d?.vendor_rate_per_sqft === "number" ? d.vendor_rate_per_sqft : null;

                          const label = t.template_code
                            ? `${t.template_code} • ${t.public_label ?? ""}`.trim()
                            : t.public_label ?? "Template";
                          const title = (t.marketing_title ?? "").trim() || (t.public_label ?? "").trim() || "Template";

                          return (
                            <Card key={t.template_code}>
                              <CardBody>
                                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                                  <div style={{ fontWeight: 900 }}>
                                    {title}
                                    <div style={{ color: "#5b6472", fontSize: 12, fontWeight: 700 }}>
                                      Admin guidance: {guidance}
                                    </div>
                                  </div>
                                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                    <Badge>{label}</Badge>
                                  </div>
                                </div>

                                <div style={{ marginTop: 10 }}>
                                  <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14 }}>
                                    <input
                                      type="checkbox"
                                      checked={enabled}
                                      onChange={(e) =>
                                        setTurnkeyDrafts((prev) =>
                                          prev.map((x) =>
                                            x.template_code === t.template_code ? { ...x, enabled: e.target.checked } : x
                                          )
                                        )
                                      }
                                      />
                                    Enable this package
                                  </label>
                                </div>

                                <div style={{ marginTop: 10 }}>
                                  <span style={styles.label}>Your rate per sqft (₹)</span>
                                  <input
                                    type="number"
                                    value={typeof vendorRate === "number" ? vendorRate : ""}
                                    onChange={(e) => {
                                      const n = parseOptionalNumber(e.target.value);
                                      setTurnkeyDrafts((prev) =>
                                        prev.map((x) =>
                                          x.template_code === t.template_code ? { ...x, vendor_rate_per_sqft: n ?? null } : x
                                        )
                                      );
                                    }}
                                    disabled={!enabled}
                                    style={{
                                      ...styles.input,
                                      opacity: enabled ? 1 : 0.6,
                                      cursor: enabled ? "text" : "not-allowed",
                                    }}
                                  />
                                  <div style={{ ...styles.minor, marginTop: 6 }}>
                                    Tip: keep close to guidance for better conversion. You can update later.
                                  </div>
                                </div>
                              </CardBody>
                            </Card>
                          );
                        })}
                      </Grid>
                    </div>
                  )
                ) : (
                  <div style={{ marginTop: 12 }}>
                    <EmptyState message="Turnkey packages disabled. You can still publish individual services." />
                  </div>
                )}
              </CardBody>
            </Card>

            {/* Review selected drafts */}
            <div style={{ marginTop: 14 }}>
              <Card>
                <CardBody>
                  <div style={styles.toolbar}>
                    <div>
                      <div style={{ fontWeight: 900, fontSize: 16 }}>Review Your Services</div>
                      <div style={{ color: "#5b6472", fontSize: 13 }}>
                        Confirm everything. Then save as draft or publish.
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <button onClick={() => goToStep(2)} style={styles.miniBtn()}>
                        ← Back to Step 2
                      </button>
                      <button onClick={() => goToStep(1)} style={styles.miniBtn()}>
                        ← Back to Step 1
                      </button>
                    </div>
                  </div>

                  <div style={{ marginTop: 12 }}>
                    {draftsCountValid === 0 && !includeTurnkey ? (
                      <EmptyState message="Nothing to save. Add at least one service draft or enable turnkey packages." />
                    ) : (
                      <Grid min={320} gap={12}>
                        {drafts
                          .filter((d) => (d.pickMode === "catalog" ? !!d.service_id : !!d.other_service?.trim()))
                          .map((d) => {
                            const k = keyForDraftDedup(d);
                            const alreadyListed = k ? existingKeys.has(k) : false;

                            const row = d.pickMode === "catalog" ? findCatalogRow(d.service_id) : null;
                            const path =
                              d.pickMode === "catalog"
                                ? row?.full_path ?? "Catalog"
                                : `Other • ${(d.other_category || "—").trim()} • ${(d.other_subcategory || "—").trim()}`;

                            const title = buildTitle(d);

                            const unit = unitLabel(d.rate_unit, d.rate_unit_label);
                            const pricePreview =
                              d.rate_type === "range"
                                ? `₹${d.rate_min ?? "…"}–₹${d.rate_max ?? "…"} ${unit}`
                                : `₹${d.rate_value ?? "…"} ${unit}`;

                            const minMax = decideMinMaxPrice(d);
                            const minMaxPreview =
                              minMax.min_price == null
                                ? "—"
                                : minMax.min_price === minMax.max_price
                                ? `₹${minMax.min_price}`
                                : `₹${minMax.min_price}–₹${minMax.max_price}`;

                            return (
                              <Card key={d.key}>
                                <CardBody>
                                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                                    <div style={{ fontWeight: 900 }}>
                                      {title}
                                      <div style={{ ...styles.minor, marginTop: 2 }}>{path}</div>
                                    </div>

                                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                                      <Badge>{d.pickMode === "catalog" ? "Catalog" : "Other"}</Badge>
                                      {alreadyListed ? <Badge>Already listed</Badge> : null}
                                    </div>
                                  </div>

                                  <div style={{ marginTop: 10, ...styles.minor }}>
                                    Primary pricing: <b>{rateLabel(d.rate_type)}</b> {pricePreview}
                                  </div>

                                  <div style={{ marginTop: 6, ...styles.minor }}>
                                    Stored price (min/max): <b>{minMaxPreview}</b> • GST:{" "}
                                    <b>{d.gst_applicable ? `Yes${typeof d.gst_pct === "number" ? ` (${d.gst_pct}%)` : ""}` : "No"}</b>
                                  </div>

                                  <div style={{ marginTop: 10 }}>
                                    <div style={{ fontWeight: 900, marginBottom: 6, fontSize: 13 }}>Quick details</div>
                                    <div style={{ color: "#5b6472", fontSize: 13, whiteSpace: "pre-wrap" }}>
                                      {buildRichDescription(d) || "—"}
                                    </div>
                                  </div>
                                </CardBody>

                                <CardFooter>
                                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, width: "100%" }}>
                                    <button
                                      onClick={() => {
                                        setActiveDraftKey(d.key);
                                        goToStep(2);
                                      }}
                                      style={styles.miniBtn()}
                                    >
                                      Edit details
                                    </button>

                                    <button
                                      onClick={() => removeDraft(d.key)}
                                      style={{
                                        ...styles.miniBtn(),
                                        border: "1px solid #ef4444",
                                      }}
                                    >
                                      Remove
                                    </button>
                                  </div>
                                </CardFooter>
                              </Card>
                            );
                          })}
                      </Grid>
                    )}
                  </div>

                  {/* Declaration */}
                  <div style={{ marginTop: 14, ...styles.box }}>
                    <div style={{ fontWeight: 900, marginBottom: 6 }}>Declaration</div>
                    <div style={{ color: "#5b6472", fontSize: 13 }}>
                      I hereby declare that all information provided above is true to the best of my knowledge.
                      I authorize 3Bigha.com to verify and publish these service listings on its portal.
                    </div>
                  </div>
                </CardBody>

                <CardFooter>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      width: "100%",
                      flexWrap: "wrap",
                      alignItems: "center",
                    }}
                  >
                    <div style={{ color: "#5b6472", fontSize: 13 }}>
                      Ready to save: <b>{draftsCountValid}</b> service draft(s) {includeTurnkey ? "• Turnkey enabled" : ""}
                    </div>

                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <button
                        onClick={() => saveMany("draft")}
                        disabled={saving}
                        style={{
                          border: "1px solid #111827",
                          background: "#fff",
                          padding: "10px 12px",
                          borderRadius: 12,
                          cursor: saving ? "not-allowed" : "pointer",
                          fontWeight: 900,
                          opacity: saving ? 0.6 : 1,
                        }}
                      >
                        {saving ? "Saving..." : "Save as Draft"}
                      </button>

                      <button
                        onClick={() => saveMany("published")}
                        disabled={saving}
                        style={{
                          border: "1px solid #111827",
                          background: "#111827",
                          color: "#fff",
                          padding: "10px 12px",
                          borderRadius: 12,
                          cursor: saving ? "not-allowed" : "pointer",
                          fontWeight: 900,
                          opacity: saving ? 0.6 : 1,
                        }}
                      >
                        {saving ? "Publishing..." : "Publish Now"}
                      </button>
                    </div>
                  </div>
                </CardFooter>
              </Card>
            </div>
          </div>
        ) : null}

        {/* Footer spacing */}
        <div style={{ height: 40 }} />
      </Container>

      {/* Hide global header/footer, keep consistent page background */}
      <style jsx global>{`
        header,
        footer {
          display: none !important;
        }
        body {
          background: #f8fafc;
        }
      `}</style>
    </main>
  );
}

