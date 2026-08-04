"use client";

import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
import UniversalMediaUploader from "@/app/components/media/UniversalMediaUploader";
import type { UploadedMediaAsset } from "@/lib/media/media-config";
import AddressEngine, { type AddressEngineValue } from "@/components/geography/AddressEngine";
import { addressEngineToBusinessPayload, legacyBusinessToAddressEngine } from "@/lib/geography/addressAdapters";
import AIWritingImprovement from "../../../components/onboarding/AIWritingImprovement";
import BusinessIdentityJourney, {
  type BusinessIdentityJourneyStep,
} from "@/components/onboarding/BusinessIdentityJourney";
import BusinessVerificationPanel from "@/components/onboarding/BusinessVerificationPanel";
import BusinessRegistrationStatusRail from "@/components/onboarding/BusinessRegistrationStatusRail";
import {
  resolveRegistrationReadiness,
  type BusinessProofStatus as CanonicalBusinessProofStatus,
} from "@/lib/registration/resolveRegistrationReadiness";
import {
  legalProofValidityIsComplete,
  legalProofValidityIsExpired,
  normalizeValidityType,
  type LegalProofValidityType,
} from "@/lib/registration/legalProofValidity";

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
  validityType: LegalProofValidityType;
  validUntil: string;
  noExpiry: boolean;
  periodStartYear: number | null;
  periodEndYear: number | null;
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
    validityType: normalizeValidityType({
      validityType: candidate.validityType as string,
      validUntil: candidate.validUntil as string,
      noExpiry: Boolean(candidate.noExpiry),
      periodStartYear:
        candidate.periodStartYear as number | string,
      periodEndYear:
        candidate.periodEndYear as number | string,
    }),
    validUntil: String(
      candidate.validUntil || ""
    ).trim(),
    noExpiry:
      normalizeValidityType({
        validityType: candidate.validityType as string,
        noExpiry: Boolean(candidate.noExpiry),
      }) === "no_expiry",
    periodStartYear:
      Number.isInteger(Number(candidate.periodStartYear))
        ? Number(candidate.periodStartYear)
        : null,
    periodEndYear:
      Number.isInteger(Number(candidate.periodEndYear))
        ? Number(candidate.periodEndYear)
        : null,
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
  return legalProofValidityIsExpired(meta);
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
    normalizeValidityType(meta) !== "exact_date" ||
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
      legalProofValidityIsComplete(meta) &&
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
  business_identities: string[] | null;
  individual_identities: string[] | null;
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

const LEGAL_CONSTITUTION_OPTIONS = [
  { key: "proprietorship", label: "Proprietorship" },
  { key: "partnership", label: "Partnership" },
  { key: "llp", label: "LLP" },
  { key: "private_limited", label: "Private Limited" },
  { key: "public_limited", label: "Public Limited" },
  { key: "opc", label: "OPC" },
  { key: "society", label: "Society" },
  { key: "trust", label: "Trust" },
  { key: "government", label: "Government" },
  { key: "cooperative", label: "Cooperative" },
  { key: "individual_professional", label: "Individual Professional" },
] as const;

type BusinessIdentityOption = {
  key: string;
  label: string;
  nature: Array<"property" | "materials" | "services" | "rentals" | "blog">;
};

type BusinessIdentityGroup = {
  title: string;
  options: BusinessIdentityOption[];
};

