"use client";

import type { GeoSelection } from "@/components/geography/GeoSelector";
import AddressEngine from "@/components/geography/AddressEngine";

import {
  validateTrustedPublication,
} from "@/lib/media/trusted-publication-gate";

import type React from "react";

import { Suspense, useEffect, useMemo, useState } from "react";

import { useRouter, useSearchParams } from "next/navigation";
import nextDynamic from "next/dynamic";

import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

import {
  loadVendorListingMemory,
  saveVendorListingMemory,
  type VendorListingMemoryRow,
} from "@/lib/vendors/vendorListingMemory";

import {
  buildVendorSmartSuggestions,
} from "@/lib/vendors/vendorSmartSuggestions";
const UniversalMediaUploader = nextDynamic(
  () => import("@/app/components/media/UniversalMediaUploader"),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          border: "1px dashed #cbd5e1",
          borderRadius: 14,
          padding: 16,
          background: "#f8fafc",
          color: "#475569",
          fontWeight: 700,
        }}
      >
        Loading media uploader...
      </div>
    ),
  }
);
import type { UploadedMediaAsset } from "@/lib/media/media-config";


import { Container } from "@/components/layout/Container";

import { SectionHeader } from "@/components/layout/SectionHeader";

import { Card, CardBody, CardFooter } from "@/components/ui/Card";

import { ActionButton } from "@/components/ui/ActionButton";

import { EmptyState } from "@/components/ui/EmptyState";

import { Badge } from "@/components/ui/Badge";


type Intent = "sell" | "rent" | "lease" | "pg";

type PropertyType = "Land / Plot" | "House(s)";

type LandSubtype = "Residential" | "Commercial" | "Agricultural" | "Industrial" | "Others";

type DraftRow = Record<string, any>;
type ListingMode = "individual" | "builder_project";

type BuilderProjectRow = {
  id: string;
  name: string;
  slug: string;
  status: string | null;
};

type BuilderUnitRow = {
  id: string;
  project_id: string;
  unit_code: string | null;
  title: string | null;
  status: string | null;
};

type InventoryRow = {
  id: string;
  project_id: string;
  listing_id: string | null;
  unit_code: string | null;
  title: string | null;
  price: number | null;
  availability_status: string | null;
};

type HouseSubtype =

  | "Independent / Builder Floor"

  | "Independent House / Villa"

  | "Flat / Apartment"

  | "Farm House"

  | "Bunglow"

  | "Office Space"

  | "Shop"

  | "Others";



type PropertySubtype = LandSubtype | HouseSubtype;



const LAND_SUBTYPES: LandSubtype[] = ["Residential", "Commercial", "Agricultural", "Industrial", "Others"];

const HOUSE_SUBTYPES: HouseSubtype[] = [

  "Independent / Builder Floor",

  "Independent House / Villa",

  "Flat / Apartment",

  "Farm House",

  "Bunglow",

  "Office Space",

  "Shop",

  "Others",

];



function subtypeList(type: PropertyType | ""): PropertySubtype[] {

  if (type === "Land / Plot") return LAND_SUBTYPES;

  if (type === "House(s)") return HOUSE_SUBTYPES;

  return [];

}



type AreaUnit = "Sq. ft." | "Sq. mtr.";

type OpenSides = "1" | "2" | "3" | "3+";

type Possession = "Immediate" | "Within 3 months" | "Within 6 months" | "By 2026" | "By 2027" | "By 2028";

type Ownership = "Freehold" | "Lease hold" | "Co-op. Society" | "Power of Attorney";

// ✅ DB-driven dynamic attributes (Property master data)
type AttrInputType = "single_select" | "multi_select" | "text" | "number" | "boolean" | string;

type AttrRow = {
  id: string;
  name: string;
  slug: string;
  input_type: AttrInputType;
  unit: string | null;
  sort_order: number | null;
  // ✅ add this
  is_active: boolean | null;
};

// ✅ DB attribute row (includes mapping requirement flag)
type DbAttrRow = AttrRow & {
  is_required: boolean | null;
};

type AttrValueRow = {
  id: string;
  attribute_id: string;
  value: string;
  slug: string | null;
  sort_order: number | null;
  is_active: boolean | null;
};

type ListingAttrRow = {
  attribute_id: string;
  value_text: string | null;
  value_number: number | null;
  value_bool: boolean | null;
  value_ids: string[] | null;
};

type ListingAttrUpsert = {
  listing_id: string;
  attribute_id: string;
  value_text: string | null;
  value_number: number | null;
  value_bool: boolean | null;
  value_ids: string[] | null;
};

type AmenityCategory =
  | "open_space"
  | "security"
  | "utilities"
  | "parking"
  | "convenience"
  | "lifestyle"
  | "society"
  | "compliance"
  | string;

type AmenityRow = {
  id: string;
  category: AmenityCategory;
  name: string;
  sort_order: number | null;
  is_active: boolean | null;
};

function FieldLabel({ title, required, hint }: { title: string; required?: boolean; hint?: string }) {

  return (

    <div style={{ marginTop: 12 }}>

      <div style={{ fontWeight: 700 }}>

        {title} {required ? <span style={{ color: "#ef4444" }}>*</span> : null}

      </div>

      {hint ? <div style={{ color: "#5b6472", fontSize: 12, marginTop: 4 }}>{hint}</div> : null}

    </div>

  );

}



function TextInput(props: {

  value: string;

  onChange: (v: string) => void;

  placeholder?: string;

  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];

}) {

  return (

    <input

      value={props.value}

      onChange={(e) => props.onChange(e.target.value)}

      placeholder={props.placeholder}

      inputMode={props.inputMode}

      style={{

        width: "100%",

        height: 44,

        borderRadius: 12,

        border: "1px solid #e5e7eb",

        padding: "0 14px",

        outline: "none",

        background: "white",

        fontSize: 14,

        marginTop: 8,

      }}

    />

  );

}



function TextArea(props: { value: string; onChange: (v: string) => void; placeholder?: string }) {

  return (

    <textarea

      value={props.value}

      onChange={(e) => props.onChange(e.target.value)}

      placeholder={props.placeholder}

      style={{

        width: "100%",

        minHeight: 110,

        borderRadius: 12,

        border: "1px solid #e5e7eb",

        padding: "10px 14px",

        outline: "none",

        background: "white",

        fontSize: 14,

        marginTop: 8,

        resize: "vertical",

      }}

    />

  );

}