const BUSINESS_IDENTITY_GROUPS: BusinessIdentityGroup[] = [
  {
    title: "Construction & Infrastructure",
    options: [
      { key: "manufacturer", label: "Manufacturer", nature: ["materials"] },
      { key: "builder_developer", label: "Builder / Developer", nature: ["property", "services"] },
      { key: "civil_contractor", label: "Civil Contractor", nature: ["services"] },
      { key: "epc_contractor", label: "EPC Contractor", nature: ["services"] },
      { key: "interior_contractor", label: "Interior Contractor", nature: ["services"] },
      { key: "fabricator", label: "Fabricator", nature: ["materials", "services"] },
      { key: "infrastructure_company", label: "Infrastructure Company", nature: ["services"] },
    ],
  },
  {
    title: "Trading & Distribution",
    options: [
      { key: "manufacturer", label: "Manufacturer", nature: ["materials"] },
      { key: "wholesaler", label: "Wholesaler", nature: ["materials"] },
      { key: "distributor", label: "Distributor", nature: ["materials"] },
      { key: "dealer", label: "Dealer", nature: ["materials"] },
      { key: "retailer", label: "Retailer", nature: ["materials"] },
      { key: "supplier", label: "Supplier", nature: ["materials"] },
      { key: "importer", label: "Importer", nature: ["materials"] },
      { key: "exporter", label: "Exporter", nature: ["materials"] },
      { key: "stockist", label: "Stockist", nature: ["materials"] },
    ],
  },
  {
    title: "Professional Services",
    options: [
      { key: "architect", label: "Architect", nature: ["services"] },
      { key: "structural_engineer", label: "Structural Engineer", nature: ["services"] },
      { key: "civil_engineer", label: "Civil Engineer", nature: ["services"] },
      { key: "surveyor", label: "Surveyor (Amin)", nature: ["services"] },
      { key: "valuer", label: "Valuer", nature: ["services"] },
      { key: "consultant", label: "Consultant", nature: ["services"] },
      { key: "chartered_accountant", label: "Chartered Accountant", nature: ["services"] },
      { key: "advocate", label: "Advocate", nature: ["services"] },
      { key: "project_management_consultant", label: "Project Management Consultant", nature: ["services"] },
    ],
  },
  {
    title: "Equipment & Logistics",
    options: [
      { key: "equipment_owner", label: "Equipment Owner", nature: ["rentals"] },
      { key: "equipment_rental_company", label: "Equipment Rental Company", nature: ["rentals"] },
      { key: "transport_company", label: "Transport Company", nature: ["services", "rentals"] },
      { key: "fleet_owner", label: "Fleet Owner", nature: ["rentals"] },
      { key: "warehouse_operator", label: "Warehouse Operator", nature: ["services", "rentals"] },
    ],
  },
  {
    title: "Property",
    options: [
      { key: "property_owner", label: "Property Owner", nature: ["property"] },
      { key: "builder_developer", label: "Builder / Developer", nature: ["property", "services"] },
      { key: "real_estate_broker", label: "Real Estate Broker", nature: ["property"] },
      { key: "property_consultant", label: "Property Consultant", nature: ["property", "services"] },
    ],
  },
  {
    title: "Finance",
    options: [
      { key: "bank", label: "Bank", nature: ["services"] },
      { key: "nbfc", label: "NBFC", nature: ["services"] },
      { key: "housing_finance_company", label: "Housing Finance Company", nature: ["services"] },
      { key: "insurance_company", label: "Insurance Company", nature: ["services"] },
      { key: "financial_consultant", label: "Financial Consultant", nature: ["services"] },
    ],
  },
  {
    title: "Manufacturing & Industry",
    options: [
      { key: "factory", label: "Factory", nature: ["materials"] },
      { key: "processing_unit", label: "Processing Unit", nature: ["materials"] },
      { key: "workshop", label: "Workshop", nature: ["materials", "services"] },
      { key: "msme_unit", label: "MSME Unit", nature: ["materials", "services"] },
      { key: "industrial_enterprise", label: "Industrial Enterprise", nature: ["materials", "services"] },
    ],
  },
  {
    title: "Agriculture",
    options: [
      { key: "farmer", label: "Farmer", nature: ["materials"] },
      { key: "nursery", label: "Nursery", nature: ["materials"] },
      { key: "agri_supplier", label: "Agri Supplier", nature: ["materials"] },
      { key: "cold_storage", label: "Cold Storage", nature: ["services", "rentals"] },
      { key: "food_processing", label: "Food Processing", nature: ["materials"] },
    ],
  },
  {
    title: "Utilities",
    options: [
      { key: "water_supplier", label: "Water Supplier", nature: ["materials", "services"] },
      { key: "electricity_contractor", label: "Electricity Contractor", nature: ["services"] },
      { key: "solar_company", label: "Solar Company", nature: ["materials", "services"] },
      { key: "telecom_contractor", label: "Telecom Contractor", nature: ["services"] },
    ],
  },
  {
    title: "Media & Digital",
    options: [
      { key: "blogger", label: "Blogger", nature: ["blog"] },
      { key: "writer", label: "Writer", nature: ["blog"] },
      { key: "publisher", label: "Publisher", nature: ["blog"] },
      { key: "digital_agency", label: "Digital Agency", nature: ["services", "blog"] },
      { key: "software_company", label: "Software Company", nature: ["services"] },
    ],
  },
  {
    title: "Others",
    options: [
      { key: "ngo_trust", label: "NGO / Trust", nature: ["services"] },
      { key: "educational_institution", label: "Educational Institution", nature: ["services"] },
      { key: "government_organisation", label: "Government Organisation", nature: ["services"] },
      { key: "cooperative_society", label: "Cooperative Society", nature: ["services"] },
      { key: "startup", label: "Startup", nature: ["services"] },
      { key: "individual_professional", label: "Individual Professional", nature: ["services"] },
    ],
  },
];

const BUSINESS_SECTOR_CARDS = [
  { key: "construction_infrastructure", title: "Construction & Infrastructure", description: "Building, contracting, fabrication and infrastructure delivery.", symbol: "🏗️" },
  { key: "trading_distribution", title: "Trading & Distribution", description: "Manufacturing, supply, wholesale, retail and distribution.", symbol: "📦" },
  { key: "professional_services", title: "Professional Services", description: "Architecture, engineering, valuation, legal and advisory work.", symbol: "🧭" },
  { key: "equipment_logistics", title: "Equipment & Logistics", description: "Equipment, transport, fleets, rentals and storage.", symbol: "🚚" },
  { key: "property", title: "Property", description: "Ownership, development, brokerage and property consultancy.", symbol: "🏠" },
  { key: "finance", title: "Finance", description: "Banking, lending, insurance and financial guidance.", symbol: "₹" },
  { key: "manufacturing_industry", title: "Manufacturing & Industry", description: "Factories, workshops, processing and industrial enterprises.", symbol: "🏭" },
  { key: "agriculture", title: "Agriculture", description: "Farming, nursery, agricultural supply, storage and processing.", symbol: "🌾" },
  { key: "utilities", title: "Utilities", description: "Water, electricity, solar and telecom services.", symbol: "⚡" },
  { key: "media_digital", title: "Media & Digital", description: "Writing, publishing, digital agencies and software.", symbol: "💻" },
  { key: "others", title: "Others", description: "Institutions, cooperatives, startups and other organisations.", symbol: "🧩" },
] as const;

const BUSINESS_GROUP_BY_SECTOR = new Map([
  ["construction_infrastructure", "Construction & Infrastructure"],
  ["trading_distribution", "Trading & Distribution"],
  ["professional_services", "Professional Services"],
  ["equipment_logistics", "Equipment & Logistics"],
  ["property", "Property"],
  ["finance", "Finance"],
  ["manufacturing_industry", "Manufacturing & Industry"],
  ["agriculture", "Agriculture"],
  ["utilities", "Utilities"],
  ["media_digital", "Media & Digital"],
  ["others", "Others"],
]);

const INDIVIDUAL_IDENTITY_OPTIONS = [
  { key: "buyer", label: "Buyer" },
  { key: "vendor_hub", label: "Vendor Hub" },
  { key: "builder", label: "Builder" },
  { key: "contractor", label: "Contractor" },
  { key: "property_owner", label: "Property Owner" },
  { key: "equipment_owner", label: "Equipment Owner" },
  { key: "architect", label: "Architect" },
  { key: "civil_engineer", label: "Civil Engineer" },
  { key: "structural_engineer", label: "Structural Engineer" },
  { key: "surveyor", label: "Surveyor (Amin)" },
  { key: "valuer", label: "Valuer" },
  { key: "banker", label: "Banker" },
  { key: "financial_consultant", label: "Financial Consultant" },
  { key: "accountant", label: "Chartered Accountant / Accountant" },
  { key: "advocate", label: "Advocate" },
  { key: "consultant", label: "Consultant" },
  { key: "project_management_consultant", label: "Project Management Consultant" },
  { key: "driver", label: "Driver" },
  { key: "operator", label: "Operator" },
  { key: "skilled_professional", label: "Skilled Professional" },
  { key: "writer_author", label: "Writer / Author" },
  { key: "farmer", label: "Farmer" },
  { key: "transport_operator", label: "Transport Operator" },
  { key: "other_individual_professional", label: "Other Individual Professional" },
] as const;

const BUSINESS_IDENTITY_INDEX = new Map(
  BUSINESS_IDENTITY_GROUPS.flatMap((group) => group.options).map((option) => [option.key, option])
);