function Select(props: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {

  return (

    <select

      value={props.value}

      onChange={(e) => props.onChange(e.target.value)}

      style={{
        width: "100%",
        height: 44,
        borderRadius: 12,
        border: "1px solid #e5e7eb",
        padding: "0 14px",
        outline: "none",
        background: "white",
        fontSize: 14,
        marginTop: 8,
      }}
    >
      {props.options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>

  );
}

function ToggleRow(props: { label: string; value: boolean | null; onChange: (v: boolean) => void }) {
  const { label, value, onChange } = props;
  return (

    <div style={{ marginTop: 12 }}>
      <div style={{ fontWeight: 700, marginBottom: 8 }}>{label}</div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>

        <button
          type="button"
          onClick={() => onChange(true)}
          style={{
            height: 40,
            padding: "0 12px",
            borderRadius: 12,
            border: "1px solid #e5e7eb",
            background: value === true ? "#111827" : "white",
            color: value === true ? "white" : "#111827",
            cursor: "pointer",
            fontWeight: 700,
          }}
        >
          Yes
        </button>
        <button
          type="button"
          onClick={() => onChange(false)}
          style={{
            height: 40,
            padding: "0 12px",
            borderRadius: 12,
            border: "1px solid #e5e7eb",
            background: value === false ? "#111827" : "white",
            color: value === false ? "white" : "#111827",
            cursor: "pointer",
            fontWeight: 700,
          }}
        >
          No

        </button>
      </div>
    </div>
  );
}

function formatINR(n: number) {
  if (!Number.isFinite(n)) return "—";
  try {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
  } catch {
    return `₹${Math.round(n)}`;
  }
}

function unitLabel(u: AreaUnit) {
  return u === "Sq. mtr." ? "sq. mtr." : "sq. ft.";
}



function toNumberOrNull(x: string) {

  const n = Number(String(x ?? "").trim());

  return Number.isFinite(n) ? n : null;

}



function clamp(num: number, min: number, max: number) {

  return Math.min(max, Math.max(min, num));

}



function computeEMI(P: number, annualRatePct: number, months: number) {

  if (!(P > 0) || !(months > 0)) return null;

  const r = annualRatePct / 100 / 12;

  if (r === 0) return P / months;

  const pow = Math.pow(1 + r, months);

  const emi = (P * r * pow) / (pow - 1);

  return Number.isFinite(emi) ? emi : null;

}



function slugify(input: string) {

  return input

    .toLowerCase()

    .trim()

    .replace(/['"]/g, "")

    .replace(/[^a-z0-9]+/g, "-")

    .replace(/(^-|-$)+/g, "");

}



// Indian number words (simple, good enough for UI)

function numberToWordsIndian(n: number) {

  if (!Number.isFinite(n) || n < 0) return "";

  if (n === 0) return "Zero";



  const ones = [

    "",

    "One",

    "Two",

    "Three",

    "Four",

    "Five",

    "Six",

    "Seven",

    "Eight",

    "Nine",

    "Ten",

    "Eleven",

    "Twelve",

    "Thirteen",

    "Fourteen",

    "Fifteen",

    "Sixteen",

    "Seventeen",

    "Eighteen",

    "Nineteen",

  ];

  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];



  const twoDigits = (x: number) => {

    if (x < 20) return ones[x];

    const t = Math.floor(x / 10);

    const o = x % 10;

    return `${tens[t]}${o ? " " + ones[o] : ""}`.trim();

  };



  const threeDigits = (x: number) => {

    const h = Math.floor(x / 100);

    const r = x % 100;

    const hPart = h ? `${ones[h]} Hundred` : "";

    const rPart = r ? twoDigits(r) : "";

    return `${hPart}${hPart && rPart ? " " : ""}${rPart}`.trim();

  };



  const num = Math.floor(n);

  const crore = Math.floor(num / 10000000);

  const lakh = Math.floor((num / 100000) % 100);

  const thousand = Math.floor((num / 1000) % 100);

  const hundred = num % 1000;



  const parts: string[] = [];

  if (crore) parts.push(`${twoDigits(crore)} Crore`.trim());

  if (lakh) parts.push(`${twoDigits(lakh)} Lakh`.trim());

  if (thousand) parts.push(`${twoDigits(thousand)} Thousand`.trim());

  if (hundred) parts.push(threeDigits(hundred));

  return parts.filter(Boolean).join(" ").trim();

}



function inrWordsFromInput(x: string) {

  const n = toNumberOrNull(x);

  if (!n || n <= 0) return "";

  return numberToWordsIndian(n);

}



function safeUrlsFromList(list: string[]): string[] {

  return list

    .map((x) => x.trim())

    .filter(Boolean)

    .filter((u) => /^https?:\/\/.+/i.test(u));

}



function looksLikeMissingColumnError(message: string) {

  const msg = (message || "").toLowerCase();

  return (

    msg.includes("schema cache") ||

    msg.includes("could not find the") ||

    msg.includes("does not exist") ||

    msg.includes("unknown field")

  );

}

function extractMissingColumnName(message: string): string | null {
  const msg = message || "";

  // Case 1: could not find the 'xxx' column
  const m1 = msg.match(/could not find the '([^']+)' column/i);
  if (m1?.[1]) return m1[1];

  // Case 2: column "xxx" does not exist
  const m2 = msg.match(/column\s+"([^"]+)"\s+.*does not exist/i);
  if (m2?.[1]) return m2[1];

  // ✅ Case 3: column table.column does not exist (NO quotes)
  // Example: column property_listings.location_json does not exist
  const m3 = msg.match(/column\s+([a-z0-9_]+\.[a-z0-9_]+)\s+does not exist/i);
  if (m3?.[1]) {
    const full = m3[1];
    return full.split(".").pop() || full;
  }

  // ✅ Case 4: column column_name does not exist (NO quotes, no table)
  const m4 = msg.match(/column\s+([a-z0-9_]+)\s+does not exist/i);
  if (m4?.[1]) return m4[1];

  return null;
}


function normBool(v: any): boolean | null {
  if (v === true) return true;
  if (v === false) return false;
  return null;
}

function hasAnyDbValue(v: {
  value_text: string;
  value_number: string;
  value_bool: boolean | null;
  value_ids: string[];
}) {
  if ((v.value_text || "").trim()) return true;
  if ((v.value_number || "").trim()) return true;
  if (v.value_bool === true || v.value_bool === false) return true;
  if (Array.isArray(v.value_ids) && v.value_ids.length > 0) return true;
  return false;
}

async function reverseGeocodeOSM(lat: number, lng: number) {

  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(

    lat

  )}&lon=${encodeURIComponent(lng)}&zoom=18&addressdetails=1`;



  const res = await fetch(url, { headers: { Accept: "application/json" } });

  if (!res.ok) throw new Error(`Reverse geocode failed (${res.status})`);

  return (await res.json()) as any;

}



/** -----------------------------

 * Dynamic Attributes (Phase 1)

 * ------------------------------

 * This is the "fallback engine" that makes House(s) feel correct NOW.

 * Later, you will replace this with DB-driven attributes + mapping tables.

 */

type DynInputType = "text" | "number" | "boolean" | "single_select" | "multi_select";



type DynAttrDef = {

  key: string; // stable key stored in JSON

  label: string;

  input_type: DynInputType;

  required?: boolean;

  hint?: string;

  unit?: string; // e.g., "sq ft", "years"

  options?: { value: string; label: string }[]; // for selects

};



function dynKey(k: string) {

  return slugify(k).replace(/-/g, "_");

}



const COMMON_BUILT_ATTRS: DynAttrDef[] = [

  { key: "built_up_area", label: "Built-up Area", input_type: "number", required: true, unit: "sq ft" },

  { key: "carpet_area", label: "Carpet Area", input_type: "number", unit: "sq ft" },

  {

    key: "furnishing",

    label: "Furnishing",

    input_type: "single_select",

    options: [

      { value: "", label: "Select..." },

      { value: "unfurnished", label: "Unfurnished" },

      { value: "semi_furnished", label: "Semi-Furnished" },

      { value: "fully_furnished", label: "Fully Furnished" },

    ],

  },

  {

    key: "parking_type",

    label: "Parking",

    input_type: "single_select",

    options: [

      { value: "", label: "Select..." },

      { value: "none", label: "No parking" },

      { value: "open", label: "Open parking" },

      { value: "covered", label: "Covered parking" },

      { value: "both", label: "Open + Covered" },

    ],

  },

  { key: "parking_count", label: "Parking count", input_type: "number" },

  { key: "facing", label: "Facing", input_type: "single_select", options: [

    { value: "", label: "Select..." },

    { value: "north", label: "North" },

    { value: "south", label: "South" },

    { value: "east", label: "East" },

    { value: "west", label: "West" },

    { value: "north_east", label: "North-East" },

    { value: "north_west", label: "North-West" },

    { value: "south_east", label: "South-East" },

    { value: "south_west", label: "South-West" },

  ]},

  { key: "age_years", label: "Age of property", input_type: "number", unit: "years", hint: "0 for brand new" },

  { key: "ready_to_move", label: "Ready to move?", input_type: "boolean" },

];



const HOUSE_ATTRS: DynAttrDef[] = [

  ...COMMON_BUILT_ATTRS,

  { key: "bedrooms", label: "Bedrooms", input_type: "number", required: true },

  { key: "bathrooms", label: "Bathrooms", input_type: "number", required: true },

  { key: "kitchens", label: "Kitchens", input_type: "number" },

  { key: "balconies", label: "Balconies", input_type: "number" },

  { key: "floors_in_building", label: "Total floors in building", input_type: "number" },

  { key: "your_floor", label: "Your floor (if applicable)", input_type: "number" },

  { key: "power_backup", label: "Power backup available?", input_type: "boolean" },

  { key: "water_supply", label: "Water supply available?", input_type: "boolean" },

];



const FLAT_ATTRS: DynAttrDef[] = [

  ...COMMON_BUILT_ATTRS,

  { key: "bhk", label: "BHK", input_type: "single_select", required: true, options: [

    { value: "", label: "Select..." },

    { value: "1", label: "1 BHK" },

    { value: "2", label: "2 BHK" },

    { value: "3", label: "3 BHK" },

    { value: "4", label: "4 BHK" },

    { value: "5", label: "5+ BHK" },

  ]},

  { key: "bedrooms", label: "Bedrooms (optional)", input_type: "number", hint: "Optional if you chose BHK" },

  { key: "bathrooms", label: "Bathrooms", input_type: "number", required: true },

  { key: "balconies", label: "Balconies", input_type: "number" },

  { key: "floor_no", label: "Floor number", input_type: "number", required: true },

  { key: "total_floors", label: "Total floors in building", input_type: "number", required: true },

  { key: "lift", label: "Lift available?", input_type: "boolean" },

  { key: "security", label: "Security available?", input_type: "boolean" },

  { key: "maintenance_monthly", label: "Maintenance (₹/month)", input_type: "number" },

  { key: "amenities", label: "Society amenities", input_type: "multi_select", options: [

    { value: "gym", label: "Gym" },

    { value: "pool", label: "Swimming Pool" },

    { value: "club_house", label: "Club House" },

    { value: "children_play", label: "Children Play Area" },

    { value: "garden", label: "Garden" },

    { value: "cctv", label: "CCTV" },

    { value: "intercom", label: "Intercom" },

    { value: "power_backup", label: "Power Backup" },

  ]},

];



const SHOP_ATTRS: DynAttrDef[] = [

  ...COMMON_BUILT_ATTRS,

  { key: "carpet_area", label: "Carpet Area", input_type: "number", required: true, unit: "sq ft" },

  { key: "frontage_ft", label: "Frontage width", input_type: "number", unit: "ft" },

  { key: "floor_no", label: "Floor number", input_type: "number" },

  { key: "washroom", label: "Washroom available?", input_type: "boolean" },

  { key: "pantry", label: "Pantry available?", input_type: "boolean" },

  { key: "suitable_for", label: "Suitable for", input_type: "multi_select", options: [

    { value: "retail", label: "Retail Shop" },

    { value: "clinic", label: "Clinic" },

    { value: "salon", label: "Salon" },

    { value: "office", label: "Office" },

    { value: "warehouse", label: "Warehouse" },

    { value: "restaurant", label: "Restaurant / Cafe" },

  ]},

];



const OFFICE_ATTRS: DynAttrDef[] = [

  ...COMMON_BUILT_ATTRS,

  { key: "carpet_area", label: "Carpet Area", input_type: "number", required: true, unit: "sq ft" },

  { key: "floor_no", label: "Floor number", input_type: "number" },

  { key: "cabins", label: "Cabins / Rooms", input_type: "number" },

  { key: "workstations", label: "Workstations", input_type: "number" },

  { key: "meeting_room", label: "Meeting room available?", input_type: "boolean" },

  { key: "washroom", label: "Washroom available?", input_type: "boolean" },

  { key: "pantry", label: "Pantry available?", input_type: "boolean" },

];



function getBuiltAttrDefs(subtype: PropertySubtype | ""): DynAttrDef[] {

  const s = String(subtype || "");

  if (!s) return HOUSE_ATTRS;



  if (s === "Flat / Apartment") return FLAT_ATTRS;

  if (s === "Shop") return SHOP_ATTRS;

  if (s === "Office Space") return OFFICE_ATTRS;



  // House-like

  return HOUSE_ATTRS;

}



function normalizeDynValue(input_type: DynInputType, raw: any) {

  if (input_type === "boolean") return raw === true ? true : raw === false ? false : null;

  if (input_type === "number") {

    const n = toNumberOrNull(String(raw ?? ""));

    return n === null ? "" : String(n);

  }

  if (input_type === "multi_select") {

    if (Array.isArray(raw)) return raw;

    return [];

  }

  return String(raw ?? "");

}



function renderDynField(opts: {

  def: DynAttrDef;

  value: any;

  setValue: (v: any) => void;

}) {

  const { def, value, setValue } = opts;



  if (def.input_type === "boolean") {

    return <ToggleRow label={def.label} value={value === true ? true : value === false ? false : null} onChange={setValue} />;

  }



  if (def.input_type === "single_select") {

    return (

      <>

        <FieldLabel title={def.label} required={def.required} hint={def.hint} />

        <Select value={String(value ?? "")} onChange={setValue} options={def.options || [{ value: "", label: "Select..." }]} />

      </>

    );

  }



  if (def.input_type === "multi_select") {

    const current: string[] = Array.isArray(value) ? value : [];

    const options = def.options || [];

    return (

      <div style={{ marginTop: 12 }}>

        <div style={{ fontWeight: 700 }}>

          {def.label} {def.required ? <span style={{ color: "#ef4444" }}>*</span> : null}

        </div>

        {def.hint ? <div style={{ color: "#5b6472", fontSize: 12, marginTop: 4 }}>{def.hint}</div> : null}

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>

          {options.map((o) => {

            const active = current.includes(o.value);

            return (

              <button

                key={o.value}

                type="button"

                onClick={() => {

                  if (active) setValue(current.filter((x) => x !== o.value));

                  else setValue([...current, o.value]);

                }}

                style={{

                  height: 40,

                  padding: "0 12px",

                  borderRadius: 12,

                  border: "1px solid #e5e7eb",

                  background: active ? "#111827" : "white",

                  color: active ? "white" : "#111827",

                  cursor: "pointer",

                  fontWeight: 700,

                }}

              >

                {o.label}

              </button>

            );

          })}

        </div>

      </div>

    );

  }



  // text / number

  return (

    <>

      <FieldLabel

        title={def.unit ? `${def.label} (${def.unit})` : def.label}

        required={def.required}

        hint={def.hint}

      />

      <TextInput

        value={String(value ?? "")}

        onChange={(v) => setValue(def.input_type === "number" ? (v || "") : v)}

        placeholder={def.input_type === "number" ? "Enter number" : "Enter value"}

        inputMode={def.input_type === "number" ? "decimal" : undefined}

      />

    </>

  );

}



function AddPropertyPageInner() {

  const router = useRouter();

  const supabase = useMemo(() => getSupabaseBrowser(), []);

  const searchParams = useSearchParams();

  const [hydrating, setHydrating] = useState(false);

  // Auth gate

  const [checkingAuth, setCheckingAuth] = useState(true);

  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
  if (!userId) return;

  let alive = true;

  async function loadDraftFromSupabase(listing_id: string) {
    setHydrating(true);
    setSaveMsg("");

    try {
      const { data, error } = await safeSelectPropertyListing(listing_id);

      // ✅ FORCE TypeScript to treat it as a normal row
      const row = data as DraftRow | null;

if (error) throw error;
if (!row || !row.id) return; // ✅ only row check (remove data check)

// ✅ listing tracking (use row only)
setListingId(String(row.id));
setListingStatus(((row.status ?? "draft") as any) || "draft");

const rowIsBuilder = !!(row as any)?.is_builder_listing;
const rowBuilderProjectId = (row as any)?.builder_project_id ? String((row as any).builder_project_id) : "";

if (rowIsBuilder || rowBuilderProjectId) {
  setListingMode("builder_project");
  if (rowBuilderProjectId) {
    setSelectedBuilderProjectId(rowBuilderProjectId);
  }
} else {
  setListingMode("individual");
  setSelectedBuilderProjectId("");
  setSelectedBuilderUnitId("");
  setSelectedBuilderUnitCode("");
}

// ✅ Step 1 restore (BEST: type_id/subtype_id -> fetch names)
const intentFromDb = (row.listing_intent ?? "") as any;
if (intentFromDb) setIntent(intentFromDb);

// Try to hydrate from type_id/subtype_id if present
const typeId = (row as any).type_id ? String((row as any).type_id) : "";
const subtypeId = (row as any).subtype_id ? String((row as any).subtype_id) : "";

if (typeId) {
  const tRes = await supabase.from("property_types").select("name,slug").eq("id", typeId).maybeSingle();
  if (!tRes.error && tRes.data?.name) {
    const uiType = normalizeUiType(tRes.data.name);
    if (uiType) setType(uiType);
  }
}
      if (subtypeId) {
        // Try property_subtypes first
        const sRes = await supabase
          .from("property_subtypes")
          .select("name,slug")
          .eq("id", subtypeId)
          .maybeSingle();

        if (!sRes.error && sRes.data?.name) {
          setSubtype(sRes.data.name as any);
        } else {
          // fallback: property_taxons if you are using that
          const pRes = await supabase
            .from("property_taxons")
            .select("name,slug")
            .eq("id", subtypeId)
            .maybeSingle();
          if (!pRes.error && pRes.data?.name) setSubtype(pRes.data.name as any);
        }
      }

     // Fallback to legacy columns if they exist in select result
      const legacyType = (row as any)?.property_type ?? "";
      const legacySubtype = (row as any)?.property_subtype ?? "";

      // IMPORTANT: do not depend on current React state here
      if (legacyType) {
        const uiType = normalizeUiType(String(legacyType));
        if (uiType) setType(uiType);
      }

      if (legacySubtype) {
        setSubtype(String(legacySubtype) as any);
      }

      // ✅ Location restore
      const loc = (row?.location_json ?? null) as any;

if (loc) {
  setCity(String(loc.city ?? ""));
  setDistrict(String(loc.district ?? ""));
  setApartmentSociety(String(loc.apartmentSociety ?? ""));
  setLocality(String(loc.locality ?? ""));
  setSubLocality(String(loc.subLocality ?? ""));
  setPlotNo(String(loc.plotNo ?? ""));
  setStreetAddress(String(loc.streetAddress ?? ""));
  setPostalCode(String(loc.postalCode ?? ""));
  setStateName(String(loc.stateName ?? ""));
  setGoogleMapsUrl(String(loc.googleMapsUrl ?? ""));
} else {
  // fallback from flat cols if JSON not present
  setCity(String((row as any).city ?? ""));
  setStateName(String((row as any).state ?? ""));
  setGoogleMapsUrl(String((row as any).google_maps_url ?? ""));
}


      // ✅ Profile restore (Land vs House)
      const prof = ((row as any).profile_json ?? null) as any;
        if (prof) {
        // Land profile
        if (prof.plotArea != null) setPlotArea(String(prof.plotArea ?? ""));
        if (prof.plotAreaUnit) setPlotAreaUnit(prof.plotAreaUnit as AreaUnit);
        if (prof.lengthOfPlot != null) setLengthOfPlot(String(prof.lengthOfPlot ?? ""));
        if (prof.breadthOfPlot != null) setBreadthOfPlot(String(prof.breadthOfPlot ?? ""));
        if (prof.dimensionUnit) setDimensionUnit(prof.dimensionUnit as AreaUnit);
        if ("boundaryWall" in prof) setBoundaryWall(normBool(prof.boundaryWall));
        if (prof.openSides) setOpenSides(prof.openSides as any);
        if ("anyConstruction" in prof) setAnyConstruction(normBool(prof.anyConstruction));
        if (prof.possession) setPossession(prof.possession as any);

        // House profile
        if (prof.unit) setDynAreaUnit(prof.unit as AreaUnit);
        if (prof.manualUnitNo != null) setManualUnitNo(String(prof.manualUnitNo ?? ""));
        if (prof.dynamicAttributes && typeof prof.dynamicAttributes === "object") {
          setDynamicAttributes(prof.dynamicAttributes as any);
        }
      }

      // ✅ Pricing restore
      const pr = ((row as any).pricing_json ?? null) as any;
        if (pr) {
        if (pr.ownership) setOwnership(pr.ownership as any);
        if (pr.approvalAuthority != null) setApprovalAuthority(String(pr.approvalAuthority ?? ""));
        if (pr.expectedPrice != null) setExpectedPrice(String(pr.expectedPrice ?? ""));
        if (pr.pricePerUnit != null) setPricePerUnit(String(pr.pricePerUnit ?? ""));
        if ("allInclusive" in pr) setAllInclusive(normBool(pr.allInclusive));
        if ("priceNegotiable" in pr) setPriceNegotiable(normBool(pr.priceNegotiable));
        if (pr.uspDescription != null) setUspDescription(String(pr.uspDescription ?? ""));

        const lab = pr.labels ?? {};
        if ("bestDealEnabled" in lab) setBestDealEnabled(normBool(lab.bestDealEnabled));
        if (lab.bestDealReason != null) setBestDealReason(String(lab.bestDealReason ?? ""));
        if ("hotOfferEnabled" in lab) setHotOfferEnabled(normBool(lab.hotOfferEnabled));
        if (lab.hotOfferText != null) setHotOfferText(String(lab.hotOfferText ?? ""));
        if ("soldOut" in lab) setSoldOut(normBool(lab.soldOut));

        const d = pr.directEmi ?? {};
        if ("directEmiEnabled" in d) setDirectEmiEnabled(normBool(d.directEmiEnabled));
        if (d.emiTotalAmount != null) setEmiTotalAmount(String(d.emiTotalAmount ?? ""));
        if (d.emiDownPaymentPct != null) setEmiDownPaymentPct(String(d.emiDownPaymentPct ?? "20"));
        if (d.emiInterestPct != null) setEmiInterestPct(String(d.emiInterestPct ?? "0"));
        if (d.emiMonths != null) setEmiMonths(String(d.emiMonths ?? "120"));
        if (d.emiDownPaymentDays != null) setEmiDownPaymentDays(String(d.emiDownPaymentDays ?? "0"));
        if ("emiProvideRegistrationAfterDownPayment" in d)
          setEmiProvideRegistrationAfterDownPayment(normBool(d.emiProvideRegistrationAfterDownPayment));
        if (d.emiWhoKeepsOriginalDeed != null) setEmiWhoKeepsOriginalDeed(String(d.emiWhoKeepsOriginalDeed ?? ""));
        if ("emiNeedGuarantor" in d) setEmiNeedGuarantor(normBool(d.emiNeedGuarantor));
        if (d.emiTerms != null) setEmiTerms(String(d.emiTerms ?? ""));
      }

      // ✅ Media restore
      const media = ((row as any).media_json ?? null) as any;

      if (Array.isArray(media) && media.length) {
        if (typeof media[0] === "string") {
          setMediaUrls(media.map((x) => String(x)));
          setMediaAssets([]);
        } else {
          const restoredAssets: UploadedMediaAsset[] = media
            .map((x: any, idx: number): UploadedMediaAsset => {
              const rawKind = String(x?.kind || "").toLowerCase();
              const kind: UploadedMediaAsset["kind"] =
                rawKind === "video" ? "video" : rawKind === "document" ? "document" : "image";

              return {
                id: String(x?.id || `${Date.now()}_${idx}`),
                url: String(x?.url || x?.public_url || ""),
                bucket: String(x?.bucket || "listing-media"),
                path: String(x?.path || x?.object_path || ""),
                name: String(x?.name || x?.file_name || `Property media ${idx + 1}`),
                size: Number(x?.size || x?.file_size || 0),
                mimeType: String(x?.mimeType || x?.mime_type || ""),
                kind,
              };
            })
            .filter((x) => Boolean(x.url));

          setMediaAssets(restoredAssets);
          setMediaUrls([""]);
        }
      } else {
        setMediaAssets([]);
        setMediaUrls([""]);
      }
      if (rowIsBuilder && row.id) {
      try {
        await loadExistingBuilderInventoryLink(String(row.id));
      } catch {}
    }
      setSaveMsg("✅ Loaded saved draft from Supabase.");
    } catch (e: any) {
      setSaveMsg(`❌ Draft load failed: ${e?.message || "Unknown error"}`);
    } finally {
      if (alive) setHydrating(false);
    }
  }

  // 1) URL param ?edit=<listingId>
  const editId = searchParams.get("edit");
  if (editId) {
    loadDraftFromSupabase(editId);
    return () => {
      alive = false;
    };
  }

  // 2) else try localStorage last saved listingId for this user
  try {
    const key = `3bigha_property_last_listing_${userId}`;
    const last = localStorage.getItem(key);
    if (last) loadDraftFromSupabase(last);
  } catch {}

  return () => {
    alive = false;
  };
}, [supabase, userId, searchParams]);

  // Profile completion banner only (NO auto redirect)

  const [profileComplete, setProfileComplete] = useState<boolean>(false);



  // draft row tracking

  const [listingId, setListingId] = useState<string | null>(null);

  const [listingStatus, setListingStatus] = useState<"draft" | "pending" | "approved" | "rejected">("draft");

  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  const [listingMode, setListingMode] = useState<ListingMode>("individual");

const [builderProjects, setBuilderProjects] = useState<BuilderProjectRow[]>([]);
const [builderProjectsLoading, setBuilderProjectsLoading] = useState(false);
const [builderProjectsError, setBuilderProjectsError] = useState<string | null>(null);
const [selectedBuilderProjectId, setSelectedBuilderProjectId] = useState("");

const [builderUnits, setBuilderUnits] = useState<BuilderUnitRow[]>([]);
const [builderUnitsLoading, setBuilderUnitsLoading] = useState(false);
const [builderUnitsError, setBuilderUnitsError] = useState<string | null>(null);
const [selectedBuilderUnitId, setSelectedBuilderUnitId] = useState("");
const [selectedBuilderUnitCode, setSelectedBuilderUnitCode] = useState("");

const isBuilderListing = listingMode === "builder_project";

  // STEP 1

  const [intent, setIntent] = useState<Intent | "">("");

  const [type, setType] = useState<PropertyType | "">("");

  const [subtype, setSubtype] = useState<PropertySubtype | "">("");



  // cache resolved type_id (prevents repeat lookups)

  const [resolvedTypeId, setResolvedTypeId] = useState<string | null>(null);



  // cache resolved subtype_id

  const [resolvedSubtypeId, setResolvedSubtypeId] = useState<string | null>(null);

  const [resolvedSubtypeKey, setResolvedSubtypeKey] = useState<string | null>(null);



  // STEP 2

  const [city, setCity] = useState("");

  const [district, setDistrict] = useState("");

  const [apartmentSociety, setApartmentSociety] = useState("");

  const [locality, setLocality] = useState("");

  const [recentPropertyMemory, setRecentPropertyMemory] = useState<
    VendorListingMemoryRow[]
  >([]);

  const smartPropertySuggestions = buildVendorSmartSuggestions(
    recentPropertyMemory,
    4
  );

  const [subLocality, setSubLocality] = useState("");

  const [plotNo, setPlotNo] = useState("");

  const [streetAddress, setStreetAddress] = useState("");

  const [postalCode, setPostalCode] = useState("");

  const [stateName, setStateName] = useState("");
  const [geoSelection, setGeoSelection] = useState<GeoSelection>({});

  const [googleMapsUrl, setGoogleMapsUrl] = useState("");

  const [mapMsg, setMapMsg] = useState<string>("");

  // ✅ Amenities (listing-level)
const [amenitiesLoading, setAmenitiesLoading] = useState(false);
const [amenitiesError, setAmenitiesError] = useState<string | null>(null);
const [amenities, setAmenities] = useState<AmenityRow[]>([]);
const [selectedAmenityIds, setSelectedAmenityIds] = useState<string[]>([]);
const [showAmenities, setShowAmenities] = useState(false);

const amenitiesByCategory = useMemo(() => {
  const map = new Map<string, AmenityRow[]>();
  amenities.forEach((a) => {
    const cat = String(a.category || "other");
    if (!map.has(cat)) map.set(cat, []);
    map.get(cat)!.push(a);
  });

  // sort items inside each category
  for (const [k, list] of map.entries()) {
    list.sort((x, y) => {
      const xo = x.sort_order == null ? 1e15 : x.sort_order;
      const yo = y.sort_order == null ? 1e15 : y.sort_order;
      if (xo !== yo) return xo - yo;
      return String(x.name || "").localeCompare(String(y.name || ""));
    });
    map.set(k, list);
  }

  // category order by name
  return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
}, [amenities]);


  /** STEP 3 - Land fields (existing) */

  const [plotArea, setPlotArea] = useState("");

  const [plotAreaUnit, setPlotAreaUnit] = useState<AreaUnit>("Sq. ft.");

  const [lengthOfPlot, setLengthOfPlot] = useState("");

  const [breadthOfPlot, setBreadthOfPlot] = useState("");

  const [dimensionUnit, setDimensionUnit] = useState<AreaUnit>("Sq. ft.");

  const [boundaryWall, setBoundaryWall] = useState<boolean | null>(null);

  const [openSides, setOpenSides] = useState<OpenSides | "">("");

  const [anyConstruction, setAnyConstruction] = useState<boolean | null>(null);

  const [possession, setPossession] = useState<Possession | "">("");



  /** STEP 3 - Built property dynamic attributes */

  const [dynAreaUnit, setDynAreaUnit] = useState<AreaUnit>("Sq. ft.");

  const [dynamicAttributes, setDynamicAttributes] = useState<Record<string, any>>({});

  // =====================
// BUILDER-LIKE SECTIONS (5-7) for Individual Listings (House(s))
// =====================
type UnitCodeMode = "auto" | "manual";

const [unitMetaTower, setUnitMetaTower] = useState(""); // Tower / Block
const [unitMetaFloor, setUnitMetaFloor] = useState(""); // Floor
const [unitMetaTotalFloors, setUnitMetaTotalFloors] = useState(""); // Total floors in tower
const [unitMetaFlatsOnFloor, setUnitMetaFlatsOnFloor] = useState(""); // Flats/Apts on this floor
const [unitMetaStartFlatNo, setUnitMetaStartFlatNo] = useState(""); // Start flat no in this floor

const [unitCodeMode, setUnitCodeMode] = useState<UnitCodeMode>("auto");
const [unitCodePrefix, setUnitCodePrefix] = useState(""); // e.g. B
const [unitCodeStartNo, setUnitCodeStartNo] = useState("1"); // e.g. 1
const [unitCodeDigits, setUnitCodeDigits] = useState("2"); // e.g. 2 -> 01
const [unitCodeManual, setUnitCodeManual] = useState(""); // e.g. B-503

const [showRoomConfig, setShowRoomConfig] = useState(false);

type RoomKey =
  | "bedrooms"
  | "bathrooms"
  | "balconies"
  | "kitchens"
  | "living_rooms"
  | "dining_rooms"
  | "study_rooms"
  | "pooja_rooms"
  | "store_rooms"
  | "servant_rooms";

const ROOM_LABELS: Record<RoomKey, string> = {
  bedrooms: "Bedrooms",
  bathrooms: "Bathrooms",
  balconies: "Balconies",
  kitchens: "Kitchens",
  living_rooms: "Living Rooms",
  dining_rooms: "Dining Rooms",
  study_rooms: "Study Rooms",
  pooja_rooms: "Pooja Rooms",
  store_rooms: "Store Rooms",
  servant_rooms: "Servant Rooms",
};

type RoomItem = {
  length_ft: string;
  width_ft: string;
  area_sqft: string;
  notes: string;
  photos: File[]; // UI only for now (no upload in this page)
};

const [roomCounts, setRoomCounts] = useState<Record<RoomKey, number>>({
  bedrooms: 0,
  bathrooms: 0,
  balconies: 0,
  kitchens: 0,
  living_rooms: 0,
  dining_rooms: 0,
  study_rooms: 0,
  pooja_rooms: 0,
  store_rooms: 0,
  servant_rooms: 0,
});

const [roomDetails, setRoomDetails] = useState<Record<RoomKey, RoomItem[]>>({
  bedrooms: [],
  bathrooms: [],
  balconies: [],
  kitchens: [],
  living_rooms: [],
  dining_rooms: [],
  study_rooms: [],
  pooja_rooms: [],
  store_rooms: [],
  servant_rooms: [],
});

function padLeft(n: string, digits: string) {
  const d = Math.max(1, Math.min(6, Number(digits || "2")));
  const s = String(n || "0").replace(/[^\d]/g, "");
  return s.padStart(d, "0");
}

const computedUnitCode = useMemo(() => {
  if (unitCodeMode === "manual") return unitCodeManual.trim();
  const pref = unitCodePrefix.trim();
  const start = unitCodeStartNo.trim() || "1";
  const dd = unitCodeDigits.trim() || "2";
  const serial = padLeft(start, dd);
  if (!pref) return serial ? `A-${serial}` : "";
  return `${pref}-${serial}`;
}, [unitCodeMode, unitCodeManual, unitCodePrefix, unitCodeStartNo, unitCodeDigits]);

function ensureRoomArray(key: RoomKey, count: number) {
  setRoomDetails((prev) => {
    const cur = prev[key] || [];
    const next = [...cur];
    while (next.length < count) {
      next.push({ length_ft: "", width_ft: "", area_sqft: "", notes: "", photos: [] });
    }
    while (next.length > count) next.pop();
    return { ...prev, [key]: next };
  });
}

// ✅ DB-driven dynamic attributes (Property Attributes)
const [dbAttrLoading, setDbAttrLoading] = useState(false);
const [dbAttrErr, setDbAttrErr] = useState<string | null>(null);
const [dbAttrDefs, setDbAttrDefs] = useState<DbAttrRow[]>([]);
const [dbAttrOptions, setDbAttrOptions] = useState<Record<string, AttrValueRow[]>>({});
const [dbAttrValues, setDbAttrValues] = useState<
  Record<
    string,
    {
      value_text: string;
      value_number: string; // keep as string for input
      value_bool: boolean | null;
      value_ids: string[]; // for single/multi
    }
  >
>({});

  const builtAttrDefs = useMemo(() => getBuiltAttrDefs(subtype), [subtype]);



  // initialize/normalize dynamic keys on subtype change (safe: preserves existing values where possible)

  useEffect(() => {

    if (type !== "House(s)") return;



    const next: Record<string, any> = { ...dynamicAttributes };

    for (const def of builtAttrDefs) {

      if (!(def.key in next)) {

        // default by type

        if (def.input_type === "boolean") next[def.key] = null;

        else if (def.input_type === "multi_select") next[def.key] = [];

        else next[def.key] = "";

      } else {

        next[def.key] = normalizeDynValue(def.input_type, next[def.key]);
      }
    }

    // prune keys that are no longer in defs (to keep JSON clean)
    const allowed = new Set(builtAttrDefs.map((d) => d.key));
    for (const k of Object.keys(next)) {
      if (!allowed.has(k)) delete next[k];
    }

    setDynamicAttributes(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, subtype]);

  // STEP 4
  const [ownership, setOwnership] = useState<Ownership | "">("");
  const [approvalAuthority, setApprovalAuthority] = useState("");
  const [expectedPrice, setExpectedPrice] = useState("");
  const [pricePerUnit, setPricePerUnit] = useState("");
  const [pricePerUnitTouched, setPricePerUnitTouched] = useState(false);
  const [allInclusive, setAllInclusive] = useState<boolean | null>(null);
  const [priceNegotiable, setPriceNegotiable] = useState<boolean | null>(null);
  const [uspDescription, setUspDescription] = useState("");
  const [aiSmartFillLoading, setAiSmartFillLoading] = useState(false);

  const [bestDealEnabled, setBestDealEnabled] = useState<boolean | null>(null);
  const [bestDealReason, setBestDealReason] = useState("");
  const [hotOfferEnabled, setHotOfferEnabled] = useState<boolean | null>(null);
  const [hotOfferText, setHotOfferText] = useState("");
  const [soldOut, setSoldOut] = useState<boolean | null>(null);

  const [directEmiEnabled, setDirectEmiEnabled] = useState<boolean | null>(null);
  const [emiTotalAmount, setEmiTotalAmount] = useState("");
  const [emiTotalTouched, setEmiTotalTouched] = useState(false);
  const [lastAutoEmiTotal, setLastAutoEmiTotal] = useState<number | null>(null);

  const [emiDownPaymentPct, setEmiDownPaymentPct] = useState("20");
  const [emiInterestPct, setEmiInterestPct] = useState("0");
  const [emiMonths, setEmiMonths] = useState("120");
  const [emiDownPaymentDays, setEmiDownPaymentDays] = useState("0");
  const [emiProvideRegistrationAfterDownPayment, setEmiProvideRegistrationAfterDownPayment] = useState<boolean | null>(
    null
  );
  const [emiWhoKeepsOriginalDeed, setEmiWhoKeepsOriginalDeed] = useState("");
  const [emiNeedGuarantor, setEmiNeedGuarantor] = useState<boolean | null>(null);
  const [emiTerms, setEmiTerms] = useState("");

  const [investmentEnabled, setInvestmentEnabled] = useState<boolean | null>(null);
  const [investmentMin, setInvestmentMin] = useState("");
  const [investmentMax, setInvestmentMax] = useState("");

  const [investmentMinPct, setInvestmentMinPct] = useState("");
  const [investmentMaxPct, setInvestmentMaxPct] = useState("");
  const [investmentHoldingMonths, setInvestmentHoldingMonths] = useState("");
  const [investmentRiskLevel, setInvestmentRiskLevel] = useState<"low" | "medium" | "high">("medium");

  // STEP 5
  const [mediaUrls, setMediaUrls] = useState<string[]>([""]);
  const [mediaAssets, setMediaAssets] = useState<UploadedMediaAsset[]>([]);
  // Manual Unit No. (Individual listing: single property)
  const [manualUnitNo, setManualUnitNo] = useState("");
  const [agree, setAgree] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string>("");

  // ✅ REQUIRED: resolve NOT NULL type_id from your master table (property_types ONLY)
  async function resolveTypeIdOrThrow(): Promise<string> {
  if (resolvedTypeId) return resolvedTypeId;
  if (!type) throw new Error("Property Type is missing (Step 1).");

  const normalizedType = String(type).trim();

  const slugCandidates =
    normalizedType === "House(s)"
      ? ["houses", "house-s", "house"]
      : normalizedType === "Land / Plot"
      ? ["land-plot", "land", "plot"]
      : [slugify(normalizedType)];

  console.log("resolveTypeIdOrThrow.start", {
    normalizedType,
    slugCandidates,
  });

  const byName = await supabase
    .from("property_types")
    .select("id,name,slug")
    .eq("name", normalizedType)
    .limit(1);

  console.log("resolveTypeIdOrThrow.byName", byName);

  if (byName.error) {
    throw new Error(`property_types by name failed: ${byName.error.message}`);
  }

  if (byName.data && byName.data.length > 0 && byName.data[0]?.id) {
    const id = String(byName.data[0].id);
    setResolvedTypeId(id);
    return id;
  }

  const bySlug = await supabase
    .from("property_types")
    .select("id,name,slug")
    .in("slug", slugCandidates)
    .limit(10);

  console.log("resolveTypeIdOrThrow.bySlug", bySlug);

  if (bySlug.error) {
    throw new Error(`property_types by slug failed: ${bySlug.error.message}`);
  }

  if (bySlug.data && bySlug.data.length > 0 && bySlug.data[0]?.id) {
    const id = String(bySlug.data[0].id);
    setResolvedTypeId(id);
    return id;
  }

  throw new Error(
    `type_id not found in property_types for UI type "${normalizedType}". Checked slugs: ${slugCandidates.join(", ")}`
  );
}

  // ✅ resolve NOT NULL subtype_id from property_subtypes (or property_taxons fallback)
  async function resolveSubtypeIdOrThrow(typeId: string): Promise<string> {
    if (!subtype) throw new Error("Property Subcategory/Subtype is missing (Step 1).");

    const key = `${typeId}::${String(subtype).trim()}`;
    if (resolvedSubtypeId && resolvedSubtypeKey === key) return resolvedSubtypeId;

    const wantedName = String(subtype).trim();
    const wantedSlug = slugify(wantedName);

    // 1) Try property_subtypes (most common schema)
    {
      const byName = await supabase
        .from("property_subtypes")
        .select("id,type_id,name,slug")
        .eq("type_id", typeId)
        .eq("name", wantedName)
        .maybeSingle();

      if (!byName.error && byName.data?.id) {
        setResolvedSubtypeId(byName.data.id as string);
        setResolvedSubtypeKey(key);
        return byName.data.id as string;
      }

      const bySlug = await supabase
        .from("property_subtypes")
        .select("id,type_id,name,slug")
        .eq("type_id", typeId)
        .eq("slug", wantedSlug)
        .maybeSingle();

      if (!bySlug.error && bySlug.data?.id) {
        setResolvedSubtypeId(bySlug.data.id as string);
        setResolvedSubtypeKey(key);
        return bySlug.data.id as string;
      }

      // If table doesn't exist, ignore and fall back
      const msg = String(byName.error?.message || bySlug.error?.message || "").toLowerCase();
      const isMissingTable =
        msg.includes('relation "property_subtypes" does not exist') ||
        msg.includes("does not exist") ||
        msg.includes("schema cache");
      if ((byName.error || bySlug.error) && !isMissingTable) {
        throw (byName.error || bySlug.error) as any;
      }
    }

    // 2) Fallback: property_taxons
    {
      const byName = await supabase
        .from("property_taxons")
        .select("id,parent_id,kind,name,slug")
        .eq("parent_id", typeId)
        .in("kind", ["subtype", "property_subtype"])
        .eq("name", wantedName)
        .maybeSingle();

      if (!byName.error && byName.data?.id) {
        setResolvedSubtypeId(byName.data.id as string);
        setResolvedSubtypeKey(key);
        return byName.data.id as string;
      }

      const bySlug = await supabase
        .from("property_taxons")
        .select("id,parent_id,kind,name,slug")
        .eq("parent_id", typeId)
        .in("kind", ["subtype", "property_subtype"])
        .eq("slug", wantedSlug)
        .maybeSingle();

      if (!bySlug.error && bySlug.data?.id) {
        setResolvedSubtypeId(bySlug.data.id as string);
        setResolvedSubtypeKey(key);
        return bySlug.data.id as string;
      }

      const msg = String(byName.error?.message || bySlug.error?.message || "").toLowerCase();
      const isMissingTable =
        msg.includes('relation "property_taxons" does not exist') ||
        msg.includes("does not exist") ||
        msg.includes("schema cache");
      if ((byName.error || bySlug.error) && !isMissingTable) {
        throw (byName.error || bySlug.error) as any;
      }
    }

    throw new Error(
      `subtype_id is required but could not be found for "${wantedName}" under type_id "${typeId}". ` +
        `Seed property_subtypes (recommended) or property_taxons so this subtype exists.`
    );
  }

  // 1) Auth gate
  useEffect(() => {
    let alive = true;

    (async () => {
      setCheckingAuth(true);

      try {
        const { data, error } = await supabase.auth.getUser();

        if (!alive) return;

        const uid = data.user?.id ?? null;

        if (error || !uid) {
          setUserId(null);
          setCheckingAuth(false);
          router.replace(`/login?next=${encodeURIComponent("/property/add")}`);
          return;
        }

        setUserId(uid);
        setCheckingAuth(false);
      } catch {
        if (!alive) return;
        setUserId(null);
        setCheckingAuth(false);
        router.replace(`/login?next=${encodeURIComponent("/property/add")}`);
      }
    })();

    return () => {
      alive = false;
    };
  }, [supabase, router]);

  // 1.5) Profile completion banner load (no redirect)
  useEffect(() => {
    if (!userId) return;
    let alive = true;

    (async () => {
      const { data: bp, error } = await supabase
        .from("business_profiles")
        .select("is_complete")
        .eq("user_id", userId)
        .maybeSingle();

      if (!alive) return;

      if (!error) {
        setProfileComplete(!!bp?.is_complete);
        return;
      }

      const { data: comp } = await supabase
        .from("v_vendor_profile_completeness")
        .select("is_complete")
        .eq("user_id", userId)
        .maybeSingle();

      if (!alive) return;
      setProfileComplete(!!comp?.is_complete);
    })();

    return () => {
      alive = false;
    };
  }, [supabase, userId]);

  // ✅ Load amenities master and set defaults
  useEffect(() => {
    if (!userId) return;
    loadAmenitiesMasterAndDefaults();
    loadBuilderProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, listingId]);

  useEffect(() => {
  if (!userId) return;

  if (!selectedBuilderProjectId) {
    setBuilderUnits([]);
    setSelectedBuilderUnitId("");
    setSelectedBuilderUnitCode("");
    return;
  }

  loadBuilderUnits(selectedBuilderProjectId);

  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [userId, selectedBuilderProjectId, listingId]);
useEffect(() => {
  const unit = builderUnits.find((u) => u.id === selectedBuilderUnitId);
  setSelectedBuilderUnitCode(unit?.unit_code ? String(unit.unit_code) : "");
}, [builderUnits, selectedBuilderUnitId]);

  // Reset subtype + resolved IDs if type changes
  useEffect(() => {
    setSubtype("");
    setResolvedTypeId(null);
    setResolvedSubtypeId(null);
    setResolvedSubtypeKey(null);
  }, [type]);

  // Reset resolved subtype cache if subtype changes
  useEffect(() => {
    setResolvedSubtypeId(null);
    setResolvedSubtypeKey(null);
  }, [subtype]);

  useEffect(() => {
  let alive = true;

  async function loadDbAttrs() {
    setDbAttrErr(null);
    setDbAttrDefs([]);
    setDbAttrOptions({});
    setDbAttrValues({});
    if (!type || !subtype) return;

    setDbAttrLoading(true);

    try {
      // Resolve IDs (using your existing resolvers)
      const typeId = await resolveTypeIdOrThrow();
      const subtypeId = await resolveSubtypeIdOrThrow(typeId);

      // 1) Load mapped attributes for subtype
      const mres = await supabase
        .from("property_subtype_attributes")
        .select("attribute_id, sort_order, is_required, property_attributes(id,name,slug,input_type,unit,sort_order,is_active)")
        .eq("subtype_id", subtypeId);

      if (!alive) return;

      if (mres.error) {
        setDbAttrErr(mres.error.message);
        setDbAttrLoading(false);
        return;
      }

      const defs: DbAttrRow[] = (mres.data ?? [])
  .map((r: any) => {
    const a = r?.property_attributes;
    if (!a?.id) return null;

    const out: DbAttrRow = {
      id: String(a.id),
      name: String(a.name ?? ""),
      slug: String(a.slug ?? ""),
      input_type: String(a.input_type ?? ""),
      unit: a.unit == null ? null : String(a.unit),
      sort_order: a.sort_order == null ? null : Number(a.sort_order),
      is_active: a.is_active == null ? null : Boolean(a.is_active),

      // ✅ comes from mapping table property_subtype_attributes
      is_required: r?.is_required == null ? null : Boolean(r.is_required),
    };

    // ✅ mapping sort_order wins
    if (r?.sort_order != null && Number.isFinite(Number(r.sort_order))) {
      out.sort_order = Number(r.sort_order);
    }

    return out;
  })
  .filter((x): x is DbAttrRow => Boolean(x));

      defs.sort((a, b) => {
        const ao = a.sort_order == null ? 1e15 : a.sort_order;
        const bo = b.sort_order == null ? 1e15 : b.sort_order;
        if (ao !== bo) return ao - bo;
        return String(a.name ?? "").localeCompare(String(b.name ?? ""));
      });

      setDbAttrDefs(defs);

      // 2) Initialize value state (and hydrate from saved listing if available)
const init: Record<
  string,
  { value_text: string; value_number: string; value_bool: boolean | null; value_ids: string[] }
> = {};

defs.forEach((d) => {
  init[d.id] = { value_text: "", value_number: "", value_bool: null, value_ids: [] };
});

// ✅ If a listing already exists, pull saved values from property_listing_attributes
if (listingId) {
  const lres = await supabase
    .from("property_listing_attributes")
    .select("attribute_id,value_text,value_number,value_bool,value_ids")
    .eq("listing_id", listingId);

  if (!alive) return;

  if (!lres.error) {
    (lres.data as ListingAttrRow[] | null)?.forEach((row) => {
      const aid = String(row.attribute_id ?? "");
      if (!aid || !(aid in init)) return;

      init[aid] = {
        value_text: row.value_text ?? "",
        value_number: row.value_number == null ? "" : String(row.value_number),
        value_bool: row.value_bool == null ? null : !!row.value_bool,
        value_ids: Array.isArray(row.value_ids) ? row.value_ids : [],
      };
    });
  }
}

setDbAttrValues(init);

      // 3) Load select options for those attributes (best effort)
      const selectAttrIds = defs
        .filter((d) => d.input_type === "single_select" || d.input_type === "multi_select")
        .map((d) => d.id);

      if (selectAttrIds.length > 0) {
        const ores = await supabase
        .from("property_subtype_attribute_values")
        .select("id,attribute_id,value,slug,sort_order,is_active")
        .eq("subtype_id", subtypeId)
        .in("attribute_id", selectAttrIds)
        .order("sort_order", { ascending: true });

        if (!alive) return;

        if (!ores.error) {
          const grouped: Record<string, AttrValueRow[]> = {};
          (ores.data ?? []).forEach((x: any) => {
            const aid = String(x.attribute_id ?? "");
            if (!aid) return;
            if (!grouped[aid]) grouped[aid] = [];
            grouped[aid].push({
              id: String(x.id),
              attribute_id: aid,
              value: String(x.value ?? ""),
              slug: x.slug == null ? null : String(x.slug),
              sort_order: x.sort_order == null ? null : Number(x.sort_order),
              is_active: x.is_active == null ? null : Boolean(x.is_active),
            });
          });
          setDbAttrOptions(grouped);
        }
      }
    } catch (e: any) {
      setDbAttrErr(e?.message || "Failed to load DB attributes.");
    } finally {
      if (alive) setDbAttrLoading(false);
    }
  }

  loadDbAttrs();

  return () => {
    alive = false;
  };
}, [type, subtype, supabase, listingId]);

  // Auto-calc price per unit from Expected Price ÷ Plot Area (no overwrite if user touched)
  useEffect(() => {
    const price = toNumberOrNull(expectedPrice);
    const area = toNumberOrNull(plotArea);
    if (!price || price <= 0) return;
    if (!area || area <= 0) return;

    const per = price / area;
    if (!Number.isFinite(per) || per <= 0) return;
    if (pricePerUnitTouched && pricePerUnit.trim()) return;

    setPricePerUnit(String(Math.round(per)));
  }, [expectedPrice, plotArea, plotAreaUnit, pricePerUnitTouched, pricePerUnit]);

  // Auto-fill EMI total from Expected Price when Direct EMI is enabled (no overwrite if user touched)
  useEffect(() => {
    if (directEmiEnabled !== true) return;
    const ep = toNumberOrNull(expectedPrice);
    if (!ep || ep <= 0) return;
    if (emiTotalTouched && emiTotalAmount.trim()) return;

    const current = toNumberOrNull(emiTotalAmount);
    const rounded = Math.round(ep);

    if (!current || (lastAutoEmiTotal !== null && current === lastAutoEmiTotal)) {
      setEmiTotalAmount(String(rounded));
      setLastAutoEmiTotal(rounded);
    }
  }, [directEmiEnabled, expectedPrice, emiTotalTouched, emiTotalAmount, lastAutoEmiTotal]);

  // Step validations
  const canContinueStep1 = Boolean(
    intent &&
      type &&
      subtype &&
      (listingMode === "individual" || (listingMode === "builder_project" && selectedBuilderProjectId))
  );

  useEffect(() => {
    (async () => {
      if (!userId) return;

      const rows = await loadVendorListingMemory({
        userId,
        module: "property",
        memoryType: "workflow",
        limit: 8,
      });

      setRecentPropertyMemory(rows);
    })();
  }, [userId]);

  function applyPropertyMemory(memory: VendorListingMemoryRow) {
    const p = memory.payload ?? {};

    setCity(String(p.city ?? ""));
    setDistrict(String(p.district ?? ""));
    setLocality(String(p.locality ?? ""));
    setSubLocality(String(p.subLocality ?? ""));
    setStateName(String(p.stateName ?? ""));
    setPostalCode(String(p.postalCode ?? ""));
    setStreetAddress(String(p.streetAddress ?? ""));
    setPlotNo(String(p.plotNo ?? ""));
    setApartmentSociety(String(p.apartmentSociety ?? ""));
    setGoogleMapsUrl(String(p.googleMapsUrl ?? ""));
  }

  const canContinueStep2 = Boolean(city.trim() && locality.trim());

  // Step 3 rules:
  // - Land / Plot uses old required fields
  // - House(s) requires dynamic required fields
  const canContinueStep3 = useMemo(() => {
    if (type === "Land / Plot") {
      return Boolean(
        plotArea.trim() && !Number.isNaN(Number(plotArea)) && openSides && anyConstruction !== null && possession
      );
    }

    // built (House(s))
    if (type === "House(s)") {
      const defs = builtAttrDefs;
      for (const def of defs) {
        if (!def.required) continue;
        const v = dynamicAttributes[def.key];
        if (def.input_type === "boolean") {
          if (v !== true && v !== false) return false;
        } else if (def.input_type === "multi_select") {
          if (!Array.isArray(v) || v.length === 0) return false;
        } else {
          if (!String(v ?? "").trim()) return false;
        }
      }
      // ✅ Also enforce DB-driven required specs
      for (const def of dbAttrDefs) {
        if (def.is_active === false) continue;
        if (!def.is_required) continue;

      const v = dbAttrValues[def.id];
        if (!v) return false;

      // required means user must provide something
        if (!hasAnyDbValue(v)) return false;
      }
      return true;
    }

    return false;
  }, [type, plotArea, openSides, anyConstruction, possession, builtAttrDefs, dynamicAttributes, dbAttrDefs, dbAttrValues]);

  const canContinueStep4 = Boolean(
    String(ownership).trim() !== "" &&
      String(expectedPrice).trim() !== "" &&
      Number.isFinite(Number(expectedPrice)) &&
      Number(expectedPrice) > 0 &&
      (
        listingMode === "individual" ||
        (listingMode === "builder_project" && String(selectedBuilderProjectId).trim() !== "")
      )
  );

  const emiCalc = useMemo(() => {
    if (directEmiEnabled !== true) return null;

    const total = Number(emiTotalAmount);
    const dpPctRaw = Number(emiDownPaymentPct);
    const rateRaw = Number(emiInterestPct);
    const monthsRaw = Number(emiMonths);

    if (!Number.isFinite(total) || total <= 0) return { error: "Enter Total Amount." };

    const dpPct = clamp(Number.isFinite(dpPctRaw) ? dpPctRaw : 0, 0, 100);
    const rate = clamp(Number.isFinite(rateRaw) ? rateRaw : 0, 0, 15);
    const months = clamp(Number.isFinite(monthsRaw) ? monthsRaw : 0, 0, 300);

    if (months <= 0) return { error: "EMI months must be at least 1." };

    const downPayment = (total * dpPct) / 100;
    const principal = total - downPayment;

    if (principal <= 0) return { error: "Principal becomes 0. Reduce down payment %." };

    const emi = computeEMI(principal, rate, months);
    if (emi === null) return { error: "Cannot compute EMI." };

    return { total, dpPct, rate, months, downPayment, principal, emi };
      }, [directEmiEnabled, emiTotalAmount, emiDownPaymentPct, emiInterestPct, emiMonths]);

  const investmentCalc = useMemo(() => {
  const total = toNumberOrNull(expectedPrice);

  if (!total || total <= 0) {
    return { minAmount: null, maxAmount: null };
  }

  const minPct = Number(investmentMinPct || 0);
  const maxPct = Number(investmentMaxPct || 0);

  return {
    minAmount: minPct ? Math.round((total * minPct) / 100) : null,
    maxAmount: maxPct ? Math.round((total * maxPct) / 100) : null,
  };
}, [expectedPrice, investmentMinPct, investmentMaxPct]);

useEffect(() => {
  if (investmentEnabled !== true) return;

  if (investmentCalc.minAmount != null) {
    setInvestmentMin(String(investmentCalc.minAmount));
  }

  if (investmentCalc.maxAmount != null) {
    setInvestmentMax(String(investmentCalc.maxAmount));
  }
}, [investmentEnabled, investmentCalc.minAmount, investmentCalc.maxAmount]);

    const cleanedMedia = useMemo(() => {
      const uploadedUrls = mediaAssets.map((asset) => asset.url).filter(Boolean);
      const pastedUrls = safeUrlsFromList(mediaUrls);
      return Array.from(new Set([...uploadedUrls, ...pastedUrls]));
    }, [mediaAssets, mediaUrls]);
    const canSubmit = Boolean(agree);

  function computeAddressText() {
    return [plotNo, apartmentSociety, streetAddress, subLocality, locality, district, city, stateName, postalCode]
      .map((x) => (x || "").trim())
      .filter(Boolean)
      .join(", ");
  }

  const addressPreview = useMemo(
    () => computeAddressText(),
    [plotNo, apartmentSociety, streetAddress, subLocality, locality, city, district, stateName, postalCode]
  );

  const buildPayload = () => {
    const payload = {
      vendor_user_id: userId,
      listing_mode: listingMode,
      is_builder_listing: listingMode === "builder_project",
      builder_project_id: listingMode === "builder_project" ? selectedBuilderProjectId || null : null,
      builder_unit_id: listingMode === "builder_project" ? selectedBuilderUnitId || null : null,
      builder_unit_code: listingMode === "builder_project" ? selectedBuilderUnitCode || null : null,
      created_at_local: new Date().toISOString(),
      intent,
      property_type: type,
      property_subtype: subtype,

    location: {
      city,
      district,
      apartmentSociety,
      locality,
      subLocality,
      plotNo,
      streetAddress,
      postalCode,
      stateName,
      googleMapsUrl,
    },

    profile:
      type === "Land / Plot"
        ? {
            plotArea,
            plotAreaUnit,
            lengthOfPlot,
            breadthOfPlot,
            dimensionUnit,
            boundaryWall,
            openSides,
            anyConstruction,
            possession,
          }
        : {
    unit: dynAreaUnit,
    dynamicAttributes,
    manualUnitNo: manualUnitNo.trim() || null,
  },

    pricing: {
      ownership,
      approvalAuthority,
      expectedPrice,
      pricePerUnit,
      allInclusive,
      priceNegotiable,
      uspDescription,
      labels: {
        bestDealEnabled,
        bestDealReason,
        hotOfferEnabled,
        hotOfferText,
        soldOut,
      },
      directEmi: {
        directEmiEnabled,
        emiTotalAmount,
        emiDownPaymentPct,
        emiInterestPct,
        emiMonths,
        emiDownPaymentDays,
        emiProvideRegistrationAfterDownPayment,
        emiWhoKeepsOriginalDeed,
        emiNeedGuarantor,
        emiTerms,
        emiCalculated: emiCalc,
      },
    },

    media: mediaAssets.length
      ? mediaAssets.map((asset) => ({
          id: asset.id,
          url: asset.url,
          bucket: asset.bucket,
          path: asset.path,
          name: asset.name,
          size: asset.size,
          mimeType: asset.mimeType,
          kind: asset.kind,
        }))
      : cleanedMedia,

    
  };

  return payload;
};

  const saveDraftLocal = async () => {
    setSaveMsg("");
    setSaving(true);
    try {
      const payload = buildPayload();
      const key = `3bigha_property_draft_${userId}`;
      localStorage.setItem(key, JSON.stringify(payload));
      setSaveMsg("✅ Saved as draft (local).");
    } catch (e: any) {
      setSaveMsg(`❌ Failed to save draft: ${e?.message || "Unknown error"}`);
    } finally {
      setSaving(false);
    }
  };

    async function gatedProfileOrRedirect() {
    if (profileComplete) return true;

    setSaving(false);
    setSaveMsg("❌ Please complete your Business Profile before saving or submitting.");
    window.location.href = `/onboarding/business?returnTo=${encodeURIComponent("/property/add")}`;
    return false;
  }

  function computeTitle() {
    const parts = [
      type || "Property",
      subtype ? `(${subtype})` : "",
      locality ? `- ${locality}` : "",
      city ? `, ${city}` : "",
    ];
    return parts.join(" ").replace(/\s+/g, " ").trim();
  }

  async function generatePropertyDescriptionWithAI() {
  if (aiSmartFillLoading) return;

  setAiSmartFillLoading(true);
  setSaveMsg("");

  try {
    const bullets = [
      intent ? `Listing purpose: ${intent}` : "",
      type ? `Property type: ${type}` : "",
      subtype ? `Subcategory: ${subtype}` : "",
      locality ? `Locality: ${locality}` : "",
      city ? `City: ${city}` : "",
      district ? `District: ${district}` : "",
      expectedPrice ? `Expected price: ₹${expectedPrice}` : "",
      pricePerUnit ? `Price per unit: ₹${pricePerUnit}` : "",
      ownership ? `Ownership: ${ownership}` : "",
      approvalAuthority ? `Approval authority: ${approvalAuthority}` : "",
      allInclusive !== null ? `All inclusive price: ${allInclusive ? "Yes" : "No"}` : "",
      priceNegotiable !== null ? `Price negotiable: ${priceNegotiable ? "Yes" : "No"}` : "",
      type === "Land / Plot" && plotArea ? `Plot area: ${plotArea} ${plotAreaUnit}` : "",
      type === "Land / Plot" && openSides ? `Open sides: ${openSides}` : "",
      type === "Land / Plot" && possession ? `Possession: ${possession}` : "",
      type === "House(s)" && manualUnitNo ? `Unit no: ${manualUnitNo}` : "",
      addressPreview ? `Address: ${addressPreview}` : "",
    ].filter(Boolean);

    const res = await fetch("/api/ai/smart-fill", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      credentials: "same-origin",
      body: JSON.stringify({
        module: "property",
        action: uspDescription.trim() ? "refine" : "generate_description",
        tone: "professional",
        input: {
          title: computeTitle(),
          location: addressPreview || [locality, city, district, stateName].filter(Boolean).join(", "),
          price: expectedPrice ? `₹${expectedPrice}` : "",
          bullets,
          existingText: uspDescription,
          attributes: {
            intent,
            type,
            subtype,
            city,
            district,
            locality,
            subLocality,
            ownership,
            approvalAuthority,
            expectedPrice,
            pricePerUnit,
            allInclusive,
            priceNegotiable,
            plotArea,
            plotAreaUnit,
            openSides,
            possession,
            dynamicAttributes,
          },
        },
      }),
    });

    const data = await res.json();

    if (!res.ok || !data?.ok) {
      if (res.status === 429) {
        setSaveMsg("⚠️ AI quota exceeded. Please try again later or contact support.");
        return;
      }

      if (data?.source === "fallback") {
        setUspDescription(data.result?.description || "");
        setSaveMsg("⚠️ AI service unavailable. Basic description generated.");
        return;
      }

      throw new Error(data?.error || `AI Smart-Fill failed with status ${res.status}`);
    }

    const description = String(data?.result?.description || "").trim();

    if (!description) {
      throw new Error("AI did not return a description.");
    }

    setUspDescription(description);

    const usps = Array.isArray(data?.result?.usps)
      ? data.result.usps.map((x: unknown) => String(x || "").trim()).filter(Boolean)
      : [];

    if (usps.length > 0 && !bestDealReason.trim()) {
      setBestDealReason(usps.slice(0, 2).join(" • "));
    }

    setSaveMsg("✅ AI description generated. Please verify all facts before publishing.");
  } catch (e: any) {
    setSaveMsg(`❌ AI Smart-Fill failed: ${e?.message || "Unknown error"}`);
  } finally {
    setAiSmartFillLoading(false);
  }
}

async function runFullPropertyAI() {
  if (aiSmartFillLoading || saving) return;

  setSaveMsg("🤖 AI is generating full listing...");

  try {
    await generatePropertyDescriptionWithAI();

    setTimeout(async () => {
      await runPropertyFieldAI("bestDealReason");
      await runPropertyFieldAI("hotOfferText");
      await runPropertyFieldAI("emiTerms");
      await runPropertyFieldAI("amenities");

      setSaveMsg("✅ Full AI listing generated. Please review before publishing.");
    }, 300);
  } catch (e: any) {
    setSaveMsg(`❌ Full AI failed: ${e?.message || "Unknown error"}`);
  }
}

async function runPropertyFieldAI(target: "bestDealReason" | "hotOfferText" | "emiTerms" | "amenities") {
  if (aiSmartFillLoading) return;

  setAiSmartFillLoading(true);
  setSaveMsg("");

  try {
    const contextBullets = [
      intent ? `Listing purpose: ${intent}` : "",
      type ? `Property type: ${type}` : "",
      subtype ? `Subcategory: ${subtype}` : "",
      locality ? `Locality: ${locality}` : "",
      city ? `City: ${city}` : "",
      district ? `District: ${district}` : "",
      expectedPrice ? `Expected price: ₹${expectedPrice}` : "",
      pricePerUnit ? `Price per unit: ₹${pricePerUnit}` : "",
      ownership ? `Ownership: ${ownership}` : "",
      approvalAuthority ? `Approval authority: ${approvalAuthority}` : "",
      plotArea ? `Plot area: ${plotArea} ${plotAreaUnit}` : "",
      openSides ? `Open sides: ${openSides}` : "",
      possession ? `Possession: ${possession}` : "",
      boundaryWall !== null ? `Boundary wall: ${boundaryWall ? "Yes" : "No"}` : "",
      anyConstruction !== null ? `Construction done: ${anyConstruction ? "Yes" : "No"}` : "",
      addressPreview ? `Address: ${addressPreview}` : "",
      uspDescription ? `Current description: ${uspDescription}` : "",
    ].filter(Boolean);

    const targetInstruction =
      target === "bestDealReason"
        ? "Write a short, truthful reason why this can be marked as Best Deal. Do not invent market facts."
        : target === "hotOfferText"
          ? "Write a short hot offer line. Do not claim discount unless provided."
          : target === "emiTerms"
            ? "Draft clear direct EMI terms for seller-to-buyer understanding. Keep it practical and safe."
            : "Suggest only relevant amenities from the available amenities list. Return amenity names in suggestions.";

    const res = await fetch("/api/ai/smart-fill", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      credentials: "same-origin",
      body: JSON.stringify({
        module: "property",
        action: "refine",
        tone: "professional",
        input: {
          title: computeTitle(),
          location: addressPreview || [locality, city, district, stateName].filter(Boolean).join(", "),
          price: expectedPrice ? `₹${expectedPrice}` : "",
          attributes: {
            targetField: target,
            requiredOutputStyle:
              target === "bestDealReason"
                ? "Return only 1 short best-deal reason, maximum 25 words."
                : target === "hotOfferText"
                  ? "Return only 1 short promotional offer line, maximum 18 words. Do not mention discount unless provided."
                  : target === "emiTerms"
                    ? "Return practical direct EMI terms in 4-6 short points. Do not write property marketing description."
                    : "Return only matching amenity names from the available amenities list.",
          },
          bullets: [
            ...contextBullets,
            targetInstruction,
            target === "amenities"
              ? `Available amenities: ${amenities.map((a) => a.name).join(", ")}`
              : "",
          ].filter(Boolean),
          existingText:
            target === "bestDealReason"
              ? bestDealReason
              : target === "hotOfferText"
                ? hotOfferText
                : target === "emiTerms"
                  ? emiTerms
                  : selectedAmenityIds
                      .map((id) => amenities.find((a) => a.id === id)?.name || "")
                      .filter(Boolean)
                      .join(", "),
        },
      }),
    });

    const data = await res.json();

    if (!res.ok || !data?.ok) {
      if (res.status === 429) {
        setSaveMsg("⚠️ AI quota exceeded. Please try again later.");
        return;
      }

      throw new Error(data?.error || `AI failed with status ${res.status}`);
    }

    const description = String(data?.result?.description || "").trim();
    const suggestions = Array.isArray(data?.result?.suggestions)
      ? data.result.suggestions.map((x: unknown) => String(x || "").trim()).filter(Boolean)
      : [];

    if (target === "bestDealReason") {
      setBestDealEnabled(true);
      setBestDealReason(description || suggestions.slice(0, 2).join(" • "));
      setSaveMsg("✅ AI filled Best Deal reason.");
      return;
    }

    if (target === "hotOfferText") {
      setHotOfferEnabled(true);
      setHotOfferText(description || suggestions[0] || "");
      setSaveMsg("✅ AI filled Hot Offer text.");
      return;
    }

    if (target === "emiTerms") {
      setDirectEmiEnabled(true);
      setEmiTerms(description || suggestions.join("\n"));
      setSaveMsg("✅ AI drafted EMI terms.");
      return;
    }

    if (target === "amenities") {
      const aiText = `${description} ${suggestions.join(" ")}`.toLowerCase();

      const matchedIds = amenities
        .filter((a) => aiText.includes(String(a.name || "").toLowerCase()))
        .map((a) => a.id);

      if (matchedIds.length > 0) {
        setSelectedAmenityIds(Array.from(new Set(matchedIds)));
        setShowAmenities(true);
        setSaveMsg(`✅ AI selected ${matchedIds.length} relevant amenities. Please review before continuing.`);
      } else {
        setSaveMsg("⚠️ AI could not confidently match amenities. Please select manually.");
      }
    }
  } catch (e: any) {
    setSaveMsg(`❌ AI failed: ${e?.message || "Unknown error"}`);
  } finally {
    setAiSmartFillLoading(false);
  }
}

function computeSlug() {
  // If editing an already saved listing, keep same slug
  if (listingId) {
    const existing = localStorage.getItem(`3bigha_property_existing_slug_${listingId}`);
    if (existing) return existing;
  }

  const base = `${type}-${subtype}-${locality}-${city}`.trim();
  const s = slugify(base || computeTitle());

  const uniqueTail = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;

  return s ? `${s}-${uniqueTail}` : `property-${uniqueTail}`;
}
  async function saveListingAmenities(listing_id: string) {
    const ids = Array.from(new Set(selectedAmenityIds)).filter(Boolean);

    await supabase
      .from("property_listing_amenities")
      .delete()
      .eq("listing_id", listing_id);

    if (ids.length > 0) {
      const rows = ids.map((amenity_id) => ({ listing_id, amenity_id }));
      const ins = await supabase.from("property_listing_amenities").insert(rows as any);
      if (ins.error) throw ins.error;
    }
  }
  async function saveRoomDetails(listing_id: string) {
  const rows: any[] = [];

  Object.entries(roomDetails).forEach(([roomType, items]) => {
    (items || []).forEach((r) => {
      const len = toNumberOrNull(r.length_ft);
      const wid = toNumberOrNull(r.width_ft);
      const area = toNumberOrNull(r.area_sqft);

      if (!len && !wid && !area && !r.notes?.trim()) return;

      rows.push({
        listing_id,
        room_type: roomType,
        length_ft: len,
        width_ft: wid,
        area_sqft: area,
        notes: r.notes || null,
      });
    });
  });

  await supabase
    .from("property_room_details")
    .delete()
    .eq("listing_id", listing_id);

  if (rows.length > 0) {
    const ins = await supabase
      .from("property_room_details")
      .insert(rows);

    if (ins.error) throw ins.error;
  }
}

  async function savePropertyListingAttributes(listing_id: string) {
    const rows: ListingAttrUpsert[] = [];

    for (const def of dbAttrDefs) {
      if (def.is_active === false) continue;

      const v = dbAttrValues[def.id];
      if (!v) continue;

      if (!hasAnyDbValue(v)) continue;

      const t = String(def.input_type);

      let value_text: string | null = null;
      let value_number: number | null = null;
      let value_bool: boolean | null = null;
      let value_ids: string[] | null = null;

      if (t === "text") value_text = (v.value_text || "").trim() || null;
      else if (t === "number") value_number = toNumberOrNull(String(v.value_number ?? ""));
      else if (t === "boolean") value_bool = v.value_bool === true ? true : v.value_bool === false ? false : null;
      else if (t === "single_select") value_ids = v.value_ids?.[0] ? [v.value_ids[0]] : null;
      else if (t === "multi_select") value_ids = Array.isArray(v.value_ids) && v.value_ids.length ? v.value_ids : null;
      else value_text = (v.value_text || "").trim() || null;

      rows.push({
        listing_id,
        attribute_id: def.id,
        value_text,
        value_number,
        value_bool,
        value_ids,
      });
    }

    await supabase
      .from("property_listing_attributes")
      .delete()
      .eq("listing_id", listing_id);

    if (rows.length > 0) {
      const ins = await supabase.from("property_listing_attributes").insert(rows as any);
      if (ins.error) throw ins.error;
    }
  }

  async function safeSelectPropertyListing(
  listing_id: string
): Promise<{ data: DraftRow | null; error: any | null }> {
  let cols = [
  "id",
  "status",
  "listing_intent",
  "type_id",
  "subtype_id",
  "is_builder_listing",
  "builder_project_id",

  "location_json",
  "profile_json",
  "pricing_json",
  "media_json",

  "google_maps_url",
  "city",
  "district",
  "state",
  "address_text",
  "title",
  "slug",
  "price",

  "property_type",
  "property_subtype",
];

  let attemptCols = [...cols];

  for (let i = 0; i < 10; i++) {
    const res = await supabase
      .from("property_listings")
      .select(attemptCols.join(","))
      .eq("id", listing_id)
      .maybeSingle();

    const data = (res.data as unknown as DraftRow | null) ?? null;
    const error = res.error as any;

    if (!error) {
      return { data, error: null };
    }

    const msg = String(error.message || "");
    if (!looksLikeMissingColumnError(msg)) {
      return { data: null, error };
    }

    const missing = extractMissingColumnName(msg);
    if (!missing) {
      return { data: null, error };
    }

    // 🔥 THIS is what fixes your screenshot error
    attemptCols = attemptCols.filter((c) => c.trim() !== missing.trim());
  }

  return {
    data: null,
    error: new Error("Failed to load draft: schema mismatch in property_listings."),
  };
}

// maps DB names to your UI strings
function normalizeUiType(dbName: string): PropertyType | "" {
  const n = String(dbName || "").trim().toLowerCase();
  if (!n) return "";
  if (n === "land / plot" || n === "land" || n === "plot") return "Land / Plot";
  if (n === "house(s)" || n === "houses" || n === "house") return "House(s)";
  return "";
}

async function insertPropertyRow(params: {
  owner_id: string;
  type_id: string;
  subtype_id: string;
  title: string;
  slug: string;
  description: string | null;
  price: number | null;
  city: string | null;
  state: string | null;
  address_text: string | null;
  status: "draft" | "pending" | "approved" | "rejected";
  cover_image_url: string | null;
  google_maps_url: string | null;
  is_builder_listing: boolean;
  builder_project_id: string | null;
}) {
  console.log("insertPropertyRow.enter", params);

  const payload = buildPayload();

  const minimalInsert: Record<string, any> = {
    owner_id: params.owner_id,
    listing_intent: intent || null,
    type_id: params.type_id,
    subtype_id: params.subtype_id,
    title: params.title,
    city: params.city || "",
    status: params.status,
    is_public: false,
    is_builder_listing: params.is_builder_listing,
    slug: params.slug,
    builder_project_id: params.builder_project_id,
  };

const extraUpdate: Record<string, any> = {
  description: params.description,
  price: params.price,
  city: params.city,
  state: params.state,
  address_text: params.address_text,
  geo_state_id: geoSelection.state?.id || null,
  geo_district_id: geoSelection.district?.id || null,
  geo_subdivision_id: geoSelection.subdivision?.id || null,
  geo_block_id: geoSelection.block?.id || null,
  geo_place_id: geoSelection.place?.id || null,
};
  Object.keys(extraUpdate).forEach((k) => {
    if (extraUpdate[k] === undefined) delete extraUpdate[k];
  });

  console.log("insertPropertyRow.minimalInsert =>", minimalInsert);
  console.log("insertPropertyRow.extraUpdate =>", extraUpdate);

  const apiRes = await fetch("/api/property-listings/create-draft-full", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      minimalInsert,
      extraUpdate,
    }),
    cache: "no-store",
    credentials: "same-origin",
  }).catch((e) => {
    return {
      ok: false,
      status: 500,
      json: async () => ({ error: e?.message || "Unknown API error" }),
    } as Response;
  });

  const json = await apiRes.json();

  console.log("insertPropertyRow.apiRes.status =>", apiRes.status);
  console.log("insertPropertyRow.apiRes.json =>", json);

  if (!apiRes.ok) {
    return {
      data: null,
      error: new Error(json?.error || `Draft create API failed with status ${apiRes.status}`),
    };
  }

  return {
    data: json?.data ?? null,
    error: null,
  };
}

 async function updatePropertyRow(
  id: string,
  params: {
    type_id: string;
    subtype_id: string;
    title: string;
    slug: string;
    description: string | null;
    price: number | null;
    city: string | null;
    state: string | null;
    address_text: string | null;
    cover_image_url: string | null;
    google_maps_url: string | null;
    is_builder_listing: boolean;
    builder_project_id: string | null;
  }
) {
  const payload = buildPayload();

  const base: Record<string, any> = {
    type_id: params.type_id,
    subtype_id: params.subtype_id,
    listing_intent: intent || null,
    is_builder_listing: params.is_builder_listing,
    builder_project_id: params.builder_project_id,
    title: params.title,
    slug: params.slug,
    description: params.description,
    price: params.price,
    city: params.city,
    state: params.state,
    address_text: params.address_text,
    cover_image_url: params.cover_image_url,
    google_maps_url: params.google_maps_url,
    geo_state_id: geoSelection.state?.id || null,
    geo_district_id: geoSelection.district?.id || null,
    geo_subdivision_id: geoSelection.subdivision?.id || null,
    geo_block_id: geoSelection.block?.id || null,
    geo_place_id: geoSelection.place?.id || null,

    // ✅ JSON blobs (best effort — will be auto-dropped if missing)
    location_json: payload.location,
    profile_json: payload.profile,
    pricing_json: payload.pricing,
    media_json: payload.media,
  };

  let attemptObj: Record<string, any> = { ...base };

  for (let i = 0; i < 10; i++) {
    console.log("updatePropertyRow.attempt", {
      attempt: i + 1,
      id,
      attemptObj,
    });

    let res: { data: any; error: any };

    try {
      res = await supabase
        .from("property_listings")
        .update(attemptObj as any)
        .eq("id", id)
        .select("id,status")
        .single();
    } catch (e: any) {
      res = {
        data: null,
        error: e,
      };
    }

    console.log("updatePropertyRow.response", res);

    if (!(res as any)?.error) return res as any;

    const err: any = (res as any).error;
    const msg = String(err?.message || "");

    if (!looksLikeMissingColumnError(msg)) return res as any;

    const missing = extractMissingColumnName(msg);
    if (!missing) return res as any;

    if (missing in attemptObj) {
      const copy = { ...attemptObj };
      delete copy[missing];
      attemptObj = copy;
      continue;
    }

    return res as any;
  }

  return await supabase
    .from("property_listings")
    .update(attemptObj as any)
    .eq("id", id)
    .select("id,status")
    .single();
}

  async function saveDraftSupabaseAndGoSubscription() {
    if (!userId) {
      router.replace(`/login?next=${encodeURIComponent("/property/add")}`);
      return;
    }

    const ok = await gatedProfileOrRedirect();
    if (!ok) return;

    if (!intent || !type || !subtype) {
      setSaveMsg("❌ Step 1 is incomplete. Please select Intent + Property Type + Subcategory.");
      return;
    }

    await saveDraftLocal();

    const computedTitle = computeTitle();
    const computedSlug = computeSlug();
    const priceNum = expectedPrice.trim() && !Number.isNaN(Number(expectedPrice)) ? Number(expectedPrice) : null;
    const addressText = computeAddressText();
    const coverImageUrl = cleanedMedia[0] || null;

    setSaving(true);
    setSaveMsg("Saving draft to Supabase...");

    try {
      const typeId = await resolveTypeIdOrThrow();
      const subtypeId = await resolveSubtypeIdOrThrow(typeId);

      const payload = buildPayload();

      if (!listingId) {
        const { data, error } = await insertPropertyRow({
      owner_id: userId,
      type_id: typeId,
      subtype_id: subtypeId,
      title: computedTitle,
      slug: computedSlug,
      description: uspDescription.trim() || null,
      price: priceNum,
      city: city.trim() || null,
      state: stateName.trim() || null,
      address_text: addressText || null,
      status: "draft",
      cover_image_url: coverImageUrl,
      google_maps_url: googleMapsUrl.trim() ? googleMapsUrl.trim() : null,
      is_builder_listing: isBuilderListing,
      builder_project_id: isBuilderListing ? selectedBuilderProjectId || null : null,
    });

        if (error) throw error;

        const newId = (data as any).id as string;
        setListingId(newId);
        setListingStatus(((data as any).status ?? "draft") as any);
        try {
          localStorage.setItem(`3bigha_property_last_listing_${userId}`, newId);
        } catch {} 
        if (isBuilderListing) {
          const builderPrice = priceNum;
          if (!selectedBuilderProjectId) {
            throw new Error("Please select a builder project.");
          }
          if (!selectedBuilderUnitId) {
            throw new Error("Please select a builder unit.");
          }
          if (builderPrice == null || !Number.isFinite(builderPrice) || builderPrice <= 0) {
            throw new Error("Builder listing requires a valid price.");
          }

          await syncBuilderInventoryForListing({
            listingId: newId,
            projectId: selectedBuilderProjectId,
            unitId: selectedBuilderUnitId,
            title: computedTitle,
            price: builderPrice,
          });
        }   

                if (investmentEnabled === true) {
          await upsertPropertyInvestmentOpportunity({
            listingId: newId,
            title: computedTitle,
            city: city.trim() || null,
            state: stateName.trim() || null,
          });
        }
        
          // ✅ save DB attributes (best effort)
            try {
              await savePropertyListingAttributes(newId);
              await saveRoomDetails(newId);
            } catch (e: any) {
              console.warn("Failed to save property_listing_attributes:", e?.message || e);
            }

          // ✅ save amenities (best effort)
          try {
            await saveListingAmenities(newId);
          } catch (e: any) {
            console.warn("Failed to save listing amenities:", e?.message || e);
          }
        
        // BEST EFFORT: store JSON blobs (ignore if column missing)
        await supabase
          .from("property_listings")
          .update({
            location_json: payload.location,
            profile_json: payload.profile,
            pricing_json: payload.pricing,
            media_json: payload.media,
          } as any)
          .eq("id", newId);


        try {
          await saveVendorListingMemory({
            userId,
            module: "property",
            memoryType: "workflow",

            title:
              computedTitle ||
              [type, subtype, locality, city]
                .filter(Boolean)
                .join(" - ") ||
              "Property Workflow",

            payload: {
              city,
              district,
              locality,
              subLocality,
              stateName,
              postalCode,
              streetAddress,
              plotNo,
              apartmentSociety,
              googleMapsUrl,

              intent,
              property_type: type,
              property_subtype: subtype,

              expectedPrice,
              ownership,

              saved_from: "property_add_page",
              saved_at: new Date().toISOString(),
            },
          });
        } catch (memoryErr) {
          console.error("Property memory save failed", memoryErr);
        }

        router.push(
          `/dashboard/subscription?source=property&listingId=${encodeURIComponent(newId)}&return=${encodeURIComponent(
            "/property/my"
          )}`
        );
        return;
      } else {
        const { data, error } = await updatePropertyRow(listingId, {
          type_id: typeId,
          subtype_id: subtypeId,
          title: computedTitle,
          slug: computedSlug,
          description: uspDescription.trim() || null,
          price: priceNum,
          city: city.trim() || null,
          state: stateName.trim() || null,
          address_text: addressText || null,
          cover_image_url: coverImageUrl,
          google_maps_url: googleMapsUrl.trim() ? googleMapsUrl.trim() : null,
          is_builder_listing: isBuilderListing,
          builder_project_id: isBuilderListing ? selectedBuilderProjectId || null : null,
        });

        if (error) throw error;

        const id = (data as any).id as string;
        setListingStatus(((data as any).status ?? listingStatus) as any);
        if (isBuilderListing) {
        if (!selectedBuilderProjectId) {
          throw new Error("Please select a builder project.");
        }
        if (!selectedBuilderUnitId) {
          throw new Error("Please select a builder unit.");
        }
        if (priceNum == null || !Number.isFinite(priceNum) || priceNum <= 0) {
          throw new Error("Builder listing requires a valid price.");
        }

        await syncBuilderInventoryForListing({
          listingId: id,
          projectId: selectedBuilderProjectId,
          unitId: selectedBuilderUnitId,
          title: computedTitle,
          price: priceNum,
        });
      }

              if (investmentEnabled === true) {
          await upsertPropertyInvestmentOpportunity({
            listingId: id,
            title: computedTitle,
            city: city.trim() || null,
            state: stateName.trim() || null,
          });
        }

        // ✅ save DB attributes (best effort)
        try {
          await savePropertyListingAttributes(id);
          await saveRoomDetails(id);
        } catch (e: any) {
          console.warn("Failed to save property_listing_attributes:", e?.message || e);
        }

        try {
          await saveListingAmenities(id);
        } catch (e: any) {
          console.warn("Failed to save listing amenities:", e?.message || e);
        }

        await supabase
          .from("property_listings")
          .update({
            location_json: payload.location,
            profile_json: payload.profile,
            pricing_json: payload.pricing,
            media_json: payload.media,
          } as any)
          .eq("id", id);

        router.push(
          `/dashboard/subscription?source=property&listingId=${encodeURIComponent(id)}&return=${encodeURIComponent(
            "/property/my"
          )}`
        );
      }
    } catch (e: any) {
      console.error("saveDraftSupabaseAndGoSubscription failed:", e);
      setSaveMsg(
        `❌ Supabase draft save failed: ${
          e?.message || e?.error_description || JSON.stringify(e) || "Unknown error"
        }`
      );
    } finally {
      setSaving(false);
    }
  }
async function callSubmitForReviewApi(listingId: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45000);

  try {
    const res = await fetch("/api/property/submit-for-review", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ listingId }),
      cache: "no-store",
      credentials: "same-origin",
      signal: controller.signal,
    });

    const raw = await res.text();
    let json: any = null;

    try {
      json = raw ? JSON.parse(raw) : null;
    } catch {
      json = { raw };
    }

    if (!res.ok) {
      throw new Error(
        json?.error?.message ||
          json?.error ||
          json?.message ||
          `Submit API failed with status ${res.status}`
      );
    }

    if (json?.error) {
      throw new Error(json.error?.message || json.error || "Final submit failed");
    }

    return json;
  } finally {
    clearTimeout(timer);
  }
}

async function submitForReviewSupabase() {
  if (!canSubmit || saving) return;
  setSaveMsg("");

  if (listingStatus === "approved") {
    setSaveMsg("✅ This listing is already APPROVED. No need to submit again.");
    router.replace("/property/my");
    return;
  }

  if (listingStatus === "pending") {
    setSaveMsg("ℹ️ This listing is already PENDING review.");
    router.replace("/property/my");
    return;
  }

  try {
    setSaving(true);
    console.log("SUBMIT_FOR_REVIEW_FLOW_V2_RUNNING");
    setSaveMsg("Checking business profile...");

    const ok = await gatedProfileOrRedirect();
    if (!ok) return;

    if (!intent || !type || !subtype) {
      setSaveMsg("❌ Step 1 is incomplete. Please select Intent + Property Type + Subcategory.");
      return;
    }

    let currentListingId = listingId;

    const computedTitle = computeTitle();
    const computedSlug = computeSlug();
    const priceNum =
      expectedPrice.trim() && !Number.isNaN(Number(expectedPrice))
        ? Number(expectedPrice)
        : null;
    const addressText = computeAddressText();
    const coverImageUrl = cleanedMedia[0] || null;

    if (!currentListingId) {
      setSaveMsg("Saving draft locally...");
      await saveDraftLocal();

      setSaveMsg("Resolving property type...");
      const typeId = await resolveTypeIdOrThrow();

      setSaveMsg("Resolving property subtype...");
      const subtypeId = await resolveSubtypeIdOrThrow(typeId);

      setSaveMsg("Creating draft before final submission...");
      const insertRes = await insertPropertyRow({
        owner_id: userId!,
        type_id: typeId,
        subtype_id: subtypeId,
        title: computedTitle,
        slug: computedSlug,
        description: uspDescription.trim() || null,
        price: priceNum,
        city: city.trim() || null,
        state: stateName.trim() || null,
        address_text: addressText || null,
        status: "draft",
        cover_image_url: coverImageUrl,
        google_maps_url: googleMapsUrl.trim() ? googleMapsUrl.trim() : null,
        is_builder_listing: isBuilderListing,
        builder_project_id: isBuilderListing ? selectedBuilderProjectId || null : null,
      });

      const { data, error } = insertRes;

      if (error) throw error;
      if (!data?.id) throw new Error("Draft created but listing id was not returned.");

      currentListingId = String(data.id);
      setListingId(currentListingId);
      setListingStatus(((data.status ?? "draft") as any) || "draft");

      try {
        localStorage.setItem(`3bigha_property_last_listing_${userId}`, currentListingId);
      } catch {}

      if (isBuilderListing) {
        if (!selectedBuilderProjectId) throw new Error("Please select a builder project.");
        if (!selectedBuilderUnitId) throw new Error("Please select a builder unit.");
        if (priceNum == null || !Number.isFinite(priceNum) || priceNum <= 0) {
          throw new Error("Builder listing requires a valid price.");
        }

        setSaveMsg("Syncing builder inventory...");
        await syncBuilderInventoryForListing({
          listingId: currentListingId,
          projectId: selectedBuilderProjectId,
          unitId: selectedBuilderUnitId,
          title: computedTitle,
          price: priceNum,
        });
      }

            if (investmentEnabled === true) {
        setSaveMsg("Creating investment opportunity...");
        await upsertPropertyInvestmentOpportunity({
          listingId: currentListingId,
          title: computedTitle,
          city: city.trim() || null,
          state: stateName.trim() || null,
        });
      }

      setSaveMsg("Saving specifications...");
      try {
        await savePropertyListingAttributes(currentListingId);
      } catch (e: any) {
        console.warn("Failed to save property_listing_attributes:", e?.message || e);
      }

      setSaveMsg("Saving room details...");
      try {
        await saveRoomDetails(currentListingId);
      } catch (e: any) {
        console.warn("Failed to save room details:", e?.message || e);
      }

      setSaveMsg("Saving amenities...");
      try {
        await saveListingAmenities(currentListingId);
      } catch (e: any) {
        console.warn("Failed to save listing amenities:", e?.message || e);
      }
    }

    if (!currentListingId) {
      throw new Error("Could not determine listing id for final submission.");
    }

    if (isBuilderListing) {
      const freshPriceNum =
        expectedPrice.trim() && !Number.isNaN(Number(expectedPrice))
          ? Number(expectedPrice)
          : null;

      if (!selectedBuilderProjectId) throw new Error("Please select a builder project.");
      if (!selectedBuilderUnitId) throw new Error("Please select a builder unit.");
      if (freshPriceNum == null || !Number.isFinite(freshPriceNum) || freshPriceNum <= 0) {
        throw new Error("Builder listing requires a valid price.");
      }

      setSaveMsg("Syncing builder inventory before submit...");
      await syncBuilderInventoryForListing({
        listingId: currentListingId,
        projectId: selectedBuilderProjectId,
        unitId: selectedBuilderUnitId,
        title: computeTitle(),
        price: freshPriceNum,
      });
    }

        if (investmentEnabled === true) {
      setSaveMsg("Updating investment opportunity...");
      await upsertPropertyInvestmentOpportunity({
        listingId: currentListingId,
        title: computeTitle(),
        city: city.trim() || null,
        state: stateName.trim() || null,
      });
    }

    setSaveMsg("Checking trusted media...");

    const trustedResult =
      await validateTrustedPublication(
        "property",
        mediaAssets.length,
      );

    if (!trustedResult.ok) {
      setSaveMsg(
        `❌ ${trustedResult.message}`,
      );
      return;
    }

    setSaveMsg("Submitting for review...");

    const finalRes =
      await callSubmitForReviewApi(
        currentListingId,
      );

    console.log("Final submit API result:", finalRes);

    const nextStatus =
      finalRes?.data?.status === "approved"
        ? "approved"
        : finalRes?.data?.status === "pending"
        ? "pending"
        : "pending";

    setListingStatus(nextStatus);
    setSaveMsg(
      nextStatus === "approved"
        ? "✅ Listing is already approved."
        : "✅ Submitted for Review. Status is now PENDING."
    );

    setTimeout(() => {
      router.replace("/property/my");
    }, 250);
  } catch (e: any) {
    console.error("submitForReviewSupabase failed:", e);
    setSaveMsg(
      `❌ Submit for review failed: ${
        e?.message || e?.error_description || JSON.stringify(e) || "Unknown error"
      }`
    );
  } finally {
    setSaving(false);
  }
}
  async function copyGoogleMapLink() {
    setMapMsg("");
    const link = googleMapsUrl.trim();
    if (!link) {
      setMapMsg("❌ No link to copy. Paste a Google Maps link first.");
      return;
    }
    try {
      await navigator.clipboard.writeText(link);
      setMapMsg("✅ Link copied.");
      setTimeout(() => setMapMsg(""), 2000);
    } catch {
      setMapMsg("❌ Copy failed in this browser. Please copy manually.");
    }
  }
  function toggleAmenity(id: string) {
  setSelectedAmenityIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
}

async function loadBuilderProjects() {
  if (!userId) return;

  setBuilderProjectsLoading(true);
  setBuilderProjectsError(null);

  try {
    const res = await supabase
      .from("builder_projects")
      .select("id,name,slug,status")
      .order("created_at", { ascending: false });

    if (res.error) throw res.error;

    const rows: BuilderProjectRow[] = (res.data ?? []).map((r: any) => ({
      id: String(r.id),
      name: String(r.name ?? ""),
      slug: String(r.slug ?? ""),
      status: r.status == null ? null : String(r.status),
    }));

    setBuilderProjects(rows);
  } catch (e: any) {
    setBuilderProjectsError(e?.message || "Failed to load builder projects.");
  } finally {
    setBuilderProjectsLoading(false);
  }
}

async function loadBuilderUnits(projectId: string): Promise<BuilderUnitRow[]> {
  if (!projectId) {
    setBuilderUnits([]);
    setSelectedBuilderUnitId("");
    setSelectedBuilderUnitCode("");
    return [];
  }

  setBuilderUnitsLoading(true);
  setBuilderUnitsError(null);

  try {
    const unitsRes = await supabase
      .from("builder_inventory_units")
      .select("id,project_id,unit_code,title,status")
      .eq("project_id", projectId)
      .order("unit_code", { ascending: true });

    if (unitsRes.error) throw unitsRes.error;

    const inventoryRes = await supabase
      .from("inventory_items")
      .select("id,project_id,listing_id,unit_code,title,price,availability_status")
      .eq("project_id", projectId);

    if (inventoryRes.error) throw inventoryRes.error;

    const inventoryByUnitCode = new Map<string, InventoryRow>();
    (inventoryRes.data ?? []).forEach((r: any) => {
      const code = String(r.unit_code ?? "");
      if (!code) return;
      inventoryByUnitCode.set(code, {
        id: String(r.id),
        project_id: String(r.project_id),
        listing_id: r.listing_id == null ? null : String(r.listing_id),
        unit_code: r.unit_code == null ? null : String(r.unit_code),
        title: r.title == null ? null : String(r.title),
        price: r.price == null ? null : Number(r.price),
        availability_status: r.availability_status == null ? null : String(r.availability_status),
      });
    });

    const freeUnits: BuilderUnitRow[] = (unitsRes.data ?? [])
      .map((r: any) => ({
        id: String(r.id),
        project_id: String(r.project_id),
        unit_code: r.unit_code == null ? null : String(r.unit_code),
        title: r.title == null ? null : String(r.title),
        status: r.status == null ? null : String(r.status),
      }))
      .filter((u) => {
        const code = String(u.unit_code ?? "");
        if (!code) return false;
        const inv = inventoryByUnitCode.get(code);
        if (!inv) return true;
        return !inv.listing_id || inv.listing_id === listingId;
      });

    setBuilderUnits(freeUnits);

    const selected = freeUnits.find((u) => u.id === selectedBuilderUnitId);
    if (!selected) {
      setSelectedBuilderUnitId("");
      setSelectedBuilderUnitCode("");
    }

    return freeUnits;
  } catch (e: any) {
    setBuilderUnitsError(e?.message || "Failed to load builder units.");
    setBuilderUnits([]);
    return [];
  } finally {
    setBuilderUnitsLoading(false);
  }
}

async function loadExistingBuilderInventoryLink(currentListingId: string) {
  if (!currentListingId) return;

  const res = await supabase
    .from("inventory_items")
    .select("id,project_id,listing_id,unit_code,title,price,availability_status")
    .eq("listing_id", currentListingId)
    .limit(1)
    .maybeSingle();

  if (res.error || !res.data) return;

  const row = res.data as any;
  const code = String(row.unit_code ?? "");

  if (row.project_id) {
    const projectId = String(row.project_id);
    setSelectedBuilderProjectId(projectId);
    setListingMode("builder_project");

    const loadedUnits = await loadBuilderUnits(projectId);

    const matchingUnit = loadedUnits.find((u) => String(u.unit_code ?? "") === code);
    if (matchingUnit?.id) {
      setSelectedBuilderUnitId(matchingUnit.id);
    }
  }

  if (code) setSelectedBuilderUnitCode(code);
}

async function upsertPropertyInvestmentOpportunity(args: {
  listingId: string;
  title: string;
  city: string | null;
  state: string | null;
}) {
  if (investmentEnabled !== true) return;

  const minInvestment = investmentCalc.minAmount;
  const maxInvestment = investmentCalc.maxAmount;
  const holdingMonths = toNumberOrNull(investmentHoldingMonths);

  if (minInvestment === null || minInvestment <= 0) {
    throw new Error("Investment Min Amount is required when investment is enabled.");
  }

  if (maxInvestment === null || maxInvestment <= 0) {
    throw new Error("Investment Max Amount is required when investment is enabled.");
  }

  if (maxInvestment < minInvestment) {
    throw new Error("Investment Max Amount must be greater than or equal to Min Amount.");
  }

  const res = await fetch("/api/investment/opportunities", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "same-origin",
    cache: "no-store",
    body: JSON.stringify({
      opportunityType: "inventory_investment",
      sourceType: "property",
      sourceId: args.listingId,
      title: `Investment for ${args.title}`,
      city: args.city,
      state: args.state,
      geo_state_id: geoSelection.state?.id || null,
      geo_district_id: geoSelection.district?.id || null,
      geo_subdivision_id: geoSelection.subdivision?.id || null,
      geo_block_id: geoSelection.block?.id || null,
      geo_place_id: geoSelection.place?.id || null,
      visibility: "public",
      status: "active",
      minInvestment,
      maxInvestment,
      expectedHoldingMonths: holdingMonths,
      riskLevel: investmentRiskLevel,
    }),
  });

  const json = await res.json().catch(() => null);

  if (!res.ok || !json?.ok) {
    throw new Error(json?.error || "Failed to create/update investment opportunity.");
  }
}

async function syncBuilderInventoryForListing(args: {
  listingId: string;
  projectId: string;
  unitId: string;
  title: string;
  price: number;
}) {
  const unit = builderUnits.find((u) => u.id === args.unitId);
  if (!unit?.unit_code) {
    throw new Error("Please select a valid builder unit.");
  }

  const unitCode = String(unit.unit_code);
  setSelectedBuilderUnitCode(unitCode);

  const existing = await supabase
    .from("inventory_items")
    .select("id,listing_id,project_id,unit_code")
    .eq("project_id", args.projectId)
    .eq("unit_code", unitCode)
    .limit(1)
    .maybeSingle();

  if (existing.error) throw existing.error;

  if (existing.data?.id) {
    const existingListingId = existing.data.listing_id ? String(existing.data.listing_id) : null;
    if (existingListingId && existingListingId !== args.listingId) {
      throw new Error(`Selected unit ${unitCode} is already linked to another listing.`);
    }

    const upd = await supabase
      .from("inventory_items")
      .update({
        listing_id: args.listingId,
        title: args.title,
        price: args.price,
        availability_status: "available",
      } as any)
      .eq("id", existing.data.id)
      .select("id")
      .single();

    if (upd.error) throw upd.error;
    return;
  }

  const ins = await supabase
    .from("inventory_items")
    .insert({
      project_id: args.projectId,
      listing_id: args.listingId,
      unit_code: unitCode,
      title: args.title,
      price: args.price,
      availability_status: "available",
    } as any)
    .select("id")
    .single();

  if (ins.error) throw ins.error;
}

async function loadAmenitiesMasterAndDefaults() {
  setAmenitiesError(null);
  setAmenitiesLoading(true);

  try {
    // 1) Load amenities master
    const aRes = await supabase
      .from("amenities_master")
      .select("id,category,name,sort_order,is_active")
      .eq("is_active", true)
      .order("category", { ascending: true })
      .order("sort_order", { ascending: true });

    if (aRes.error) throw aRes.error;

    const list: AmenityRow[] = (aRes.data ?? []).map((r: any) => ({
      id: String(r.id),
      category: String(r.category ?? ""),
      name: String(r.name ?? ""),
      sort_order: r.sort_order == null ? null : Number(r.sort_order),
      is_active: r.is_active == null ? null : Boolean(r.is_active),
    }));

    setAmenities(list);

    // 2) Selection default logic:
    //    - If editing (listingId exists), load from DB
    //    - Else: select ALL by default
    if (listingId) {
      const selRes = await supabase
        .from("property_listing_amenities")
        .select("amenity_id")
        .eq("listing_id", listingId);

      if (!selRes.error && Array.isArray(selRes.data)) {
        const ids = selRes.data.map((x: any) => String(x.amenity_id)).filter(Boolean);
        setSelectedAmenityIds(ids.length ? ids : list.map((a) => a.id));
      } else {
        setSelectedAmenityIds(list.map((a) => a.id));
      }
    } else {
      setSelectedAmenityIds(list.map((a) => a.id));
    }
  } catch (e: any) {
    setAmenitiesError(e?.message || "Failed to load amenities.");
  } finally {
    setAmenitiesLoading(false);
  }
}

  async function useCurrentLocation() {
    setMapMsg("");
    if (!("geolocation" in navigator)) {
      setMapMsg("❌ Geolocation not supported on this device/browser.");
      return;
    }

    setMapMsg("📍 Locating...");

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;

          const link = `https://www.google.com/maps?q=${lat},${lng}`;
          setGoogleMapsUrl(link);

          setMapMsg("📍 Getting address...");
          const data = await reverseGeocodeOSM(lat, lng);
          const a = data?.address || {};

          const autoCity = a.city || a.town || a.village || a.hamlet || a.suburb || a.municipality || a.county || "";
          const autoDistrict = a.county || a.state_district || a.city_district || a.district || a.region || "";
          const autoState = a.state || "";

          if (autoCity) setCity(String(autoCity));
          if (autoDistrict) setDistrict(String(autoDistrict));
          if (autoState) setStateName(String(autoState));
          const road = a.road || a.street || "";
const neighbourhood = a.neighbourhood || a.suburb || "";
const villageOrLocality = a.village || a.hamlet || a.town || a.suburb || a.city_district || "";
const postcode = a.postcode || "";

if (villageOrLocality && !locality.trim()) setLocality(String(villageOrLocality));
if (neighbourhood && !subLocality.trim()) setSubLocality(String(neighbourhood));
if (road && !streetAddress.trim()) setStreetAddress(String(road));
if (postcode && !postalCode.trim()) setPostalCode(String(postcode));

          setMapMsg("✅ Location captured + City/District/State filled.");
          setTimeout(() => setMapMsg(""), 2500);
        } catch (e: any) {
          setMapMsg(`❌ Location found but address lookup failed: ${e?.message || "Unknown error"}`);
        }
      },
      (err) => {
        setMapMsg(`❌ Could not get location: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }

  if (checkingAuth) {
    return (
      <main>
        <Container>
          <EmptyState message="Checking login..." />
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

  if (!userId) {
    return (
      <main>
        <Container>
          <EmptyState message="No active login found. Redirecting to login..." />
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

  return (
    <main>
      <Container>
        <SectionHeader title="Post Property" subtitle={`Step ${step} of 5`} />

        {!profileComplete ? (
          <div style={{ marginBottom: 14 }}>
            <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 14, background: "#fff" }}>
              <div style={{ fontWeight: 900, marginBottom: 6 }}>Complete your Business Profile to save drafts or submit</div>
              <div style={{ color: "#5b6472", fontSize: 13, marginBottom: 10 }}>
                You can fill the form now, but saving/submitting will redirect you to profile completion.
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <ActionButton href={`/onboarding/business?returnTo=${encodeURIComponent("/property/add")}`} variant="primary">
                  Complete Profile →
                </ActionButton>
              </div>
            </div>
          </div>
        ) : null}

        <Card>
          <CardBody>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
              <Badge>{step === 1 ? "✅ Step 1" : "Step 1"}</Badge>
              <Badge>{step === 2 ? "✅ Step 2" : "Step 2"}</Badge>
              <Badge>{step === 3 ? "✅ Step 3" : "Step 3"}</Badge>
              <Badge>{step === 4 ? "✅ Step 4" : "Step 4"}</Badge>
              <Badge>{step === 5 ? "✅ Step 5" : "Step 5"}</Badge>
              <Badge>Supabase: {listingId ? listingStatus : "not saved"}</Badge>
            </div>

            {/* STEP 1 */}
            {step === 1 ? (
              <>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>Listing Purpose</div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {(["sell", "rent", "lease", "pg"] as Intent[]).map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setIntent(k)}
                      style={{
                        height: 40,
                        padding: "0 12px",
                        borderRadius: 12,
                        border: "1px solid #e5e7eb",
                        background: intent === k ? "#111827" : "white",
                        color: intent === k ? "white" : "#111827",
                        cursor: "pointer",
                        fontWeight: 600,
                      }}
                    >
                      {k === "pg" ? "PG (Paying Guest)" : k.toUpperCase()}
                    </button>
                  ))}
                </div>
                <div style={{ marginTop: 18, fontWeight: 700, marginBottom: 8 }}>Listing Mode</div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={() => {
                      setListingMode("individual");
                      setSelectedBuilderProjectId("");
                      setSelectedBuilderUnitId("");
                      setSelectedBuilderUnitCode("");
                    }}
                    style={{
                      height: 40,
                      padding: "0 12px",
                      borderRadius: 12,
                      border: "1px solid #e5e7eb",
                      background: listingMode === "individual" ? "#111827" : "white",
                      color: listingMode === "individual" ? "white" : "#111827",
                      cursor: "pointer",
                      fontWeight: 600,
                    }}
                  >
                    Individual Listing
                  </button>

                  <button
                    type="button"
                    onClick={() => setListingMode("builder_project")}
                    style={{
                      height: 40,
                      padding: "0 12px",
                      borderRadius: 12,
                      border: "1px solid #e5e7eb",
                      background: listingMode === "builder_project" ? "#111827" : "white",
                      color: listingMode === "builder_project" ? "white" : "#111827",
                      cursor: "pointer",
                      fontWeight: 600,
                    }}
                  >
                    Builder Project Listing
                  </button>
                </div>

                {listingMode === "builder_project" ? (
                  <div style={{ marginTop: 14 }}>
                    <FieldLabel
                      title="Select Builder Project"
                      required
                      hint="Only your own builder projects are shown."
                    />

                    {builderProjectsLoading ? (
                      <div style={{ color: "#6b7280", fontSize: 13, marginTop: 8 }}>Loading builder projects…</div>
                    ) : builderProjectsError ? (
                      <div style={{ color: "#b91c1c", fontWeight: 800, marginTop: 8 }}>{builderProjectsError}</div>
                    ) : (
                      <Select
                        value={selectedBuilderProjectId}
                        onChange={setSelectedBuilderProjectId}
                        options={[
                          { value: "", label: "Select builder project..." },
                          ...builderProjects.map((p) => ({
                            value: p.id,
                            label: `${p.name}${p.status ? ` (${p.status})` : ""}`,
                          })),
                        ]}
                      />
                    )}
                  </div>
                ) : null}

                <div style={{ marginTop: 18, fontWeight: 700, marginBottom: 8 }}>Property Type</div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {(["Land / Plot", "House(s)"] as PropertyType[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setType(t)}
                      style={{
                        height: 40,
                        padding: "0 12px",
                        borderRadius: 12,
                        border: "1px solid #e5e7eb",
                        background: type === t ? "#111827" : "white",
                        color: type === t ? "white" : "#111827",
                        cursor: "pointer",
                        fontWeight: 600,
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                <div style={{ marginTop: 18, fontWeight: 700, marginBottom: 8 }}>
                  Subcategory{" "}
                  {type ? (
                    <span style={{ marginLeft: 8 }}>
                      <Badge>{type}</Badge>
                    </span>
                  ) : null}
                </div>

                {!type ? (
                  <div style={{ color: "#5b6472", fontSize: 13 }}>Please select a Property Type to see subcategories.</div>
                ) : (
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {subtypeList(type).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setSubtype(s)}
                        style={{
                          height: 40,
                          padding: "0 12px",
                          borderRadius: 12,
                          border: "1px solid #e5e7eb",
                          background: subtype === s ? "#111827" : "white",
                          color: subtype === s ? "white" : "#111827",
                          cursor: "pointer",
                          fontWeight: 600,
                        }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : null}

            {/* STEP 2 */}
            {step === 2 ? (
              <>
                <div style={{ fontWeight: 800, marginBottom: 6 }}>Location Details</div>
                <div style={{ color: "#5b6472", fontSize: 13 }}>
                  Select State, District, Block and City / Place from 3Bigha geography database. Type only landmark or society if needed.
                </div>

                {recentPropertyMemory.length > 0 ? (
                  <details style={{ marginTop: 14, marginBottom: 12 }}>
                    <summary style={{ cursor: "pointer", fontWeight: 900, color: "#1d4ed8" }}>
                      📍 Smart Location Suggestions
                    </summary>

                    <div
                      style={{
                        marginTop: 10,
                        border: "1px solid #dbeafe",
                        background: "#f8fbff",
                        borderRadius: 12,
                        padding: 10,
                      }}
                    >

                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 8,
                      }}
                    >
                      {smartPropertySuggestions.map((suggestion) => {
                        const memory = suggestion.memory;

                        return (
                          <button
                            key={suggestion.key}
                            type="button"
                            onClick={() => applyPropertyMemory(memory)}
                            style={{
                              border: "1px solid #bfdbfe",
                              background: "#fff",
                              borderRadius: 999,
                              padding: "8px 12px",
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: "pointer",
                              textAlign: "left",
                            }}
                          >
                            <div style={{ fontWeight: 800 }}>
                              {suggestion.title}
                            </div>

                            <div
                              style={{
                                marginTop: 2,
                                fontSize: 10,
                                opacity: 0.72,
                                fontWeight: 600,
                              }}
                            >
                              {suggestion.reason}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    <div
                      style={{
                        marginTop: 8,
                        fontSize: 11,
                        opacity: 0.72,
                      }}
                    >
                      Smart suggestions based on your frequently reused property location and pricing workflows.
                    </div>
                    </div>
                  </details>
                ) : null}


                <AddressEngine
                  value={{
                    geography: geoSelection,
                    house_flat_plot_no: plotNo,
                    building_market_name: apartmentSociety,
                    street_road_locality: streetAddress,
                    landmark: locality || subLocality || "",
                  }}
                  disabled={saving}
                  onChange={(nextAddress) => {
                    const geo = nextAddress.geography || {};
                    setGeoSelection(geo as GeoSelection);

                    setStateName(geo.state?.name || "");
                    setDistrict(geo.district?.name || "");
                    setCity(geo.place?.name || geo.district?.name || "");

                    if (geo.place?.pincode) setPostalCode(geo.place.pincode);
                    if (nextAddress.house_flat_plot_no !== undefined) setPlotNo(nextAddress.house_flat_plot_no || "");
                    if (nextAddress.building_market_name !== undefined) setApartmentSociety(nextAddress.building_market_name || "");
                    if (nextAddress.street_road_locality !== undefined) setStreetAddress(nextAddress.street_road_locality || "");
                    if (nextAddress.landmark !== undefined) setLocality(nextAddress.landmark || "");
                  }}
                />

                <FieldLabel title="Apartment / Society (optional)" />
                <TextInput value={apartmentSociety} onChange={setApartmentSociety} placeholder="e.g., ABC Society" />

                <FieldLabel title="Locality / Landmark" required hint="If your exact locality is not listed above, type it here." />
                <TextInput value={locality} onChange={setLocality} placeholder="e.g., Khagrabari, Near Station, Ward No. 5" />

                <FieldLabel title="Sub Locality" hint="Optional nearby detail" />
                <TextInput value={subLocality} onChange={setSubLocality} placeholder="e.g., Near NH-17" />

                <FieldLabel title="Plot No. (optional)" />
                <TextInput value={plotNo} onChange={setPlotNo} placeholder="e.g., Plot 12" />

                <FieldLabel title="Street Address (optional)" />
                <TextInput value={streetAddress} onChange={setStreetAddress} placeholder="Street address" />

                <FieldLabel
                  title="Google Location Map Link (optional)"
                  hint="Paste Google Maps share link OR click “Use my current location”."
                />
                <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr auto auto", marginTop: 8 }}>
                  <div>
                    <input
                      value={googleMapsUrl}
                      onChange={(e) => setGoogleMapsUrl(e.target.value)}
                      placeholder="https://maps.app.goo.gl/..."
                      style={{
                        width: "100%",
                        height: 44,
                        borderRadius: 12,
                        border: "1px solid #e5e7eb",
                        padding: "0 14px",
                        outline: "none",
                        background: "white",
                        fontSize: 14,
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={copyGoogleMapLink}
                    style={{
                      height: 44,
                      padding: "0 12px",
                      borderRadius: 12,
                      border: "1px solid #e5e7eb",
                      background: "white",
                      cursor: "pointer",
                      fontWeight: 900,
                    }}
                  >
                    Copy link
                  </button>
                  <button
                    type="button"
                    onClick={useCurrentLocation}
                    style={{
                      height: 44,
                      padding: "0 12px",
                      borderRadius: 12,
                      border: "1px solid #e5e7eb",
                      background: "#111827",
                      color: "white",
                      cursor: "pointer",
                      fontWeight: 900,
                    }}
                  >
                    Use my location
                  </button>
                </div>

                {mapMsg ? (
                  <div style={{ marginTop: 8, fontWeight: 800, color: mapMsg.startsWith("✅") ? "#065f46" : "#b91c1c" }}>
                    {mapMsg}
                  </div>
                ) : null}

                <FieldLabel
                  title="Auto Address Preview (saved automatically)"
                  hint="This is what will be saved as address_text in Supabase."
                />
                <input
                  value={addressPreview}
                  readOnly
                  style={{
                    width: "100%",
                    height: 44,
                    borderRadius: 12,
                    border: "1px solid #e5e7eb",
                    padding: "0 14px",
                    outline: "none",
                    background: "#f9fafb",
                    fontSize: 14,
                    marginTop: 8,
                    color: "#111827",
                  }}
                />

                <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr", marginTop: 12 }}>
                  <div>
                    <FieldLabel title="Postal / Zip Code (optional)" />
                    <TextInput value={postalCode} onChange={setPostalCode} placeholder="e.g., 736101" />
                  </div>
                </div>
              </>
            ) : null}

{/* STEP 3 */}
{step === 3 ? (
  <>
    <div style={{ fontWeight: 800, marginBottom: 6 }}>Property Profile</div>

    {type === "Land / Plot" ? (
      <>
        <FieldLabel title="Plot Area" required />
        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" }}>
          <TextInput value={plotArea} onChange={setPlotArea} placeholder="Enter plot area" inputMode="decimal" />
          <Select
            value={plotAreaUnit}
            onChange={(v) => setPlotAreaUnit(v as AreaUnit)}
            options={[
              { value: "Sq. ft.", label: "Sq. ft." },
              { value: "Sq. mtr.", label: "Sq. mtr." },
            ]}
          />
        </div>

        <FieldLabel title="Property Dimension (optional)" hint="Length of Plot and Breadth of Plot" />
        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" }}>
          <div>
            <div style={{ marginTop: 8, fontWeight: 700, fontSize: 13 }}>Length of Plot</div>
            <TextInput value={lengthOfPlot} onChange={setLengthOfPlot} placeholder="Length" inputMode="decimal" />
          </div>
          <div>
            <div style={{ marginTop: 8, fontWeight: 700, fontSize: 13 }}>Breadth of Plot</div>
            <TextInput value={breadthOfPlot} onChange={setBreadthOfPlot} placeholder="Breadth" inputMode="decimal" />
          </div>
        </div>

        <div style={{ marginTop: 10 }}>
          <div style={{ fontWeight: 700 }}>Dimension Unit</div>
          <Select
            value={dimensionUnit}
            onChange={(v) => setDimensionUnit(v as AreaUnit)}
            options={[
              { value: "Sq. ft.", label: "Sq. ft." },
              { value: "Sq. mtr.", label: "Sq. mtr." },
            ]}
          />
        </div>

        <ToggleRow
          label="Is there a boundary / guard wall around the property?"
          value={boundaryWall}
          onChange={setBoundaryWall}
        />

        <FieldLabel title="Nos. of open sides" required />
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 8 }}>
          {(["1", "2", "3", "3+"] as OpenSides[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setOpenSides(k)}
              style={{
                height: 40,
                padding: "0 12px",
                borderRadius: 12,
                border: "1px solid #e5e7eb",
                background: openSides === k ? "#111827" : "white",
                color: openSides === k ? "white" : "#111827",
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              {k}
            </button>
          ))}
        </div>

        <ToggleRow
          label="Any construction done on this property?"
          value={anyConstruction}
          onChange={setAnyConstruction}
        />

        <FieldLabel title="Possession by" required />
        <Select
          value={possession}
          onChange={(v) => setPossession(v as Possession)}
          options={[
            { value: "", label: "Select..." },
            { value: "Immediate", label: "Immediate" },
            { value: "Within 3 months", label: "Within 3 months" },
            { value: "Within 6 months", label: "Within 6 months" },
            { value: "By 2026", label: "By 2026" },
            { value: "By 2027", label: "By 2027" },
            { value: "By 2028", label: "By 2028" },
          ]}
        />
      </>
    ) : (
      <>
        <FieldLabel title="Area unit for built-up/carpet" />
        <Select
          value={dynAreaUnit}
          onChange={(v) => setDynAreaUnit(v as AreaUnit)}
          options={[
            { value: "Sq. ft.", label: "Sq. ft." },
            { value: "Sq. mtr.", label: "Sq. mtr." },
          ]}
        />

        <div
          style={{
            marginTop: 12,
            padding: 12,
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            background: "#fafafa",
          }}
        >
          <div style={{ fontWeight: 900, marginBottom: 6 }}>
            Built property details <span style={{ color: "#6b7280" }}>({subtype || "House"})</span>
          </div>
          <div style={{ color: "#5b6472", fontSize: 13 }}>
            These fields change automatically based on Subcategory.
          </div>
        </div>

        {builtAttrDefs.map((def) => (
          <div key={def.key}>
            {renderDynField({
              def,
              value: dynamicAttributes[def.key],
              setValue: (v) =>
                setDynamicAttributes((prev) => ({
                  ...prev,
                  [def.key]: v,
                })),
            })}
          </div>
        ))}

        <div style={{ marginTop: 18, paddingTop: 12, borderTop: "1px solid #e5e7eb" }}>
          <div style={{ fontWeight: 900, marginBottom: 8 }}>Unit No. / Flat No. (Manual)</div>
          <div style={{ color: "#5b6472", fontSize: 13, marginBottom: 10 }}>
            For individual listing, manual entry is enough (example: A-01, Flat 203, House 12, Plot P-07).
          </div>

          <input
            value={manualUnitNo}
            onChange={(e) => setManualUnitNo(e.target.value)}
            placeholder="e.g., Flat 203 / A-01 / House 12"
            style={{
              width: "100%",
              height: 44,
              borderRadius: 12,
              border: "1px solid #e5e7eb",
              padding: "0 14px",
              outline: "none",
              background: "white",
              fontSize: 14,
            }}
          />
        </div>

        <div style={{ marginTop: 18, paddingTop: 12, borderTop: "1px solid #e5e7eb" }}>
          <div style={{ fontWeight: 900, marginBottom: 10 }}>5) Fill Details (Builder-style)</div>

          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
            <div>
              <div style={{ fontWeight: 800, marginBottom: 6 }}>Floor</div>
              <TextInput value={unitMetaFloor} onChange={setUnitMetaFloor} placeholder="e.g. 5" inputMode="numeric" />
            </div>

            <div>
              <div style={{ fontWeight: 800, marginBottom: 6 }}>Total floors in Tower</div>
              <TextInput
                value={unitMetaTotalFloors}
                onChange={setUnitMetaTotalFloors}
                placeholder="e.g. 12"
                inputMode="numeric"
              />
            </div>

            <div>
              <div style={{ fontWeight: 800, marginBottom: 6 }}>Flats / Apartments in this floor</div>
              <TextInput
                value={unitMetaFlatsOnFloor}
                onChange={setUnitMetaFlatsOnFloor}
                placeholder="e.g. 4"
                inputMode="numeric"
              />
            </div>

            <div>
              <div style={{ fontWeight: 800, marginBottom: 6 }}>Start Flat No. (within this floor)</div>
              <TextInput
                value={unitMetaStartFlatNo}
                onChange={setUnitMetaStartFlatNo}
                placeholder="e.g. 1"
                inputMode="numeric"
              />
              <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>
                Example: Start 1 + Qty 4 → 401, 402, 403, 404 (builder inventory can use this later)
              </div>
            </div>

            <div>
              <div style={{ fontWeight: 800, marginBottom: 6 }}>Tower / Block (optional)</div>
              <TextInput value={unitMetaTower} onChange={setUnitMetaTower} placeholder="e.g. Tower B" />
            </div>
          </div>
        </div>

        <div style={{ marginTop: 18, paddingTop: 12, borderTop: "1px solid #e5e7eb" }}>
          <div style={{ fontWeight: 900, marginBottom: 10 }}>6) Unit Code / Unit No.</div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
            <button
              type="button"
              onClick={() => setUnitCodeMode("auto")}
              style={{
                height: 40,
                padding: "0 12px",
                borderRadius: 12,
                border: "1px solid #e5e7eb",
                background: unitCodeMode === "auto" ? "#111827" : "white",
                color: unitCodeMode === "auto" ? "white" : "#111827",
                cursor: "pointer",
                fontWeight: 800,
              }}
            >
              Auto (Series)
            </button>

            <button
              type="button"
              onClick={() => setUnitCodeMode("manual")}
              style={{
                height: 40,
                padding: "0 12px",
                borderRadius: 12,
                border: "1px solid #e5e7eb",
                background: unitCodeMode === "manual" ? "#111827" : "white",
                color: unitCodeMode === "manual" ? "white" : "#111827",
                cursor: "pointer",
                fontWeight: 800,
              }}
            >
              Manual (Single)
            </button>
          </div>

          {unitCodeMode === "auto" ? (
            <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
              <div>
                <div style={{ fontWeight: 800, marginBottom: 6 }}>Prefix (Tower/Letter/Plot/House)</div>
                <TextInput value={unitCodePrefix} onChange={setUnitCodePrefix} placeholder="e.g. B" />
              </div>

              <div>
                <div style={{ fontWeight: 800, marginBottom: 6 }}>Start No</div>
                <TextInput
                  value={unitCodeStartNo}
                  onChange={setUnitCodeStartNo}
                  placeholder="e.g. 1"
                  inputMode="numeric"
                />
              </div>

              <div>
                <div style={{ fontWeight: 800, marginBottom: 6 }}>Digits (01 / 001)</div>
                <TextInput
                  value={unitCodeDigits}
                  onChange={setUnitCodeDigits}
                  placeholder="e.g. 2"
                  inputMode="numeric"
                />
              </div>

              <div>
                <div style={{ fontWeight: 800, marginBottom: 6 }}>Preview</div>
                <div
                  style={{
                    height: 44,
                    display: "flex",
                    alignItems: "center",
                    padding: "0 14px",
                    border: "1px solid #e5e7eb",
                    borderRadius: 12,
                    background: "#fafafa",
                    fontWeight: 900,
                  }}
                >
                  {computedUnitCode || "—"}
                </div>
                <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>
                  This helps future inventory pricing / linking (like builder flow).
                </div>
              </div>
            </div>
          ) : (
            <div style={{ maxWidth: 420 }}>
              <div style={{ fontWeight: 800, marginBottom: 6 }}>Unit code (manual)</div>
              <TextInput value={unitCodeManual} onChange={setUnitCodeManual} placeholder="e.g. B-503" />
              <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>
                Saved as unit_code.computed = "{computedUnitCode || ""}"
              </div>
            </div>
          )}
        </div>

        <div style={{ marginTop: 18, paddingTop: 12, borderTop: "1px solid #e5e7eb" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <div style={{ fontWeight: 900 }}>7) Detailed Room Configuration (Optional)</div>
            <button
              type="button"
              onClick={() => setShowRoomConfig((v) => !v)}
              style={{
                height: 40,
                padding: "0 12px",
                borderRadius: 12,
                border: "1px solid #e5e7eb",
                background: "white",
                cursor: "pointer",
                fontWeight: 900,
              }}
            >
              {showRoomConfig ? "Hide Detailed Room Configuration" : "Show Detailed Room Configuration"}
            </button>
          </div>

          {showRoomConfig ? (
            <div style={{ marginTop: 12 }}>
              <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
                {(Object.keys(ROOM_LABELS) as RoomKey[]).map((k) => (
                  <div
                    key={k}
                    style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 12, background: "white" }}
                  >
                    <div style={{ fontWeight: 900, marginBottom: 6 }}>{ROOM_LABELS[k]}</div>
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <input
                        type="number"
                        value={roomCounts[k]}
                        min={0}
                        onChange={(e) => {
                          const n = Math.max(0, Number(e.target.value || "0"));
                          setRoomCounts((p) => ({ ...p, [k]: n }));
                          ensureRoomArray(k, n);
                        }}
                        style={{
                          width: 120,
                          height: 40,
                          borderRadius: 12,
                          border: "1px solid #e5e7eb",
                          padding: "0 12px",
                        }}
                      />
                      <div style={{ fontSize: 12, opacity: 0.7 }}>Count</div>
                    </div>

                    {roomDetails[k]?.length ? (
                      <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                        {roomDetails[k].map((r, idx) => (
                          <div
                            key={idx}
                            style={{ border: "1px solid #f0f0f0", borderRadius: 12, padding: 10, background: "#fafafa" }}
                          >
                            <div style={{ fontWeight: 800, marginBottom: 8 }}>
                              {ROOM_LABELS[k]} {idx + 1}
                            </div>

                            <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr 1fr" }}>
                              <input
                                value={r.length_ft}
                                onChange={(e) =>
                                  setRoomDetails((p) => {
                                    const next = [...(p[k] || [])];
                                    next[idx] = { ...next[idx], length_ft: e.target.value };
                                    return { ...p, [k]: next };
                                  })
                                }
                                placeholder="Length (ft)"
                                style={{ height: 40, borderRadius: 12, border: "1px solid #e5e7eb", padding: "0 12px" }}
                              />
                              <input
                                value={r.width_ft}
                                onChange={(e) =>
                                  setRoomDetails((p) => {
                                    const next = [...(p[k] || [])];
                                    next[idx] = { ...next[idx], width_ft: e.target.value };
                                    return { ...p, [k]: next };
                                  })
                                }
                                placeholder="Width (ft)"
                                style={{ height: 40, borderRadius: 12, border: "1px solid #e5e7eb", padding: "0 12px" }}
                              />
                              <input
                                value={r.area_sqft}
                                onChange={(e) =>
                                  setRoomDetails((p) => {
                                    const next = [...(p[k] || [])];
                                    next[idx] = { ...next[idx], area_sqft: e.target.value };
                                    return { ...p, [k]: next };
                                  })
                                }
                                placeholder="Area (sqft)"
                                style={{ height: 40, borderRadius: 12, border: "1px solid #e5e7eb", padding: "0 12px" }}
                              />
                            </div>

                            <textarea
                              value={r.notes}
                              onChange={(e) =>
                                setRoomDetails((p) => {
                                  const next = [...(p[k] || [])];
                                  next[idx] = { ...next[idx], notes: e.target.value };
                                  return { ...p, [k]: next };
                                })
                              }
                              placeholder="Notes (optional)"
                              style={{
                                width: "100%",
                                minHeight: 80,
                                marginTop: 10,
                                borderRadius: 12,
                                border: "1px solid #e5e7eb",
                                padding: 10,
                              }}
                            />

                            <div style={{ marginTop: 10 }}>
                              <div style={{ fontWeight: 800, marginBottom: 6 }}>Room Photos (UI only here)</div>
                              <input
                                type="file"
                                multiple
                                accept="image/*"
                                onChange={(e) => {
                                  const files = Array.from(e.target.files || []);
                                  setRoomDetails((p) => {
                                    const next = [...(p[k] || [])];
                                    next[idx] = { ...next[idx], photos: files };
                                    return { ...p, [k]: next };
                                  });
                                }}
                              />
                              <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>
                                Selected: {(r.photos || []).length} file(s)
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>

              <div style={{ fontSize: 12, opacity: 0.7, marginTop: 10 }}>
                Note: This page currently stores room-photo selection count only (not uploaded). If you want same upload
                behavior as builder (Supabase Storage), we’ll add it next.
              </div>
            </div>
          ) : null}
        </div>
      </>
    )}

    {/* ========================================================= */}
    {/* ✅ NEW: DB-DRIVEN DYNAMIC SPECIFICATIONS (COMMON FOR BOTH) */}
    {/* ========================================================= */}
    <div style={{ marginTop: 22, paddingTop: 14, borderTop: "1px solid #e5e7eb" }}>
      <div style={{ fontWeight: 900, marginBottom: 10, fontSize: 16 }}>Additional Specifications</div>

      {dbAttrLoading ? (
        <div style={{ opacity: 0.7 }}>Loading specifications…</div>
      ) : dbAttrErr ? (
        <div style={{ color: "crimson", fontWeight: 700 }}>{dbAttrErr}</div>
      ) : dbAttrDefs.length === 0 ? (
        <div style={{ opacity: 0.7 }}>No additional specifications configured for this property type.</div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 12,
          }}
        >
          {dbAttrDefs.map((a) => {
            const v = dbAttrValues[a.id];
            if (!v) return null;

            return (
              <div key={a.id}>
                <label style={{ fontWeight: 800, display: "block", marginBottom: 6 }}>
                  {a.name}
                  {a.is_required ? <span style={{ color: "crimson" }}> *</span> : null}
                  {a.unit ? ` (${a.unit})` : ""}
                </label>

                {a.input_type === "text" && (
                  <input
                    value={v.value_text ?? ""}
                    onChange={(e) =>
                      setDbAttrValues((p) => ({
                        ...p,
                        [a.id]: { ...p[a.id], value_text: e.target.value },
                      }))
                    }
                    placeholder="Enter value"
                    style={{
                      width: "100%",
                      height: 44,
                      borderRadius: 12,
                      border: "1px solid #e5e7eb",
                      padding: "0 14px",
                      outline: "none",
                      background: "white",
                      fontSize: 14,
                    }}
                  />
                )}

                {a.input_type === "number" && (
                  <input
                    type="number"
                    value={v.value_number ?? ""}
                    onChange={(e) =>
                      setDbAttrValues((p) => ({
                        ...p,
                        [a.id]: { ...p[a.id], value_number: e.target.value },
                      }))
                    }
                    placeholder="Enter number"
                    style={{
                      width: "100%",
                      height: 44,
                      borderRadius: 12,
                      border: "1px solid #e5e7eb",
                      padding: "0 14px",
                      outline: "none",
                      background: "white",
                      fontSize: 14,
                    }}
                  />
                )}

                {a.input_type === "boolean" && (
                  <select
                    value={v.value_bool == null ? "" : v.value_bool ? "yes" : "no"}
                    onChange={(e) =>
                      setDbAttrValues((p) => ({
                        ...p,
                        [a.id]: {
                          ...p[a.id],
                          value_bool: e.target.value === "" ? null : e.target.value === "yes",
                        },
                      }))
                    }
                    style={{
                      width: "100%",
                      height: 44,
                      borderRadius: 12,
                      border: "1px solid #e5e7eb",
                      padding: "0 14px",
                      outline: "none",
                      background: "white",
                      fontSize: 14,
                    }}
                  >
                    <option value="">— Select —</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                )}

                {a.input_type === "single_select" || a.input_type === "multi_select" ? (
                  <select
                    multiple={a.input_type === "multi_select"}
                    value={Array.isArray(v.value_ids) ? v.value_ids : []}
                    onChange={(e) => {
                      const ids = Array.from(e.target.selectedOptions).map((o) => o.value);
                      setDbAttrValues((p) => ({
                        ...p,
                        [a.id]: { ...p[a.id], value_ids: ids },
                      }));
                    }}
                    style={{
                      width: "100%",
                      height: a.input_type === "multi_select" ? 140 : 44,
                      paddingTop: a.input_type === "multi_select" ? 10 : 0,
                      paddingBottom: a.input_type === "multi_select" ? 10 : 0,
                      borderRadius: 12,
                      border: "1px solid #e5e7eb",
                      paddingLeft: 14,
                      paddingRight: 14,
                      outline: "none",
                      background: "white",
                      fontSize: 14,
                    }}
                  >
                    {a.input_type === "single_select" ? <option value="">— Select —</option> : null}

                    {(dbAttrOptions[a.id] ?? []).length === 0 ? (
                      <option value="" disabled>
                        No options configured
                      </option>
                    ) : (
                      (dbAttrOptions[a.id] ?? []).map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.value}
                        </option>
                      ))
                    )}
                  </select>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>

    {/* ================= AMENITIES (LISTING) ================= */}
    <div style={{ marginTop: 22, paddingTop: 14, borderTop: "1px solid #e5e7eb" }}>
      <div style={{ fontWeight: 900, marginBottom: 8, fontSize: 16 }}>Amenities (select what is available)</div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 10 }}>
        <ActionButton variant="secondary" onClick={() => setShowAmenities((v) => !v)} disabled={amenitiesLoading}>
          {showAmenities ? "Hide Amenities" : "Show Amenities"}
        </ActionButton>

        <ActionButton
          variant="secondary"
          onClick={() => setSelectedAmenityIds(amenities.map((a) => a.id))}
          disabled={saving || amenitiesLoading || amenities.length === 0}
        >
          Select All
        </ActionButton>

        <ActionButton
          variant="secondary"
          onClick={() => runPropertyFieldAI("amenities")}
          disabled={saving || aiSmartFillLoading || amenitiesLoading || amenities.length === 0}
        >
          {aiSmartFillLoading ? "AI working..." : "✨ AI Select"}
        </ActionButton>

        <ActionButton
          variant="secondary"
          onClick={() => setSelectedAmenityIds([])}
          disabled={saving || amenitiesLoading || amenities.length === 0}
        >
          Clear All
        </ActionButton>

        <div style={{ fontSize: 12, opacity: 0.75 }}>
          Selected: <b>{selectedAmenityIds.length}</b> / {amenities.length}
        </div>
      </div>

      {amenitiesLoading ? (
        <div style={{ opacity: 0.7 }}>Loading amenities…</div>
      ) : amenitiesError ? (
        <div style={{ color: "crimson", fontWeight: 800 }}>{amenitiesError}</div>
      ) : !showAmenities ? (
        <div style={{ fontSize: 13, opacity: 0.75 }}>
          Amenities are hidden. Click <b>Show Amenities</b> to review and uncheck unwanted items.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {amenitiesByCategory.map(([cat, items]) => (
            <div key={cat} style={{ padding: 12, border: "1px solid #eee", borderRadius: 12 }}>
              <div style={{ fontWeight: 800, marginBottom: 10, textTransform: "capitalize" }}>{cat.replace(/_/g, " ")}</div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {items.map((a) => (
                  <label key={a.id} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <input
                      type="checkbox"
                      checked={selectedAmenityIds.includes(a.id)}
                      onChange={() => toggleAmenity(a.id)}
                      disabled={saving}
                    />
                    <span>{a.name}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ fontSize: 12, opacity: 0.7, marginTop: 8 }}>
        Default is ALL selected. Uncheck what your property does not have.
      </div>
    </div>
    {/* ================= END AMENITIES ================= */}
  </>
) : null}
            {/* STEP 4 */}
            {step === 4 ? (
              <>
                <div style={{ fontWeight: 800, marginBottom: 6 }}>Price & Features</div>

                <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
                  <button
                    type="button"
                    onClick={runFullPropertyAI}
                    disabled={saving || aiSmartFillLoading}
                    style={{
                      padding: "10px 16px",
                      borderRadius: 12,
                      border: "1px solid #111827",
                      background: "#111827",
                      color: "white",
                      fontWeight: 900,
                      cursor: saving || aiSmartFillLoading ? "not-allowed" : "pointer",
                      opacity: saving || aiSmartFillLoading ? 0.7 : 1,
                    }}
                  >
                    {aiSmartFillLoading ? "AI working..." : "🚀 Auto Generate Full Listing"}
                  </button>
                </div>

                <FieldLabel title="Ownership" required />
                <Select
                  value={ownership}
                  onChange={(v) => setOwnership(v as Ownership)}
                  options={[
                    { value: "", label: "Select..." },
                    { value: "Freehold", label: "Freehold" },
                    { value: "Lease hold", label: "Lease hold" },
                    { value: "Co-op. Society", label: "Co-op. Society" },
{ value: "Power of Attorney", label: "Power of Attorney" },
                  ]}
                />

                <FieldLabel title="Approval Authority (optional)" hint="e.g., Municipality / Panchayat / CIDCO / RERA etc." />
                <TextInput value={approvalAuthority} onChange={setApprovalAuthority} placeholder="Approval authority (optional)" />

                <FieldLabel title="Expected Price (₹)" required />
                <TextInput
                  value={expectedPrice}
                  onChange={(v) => setExpectedPrice(v.replace(/[^\d]/g, ""))}
                  placeholder="e.g., 1600000"
                  inputMode="numeric"
                />
                {expectedPrice.trim() ? (
                  <div style={{ marginTop: 8, color: "#374151", fontWeight: 700, fontSize: 13 }}>
                    {formatINR(Number(expectedPrice || 0))}{" "}
                    <span style={{ color: "#6b7280", fontWeight: 600 }}>
                      ({inrWordsFromInput(expectedPrice)} only)
                    </span>
                  </div>
                ) : null}
                {listingMode === "builder_project" ? (
                  <div style={{ marginTop: 18, paddingTop: 12, borderTop: "1px solid #e5e7eb" }}>
                    <div style={{ fontWeight: 900, marginBottom: 8 }}>Builder Inventory Link</div>

                    <FieldLabel
                      title="Select Builder Unit"
                      required
                      hint="This unit will be linked to the listing and inventory will be created/updated automatically."
                    />

                    {builderUnitsLoading ? (
                      <div style={{ color: "#6b7280", fontSize: 13, marginTop: 8 }}>Loading builder units…</div>
                    ) : builderUnitsError ? (
                      <div style={{ color: "#b91c1c", fontWeight: 800, marginTop: 8 }}>{builderUnitsError}</div>
                    ) : !selectedBuilderProjectId ? (
                      <div style={{ color: "#6b7280", fontSize: 13, marginTop: 8 }}>Select a builder project first.</div>
                    ) : (
                      <Select
                        value={selectedBuilderUnitId}
                        onChange={setSelectedBuilderUnitId}
                        options={[
                          { value: "", label: "Select builder unit..." },
                          ...builderUnits.map((u) => ({
                            value: u.id,
                            label: `${u.unit_code || "No Code"}${u.title ? ` — ${u.title}` : ""}${u.status ? ` (${u.status})` : ""}`,
                          })),
                        ]}
                      />
                    )}

                    <div style={{ marginTop: 10, color: "#6b7280", fontSize: 13 }}>
                      Selected unit code: <b>{selectedBuilderUnitCode || "—"}</b>
                    </div>
                  </div>
                ) : null}

                <FieldLabel
                  title={`Price per ${type === "Land / Plot" ? unitLabel(plotAreaUnit) : unitLabel(dynAreaUnit)} (optional)`}
                  hint="Auto-calculated for Land/Plot from Expected Price ÷ Plot Area. You can override."
                />
                <TextInput
                  value={pricePerUnit}
                  onChange={(v) => {
                    setPricePerUnitTouched(true);
                    setPricePerUnit(v.replace(/[^\d]/g, ""));
                  }}
                  placeholder="e.g., 1200"
                  inputMode="numeric"
                />

                <ToggleRow label="All inclusive price?" value={allInclusive} onChange={setAllInclusive} />
                <ToggleRow label="Price negotiable?" value={priceNegotiable} onChange={setPriceNegotiable} />

                <div
                  style={{
                    marginTop: 12,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-end",
                    gap: 10,
                    flexWrap: "wrap",
                  }}
                >
                  <FieldLabel title="USP / Description (optional)" hint="Write a short selling point / description." />

                  <button
                    type="button"
                    onClick={generatePropertyDescriptionWithAI}
                    disabled={aiSmartFillLoading || saving}
                    style={{
                      height: 36,
                      padding: "0 12px",
                      borderRadius: 12,
                      border: "1px solid #e5e7eb",
                      background: aiSmartFillLoading ? "#f3f4f6" : "white",
                      color: "#111827",
                      cursor: aiSmartFillLoading || saving ? "not-allowed" : "pointer",
                      fontWeight: 900,
                      fontSize: 13,
                      opacity: aiSmartFillLoading || saving ? 0.7 : 1,
                    }}
                  >
                    {aiSmartFillLoading ? "Generating..." : uspDescription.trim() ? "✨ Refine with AI" : "✨ Generate with AI"}
                  </button>
                </div>

                <TextArea value={uspDescription} onChange={setUspDescription} placeholder="e.g., Near highway, ready to move..." />

                {/* Labels */}
                <div style={{ marginTop: 18, paddingTop: 12, borderTop: "1px solid #e5e7eb" }}>
                  <div style={{ fontWeight: 900, marginBottom: 8 }}>Labels (optional)</div>

                  <ToggleRow label="Best Deal?" value={bestDealEnabled} onChange={setBestDealEnabled} />
                  {bestDealEnabled === true ? (
                    <>
                      <FieldLabel title="Why Best Deal?" />
                      <div style={{ display: "grid", gap: 8, gridTemplateColumns: "1fr auto", alignItems: "end" }}>
                <TextInput value={bestDealReason} onChange={setBestDealReason} placeholder="e.g., Lowest price in area" />
                <button
                  type="button"
                  onClick={() => runPropertyFieldAI("bestDealReason")}
                  disabled={saving || aiSmartFillLoading}
                  style={{
                    height: 44,
                    padding: "0 12px",
                    borderRadius: 12,
                    border: "1px solid #e5e7eb",
                    background: "white",
                    cursor: saving || aiSmartFillLoading ? "not-allowed" : "pointer",
                    fontWeight: 900,
                  }}
                >
                  ✨ AI
                </button>
              </div>
                    </>
                  ) : null}

                  <ToggleRow label="Hot Offer?" value={hotOfferEnabled} onChange={setHotOfferEnabled} />
                  {hotOfferEnabled === true ? (
                    <>
                      <FieldLabel title="Hot Offer Text" />
                      <div style={{ display: "grid", gap: 8, gridTemplateColumns: "1fr auto", alignItems: "end" }}>
              <TextInput value={hotOfferText} onChange={setHotOfferText} placeholder="e.g., Limited time discount" />
              <button
                type="button"
                onClick={() => runPropertyFieldAI("hotOfferText")}
                disabled={saving || aiSmartFillLoading}
                style={{
                  height: 44,
                  padding: "0 12px",
                  borderRadius: 12,
                  border: "1px solid #e5e7eb",
                  background: "white",
                  cursor: saving || aiSmartFillLoading ? "not-allowed" : "pointer",
                  fontWeight: 900,
                }}
              >
                ✨ AI
              </button>
            </div>
                    </>
                  ) : null}

                  <ToggleRow label="Mark as Sold Out?" value={soldOut} onChange={setSoldOut} />
                </div>

                {/* Direct EMI */}
                <div style={{ marginTop: 18, paddingTop: 12, borderTop: "1px solid #e5e7eb" }}>
                  <div style={{ fontWeight: 900, marginBottom: 8 }}>Direct EMI (optional)</div>
                  <ToggleRow label="Enable Direct EMI?" value={directEmiEnabled} onChange={setDirectEmiEnabled} />

                  {directEmiEnabled === true ? (
                    <>
                      <FieldLabel title="Total Amount (₹)" hint="Auto-fills from Expected Price. You can edit." />
                      <TextInput
                        value={emiTotalAmount}
                        onChange={(v) => {
                          setEmiTotalTouched(true);
                          setEmiTotalAmount(v.replace(/[^\d]/g, ""));
                        }}
                        placeholder="e.g., 1600000"
                        inputMode="numeric"
                      />

                      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr 1fr", marginTop: 12 }}>
                        <div>
                          <FieldLabel title="Down payment (%)" />
                          <TextInput value={emiDownPaymentPct} onChange={setEmiDownPaymentPct} placeholder="e.g., 20" inputMode="decimal" />
                        </div>
                        <div>
                          <FieldLabel title="Interest (%)" hint="Annual" />
                          <TextInput value={emiInterestPct} onChange={setEmiInterestPct} placeholder="e.g., 0" inputMode="decimal" />
                        </div>
                        <div>
                          <FieldLabel title="Months" />
                          <TextInput value={emiMonths} onChange={setEmiMonths} placeholder="e.g., 120" inputMode="numeric" />
                        </div>
                      </div>

                      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr", marginTop: 12 }}>
                        <div>
                          <FieldLabel title="Down payment in days (optional)" />
                          <TextInput value={emiDownPaymentDays} onChange={setEmiDownPaymentDays} placeholder="e.g., 30" inputMode="numeric" />
                        </div>
                        <div>
                          <ToggleRow
                            label="Registration after down payment?"
                            value={emiProvideRegistrationAfterDownPayment}
                            onChange={setEmiProvideRegistrationAfterDownPayment}
                          />
                        </div>
                      </div>

                      <FieldLabel title="Who keeps original deed? (optional)" />
                      <TextInput
                        value={emiWhoKeepsOriginalDeed}
                        onChange={setEmiWhoKeepsOriginalDeed}
                        placeholder="e.g., Seller / Buyer / Bank / Advocate"
                      />

                      <ToggleRow label="Need guarantor?" value={emiNeedGuarantor} onChange={setEmiNeedGuarantor} />

                      <div
                        style={{
                          marginTop: 12,
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-end",
                          gap: 10,
                          flexWrap: "wrap",
                        }}
                      >
                        <FieldLabel title="EMI Terms (optional)" />
                        <button
                          type="button"
                          onClick={() => runPropertyFieldAI("emiTerms")}
                          disabled={saving || aiSmartFillLoading}
                          style={{
                            height: 36,
                            padding: "0 12px",
                            borderRadius: 12,
                            border: "1px solid #e5e7eb",
                            background: "white",
                            cursor: saving || aiSmartFillLoading ? "not-allowed" : "pointer",
                            fontWeight: 900,
                          }}
                        >
                          ✨ Draft EMI Terms
                        </button>
                      </div>

                      <TextArea
                        value={emiTerms}
                        onChange={setEmiTerms}
                        placeholder="Write any special EMI terms / conditions here..."
                      />

                      <div style={{ marginTop: 12, padding: 12, border: "1px solid #e5e7eb", borderRadius: 12, background: "#fafafa" }}>
                        <div style={{ fontWeight: 900, marginBottom: 6 }}>EMI Preview</div>
                        {emiCalc && (emiCalc as any).error ? (
                          <div style={{ color: "#b91c1c", fontWeight: 800 }}>{(emiCalc as any).error}</div>
                        ) : emiCalc ? (
                          <div style={{ display: "grid", gap: 6, fontSize: 13, color: "#111827" }}>
                            <div>
                              <b>Total:</b> {formatINR((emiCalc as any).total)}
                            </div>
                            <div>
                              <b>Down payment:</b> {formatINR((emiCalc as any).downPayment)} ({(emiCalc as any).dpPct}%)
                            </div>
                            <div>
                              <b>Principal:</b> {formatINR((emiCalc as any).principal)}
                            </div>
                            <div>
                              <b>EMI:</b> {formatINR(Math.round((emiCalc as any).emi))} / month for {(emiCalc as any).months} months
                            </div>
                            <div style={{ color: "#6b7280" }}>
                              (Interest {(emiCalc as any).rate}% annual; estimated)
                            </div>
                          </div>
                        ) : (
                          <div style={{ color: "#6b7280" }}>Enable Direct EMI to see preview.</div>
                        )}
                      </div>
                    </>
                  ) : null}
                </div>
                                <div style={{ marginTop: 18, paddingTop: 12, borderTop: "1px solid #e5e7eb" }}>
                  <div style={{ fontWeight: 900, marginBottom: 8 }}>Investment Opportunity (optional)</div>

                  <ToggleRow
                    label="Enable Investment for this listing?"
                    value={investmentEnabled}
                    onChange={setInvestmentEnabled}
                  />

                  {investmentEnabled === true ? (
                    <>
              <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr", marginTop: 12 }}>
                <div>
              <div
                style={{
                  marginBottom: 10,
                  padding: 10,
                  borderRadius: 10,
                  background: "#f1f5f9",
                  border: "1px solid #e2e8f0",
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>
                  📜 Investment Policy
                </div>

                <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
                  Investment terms, benefits, and investor protection are defined by the platform.
                </div>

                <button
                  type="button"
                  onClick={() => {
                    window.open("/investment-policy", "_blank");
                  }}
                  style={{
                    marginTop: 8,
                    padding: "6px 10px",
                    borderRadius: 8,
                    border: "1px solid #111827",
                    background: "#111827",
                    color: "white",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  View Investment Policy
                </button>
              </div>
                  <FieldLabel title="Min Investment (₹)" required />

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 100px", gap: 8 }}>
                    <TextInput
                      value={investmentMin}
                      onChange={(v) => setInvestmentMin(v.replace(/[^\d]/g, ""))}
                      placeholder="e.g., 100000"
                      inputMode="numeric"
                    />

                    <TextInput
                      value={investmentMinPct}
                      onChange={(v) => setInvestmentMinPct(v.replace(/[^\d]/g, ""))}
                      placeholder="%"
                      inputMode="numeric"
                    />
                  </div>

                  {investmentMin ? (
                    <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
                      {numberToWordsIndian(Number(investmentMin))} only
                    </div>
                  ) : null}

                  <div style={{ marginTop: 8, color: "#374151", fontWeight: 800, fontSize: 13 }}>
                    Amount: {investmentCalc.minAmount != null ? formatINR(investmentCalc.minAmount) : "—"}
                    {investmentCalc.minAmount != null ? (
                      <div style={{ color: "#6b7280", fontWeight: 600, marginTop: 4 }}>
                        ({numberToWordsIndian(investmentCalc.minAmount)} only)
                      </div>
                    ) : null}
                  </div>
                </div>

                <div>
                  <FieldLabel title="Max Investment (₹)" required />

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 100px", gap: 8 }}>
                    <TextInput
                      value={investmentMax}
                      onChange={(v) => setInvestmentMax(v.replace(/[^\d]/g, ""))}
                      placeholder="e.g., 500000"
                      inputMode="numeric"
                    />

                    <TextInput
                      value={investmentMaxPct}
                      onChange={(v) => setInvestmentMaxPct(v.replace(/[^\d]/g, ""))}
                      placeholder="%"
                      inputMode="numeric"
                    />
                  </div>

                  {investmentMax ? (
                    <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
                      {numberToWordsIndian(Number(investmentMax))} only
                    </div>
                  ) : null}

                  <div style={{ marginTop: 8, color: "#374151", fontWeight: 800, fontSize: 13 }}>
                    Amount: {investmentCalc.maxAmount != null ? formatINR(investmentCalc.maxAmount) : "—"}
                    {investmentCalc.maxAmount != null ? (
                      <div style={{ color: "#6b7280", fontWeight: 600, marginTop: 4 }}>
                        ({numberToWordsIndian(investmentCalc.maxAmount)} only)
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

                      <FieldLabel title="Expected Holding (months)" />
                      <TextInput
                        value={investmentHoldingMonths}
                        onChange={(v) => setInvestmentHoldingMonths(v.replace(/[^\d]/g, ""))}
                        placeholder="e.g., 12"
                        inputMode="numeric"
                      />

                      <FieldLabel title="Risk Level" />
                      <Select
                        value={investmentRiskLevel}
                        onChange={(v) => setInvestmentRiskLevel(v as "low" | "medium" | "high")}
                        options={[
                          { value: "low", label: "Low" },
                          { value: "medium", label: "Medium" },
                          { value: "high", label: "High" },
                        ]}
                      />
                    </>
                  ) : null}
                </div>
              </>
            ) : null}

            {/* STEP 5 */}
            {step === 5 ? (
              <>
                <div style={{ fontWeight: 800, marginBottom: 6 }}>Media & Submit</div>

                <UniversalMediaUploader
                  module="property"
                  value={mediaAssets}
                  onChange={setMediaAssets}
                  label="Property photos / videos"
                  helperText="Capture two live GPS-verified overview photos first. After verification, additional gallery photos and videos can be uploaded."
                  allowImages
                  allowVideos
                  allowDocuments={false}
                  maxFiles={15}

                  uploadStrategy="trusted"

                  mandatoryTrustedCaptures={2}

                  inlineCamera

                  cameraFacing="environment"

                  cameraOnly={false}
                />

                <details style={{ marginTop: 14 }}>
                  <summary style={{ cursor: "pointer", fontWeight: 900, color: "#374151" }}>
                    Advanced: paste existing image/video URLs
                  </summary>

                  <div style={{ marginTop: 12 }}>
                    <FieldLabel
                      title="Photos / Videos URLs"
                      hint="Optional. Paste direct URLs only if media is already uploaded elsewhere."
                    />

                    <div style={{ display: "grid", gap: 10, marginTop: 8 }}>
                      {mediaUrls.map((u, idx) => (
                        <div key={idx} style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr auto" }}>
                          <input
                            value={u}
                            onChange={(e) => {
                              const v = e.target.value;
                              setMediaUrls((prev) => prev.map((x, i) => (i === idx ? v : x)));
                            }}
                            placeholder="https://..."
                            style={{
                              width: "100%",
                              height: 44,
                              borderRadius: 12,
                              border: "1px solid #e5e7eb",
                              padding: "0 14px",
                              outline: "none",
                              background: "white",
                              fontSize: 14,
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => setMediaUrls((prev) => prev.filter((_, i) => i !== idx))}
                            style={{
                              height: 44,
                              padding: "0 12px",
                              borderRadius: 12,
                              border: "1px solid #e5e7eb",
                              background: "white",
                              cursor: "pointer",
                              fontWeight: 900,
                            }}
                            disabled={mediaUrls.length <= 1}
                            title={mediaUrls.length <= 1 ? "At least one row remains" : "Remove"}
                          >
                            ✕
                          </button>
                        </div>
                      ))}

                      <div style={{ display: "flex", justifyContent: "flex-start" }}>
                        <button
                          type="button"
                          onClick={() => setMediaUrls((prev) => [...prev, ""])}
                          style={{
                            height: 40,
                            padding: "0 12px",
                            borderRadius: 12,
                            border: "1px solid #e5e7eb",
                            background: "white",
                            cursor: "pointer",
                            fontWeight: 900,
                          }}
                        >
                          + Add another URL
                        </button>
                      </div>
                    </div>
                  </div>
                </details>

                {cleanedMedia.length ? (
                  <div style={{ marginTop: 10, color: "#065f46", fontWeight: 800 }}>
                    ✅ {cleanedMedia.length} media item(s) will be saved.
                  </div>
                ) : (
                  <div style={{ marginTop: 10, color: "#6b7280" }}>
                    No media added yet. Add photos or videos to improve buyer trust.
                  </div>
                )}

                <div style={{ marginTop: 18, padding: 12, border: "1px solid #e5e7eb", borderRadius: 12, background: "#fafafa" }}>
                  <div style={{ fontWeight: 900, marginBottom: 8 }}>Review Summary</div>
                  <div style={{ display: "grid", gap: 6, fontSize: 13 }}>
                    <div>
                      <b>Intent:</b> {intent || "—"}
                    </div>
                    <div>
                      <b>Type:</b> {type || "—"} {subtype ? `→ ${subtype}` : ""}
                    </div>
                    <div>
                      <b>Location:</b> {addressPreview || "—"}
                    </div>
                    <div>
                      <b>Expected price:</b>{" "}
                      {expectedPrice.trim() ? formatINR(Number(expectedPrice || 0)) : "—"}
                    </div>
                    <div style={{ color: "#6b7280" }}>
                      Title: {computeTitle()}
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: 16 }}>
                  <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={agree}
                      onChange={(e) => setAgree(e.target.checked)}
                      style={{ marginTop: 4 }}
                    />
                    <div>
                      <div style={{ fontWeight: 900 }}>I confirm the details are correct</div>
                      <div style={{ color: "#6b7280", fontSize: 13 }}>
                        By submitting, you agree to platform rules and verification.
                      </div>
                    </div>
                  </label>
                </div>
              </>
            ) : null}
          </CardBody>

          <CardFooter>
            {saveMsg ? (
              <div style={{ marginBottom: 10, whiteSpace: "pre-wrap", fontWeight: 800, color: saveMsg.startsWith("✅") ? "#065f46" : "#b91c1c" }}>
                {saveMsg}
              </div>
            ) : null}

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "space-between" }}>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => setStep((s) => (s > 1 ? ((s - 1) as any) : s))}
                  disabled={saving || step === 1}
                  style={{
                    height: 44,
                    padding: "0 14px",
                    borderRadius: 12,
                    border: "1px solid #e5e7eb",
                    background: step === 1 ? "#f3f4f6" : "white",
                    cursor: step === 1 ? "not-allowed" : "pointer",
                    fontWeight: 900,
                  }}
                >
                  ← Back
                </button>

                <button
                  type="button"
                  onClick={() => setStep(1)}
                  disabled={saving}
                  style={{
                    height: 44,
                    padding: "0 14px",
                    borderRadius: 12,
                    border: "1px solid #e5e7eb",
                    background: "white",
                    cursor: "pointer",
                    fontWeight: 900,
                  }}
                >
                  Jump to Step 1
                </button>
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {step < 5 ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (step === 1 && !canContinueStep1) return;
                      if (step === 2 && !canContinueStep2) return;
                      if (step === 3 && !canContinueStep3) return;
                      if (step === 4 && !canContinueStep4) return;
                      setStep((s) => ((s + 1) as any));
                    }}
                    disabled={
                      saving ||
                      (step === 1 && !canContinueStep1) ||
                      (step === 2 && !canContinueStep2) ||
                      (step === 3 && !canContinueStep3) ||
                      (step === 4 && !canContinueStep4)
                    }
                    style={{
                      height: 44,
                      padding: "0 14px",
                      borderRadius: 12,
                      border: "1px solid #e5e7eb",
                      background: "#111827",
                      color: "white",
                      cursor:
                        saving ||
                        (step === 1 && !canContinueStep1) ||
                        (step === 2 && !canContinueStep2) ||
                        (step === 3 && !canContinueStep3) ||
                        (step === 4 && !canContinueStep4)
                          ? "not-allowed"
                          : "pointer",
                      fontWeight: 900,
                      opacity:
                        saving ||
                        (step === 1 && !canContinueStep1) ||
                        (step === 2 && !canContinueStep2) ||
                        (step === 3 && !canContinueStep3) ||
                        (step === 4 && !canContinueStep4)
                          ? 0.6
                          : 1,
                    }}
                  >
                    Continue →
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={saveDraftLocal}
                      disabled={saving}
                      style={{
                        height: 44,
                        padding: "0 14px",
                        borderRadius: 12,
                        border: "1px solid #e5e7eb",
                        background: "white",
                        cursor: "pointer",
                        fontWeight: 900,
                      }}
                    >
                      Save draft (local)
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSaveMsg("Saving draft to Supabase...");
                        saveDraftSupabaseAndGoSubscription();
                      }}
                      disabled={saving}
                      style={{
                        height: 44,
                        padding: "0 14px",
                        borderRadius: 12,
                        border: "1px solid #e5e7eb",
                        background: "#111827",
                        color: "white",
                        cursor: "pointer",
                        fontWeight: 900,
                        opacity: saving ? 0.6 : 1,
                      }}
                    >
                      Save draft (Supabase) → Subscription
                    </button>

                    <button
                    type="button"
                      onClick={submitForReviewSupabase}
                    disabled={
                      saving ||
                      !canSubmit ||
                      listingStatus === "approved" ||
                      listingStatus === "pending"
                    }
                    style={{
                      height: 44,
                      padding: "0 14px",
                      borderRadius: 12,
                      border: "1px solid #e5e7eb",
                      background:
                        !canSubmit ||
                        listingStatus === "approved" ||
                        listingStatus === "pending"
                          ? "#9ca3af"
                          : "#16a34a",
                      color: "white",
                      cursor:
                        !canSubmit ||
                        listingStatus === "approved" ||
                        listingStatus === "pending"
                          ? "not-allowed"
                          : "pointer",
                      fontWeight: 900,
                      opacity: saving ? 0.6 : 1,
                    }}
                  >
                    {listingStatus === "approved"
                      ? "Already Approved"
                      : listingStatus === "pending"
                        ? "Under Review"
                        : "Submit for Review"}
                  </button>
                  </>
                )}
              </div>
            </div>

            {/* helper: show why Continue is disabled */}
            {step < 5 ? (
              <div style={{ marginTop: 10, color: "#6b7280", fontSize: 13 }}>
                {step === 1 && !canContinueStep1
                  ? listingMode === "builder_project"
                    ? "Step 1 needs: Intent + Property Type + Subcategory + Builder Project."
                    : "Step 1 needs: Intent + Property Type + Subcategory."
                  : null}
                {step === 2 && !canContinueStep2 ? "Step 2 needs: City + Locality." : null}
                {step === 3 && !canContinueStep3 ? (type === "Land / Plot" ? "Step 3 needs: Plot Area + Open sides + Construction + Possession." : "Step 3 needs: Fill required built-property fields.") : null}
                {step === 4 && !canContinueStep4 ? "Step 4 needs: Ownership + Expected Price." : null}
              </div>
            ) : null}
          </CardFooter>
        </Card>
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

export default function AddPropertyPageClient() {
  return (
    <Suspense
      fallback={
        <main>
          <Container>
            <EmptyState message="Loading property form..." />
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
      }
    >
      <AddPropertyPageInner />
    </Suspense>
  );
}