function deriveNatureFromBusinessIdentities(identities: string[]) {
  return Array.from(
    new Set(
      identities.flatMap(
        (identity) => BUSINESS_IDENTITY_INDEX.get(identity)?.nature || []
      )
    )
  );
}

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
    business_identities: [],
    individual_identities: [],
  });
  const [selectedBusinessSectors, setSelectedBusinessSectors] = useState<string[]>([]);
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

  type RegistrationPlan =
    | "free"
    | "basic_vendor"
    | "silver_vendor"
    | "gold_vendor"
    | "platinum_vendor";

  const [selectedRegistrationPlan, setSelectedRegistrationPlan] =
    useState<RegistrationPlan>("free");

  useEffect(() => {
    const storedPlan = String(
      (bp as Record<string, unknown>).subscription_plan || "free"
    );

    if (
      [
        "free",
        "basic_vendor",
        "silver_vendor",
        "gold_vendor",
        "platinum_vendor",
      ].includes(storedPlan)
    ) {
      setSelectedRegistrationPlan(
        storedPlan as RegistrationPlan
      );
    }
  }, [(bp as Record<string, unknown>).subscription_plan]);

  const nature = safeArr(bp.nature_of_business);
  const hasBlog = nature.includes("blog");
  const hasNonBlogBusiness = nature.some((item) =>
    ["property", "materials", "services", "rentals"].includes(item)
  );
  const isPureBlogOnly =
    hasBlog && !hasNonBlogBusiness;



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
            business_identities: [],
            individual_identities: [],
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
            business_identities: safeArr((data as any).business_identities),
            individual_identities: safeArr((data as any).individual_identities),
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

  function toggleBusinessSector(key: string) {
    setSelectedBusinessSectors((current) =>
      current.includes(key)
        ? current.filter((sector) => sector !== key)
        : [...current, key]
    );
  }

  function identitiesForSector(sectorKey: string) {
    const groupTitle = BUSINESS_GROUP_BY_SECTOR.get(sectorKey);
    return BUSINESS_IDENTITY_GROUPS.find(
      (group) => group.title === groupTitle
    )?.options || [];
  }

  function businessIdentityLabel(key: string) {
    return (
      BUSINESS_IDENTITY_GROUPS.flatMap((group) => group.options)
        .find((option) => option.key === key)?.label || key
    );
  }

  function individualIdentityLabel(key: string) {
    return (
      INDIVIDUAL_IDENTITY_OPTIONS.find(
        (option) => option.key === key
      )?.label || key
    );
  }

  function toggleBusinessIdentity(key: string) {
    setBp((current) => {
      const identities = safeArr(current.business_identities);
      const nextIdentities = identities.includes(key)
        ? identities.filter((identity) => identity !== key)
        : [...identities, key];

      return {
        ...current,
        business_identities: nextIdentities,
        nature_of_business: deriveNatureFromBusinessIdentities(nextIdentities),
      };
    });
  }

  function toggleIndividualIdentity(key: string) {
    setBp((current) => {
      const identities = safeArr(current.individual_identities);
      const next = identities.includes(key)
        ? identities.filter((identity) => identity !== key)
        : [...identities, key];

      return {
        ...current,
        individual_identities: next,
      };
    });
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
        validityType:
          meta?.validityType || "exact_date",
        validUntil:
          meta?.validUntil || "",
        noExpiry:
          meta?.noExpiry || false,
        periodStartYear:
          meta?.periodStartYear || null,
        periodEndYear:
          meta?.periodEndYear || null,
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

      const auditRecorded =
        json?.auditRecorded !== false;

      setMsg(
        auditRecorded
          ? "✅ Legal-document checks completed. Review the status shown for every registration."
          : "✅ Your document check completed and the result is available. The audit-history record will be reconciled automatically; you do not need to upload the document again."
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
    "verified_by_ai",
    "verification_complete",
    "checks_completed",
  ]);

  const pendingDocumentStatuses = new Set([
    "needs_manual_review",
    "manual_review_required",
    "pending",
    "processing",
    "under_review",
  ]);

  const verificationDocuments =
    Array.isArray(documentVerification?.documents)
      ? documentVerification.documents
      : [];

  /*
   * A pending/manual-review result is not a user correction.
   *
   * Comparison flags may be false when automation could not confidently
   * read a certificate. Only explicit failure statuses, expiry, or a
   * confirmed mismatch should create a correction state.
   */
  const verificationHasFailure =
    failedDocumentStatuses.has(documentVerificationStatus) ||
    verificationDocuments.some((document) => {
      const status = String(document.status || "")
        .trim()
        .toLowerCase();

      return (
        failedDocumentStatuses.has(status) ||
        document.documentExpired === true
      );
    });

  const documentVerificationConfidence = Number(
    documentVerification?.confidence || 0
  );

  type BusinessProofStatus =
    CanonicalBusinessProofStatus;

  const businessProofStatus: BusinessProofStatus =
    isPureBlogOnly
      ? "verified"
      : !legalProofReady
      ? "not_uploaded"
      : documentVerifyLoading
      ? "verifying"
      : verificationHasFailure
      ? "needs_correction"
      : verifiedDocumentStatuses.has(
          documentVerificationStatus
        ) &&
        Number.isFinite(
          documentVerificationConfidence
        ) &&
        documentVerificationConfidence >= 85
      ? "verified"
      : documentVerification &&
        (
          pendingDocumentStatuses.has(
            documentVerificationStatus
          ) ||
          documentVerificationStatus
        )
      ? "under_review"
      : "ready_to_verify";

  const canonicalReadiness =
    resolveRegistrationReadiness({
      identityReady,
      addressReady,
      aboutReady,
      coverageReady,
      legalProofReady,
      practicalProofReady,
      liveSelfieReady,
      businessProofStatus,
      declarationsAccepted: termsAccepted,
      dashboardActivated:
        registrationCompleteUI,
    });

  const documentVerificationReady =
    canonicalReadiness.businessProofReady;

  const businessProofReady =
    canonicalReadiness.businessProofReady;

  const businessProofStatusLabel: Record<
    BusinessProofStatus,
    string
  > = {
    not_uploaded:
      "Upload one valid business proof",
    ready_to_verify:
      "Business proof uploaded — verification required",
    verifying:
      "Verifying your business proof...",
    under_review:
      "Business proof received — verification is in progress",
    needs_correction:
      "Business proof needs correction",
    verified:
      "Business proof verified",
  };

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
      key: "business-proof",
      label: businessProofStatusLabel[businessProofStatus],
      targetId: "sec-documents",
      complete: businessProofReady,
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
  ];

  const registrationPendingChecks =
    registrationReadinessChecks.filter(
      (check) => !check.complete
    );

  /*
   * Final activation now follows the canonical readiness engine.
   * The local checklist remains only as a UI navigation projection.
   */
  const registrationReadyUI =
    canonicalReadiness.registrationReady;

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
    canonicalReadiness.completedRequiredSteps;

  const weightedCompletionScore =
    canonicalReadiness.progressPercent;

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
      title: "Business Proof",
      description:
        businessProofStatusLabel[businessProofStatus],
      targetId: "sec-documents",
      complete: businessProofReady,
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

  useEffect(() => {
    if (activeJourneyKey !== "review") {
      return;
    }

    /*
     * The final panel is conditionally mounted. Scroll only after
     * React has committed it to the document.
     */
    const frame = window.requestAnimationFrame(() => {
      const panel =
        document.getElementById("sec-review");

      panel?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });

    return () =>
      window.cancelAnimationFrame(frame);
  }, [activeJourneyKey]);

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
      targetId === "sec-legal-proof"
    ) {
      return "documents";
    }

    if (targetId === "sec-selfie") {
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
    { key: "nature", title: "Step 1 — Business Identity", subtitle: "Legal constitution, business role and personal identity", show: !streamlinedRegistration, targetId: "sec-nature" },
    { key: "identity", title: streamlinedRegistration ? "Business details" : "Step 2 — Legal Details", subtitle: "Business name and verification numbers", show: true, targetId: "sec-identity" },
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
      business_identities: safeArr(bp.business_identities),
      individual_identities: safeArr(bp.individual_identities),
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

  async function continueFromFinalReview() {
    if (!userId) {
      setMsg("Please sign in again to finish registration.");
      return;
    }

    if (!termsAccepted) {
      setMsg(
        "Please confirm the truthful declaration and agree to the Terms & Conditions and Privacy Policy."
      );
      scrollToId("sec-review");
      return;
    }

    setSaving(true);
    setMsg(null);

    const subscriptionPatch =
      selectedRegistrationPlan === "free"
        ? {
            subscription_plan: "free",
            subscription_status: "free",
          }
        : {
            subscription_plan: selectedRegistrationPlan,
          };

    const { error } = await supabase
      .from("business_profiles")
      .update(subscriptionPatch)
      .eq("user_id", userId);

    setSaving(false);

    if (error) {
      setMsg(
        error.message ||
          "Your subscription choice could not be saved."
      );
      return;
    }

    setBp((previous) => ({
      ...previous,
      ...subscriptionPatch,
    }));

    if (selectedRegistrationPlan === "free") {
      await onFinishRegistration();
      return;
    }

    const subscriptionUrl =
      "/dashboard/subscription?" +
      new URLSearchParams({
        source: "registration",
        return: onboardingPath,
      }).toString();

    router.push(subscriptionUrl);
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
       * The authenticated server is the only activation authority.
       *
       * The browser submits no approval, verification, role,
       * subscription or dashboard-access decision. It consumes
       * only the final canonical activation result.
       */
      const acceptedCompletionCodes = new Set([
        "REGISTRATION_COMPLETION_AND_DASHBOARD_ACTIVATED",
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

      const dashboardActivated =
        payload?.dashboardActivation?.activated === true &&
        payload?.completion?.registrationComplete === true;

      if (
        verificationStatus !== "auto_verified" ||
        !dashboardActivated
      ) {
        throw new Error(
          "The registration server did not confirm atomic dashboard activation."
        );
      }

      await fetchCompleteness(userId);

      setMsg(
        "✅ Registration complete. Your dashboard is active. Opening your workspace..."
      );

      router.replace(returnTo);
      router.refresh();
      return;
    } catch (error) {
      console.error(
        "REGISTRATION_COMPLETION_REQUEST_FAILED",
        error
      );

      setMsg(
        error instanceof Error &&
          error.message.trim()
          ? error.message
          : "Registration could not be completed safely. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="registration-page-shell">
        Loading business profile...
      </div>
    );
  }

  return (
    <div className="registration-page-shell">
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

            /*
             * Review & Finish must always remain accessible.
             *
             * The truthful declaration is itself one of the
             * canonical readiness requirements. Redirecting away
             * while declarationsAccepted is false creates a
             * deadlock because the user cannot reach the checkbox
             * required to make registration ready.
             *
             * Incomplete evidence is explained inside the review
             * panel and activation remains disabled until every
             * canonical requirement is complete.
             */
            const pending =
              firstRegistrationPendingCheck;

            setMsg(
              pending
                ? `Review your registration below. Before activation, complete: ${pending.label}.`
                : registrationReadyUI
                ? "All required steps are ready. Review the summary below and finish registration."
                : "Review your registration below and accept the final truthful declaration to activate your dashboard."
            );

            window.setTimeout(() => {
              scrollToId("sec-review");
            }, 60);
          }}
        />
      </div>

      <div className="registration-workspace-grid">
        <div className="registration-main-column">

      <form
        onSubmit={onSave}
        className={
          activeJourneyKey === "review"
            ? "registration-form registration-form--review"
            : "registration-form"
        }
        style={{
          marginTop: 20,
          display: "grid",
          gap: 16,
        }}
      >
        {!streamlinedRegistration ? (
          <section
            id="sec-nature"
            style={{
              padding: 20,
              border: missingNature ? "2px solid crimson" : "1px solid #cbd5e1",
              borderRadius: 18,
              background: "#ffffff",
              scrollMarginTop: 190,
            }}
          >
            <div style={{ color: "#1d4ed8", fontWeight: 900, fontSize: 12, letterSpacing: ".06em", textTransform: "uppercase" }}>
              Human-first business identity
            </div>
            <h3 style={{ margin: "6px 0 4px", fontSize: 24 }}>
              Tell us about your business
            </h3>
            <p style={{ margin: "0 0 20px", color: "#475569", lineHeight: 1.6, maxWidth: 820 }}>
              Complete one clear step at a time. Your existing marketplace, RFQ and workspace access will be derived automatically from the choices you make here.
            </p>

            <div style={{ display: "grid", gap: 22 }}>
              <div>
                <h4 style={{ margin: "0 0 5px", fontSize: 18 }}>1. Legal Constitution</h4>
                <p style={{ margin: "0 0 12px", color: "#64748b", fontSize: 14 }}>
                  How is your organisation legally constituted? Select one.
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 9 }}>
                  {LEGAL_CONSTITUTION_OPTIONS.map((option) => {
                    const selected = bp.business_type === option.key;
                    return (
                      <label key={option.key} style={{
                        display: "flex",
                        gap: 9,
                        alignItems: "center",
                        minHeight: 48,
                        padding: "10px 12px",
                        border: selected ? "2px solid #2563eb" : "1px solid #dbe3ee",
                        borderRadius: 12,
                        background: selected ? "#eff6ff" : "#ffffff",
                        cursor: "pointer",
                      }}>
                        <input
                          type="radio"
                          name="business-constitution"
                          checked={selected}
                          onChange={() => setField("business_type", option.key)}
                        />
                        <span style={{ fontWeight: 750 }}>{option.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <h4 style={{ margin: "0 0 5px", fontSize: 18 }}>2. Business Sectors</h4>
                <p style={{ margin: "0 0 12px", color: "#64748b", fontSize: 14 }}>
                  Choose only the sectors in which your organisation actually works. You may select more than one.
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(225px, 1fr))", gap: 10 }}>
                  {BUSINESS_SECTOR_CARDS.map((sector) => {
                    const selected = selectedBusinessSectors.includes(sector.key);
                    return (
                      <button
                        key={sector.key}
                        type="button"
                        onClick={() => toggleBusinessSector(sector.key)}
                        aria-pressed={selected}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "38px 1fr auto",
                          gap: 10,
                          alignItems: "center",
                          minHeight: 76,
                          padding: 12,
                          textAlign: "left",
                          border: selected ? "2px solid #16a34a" : "1px solid #dbe3ee",
                          borderRadius: 14,
                          background: selected ? "#f0fdf4" : "#ffffff",
                          cursor: "pointer",
                        }}
                      >
                        <span style={{ fontSize: 24 }}>{sector.symbol}</span>
                        <span>
                          <strong style={{ display: "block", color: "#0f172a", marginBottom: 3 }}>{sector.title}</strong>
                          <span style={{ display: "block", color: "#64748b", fontSize: 12, lineHeight: 1.35 }}>
                            {sector.description}
                          </span>
                        </span>
                        <span aria-hidden="true" style={{
                          display: "grid",
                          placeItems: "center",
                          width: 22,
                          height: 22,
                          borderRadius: 999,
                          background: selected ? "#16a34a" : "#f1f5f9",
                          color: selected ? "#ffffff" : "#64748b",
                          fontWeight: 900,
                        }}>
                          {selected ? "✓" : "+"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <h4 style={{ margin: "0 0 5px", fontSize: 18 }}>3. What does your organisation do?</h4>
                {selectedBusinessSectors.length === 0 ? (
                  <div style={{
                    padding: 16,
                    borderRadius: 12,
                    border: "1px dashed #94a3b8",
                    background: "#f8fafc",
                    color: "#475569",
                  }}>
                    Select one or more business sectors above. Only the relevant business identities will then appear here.
                  </div>
                ) : (
                  <div style={{ display: "grid", gap: 12, marginTop: 10 }}>
                    {selectedBusinessSectors.map((sectorKey) => {
                      const sector = BUSINESS_SECTOR_CARDS.find((item) => item.key === sectorKey);
                      const options = identitiesForSector(sectorKey);
                      return (
                        <div key={sectorKey} style={{ padding: 14, border: "1px solid #e2e8f0", borderRadius: 14, background: "#f8fafc" }}>
                          <h5 style={{ margin: "0 0 10px", fontSize: 15 }}>
                            {sector?.symbol} {sector?.title}
                          </h5>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(205px, 1fr))", gap: 8 }}>
                            {options.map((option) => {
                              const checked = safeArr(bp.business_identities).includes(option.key);
                              return (
                                <label key={`${sectorKey}-${option.key}`} style={{
                                  display: "flex",
                                  gap: 8,
                                  alignItems: "center",
                                  minHeight: 42,
                                  padding: "8px 10px",
                                  borderRadius: 10,
                                  background: checked ? "#ede9fe" : "#ffffff",
                                  border: checked ? "1px solid #8b5cf6" : "1px solid #e2e8f0",
                                  cursor: "pointer",
                                }}>
                                  <input type="checkbox" checked={checked} onChange={() => toggleBusinessIdentity(option.key)} />
                                  <span style={{ fontWeight: 700 }}>{option.label}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                {missingNature ? (
                  <div style={{ color: "crimson", fontWeight: 800, marginTop: 10 }}>
                    Required: select at least one business identity.
                  </div>
                ) : null}
              </div>

              <div>
                <h4 style={{ margin: "0 0 5px", fontSize: 18 }}>4. Your Individual Identity</h4>
                <p style={{ margin: "0 0 12px", color: "#64748b", fontSize: 14 }}>
                  What role do you personally perform? Select only the identities that describe you.
                </p>
                <details open={bp.business_type === "individual_professional" || safeArr(bp.individual_identities).length > 0}
                  style={{ border: "1px solid #fed7aa", borderRadius: 14, background: "#fffaf5", overflow: "hidden" }}>
                  <summary style={{ cursor: "pointer", padding: 14, fontWeight: 800, color: "#9a3412" }}>
                    Choose your personal role
                    {safeArr(bp.individual_identities).length ? ` · ${safeArr(bp.individual_identities).length} selected` : ""}
                  </summary>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(205px, 1fr))", gap: 8, padding: "0 14px 14px" }}>
                    {INDIVIDUAL_IDENTITY_OPTIONS.map((option) => {
                      const checked = safeArr(bp.individual_identities).includes(option.key);
                      return (
                        <label key={option.key} style={{
                          display: "flex",
                          gap: 8,
                          alignItems: "center",
                          minHeight: 42,
                          padding: "8px 10px",
                          borderRadius: 10,
                          background: checked ? "#ecfdf5" : "#ffffff",
                          border: checked ? "1px solid #34d399" : "1px solid #e2e8f0",
                          cursor: "pointer",
                        }}>
                          <input type="checkbox" checked={checked} onChange={() => toggleIndividualIdentity(option.key)} />
                          <span style={{ fontWeight: 700 }}>{option.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </details>
              </div>

              <div style={{ display: "grid", gap: 10, padding: 14, borderRadius: 14, background: "#eff6ff", border: "1px solid #bfdbfe" }}>
                <strong style={{ color: "#1e3a8a" }}>Your Business Identity Summary</strong>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 8, fontSize: 13, color: "#334155" }}>
                  <div><b>Legal constitution:</b>{" "}
                    {LEGAL_CONSTITUTION_OPTIONS.find((option) => option.key === bp.business_type)?.label || "Not selected"}
                  </div>
                  <div><b>Business sectors:</b>{" "}
                    {selectedBusinessSectors.length
                      ? selectedBusinessSectors.map((key) => BUSINESS_SECTOR_CARDS.find((sector) => sector.key === key)?.title).filter(Boolean).join(", ")
                      : "Not selected"}
                  </div>
                  <div><b>Business identities:</b>{" "}
                    {safeArr(bp.business_identities).length
                      ? safeArr(bp.business_identities).map(businessIdentityLabel).join(", ")
                      : "Not selected"}
                  </div>
                  <div><b>Your role:</b>{" "}
                    {safeArr(bp.individual_identities).length
                      ? safeArr(bp.individual_identities).map(individualIdentityLabel).join(", ")
                      : "Not selected"}
                  </div>
                </div>
                <span style={{ color: "#1e40af", fontSize: 12, lineHeight: 1.5 }}>
                  Property, Materials, Services, Rentals and Blog workspaces are derived automatically. You will not be asked to select the same meaning twice.
                </span>
              </div>
            </div>
          </section>
        ) : null}

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

        <section
          id="sec-identity"
          style={{
            padding: 18,
            border: "1px solid #bfdbfe",
            borderRadius: 18,
            background: "#f8fbff",
            scrollMarginTop: 190,
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
            Your identity and business proof
          </div>

          <h3
            style={{
              margin: "7px 0 5px",
              fontSize: 22,
            }}
          >
            Confirm your business identity
          </h3>

          <p
            style={{
              margin: "0 0 16px",
              color: "#475569",
              lineHeight: 1.65,
            }}
          >
            Enter your business name once. Legal registration numbers,
            certificates and verification are managed in the Business Proof
            section below.
          </p>

          <Field
            label="Business Name (or use Author Display Name if only blog)"
            required
            missing={missingBusinessOrAuthor}
          >
            <input
              value={bp.business_name ?? ""}
              onChange={(event) =>
                setField("business_name", event.target.value)
              }
              style={{
                width: "100%",
                padding: 10,
                border: "none",
                outline: "none",
              }}
            />
          </Field>
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

        <section
          id="sec-address"
          style={{
            padding: 12,
            border: "1px solid #ddd",
            borderRadius: 8,
          }}
        >
          <div style={{ marginBottom: 12 }}>
            <div
              style={{
                color: "#1d4ed8",
                fontSize: 12,
                fontWeight: 900,
                letterSpacing: ".05em",
                textTransform: "uppercase",
              }}
            >
              Official business location
            </div>

            <h3 style={{ margin: "4px 0 3px" }}>
              Verify and complete your business address
            </h3>

            <p
              style={{
                margin: 0,
                color: "#64748b",
                fontSize: 13,
                lineHeight: 1.5,
              }}
            >
              Device GPS confirms that the location is genuine. The official
              LGD address below is the single address saved with your business.
            </p>
          </div>

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
                ? "Verify your device location before activation."
                : `GPS verified${
                    bp.verified_district
                      ? ` • ${bp.verified_district}`
                      : ""
                  }${
                    bp.verified_state
                      ? `, ${bp.verified_state}`
                      : ""
                  }${
                    bp.eligible_free
                      ? " • Free district eligible"
                      : ""
                  }`}
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
                : "✅ GPS Verified — Re-check"}
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

        {activeJourneyKey === "review" ? (
          <section
            id="sec-review"
            className="registration-final-review"
          >
            <div className="registration-final-success">
              <div>
                <div className="registration-final-eyebrow">
                  Final step
                </div>

                <h2>Your business registration is ready</h2>

                <p>
                  Review the completed checks, choose your
                  subscription and accept the declarations.
                  Normal registrations activate without
                  administrator approval.
                </p>
              </div>

              <div className="registration-final-score">
                <strong>
                  {canonicalReadiness.progressPercent}%
                </strong>
                <span>Registration readiness</span>
              </div>
            </div>

            <div className="registration-final-checks">
              {[
                ["Identity and contact", identityReady],
                ["Official and live address", addressReady],
                ["Personal and business story", aboutReady],
                ["Service coverage", coverageReady],
                ["Workplace evidence", practicalProofReady],
                ["Live business-board selfie", liveSelfieReady],
                ["AI business-proof verification", businessProofReady],
              ].map(([label, complete]) => (
                <div
                  key={String(label)}
                  className={
                    complete
                      ? "registration-final-check complete"
                      : "registration-final-check incomplete"
                  }
                >
                  <span>{complete ? "✓" : "!"}</span>
                  <b>{String(label)}</b>
                </div>
              ))}
            </div>

            <div className="registration-final-verification">
              <div>
                <span>AI verification</span>
                <strong>
                  {businessProofReady
                    ? "Business proof verified"
                    : "Verification required"}
                </strong>
              </div>

              <div>
                <span>AI confidence</span>
                <strong>
                  {Math.round(
                    Number(
                      documentVerification?.confidence || 0
                    )
                  )}
                  %
                </strong>
              </div>

              <div>
                <span>Evidence collected</span>
                <strong>
                  {canonicalReadiness.evidenceCollectionProgress}%
                </strong>
              </div>
            </div>

            <div className="registration-final-section">
              <div className="registration-final-heading">
                <div>
                  <div className="registration-final-eyebrow">
                    Subscription
                  </div>

                  <h3>Choose how you want to begin</h3>

                  <p>
                    The Free plan activates immediately. Paid
                    plans continue through SBI secure payment.
                  </p>
                </div>
              </div>

              <div className="registration-plan-grid">
                {[
                  {
                    key: "free",
                    title: "Free",
                    price: "₹0 / month",
                    description:
                      "Essential workspace and standard marketplace presence.",
                  },
                  {
                    key: "basic_vendor",
                    title: "Basic",
                    price: "₹299 / month",
                    description:
                      "Entry-level AI boost and improved marketplace visibility.",
                  },
                  {
                    key: "silver_vendor",
                    title: "Silver",
                    price: "₹499 / month",
                    description:
                      "Priority RFQ visibility and stronger workflow alerts.",
                  },
                  {
                    key: "gold_vendor",
                    title: "Gold",
                    price: "₹999 / month",
                    description:
                      "Strong AI boost, premium ranking and priority opportunities.",
                    recommended: true,
                  },
                  {
                    key: "platinum_vendor",
                    title: "Platinum",
                    price: "₹1,999 / month",
                    description:
                      "Maximum visibility, AI boost and marketplace priority.",
                  },
                ].map((plan) => {
                  const selected =
                    selectedRegistrationPlan === plan.key;

                  return (
                    <button
                      key={plan.key}
                      type="button"
                      className={
                        selected
                          ? "registration-plan-card selected"
                          : "registration-plan-card"
                      }
                      onClick={() =>
                        setSelectedRegistrationPlan(
                          plan.key as RegistrationPlan
                        )
                      }
                      aria-pressed={selected}
                    >
                      <div className="registration-plan-title-row">
                        <strong>{plan.title}</strong>

                        {plan.recommended ? (
                          <span>Recommended</span>
                        ) : null}
                      </div>

                      <b>{plan.price}</b>
                      <p>{plan.description}</p>

                      <div className="registration-plan-choice">
                        {selected ? "✓ Selected" : "Select plan"}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="registration-final-section">
              <div className="registration-final-eyebrow">
                Truthful declaration
              </div>

              <h3>Confirm before activation</h3>

              <label className="registration-declaration">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(event) =>
                    setTermsAccepted(event.target.checked)
                  }
                />

                <span>
                  I confirm that the information and evidence
                  submitted are truthful. I have read and agree
                  to the{" "}
                  <a
                    href="/terms-and-conditions"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Terms & Conditions
                  </a>{" "}
                  and{" "}
                  <a
                    href="/privacy-policy"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Privacy Policy
                  </a>
                  .
                </span>
              </label>

              <div className="registration-autonomy-note">
                <b>Autonomous registration:</b> Your verified
                registration will be activated without routine
                administrator approval. Only a genuine
                verification exception requires human review.
              </div>
            </div>

            <button
              type="button"
              className="registration-final-action"
              disabled={
                saving ||
                !registrationReadyUI ||
                !termsAccepted
              }
              onClick={continueFromFinalReview}
            >
              {saving
                ? "Please wait..."
                : selectedRegistrationPlan === "free"
                ? "Activate My Dashboard"
                : "Continue to SBI Secure Payment"}
            </button>

            {!registrationReadyUI ? (
              <div className="registration-final-blocker">
                {firstRegistrationPendingCheck ? (
                  <>
                    Before activation, complete:{" "}
                    <b>
                      {firstRegistrationPendingCheck.label}
                    </b>
                    .
                  </>
                ) : !termsAccepted ? (
                  <>
                    Accept the truthful declaration, Terms &
                    Conditions and Privacy Policy to activate your
                    dashboard.
                  </>
                ) : (
                  <>
                    Complete the remaining required registration
                    item before activation.
                  </>
                )}
              </div>
            ) : null}
          </section>
        ) : null}

        {msg ? (
          <div
            className="registration-inline-message"
            style={{
              color: msg.includes("✅")
                ? "green"
                : activeJourneyKey === "review"
                ? "#1d4ed8"
                : "crimson",
              fontWeight: 800,
            }}
          >
            {msg}
          </div>
        ) : null}

        {activeJourneyKey !== "review" ? (
        <div className="registration-secondary-actions">
          <button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save Draft"}
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={onSaveAndContinue}
          >
            Save and Review
          </button>

          <button
            type="button"
            onClick={() => router.replace(returnTo)}
          >
            Leave Setup
          </button>
        </div>
        ) : null}
      </form>
        </div>

        <aside>
          <BusinessRegistrationStatusRail
            readiness={canonicalReadiness}
            registrationComplete={registrationCompleteUI}
            verificationLoading={documentVerifyLoading}
            verificationConfidence={Number(
              documentVerification?.confidence || 0
            )}
            updatedAt={vc?.updated_at}
            termsAccepted={termsAccepted}
            saving={saving}
            onGoNext={() => {
              const targetId =
                firstRegistrationPendingCheck?.targetId ||
                firstPendingStep.targetId ||
                "sec-review";

              openJourneyStep(
                journeyKeyForTarget(targetId),
                targetId
              );
            }}
            onFinish={onFinishRegistration}
            onOpenDashboard={() =>
              router.replace(returnTo)
            }
          />
        </aside>
      </div>

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
