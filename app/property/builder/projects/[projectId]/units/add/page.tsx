"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
import {
  getHandoffIdFromLocation,
  loadCostInventoryHandoff,
  confirmCostInventoryHandoff,
  type CostInventoryHandoffPrefill,
} from "@/lib/cost-execution/handoff-prefill";

import { Container } from "@/components/layout/Container";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { ActionButton } from "@/components/ui/ActionButton";
import { Badge } from "@/components/ui/Badge";

type BuilderProfileRow = {
  id: string;
  owner_user_id: string;
  brand_name: string | null;
  legal_name: string | null;
  slug: string | null;
  status: string | null;
};

type BuilderProjectRow = {
  id: string;
  name: string;
  project_kind: string | null;
  city: string | null;
  district: string | null;
  state: string | null;
  status: string | null;
  investment_plan_master_id: string | null;
  formatted_address?: string | null;
  short_address?: string | null;
  geo_state_id?: string | null;
  geo_district_id?: string | null;
  geo_subdivision_id?: string | null;
  geo_block_id?: string | null;
  geo_place_id?: string | null;
};

type CatalogRow = {
  id: string;
  project_id: string;
  kind: string;
  name: string;
  slug: string;
  sort_order: number | null;
  is_active: boolean;
};

type AmenityRow = {
  id: string;
  name: string;
  slug: string;
  category: string | null;
  sort_order: number | null;
};

function friendlyDbError(err: any): string {
  return String(err?.message ?? err?.hint ?? err?.details ?? err ?? "Unknown error");
}
function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}
function parseNumber(input: string): number | null {
  const s = String(input ?? "").trim();
  if (!s) return null;
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return n;
}
function slugifyLite(s: string) {
  return String(s ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
function firstAlphaNum(s: string) {
  const m = String(s ?? "").trim().match(/[a-z0-9]/i);
  return (m?.[0] ?? "").toUpperCase();
}
function towerCodeFromName(input: string) {
  const s = String(input ?? "").trim()
    .replace(/\s+/g, " ")
    .replace(/[^a-zA-Z0-9 _-]/g, "") // remove weird symbols
    // .trim();
  if (!s) return "";

  // If user types: "Tower B" / "Block C" / "Tower- D"
  let m = s.match(/(?:tower|block)\s*[-:]*\s*([a-z0-9])/i);
  if (m?.[1]) return String(m[1]).toUpperCase();

  // If user types: "ABCDEF" and wants last letter as tower (common)
  // example: "Tower ABCDEF" => F
  m = s.match(/([a-z0-9])\s*$/i);
  if (m?.[1]) return String(m[1]).toUpperCase();

  // fallback: first alphanumeric
  m = s.match(/[a-z0-9]/i);
  return m?.[0] ? String(m[0]).toUpperCase() : "";
}
function padLeft(num: number, digits: number) {
  const s = String(Math.max(0, Math.floor(num)));
  if (digits <= 0) return s;
  return s.length >= digits ? s : "0".repeat(digits - s.length) + s;
}
function catalogKindFromPropertyKind(kind: PropertyKind): string {
  if (kind === "land_plot") return "plot";
  if (kind === "flat") return "apartment";
  if (kind === "duplex") return "villa";
  if (kind === "house") return "villa";
  return "apartment";
}
function towerLabelForCode(input: string) {
  // FULL text-friendly label for unit codes (no spaces/symbols)
  // Examples:
  // "Ram Tower" -> "RAM"
  // "Tower B" -> "B"
  // "Block C" -> "C"
  // "Laxman-2" -> "LAXMAN2"
  const raw = String(input ?? "").trim();
  if (!raw) return "";

  // Remove common words like Tower / Block from the text (but keep meaningful name)
  let s = raw.replace(/\b(tower|block)\b/gi, " ").replace(/\s+/g, " ").trim();
  if (!s) s = raw; // if user only typed "Tower", fallback

  // Keep only letters+numbers, remove spaces and symbols
  const code = s.replace(/[^a-zA-Z0-9]+/g, "");

  // Safety: avoid super long codes in unit numbers
  return code.toUpperCase().slice(0, 12);
}


// Simple Indian number-to-words (en) for INR display
function inrWords(amount: number | null) {
  if (amount === null || !Number.isFinite(amount) || amount <= 0) return "";
  const a = Math.floor(amount);

  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function twoDigits(n: number) {
    if (n < 20) return ones[n];
    const t = Math.floor(n / 10);
    const o = n % 10;
    return `${tens[t]}${o ? " " + ones[o] : ""}`.trim();
  }

  function threeDigits(n: number) {
    const h = Math.floor(n / 100);
    const r = n % 100;
    const head = h ? `${ones[h]} Hundred` : "";
    const tail = r ? twoDigits(r) : "";
    return `${head}${head && tail ? " " : ""}${tail}`.trim();
  }

  let n = a;
  const crore = Math.floor(n / 10000000); n %= 10000000;
  const lakh = Math.floor(n / 100000); n %= 100000;
  const thousand = Math.floor(n / 1000); n %= 1000;
  const rest = n;

  const parts: string[] = [];
  if (crore) parts.push(`${threeDigits(crore)} Crore`);
  if (lakh) parts.push(`${threeDigits(lakh)} Lakh`);
  if (thousand) parts.push(`${threeDigits(thousand)} Thousand`);
  if (rest) parts.push(threeDigits(rest));

  return parts.join(" ").trim() + " Rupees";
}

function calcEmi(principal: number, annualRatePct: number, months: number) {
  if (principal <= 0 || months <= 0) return { emi: 0, totalPayable: 0, totalInterest: 0 };
  const r = (annualRatePct / 100) / 12;
  if (r <= 0) {
    const emi = principal / months;
    return { emi, totalPayable: principal, totalInterest: 0 };
  }
  const pow = Math.pow(1 + r, months);
  const emi = (principal * r * pow) / (pow - 1);
  const totalPayable = emi * months;
  const totalInterest = totalPayable - principal;
  return { emi, totalPayable, totalInterest };
}

type Flash = { kind: "success" | "error"; message: string } | null;

type PropertyKind = "land_plot" | "flat" | "house" | "duplex";
type ListingPurpose = "sell" | "rent" | "lease" | "pg";
type PrimaryPropertyType = "land_plot" | "houses";
type PropertySubcategory = "residential" | "commercial" | "agricultural" | "industrial" | "others";
type UnitCodeMode = "auto" | "manual";

export default function BuilderAddUnitWizardPage() {
  const router = useRouter();
  const params = useParams<{ projectId: string }>();
  const projectId = String(params?.projectId ?? "");

  const supabase: any = useMemo(() => {
    const factory: any = getSupabaseBrowser as any;
    return factory();
  }, []);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [costHandoff, setCostHandoff] = useState<CostInventoryHandoffPrefill | null>(null);
  const [globalError, setGlobalError] = useState("");

  const [flash, setFlash] = useState<Flash>(null);
  function flashSuccess(message: string) {
    setFlash({ kind: "success", message });
    if (typeof window !== "undefined") window.setTimeout(() => setFlash(null), 3500);
  }
  function flashError(message: string) {
    setFlash({ kind: "error", message });
    if (typeof window !== "undefined") window.setTimeout(() => setFlash(null), 6500);
  }

  const [userId, setUserId] = useState<string>("");
  const [builder, setBuilder] = useState<BuilderProfileRow | null>(null);
  const [project, setProject] = useState<BuilderProjectRow | null>(null);
  const [projectInvestmentPlanId, setProjectInvestmentPlanId] = useState<string>("");

  // Master amenities + defaults from project
  const [amenitiesMaster, setAmenitiesMaster] = useState<AmenityRow[]>([]);
  const [selectedAmenityIds, setSelectedAmenityIds] = useState<string[]>([]);
  const [showAmenities, setShowAmenities] = useState(false);

  const [catalogs, setCatalogs] = useState<CatalogRow[]>([]);
  const [selectedCatalogId, setSelectedCatalogId] = useState<string>("");

  // Wizard fields
  const [kind, setKind] = useState<PropertyKind>("flat");

  useEffect(() => {
    const handoffId = getHandoffIdFromLocation();
    if (!handoffId) return;

    void (async () => {
      try {
        const handoff = await loadCostInventoryHandoff(
          supabase,
          handoffId,
          "builder_property_unit_inventory"
        );

        setCostHandoff(handoff);

        const payload = handoff.payload;
        if (payload.outputName) {
          setCustomTitle(String(payload.outputName));
        }
        if (payload.completedQuantity != null) {
          setQuantity(
            String(
              Math.max(
                1,
                Math.floor(Number(payload.completedQuantity) || 1)
              )
            )
          );
        }

        const outputType = String(payload.outputType || "");
        if (outputType === "land_plot") {
          setTypeLand();
        } else if (outputType === "house" || outputType === "villa") {
          setTypeHouses();
          setHouseVariant(outputType === "villa" ? "duplex" : "house");
        } else {
          setTypeHouses();
          setHouseVariant("flat");
        }
      } catch (error: any) {
        setGlobalError(
          error?.message ||
          "Could not load completed-project handoff."
        );
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);


  // Step-1 selectors
  const [listingPurpose, setListingPurpose] = useState<ListingPurpose>("sell");
  const [primaryType, setPrimaryType] = useState<PrimaryPropertyType>("houses");
  const [subcategory, setSubcategory] = useState<PropertySubcategory>("residential");

  // House(s) internal choice
  function setTypeLand() {
    setPrimaryType("land_plot");
    setKind("land_plot");
  }
  function setTypeHouses() {
    setPrimaryType("houses");
    if (kind === "land_plot") setKind("flat");
  }
  function setHouseVariant(v: PropertyKind) {
    setPrimaryType("houses");
    setKind(v);
    if (v === "duplex") setHouseFloors("2");
  }

  // Quantity
  const [quantity, setQuantity] = useState<string>("1");
  const [customTitle, setCustomTitle] = useState<string>("");

  // Flat fields
  const [tower, setTower] = useState<string>("");
  const [floor, setFloor] = useState<string>("");
  const [bhk, setBhk] = useState<string>("2");
  const [builtUpSqft, setBuiltUpSqft] = useState<string>("");
  const [carpetSqft, setCarpetSqft] = useState<string>("");
  // Flat numbering helpers (for A-401, A-402...)
  const [flatsPerFloor, setFlatsPerFloor] = useState<string>("");
  const [flatStartIndex, setFlatStartIndex] = useState<string>("1");

  // Plot fields
  const [plotAreaSqft, setPlotAreaSqft] = useState<string>("");
  const [plotFacing, setPlotFacing] = useState<string>("");

  // House fields
  const [houseFloors, setHouseFloors] = useState<string>("1");
  const [houseBuiltUpSqft, setHouseBuiltUpSqft] = useState<string>("");
  const [houseCarpetSqft, setHouseCarpetSqft] = useState<string>("");
  const [housePlotSqft, setHousePlotSqft] = useState<string>("");

  // Optional price
  const [price, setPrice] = useState<string>("");

  // =============================
// Detailed Room Configuration (Option A)
// count → auto blocks, plus add/remove
// =============================
const [enableRoomDetails, setEnableRoomDetails] = useState(false);

type RoomTypeKey =
  | "bedroom"
  | "bathroom"
  | "balcony"
  | "kitchen"
  | "living"
  | "dining"
  | "study"
  | "pooja"
  | "store"
  | "servant";

type RoomBlock = {
  id: string;
  type: RoomTypeKey;
  label: string; // e.g. Bedroom 1
  length: string;
  width: string;
  notes: string;
  photos: File[]; // max 5
};

const ROOM_TYPES: { key: RoomTypeKey; label: string }[] = [
  { key: "bedroom", label: "Bedrooms" },
  { key: "bathroom", label: "Bathrooms" },
  { key: "balcony", label: "Balconies" },
  { key: "kitchen", label: "Kitchens" },
  { key: "living", label: "Living Rooms" },
  { key: "dining", label: "Dining Rooms" },
  { key: "study", label: "Study Rooms" },
  { key: "pooja", label: "Pooja Rooms" },
  { key: "store", label: "Store Rooms" },
  { key: "servant", label: "Servant Rooms" },
];

function rid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function makeLabel(type: RoomTypeKey, index1: number) {
  const singular =
    type === "bedroom"
      ? "Bedroom"
      : type === "bathroom"
      ? "Bathroom"
      : type === "balcony"
      ? "Balcony"
      : type === "kitchen"
      ? "Kitchen"
      : type === "living"
      ? "Living Room"
      : type === "dining"
      ? "Dining Room"
      : type === "study"
      ? "Study Room"
      : type === "pooja"
      ? "Pooja Room"
      : type === "store"
      ? "Store Room"
      : "Servant Room";
  return `${singular} ${index1}`;
}

// =============================
// Additional fields requested
// =============================
type Facing =
  | "north" | "north_east" | "east" | "south_east"
  | "south" | "south_west" | "west" | "north_west";

type Furnishing = "unfurnished" | "semi_furnished" | "fully_furnished";
type Ownership = "freehold" | "leasehold" | "cooperative" | "power_of_attorney" | "other";

const [facing, setFacing] = useState<Facing | "">("");
const [propertyAgeYears, setPropertyAgeYears] = useState<string>(""); // years
const [furnishing, setFurnishing] = useState<Furnishing | "">("");
const [readyToMove, setReadyToMove] = useState<"yes" | "no">("yes");

const [totalFloorsInTower, setTotalFloorsInTower] = useState<string>(""); // beside floor
const [ownership, setOwnership] = useState<Ownership | "">("");

const [expectedPrice, setExpectedPrice] = useState<string>(""); // asking price
const [allInclusivePrice, setAllInclusivePrice] = useState<"yes" | "no">("yes");
const [priceNegotiable, setPriceNegotiable] = useState<"yes" | "no">("yes");

const [uspText, setUspText] = useState<string>("");

// EMI section
const [enableEmi, setEnableEmi] = useState(false);
const [downPaymentPct, setDownPaymentPct] = useState<string>("20");
const [annualInterestRate, setAnnualInterestRate] = useState<string>("10"); // banking norm default
const [emiMonths, setEmiMonths] = useState<string>("240"); // 20 years
const [downPaymentDueDays, setDownPaymentDueDays] = useState<string>("30");
const [registrationAfterDownPayment, setRegistrationAfterDownPayment] = useState<"yes" | "no">("no");
const [originalDeedHolder, setOriginalDeedHolder] = useState<"buyer" | "seller" | "bank" | "other">("bank");
const [needsGuarantor, setNeedsGuarantor] = useState<"yes" | "no">("no");
const [otherEmiTerms, setOtherEmiTerms] = useState<string>("");

// Review + confirm
const [confirmDetails, setConfirmDetails] = useState(false);

// counts kept as strings (like your current style)
const [roomCounts, setRoomCounts] = useState<Record<RoomTypeKey, string>>({
  bedroom: "0",
  bathroom: "0",
  balcony: "0",
  kitchen: "0",
  living: "0",
  dining: "0",
  study: "0",
  pooja: "0",
  store: "0",
  servant: "0",
});
// If user manually edits bedroom count, stop auto-sync from BHK
const [bedroomCountTouched, setBedroomCountTouched] = useState(false);

// =====================================================
// Unit Code strategy (RESTORE - required by page)
// =====================================================

const [unitCodeMode, setUnitCodeMode] = useState<UnitCodeMode>("auto");
const [unitCodeManual, setUnitCodeManual] = useState<string>("");

// auto-sync prefix with tower unless user manually edits prefix
const [unitCodePrefix, setUnitCodePrefix] = useState<string>("");
const [unitCodePrefixTouched, setUnitCodePrefixTouched] = useState(false);
useEffect(() => {
  if (unitCodePrefixTouched) return;
  if (kind !== "flat") return;

  const tFull = towerLabelForCode(tower);
  if (tFull) {
    setUnitCodePrefix(tFull); // Ram / Laxman / Sita etc.
    return;
  }

  // fallback: if tower empty, at least set A/B/C from previous logic
  const t = towerCodeFromName(tower);
  if (t) setUnitCodePrefix(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [tower, kind, unitCodePrefixTouched]);

const [unitCodeStartNo, setUnitCodeStartNo] = useState<string>("1");
const [unitCodePadDigits, setUnitCodePadDigits] = useState<string>("2");

// =====================================================
// Unit Media (RESTORE - required by page)
// =====================================================
const [unitPhotos, setUnitPhotos] = useState<File[]>([]);
const [unitVideo, setUnitVideo] = useState<File | null>(null);

// =====================================================
// Amenities helpers (RESTORE - required by page)
// =====================================================
function toggleAmenity(id: string) {
  setSelectedAmenityIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
}

const amenitiesByCategory = useMemo(() => {
  const map = new Map<string, AmenityRow[]>();
  for (const a of amenitiesMaster) {
    const key = (a.category || "other").toLowerCase();
    map.set(key, [...(map.get(key) || []), a]);
  }
  return Array.from(map.entries());
}, [amenitiesMaster]);

// =====================================================
// Title + Unit codes (RESTORE - required by page)
// =====================================================
function buildAutoTitle() {
  const purposeLabel =
    listingPurpose === "sell" ? "SELL" : listingPurpose === "rent" ? "RENT" : listingPurpose === "lease" ? "LEASE" : "PG";

  const subcatLabel =
    subcategory === "residential"
      ? "Residential"
      : subcategory === "commercial"
      ? "Commercial"
      : subcategory === "agricultural"
      ? "Agricultural"
      : subcategory === "industrial"
      ? "Industrial"
      : "Others";

  const base =
    kind === "flat"
      ? `Flat • ${bhk || "—"} BHK${builtUpSqft.trim() ? ` • Built-up ${builtUpSqft.trim()} sqft` : ""}${
          carpetSqft.trim() ? ` • Carpet ${carpetSqft.trim()} sqft` : ""
        }${floor.trim() ? ` • Floor ${floor.trim()}` : ""}${tower.trim() ? ` • Tower ${tower.trim()}` : ""}`
      : kind === "land_plot"
      ? `Land / Plot${plotAreaSqft.trim() ? ` • ${plotAreaSqft.trim()} sqft` : ""}${plotFacing.trim() ? ` • ${plotFacing.trim()} Facing` : ""}`
      : kind === "duplex"
      ? `Duplex • ${bhk || "—"} BHK${houseBuiltUpSqft.trim() ? ` • Built-up ${houseBuiltUpSqft.trim()} sqft` : ""}${
          houseCarpetSqft.trim() ? ` • Carpet ${houseCarpetSqft.trim()} sqft` : ""
        }${housePlotSqft.trim() ? ` • Plot ${housePlotSqft.trim()} sqft` : ""} • 2 Floor(s)`
      : `House • ${bhk || "—"} BHK${houseBuiltUpSqft.trim() ? ` • Built-up ${houseBuiltUpSqft.trim()} sqft` : ""}${
          houseCarpetSqft.trim() ? ` • Carpet ${houseCarpetSqft.trim()} sqft` : ""
        }${housePlotSqft.trim() ? ` • Plot ${housePlotSqft.trim()} sqft` : ""}${houseFloors.trim() ? ` • ${houseFloors.trim()} Floor(s)` : ""}`;

  return `[${purposeLabel}] [${subcatLabel}] ${base}`.replace(/\s+/g, " ").trim();
}


function computeUnitCodes(qty: number): string[] {
  const padDigits = Math.max(0, Math.min(6, Number(unitCodePadDigits || "2") || 0));
  const prefix = (unitCodePrefix || "").trim().toUpperCase();
  const start = Math.max(1, Number(unitCodeStartNo || "1") || 1);

  if (unitCodeMode === "manual") {
    const one = unitCodeManual.trim();
    return one ? [one] : [];
  }

  const codes: string[] = [];

  for (let i = 0; i < qty; i++) {
    const n = start + i;

    if (kind === "flat") {
      const towerName = (prefix || towerCodeFromName(tower) || "A").trim().toUpperCase();
      const floorDigits = String(floor || "").replace(/\D+/g, "");

      const perFloor = Math.max(0, Number(flatsPerFloor || "0") || 0);
      const startIdx = Math.max(1, Number(flatStartIndex || "1") || 1);

      const idxDigits = perFloor > 0 ? Math.max(2, String(perFloor).length) : 2;

      const idx = startIdx + i; // within-floor index
      const unitIdx = padLeft(idx, idxDigits);

      if (floorDigits) {
        codes.push(`${towerName}-${floorDigits}${unitIdx}`); // RAM-401, RAM-402...
      } else {
        const unitNo = padLeft(n, padDigits || 2);
        codes.push(`${towerName}-${unitNo}`); // fallback
      }
    } else if (kind === "land_plot") {
      const p = prefix || "P";
      codes.push(`${p}-${padLeft(n, padDigits || 2)}`);
    } else if (kind === "duplex") {
      const p = prefix || "D";
      codes.push(`${p}-${padLeft(n, padDigits || 2)}`);
    } else {
      const p = prefix || "H";
      codes.push(`${p}-${padLeft(n, padDigits || 2)}`);
    }
  }

  return codes;
}

const [roomBlocks, setRoomBlocks] = useState<Record<RoomTypeKey, RoomBlock[]>>({
  bedroom: [],
  bathroom: [],
  balcony: [],
  kitchen: [],
  living: [],
  dining: [],
  study: [],
  pooja: [],
  store: [],
  servant: [],
});

function clampCount(v: string) {
  // you can change max later; keeping 20 safe for now
  const n = Math.max(0, Math.min(20, Number(v || "0") || 0));
  return n;
}

function syncBlocksFromCounts(nextCounts: Record<RoomTypeKey, string>) {
  setRoomBlocks((prev) => {
    const next: Record<RoomTypeKey, RoomBlock[]> = { ...prev };

    for (const t of ROOM_TYPES) {
      const type = t.key;
      const want = clampCount(nextCounts[type]);
      const existing = prev[type] || [];
      const updated: RoomBlock[] = [];

      for (let i = 0; i < want; i++) {
        const ex = existing[i];
        updated.push({
          id: ex?.id || rid(),
          type,
          label: makeLabel(type, i + 1),
          length: ex?.length || "",
          width: ex?.width || "",
          notes: ex?.notes || "",
          photos: ex?.photos || [],
        });
      }
      next[type] = updated;
    }

    return next;
  });
}

useEffect(() => {
  if (!enableRoomDetails) {
    // keep counts but hide blocks
    setRoomBlocks({
      bedroom: [],
      bathroom: [],
      balcony: [],
      kitchen: [],
      living: [],
      dining: [],
      study: [],
      pooja: [],
      store: [],
      servant: [],
    });
    return;
  }

  syncBlocksFromCounts(roomCounts);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [enableRoomDetails]);

function setRoomCount(type: RoomTypeKey, value: string) {
  setRoomCounts((prev) => {
    const next = { ...prev, [type]: value };
    if (enableRoomDetails) syncBlocksFromCounts(next);
    return next;
  });
}

function addOneRoom(type: RoomTypeKey) {
  const current = clampCount(roomCounts[type]);
  const nextCount = String(current + 1);
  setRoomCount(type, nextCount);
}

function removeOneRoom(type: RoomTypeKey) {
  const current = clampCount(roomCounts[type]);
  const nextCount = String(Math.max(0, current - 1));
  setRoomCount(type, nextCount);
}

function updateRoomBlock(type: RoomTypeKey, idx: number, patch: Partial<RoomBlock>) {
  setRoomBlocks((prev) => {
    const arr = prev[type] || [];
    const nextArr = arr.map((r, i) => (i === idx ? { ...r, ...patch } : r));
    return { ...prev, [type]: nextArr };
  });
}
// Auto-set Bedroom count from BHK (only when enabled and not manually overridden)
useEffect(() => {
  if (!enableRoomDetails) return;
  if (bedroomCountTouched) return;

  const n = Math.max(0, Math.min(10, Number(bhk || "0") || 0));
  // only update if different (prevents loops)
  if (String(roomCounts.bedroom ?? "0") !== String(n)) {
    setRoomCount("bedroom", String(n));
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [bhk, enableRoomDetails, bedroomCountTouched]);

function areaSqft(length: string, width: string) {
  const L = Number(length || 0);
  const W = Number(width || 0);
  if (!Number.isFinite(L) || !Number.isFinite(W) || L <= 0 || W <= 0) return null;
  return L * W;
}

  // =============================
// Price & EMI Derived Values (MUST be top-level hooks)
// =============================
const expectedPriceNum = useMemo(() => parseNumber(expectedPrice), [expectedPrice]);

const pricePerSqft = useMemo(() => {
  const p = expectedPriceNum;
  if (p === null) return null;

  if (kind === "land_plot") {
    const area = parseNumber(plotAreaSqft);
    if (!area || area <= 0) return null;
    return p / area;
  }

  if (kind === "flat") {
    const area = parseNumber(builtUpSqft) || parseNumber(carpetSqft);
    if (!area || area <= 0) return null;
    return p / area;
  }

  const area = parseNumber(houseBuiltUpSqft) || parseNumber(houseCarpetSqft);
  if (!area || area <= 0) return null;
  return p / area;
}, [expectedPriceNum, kind, plotAreaSqft, builtUpSqft, carpetSqft, houseBuiltUpSqft, houseCarpetSqft]);

const expectedPriceWords = useMemo(() => inrWords(expectedPriceNum), [expectedPriceNum]);

const emiPreview = useMemo(() => {
  if (!enableEmi) return null;

  const total = expectedPriceNum ?? 0;
  const dpPct = Math.max(0, Math.min(100, Number(downPaymentPct || "0") || 0));
  const dp = (total * dpPct) / 100;
  const principal = Math.max(0, total - dp);

  const months = Math.max(1, Number(emiMonths || "1") || 1);
  const rate = Math.max(0, Number(annualInterestRate || "0") || 0);

  const { emi, totalPayable, totalInterest } = calcEmi(principal, rate, months);

  return { total, dpPct, dp, principal, months, rate, emi, totalPayable, totalInterest };
}, [enableEmi, expectedPriceNum, downPaymentPct, emiMonths, annualInterestRate]);


  const unitCodePreview = useMemo(() => {
    const qty = Math.max(1, Math.min(200, Number(quantity || "1") || 1));
    const codes = computeUnitCodes(qty);
    return codes.slice(0, 10);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
  quantity,
  unitCodeMode,
  unitCodeManual,
  unitCodePrefix,
  unitCodeStartNo,
  unitCodePadDigits,
  kind,
  tower,
  floor,
  flatsPerFloor,
  flatStartIndex,
]);
  async function loadAll() {
    setLoading(true);
    setGlobalError("");

    if (!isUuid(projectId)) {
      setLoading(false);
      setGlobalError("Invalid Project ID in URL. Please open this page from Builder Projects list.");
      return;
    }


    const uRes = await supabase.auth.getUser();
    const uid = String(uRes?.data?.user?.id ?? "");
    if (!uid) {
      setLoading(false);
      setGlobalError("You are not logged in.");
      return;
    }
    setUserId(uid);

    const bpRes = await supabase.from("business_profiles").select("user_id,is_complete").eq("user_id", uid).maybeSingle();
    if (bpRes.error) {
      setLoading(false);
      setGlobalError(friendlyDbError(bpRes.error));
      return;
    }

    const isComplete = !!(bpRes.data as any)?.is_complete;
    if (!isComplete) {
      const returnTo = `/property/builder/projects/${encodeURIComponent(projectId)}/units/add`;
      router.replace(`/onboarding/business?returnTo=${encodeURIComponent(returnTo)}`);
      return;
    }

    const ensureRes = await supabase.rpc("ensure_builder_profile");
    if (ensureRes.error) {
      setLoading(false);
      setGlobalError(`Could not ensure builder profile — ${friendlyDbError(ensureRes.error)}`);
      return;
    }

    const bRes = await supabase
      .from("builder_profiles")
      .select("id,owner_user_id,brand_name,legal_name,slug,status")
      .eq("owner_user_id", uid)
      .maybeSingle();

    if (bRes.error) {
      setLoading(false);
      setGlobalError(friendlyDbError(bRes.error));
      return;
    }
    setBuilder((bRes.data ?? null) as BuilderProfileRow | null);

    const projRes = await supabase
    .from("builder_projects")
    .select("id,name,project_kind,city,district,state,status,investment_plan_master_id,formatted_address,short_address,geo_state_id,geo_district_id,geo_subdivision_id,geo_block_id,geo_place_id")
    .eq("id", projectId)
    .maybeSingle();

    if (projRes.error) {
      setLoading(false);
      setGlobalError(friendlyDbError(projRes.error));
      return;
    }

    const proj = (projRes.data ?? null) as BuilderProjectRow | null;
      if (!proj?.id) {
        setLoading(false);
        setGlobalError("Project not found (or you do not have access).");
        return;
      }
      setProject(proj);
      setProjectInvestmentPlanId(String(proj.investment_plan_master_id ?? ""));

      const catRes = await supabase
        .from("builder_project_catalogs")
        .select("id,project_id,kind,name,slug,sort_order,is_active")
        .eq("project_id", projectId)
        .eq("is_active", true)
        .order("sort_order", { ascending: true, nullsFirst: false })
        .order("name", { ascending: true });

      if (catRes.error) {
        setLoading(false);
        setGlobalError(`Could not load project catalogs — ${friendlyDbError(catRes.error)}`);
        return;
      }

      const catRows = (catRes.data ?? []) as CatalogRow[];
      setCatalogs(catRows);

    const amRes = await supabase
      .from("amenities_master")
      .select("id,name,slug,category,sort_order")
      .eq("is_active", true)
      .order("category", { ascending: true })
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (amRes.error) {
      setLoading(false);
      setGlobalError(`Could not load amenities master — ${friendlyDbError(amRes.error)}`);
      return;
    }
    setAmenitiesMaster((amRes.data ?? []) as any);

    const projAmenRes = await supabase.from("builder_project_amenities").select("amenity_id").eq("project_id", projectId);
    if (projAmenRes.error) {
      setSelectedAmenityIds([]);
    } else {
      const ids = (projAmenRes.data ?? []).map((x: any) => String(x.amenity_id));
      setSelectedAmenityIds(ids);
    }

    setLoading(false);
  }

  useEffect(() => {
  const wantedKind = catalogKindFromPropertyKind(kind);
  const matching = catalogs.find((c) => String(c.kind).toLowerCase() === wantedKind);
  if (matching?.id) {
    setSelectedCatalogId(matching.id);
    return;
  }
  setSelectedCatalogId("");
}, [kind, catalogs]);

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  useEffect(() => {
    const wantedKind = catalogKindFromPropertyKind(kind);
    const matching = catalogs.find((c) => String(c.kind).toLowerCase() === wantedKind);

    if (matching?.id) {
      setSelectedCatalogId(matching.id);
      return;
    }

    setSelectedCatalogId("");
  }, [kind, catalogs]);

  async function saveUnitAmenities(unitId: string, amenityIds: string[]) {
    const TABLE = "builder_inventory_unit_amenities";
    const del = await supabase.from(TABLE).delete().eq("unit_id", unitId);
    if (del.error) throw del.error;

    if (!amenityIds.length) return;

    const rows = amenityIds.map((amenity_id) => ({ unit_id: unitId, amenity_id }));
    const ins = await supabase.from(TABLE).insert(rows);
    if (ins.error) throw ins.error;
  }

  // ✅ robust extract (case-insensitive)
  function parseMissingColumn(errMsg: string): string | null {
    const msg = String(errMsg || "");

    let m = msg.match(/column\s+"?([a-zA-Z0-9_]+)"?\s+of\s+relation/i);
    if (m?.[1]) return m[1];

    m = msg.match(/could\s+not\s+find\s+the\s+['"]([a-zA-Z0-9_]+)['"]\s+column\s+of\s+['"][a-zA-Z0-9_]+['"]\s+in\s+the\s+schema\s+cache/i);
    if (m?.[1]) return m[1];

    m = msg.match(/could\s+not\s+find\s+the\s+['"]([a-zA-Z0-9_]+)['"]\s+column/i);
    if (m?.[1]) return m[1];

    m = msg.match(/cannot\s+insert\s+into\s+column\s+"?([a-zA-Z0-9_]+)"?\s+of\s+view/i);
    if (m?.[1]) return m[1];

    return null;
  }

  function isViewInsertError(errMsg: string) {
    const s = String(errMsg || "").toLowerCase();
    return s.includes("of view") && s.includes("cannot insert");
  }

  async function insertWithFallback(table: string, base: Record<string, any>, idSelect = "id") {
    let current = { ...base };
    let lastErr: any = null;

    for (let attempt = 0; attempt < 20; attempt++) {
      const res = await supabase.from(table).insert(current).select(idSelect).maybeSingle();

      if (!res.error) {
        const id = String((res.data as any)?.id ?? "");
        if (!id) throw new Error("Insert succeeded but id not returned.");
        return { id };
      }

      lastErr = res.error;
      const msg = friendlyDbError(res.error);
      const col = parseMissingColumn(msg);

      // if missing column, delete and retry
      if (col && col in current) {
        const next = { ...current };
        delete (next as any)[col];
        current = next;
        continue;
      }

      // stop
      throw res.error;
    }

    throw new Error(`Insert failed after multiple retries — ${friendlyDbError(lastErr)}`);
  }

  async function uploadUnitMedia(unitId: string) {
    const BUCKET = "builder-unit-media";
    if (!unitPhotos.length && !unitVideo) return;

    const uploaded: { kind: "photo" | "video"; path: string; originalName: string }[] = [];

    for (let i = 0; i < unitPhotos.length; i++) {
      const f = unitPhotos[i];
      const ext = (f.name.split(".").pop() || "jpg").toLowerCase();
      const safeName = `${Date.now()}-${i + 1}-${slugifyLite(f.name)}.${ext}`;
      const path = `${projectId}/${unitId}/photos/${safeName}`;

      const up = await supabase.storage.from(BUCKET).upload(path, f, {
        cacheControl: "3600",
        upsert: true,
        contentType: f.type || undefined,
      });

      if (up.error) throw up.error;
      uploaded.push({ kind: "photo", path, originalName: f.name });
    }

    if (unitVideo) {
      const f = unitVideo;
      const ext = (f.name.split(".").pop() || "mp4").toLowerCase();
      const safeName = `${Date.now()}-video-${slugifyLite(f.name)}.${ext}`;
      const path = `${projectId}/${unitId}/video/${safeName}`;

      const up = await supabase.storage.from(BUCKET).upload(path, f, {
        cacheControl: "3600",
        upsert: true,
        contentType: f.type || undefined,
      });

      if (up.error) throw up.error;
      uploaded.push({ kind: "video", path, originalName: f.name });
    }

    try {
      const TABLE = "builder_inventory_unit_media";
      const rows = uploaded.map((x, idx) => ({
        unit_id: unitId,
        media_kind: x.kind,
        storage_path: x.path,
        sort_order: idx + 1,
        original_name: x.originalName,
      }));

      const ins = await supabase.from(TABLE).insert(rows);
      if (ins.error) {
        const msg = friendlyDbError(ins.error).toLowerCase();
        const likelySchema =
          msg.includes("does not exist") ||
          msg.includes("schema cache") ||
          msg.includes("could not find");
        if (!likelySchema) {
          flashError(`Media uploaded, but DB reference save failed — ${friendlyDbError(ins.error)}`);
        }
      }
    } catch {
      // ignore
    }
  }

  async function uploadUnitMediaSafe(unitId: string) {
    if (!unitPhotos.length && !unitVideo) return;

    const timeoutMs = 15000;

    await Promise.race([
      uploadUnitMedia(unitId),
      new Promise<void>((resolve) => {
        setTimeout(() => {
          flashError("Unit created, but media upload is taking too long. Please add media later from inventory/admin.");
          resolve();
        }, timeoutMs);
      }),
    ]);
  }

  async function createUnits() {
    setGlobalError("");
    setSaving(true);

    try {
      if (!selectedCatalogId) {
        flashError("Please select a catalog before creating units.");
        setSaving(false);
        return;
      }
      const qty = Math.max(1, Math.min(200, Number(quantity || "1") || 1));
      if (kind === "flat") {
  const perFloor = Math.max(0, Number(flatsPerFloor || "0") || 0);
  const startIdx = Math.max(1, Number(flatStartIndex || "1") || 1);

  if (perFloor > 0) {
    const maxAllowed = perFloor - startIdx + 1;

    if (maxAllowed <= 0) {
      flashError("Start Flat No. is invalid for the given Flats per Floor.");
      return;
    }

    if (qty > maxAllowed) {
      flashError(`Quantity is too high. This floor can create maximum ${maxAllowed} unit(s) from start ${startIdx}.`);
      return;
    }

    if (!String(floor || "").trim()) {
      flashError("Please enter Floor number (required when Flats per Floor is set).");
      return;
    }
  }
}
      if (qty > 1 && (unitPhotos.length > 0 || unitVideo)) {
        flashError("For media upload, please create 1 unit at a time (Quantity = 1).");
        return;
      }

      const titleBase = customTitle.trim() ? customTitle.trim() : buildAutoTitle();
      if (!titleBase) {
        flashError("Title is required.");
        return;
      }

      const priceNum = parseNumber(price);

      const codes = computeUnitCodes(qty);
      if (unitCodeMode === "manual") {
        if (qty !== 1) {
          flashError("Manual Unit Code is allowed only when Quantity = 1.");
          return;
        }
        if (!codes.length || !codes[0]) {
          flashError("Unit Code is required (manual mode).");
          return;
        }
      } else {
        if (!codes.length) {
          flashError("Could not generate unit codes. Please check Prefix / Start No.");
          return;
        }
      }

      const createdUnitIds: string[] = [];

      for (let i = 0; i < qty; i++) {
        const autoSuffix = qty > 1 ? ` #${i + 1}` : "";
        const rowTitle = `${titleBase}${autoSuffix}`.trim();

        // ✅ IMPORTANT: Insert into BASE TABLE (units), NOT builder_inventory_items view
        const unitPayload: any = {
          project_id: projectId,
          builder_project_id: projectId, // safe if exists; fallback will remove if not
          catalog_id: selectedCatalogId,
          builder_profile_id: builder?.id || null,
          owner_user_id: userId || null,

          title: rowTitle,
          unit_code: codes[i] || null,
          investment_plan_master_id: projectInvestmentPlanId || null,

          listing_purpose: listingPurpose,
          primary_type: primaryType,
          property_kind: kind,
          subcategory: subcategory,

          bhk: kind === "flat" || kind === "house" || kind === "duplex" ? parseNumber(bhk) : null,

          built_up_sqft:
            kind === "flat"
              ? parseNumber(builtUpSqft)
              : kind === "house" || kind === "duplex"
              ? parseNumber(houseBuiltUpSqft)
              : null,

          carpet_sqft:
            kind === "flat"
              ? parseNumber(carpetSqft)
              : kind === "house" || kind === "duplex"
              ? parseNumber(houseCarpetSqft)
              : null,

          floor: kind === "flat" ? parseNumber(floor) : null,
          tower: kind === "flat" ? (tower.trim() || null) : null,

          plot_area_sqft: kind === "land_plot" ? parseNumber(plotAreaSqft) : null,
          plot_facing: kind === "land_plot" ? (plotFacing.trim() || null) : null,

          house_floors: kind === "house" || kind === "duplex" ? parseNumber(houseFloors) : null,
          house_plot_sqft: kind === "house" || kind === "duplex" ? parseNumber(housePlotSqft) : null,
        };

        // ✅ Try inserting into builder_inventory_units first
        let unitId = "";
        try {
          const created = await insertWithFallback("builder_inventory_units", unitPayload);
          unitId = created.id;
        } catch (e: any) {
          // Fallback attempt: if your base table name is different in DB
          // (some projects use builder_inventory_items as real table, but yours is a view)
          const msg = friendlyDbError(e);
          if (isViewInsertError(msg)) {
            throw new Error(
              `Your builder_inventory_items is a VIEW. Please confirm base units table name (expected builder_inventory_units). Error: ${msg}`
            );
          }
          throw e;
        }

        createdUnitIds.push(unitId);

        // ✅ Optional: save price into pricing table (best effort)
if (priceNum !== null) {
  try {
    await insertWithFallback("builder_inventory_pricing", {
      unit_id: unitId,
      pricing_kind: "total",
      price_total: priceNum,
      updated_at: new Date().toISOString(),
    });
  } catch {
    // ignore silently (pricing table might be different)
  }
}

        try {
          await saveUnitAmenities(unitId, selectedAmenityIds);
        } catch (e: any) {
          flashError(`Unit created, but amenities save failed for one unit — ${friendlyDbError(e)}`);
        }

        try {
          await uploadUnitMediaSafe(unitId);
        } catch (e: any) {
          flashError(`Unit created, but media upload failed — ${friendlyDbError(e)}`);
        }
      }

      if (costHandoff && createdUnitIds.length > 0) {
        await confirmCostInventoryHandoff({
          supabase,
          handoff: costHandoff,
          destinationRecordIds: createdUnitIds,
          transferredQuantity: createdUnitIds.length,
        });
      }

      flashSuccess(`✅ Created ${createdUnitIds.length} unit(s). Redirecting to Units list...`);
      router.push(`/property/builder/projects/${encodeURIComponent(projectId)}/units`);
    } catch (e: any) {
      const msg = `Create failed — ${friendlyDbError(e)}`;
      setGlobalError(msg);
      flashError(msg);
    } finally {
      setSaving(false);
    }
  }

  const loc = project
    ? project.formatted_address ||
      project.short_address ||
      [project.city, project.district, project.state].filter(Boolean).join(", ")
    : "";

  return (
    <Container>
      <SectionHeader
        title="Add Units / Property"
        subtitle="Create Land Plots / Flats / Houses inside this project."
        right={
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <Link href={`/property/builder/projects/${encodeURIComponent(projectId)}/units`}>
              <ActionButton variant="secondary">Back to Units</ActionButton>
            </Link>
            <Link href="/property/builder/projects">
              <ActionButton variant="secondary">Back to Projects</ActionButton>
            </Link>
          </div>
        }
      />

      {flash ? (
        <div
          style={{
            position: "sticky",
            top: 12,
            zIndex: 20,
            marginTop: 10,
            marginBottom: 12,
            border: flash.kind === "success" ? "1px solid rgba(46, 160, 67, 0.25)" : "1px solid rgba(220, 53, 69, 0.25)",
            background: flash.kind === "success" ? "rgba(46, 160, 67, 0.08)" : "rgba(220, 53, 69, 0.08)",
            padding: "10px 12px",
            borderRadius: 12,
            fontWeight: 700,
            display: "flex",
            gap: 8,
            alignItems: "center",
          }}
        >
          <span
            style={{
              width: 16,
              height: 16,
              borderRadius: 4,
              background: flash.kind === "success" ? "rgba(46, 160, 67, 0.9)" : "rgba(220, 53, 69, 0.9)",
              display: "inline-block",
            }}
          />
          {flash.message}
        </div>
      ) : null}

      {loading ? (
        <Card>
          <CardBody>Loading…</CardBody>
        </Card>
      ) : globalError ? (
        <Card>
          <CardBody>
            <div style={{ fontWeight: 900, marginBottom: 6 }}>Error</div>
            <div style={{ whiteSpace: "pre-wrap", opacity: 0.9 }}>{globalError}</div>
            <div style={{ marginTop: 10 }}>
              <ActionButton onClick={() => router.refresh()}>Refresh</ActionButton>
            </div>
          </CardBody>
        </Card>
      ) : (
        <>
          <div style={{ marginBottom: 10, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            {builder ? (
              <>
                <Badge>Builder: {builder.brand_name || builder.legal_name || builder.id.slice(0, 8)}</Badge>
                {builder.status ? <Badge>status: {builder.status}</Badge> : null}
              </>
            ) : null}
            {project ? (
              <>
                <Badge>Project: {project.name}</Badge>
                {project.status ? <Badge>status: {project.status}</Badge> : null}
                {projectInvestmentPlanId ? <Badge>Investment Plan Attached</Badge> : <Badge>No Investment Plan</Badge>}
                {loc ? <Badge>{loc}</Badge> : null}
              </>
            ) : null}
          </div>

          <Card>
            <CardBody>
              {projectInvestmentPlanId ? (
                <div
                  style={{
                    marginBottom: 14,
                    padding: "10px 12px",
                    borderRadius: 12,
                    border: "1px solid #e5e7eb",
                    background: "#fafafa",
                    fontSize: 13,
                    lineHeight: 1.5,
                  }}
                >
                  <div style={{ fontWeight: 900, marginBottom: 4 }}>Investment Plan Notice</div>
                  <div>
                    This project already has an investment plan attached. New units created under this project will now
                    inherit that investment plan by default. Unit-level override can be added later without breaking this flow.
                  </div>
                </div>
              ) : null}

              <div style={{ fontWeight: 900, marginBottom: 10 }}>1) Listing Purpose</div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {(
                  [
                    ["sell", "SELL"],
                    ["rent", "RENT"],
                    ["lease", "LEASE"],
                    ["pg", "PG"],
                  ] as [ListingPurpose, string][]
                ).map(([k, label]) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setListingPurpose(k)}
                    style={{
                      height: 38,
                      padding: "0 12px",
                      borderRadius: 10,
                      border: "1px solid #e5e7eb",
                      background: listingPurpose === k ? "#f3f4f6" : "white",
                      fontWeight: 900,
                      cursor: "pointer",
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div style={{ height: 14 }} />

              <div style={{ fontWeight: 900, marginBottom: 10 }}>2) Property Type</div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={setTypeLand}
                  style={{
                    height: 38,
                    padding: "0 12px",
                    borderRadius: 10,
                    border: "1px solid #e5e7eb",
                    background: primaryType === "land_plot" ? "#f3f4f6" : "white",
                    fontWeight: 900,
                    cursor: "pointer",
                  }}
                >
                  Land / Plot
                </button>

                <button
                  type="button"
                  onClick={setTypeHouses}
                  style={{
                    height: 38,
                    padding: "0 12px",
                    borderRadius: 10,
                    border: "1px solid #e5e7eb",
                    background: primaryType === "houses" ? "#f3f4f6" : "white",
                    fontWeight: 900,
                    cursor: "pointer",
                  }}
                >
                  House(s)
                </button>
              </div>

              {primaryType === "houses" ? (
                <>
                  <div style={{ height: 12 }} />
                  <div style={{ fontWeight: 900, marginBottom: 10 }}>3) House(s) Type</div>

                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={() => setHouseVariant("flat")}
                      style={{
                        height: 38,
                        padding: "0 12px",
                        borderRadius: 10,
                        border: "1px solid #e5e7eb",
                        background: kind === "flat" ? "#f3f4f6" : "white",
                        fontWeight: 900,
                        cursor: "pointer",
                      }}
                    >
                      Flat / Apartment
                    </button>

                    <button
                      type="button"
                      onClick={() => setHouseVariant("house")}
                      style={{
                        height: 38,
                        padding: "0 12px",
                        borderRadius: 10,
                        border: "1px solid #e5e7eb",
                        background: kind === "house" ? "#f3f4f6" : "white",
                        fontWeight: 900,
                        cursor: "pointer",
                      }}
                    >
                      House / Villa
                    </button>

                    <button
                      type="button"
                      onClick={() => setHouseVariant("duplex")}
                      style={{
                        height: 38,
                        padding: "0 12px",
                        borderRadius: 10,
                        border: "1px solid #e5e7eb",
                        background: kind === "duplex" ? "#f3f4f6" : "white",
                        fontWeight: 900,
                        cursor: "pointer",
                      }}
                    >
                      Duplex (2 storied)
                    </button>
                  </div>
                </>
              ) : null}

              <div style={{ height: 14 }} />

              <div style={{ fontWeight: 900, marginBottom: 10 }}>4) Subcategory</div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {(
                  [
                    ["residential", "Residential"],
                    ["commercial", "Commercial"],
                    ["agricultural", "Agricultural"],
                    ["industrial", "Industrial"],
                    ["others", "Others"],
                  ] as [PropertySubcategory, string][]
                ).map(([k, label]) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setSubcategory(k)}
                    style={{
                      height: 38,
                      padding: "0 12px",
                      borderRadius: 10,
                      border: "1px solid #e5e7eb",
                      background: subcategory === k ? "#f3f4f6" : "white",
                      fontWeight: 900,
                      cursor: "pointer",
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div style={{ height: 14 }} />

              <div style={{ fontWeight: 900, marginBottom: 10 }}>5) Fill Details</div>

              {kind === "flat" ? (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>BHK</div>
                    <select
                      value={bhk}
                      onChange={(e) => setBhk(e.target.value)}
                      style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd" }}
                      disabled={saving}
                    >
                      <option value="1">1</option>
                      <option value="2">2</option>
                      <option value="3">3</option>
                      <option value="4">4</option>
                      <option value="5">5</option>
                      <option value="6">6</option>
                    </select>
                  </div>

                  <div>
                    <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Built-up size (sqft)</div>
                    <input
                      value={builtUpSqft}
                      onChange={(e) => setBuiltUpSqft(e.target.value)}
                      placeholder="e.g. 1050"
                      style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd" }}
                      disabled={saving}
                    />
                  </div>

                  <div>
                    <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Carpet area (sqft)</div>
                    <input
                      value={carpetSqft}
                      onChange={(e) => setCarpetSqft(e.target.value)}
                      placeholder="e.g. 820"
                      style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd" }}
                      disabled={saving}
                    />
                  </div>

                  <div style={{ gridColumn: "1 / span 3" }}>
  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
    <div>
      <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Floor</div>
      <input
        value={floor}
        onChange={(e) => setFloor(e.target.value)}
        placeholder="e.g. 5"
        style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd" }}
        disabled={saving}
      />
    </div>

    <div>
      <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Total floors in Tower</div>
      <input
        value={totalFloorsInTower}
        onChange={(e) => setTotalFloorsInTower(e.target.value)}
        placeholder="e.g. 12"
        style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd" }}
        disabled={saving}
      />
    </div>
  </div>
</div>
<div>
  <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>
    Flats / Apartments in this Floor
  </div>
  <input
    value={flatsPerFloor}
    onChange={(e) => setFlatsPerFloor(e.target.value)}
    placeholder="e.g. 4 or 10"
    style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd" }}
    disabled={saving}
  />
  <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>
    If 4 → flats are 01..04 (Floor 4 → 401..404).
  </div>
</div>

<div>
  <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>
    Start Flat No. (within this floor)
  </div>
  <input
    value={flatStartIndex}
    onChange={(e) => setFlatStartIndex(e.target.value)}
    placeholder="1"
    style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd" }}
    disabled={saving}
  />
  <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>
    Start 1 + Qty 3 → 401, 402, 403.
  </div>
</div>

                  <div style={{ gridColumn: "1 / span 2" }}>
                    <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Tower / Block (optional)</div>
                    <input
                      value={tower}
                      onChange={(e) => {
                        setTower(e.target.value);
                        setUnitCodePrefixTouched(false); // allow prefix to auto-sync again
                      }}
                      placeholder="e.g. Tower B"
                      style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd" }}
                      disabled={saving}
                    />
                  </div>
                </div>
              ) : kind === "land_plot" ? (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Plot area (sqft)</div>
                    <input
                      value={plotAreaSqft}
                      onChange={(e) => setPlotAreaSqft(e.target.value)}
                      placeholder="e.g. 2160"
                      style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd" }}
                      disabled={saving}
                    />
                  </div>
                

                  <div>
                    <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Facing (optional)</div>
                    <input
                      value={plotFacing}
                      onChange={(e) => setPlotFacing(e.target.value)}
                      placeholder="e.g. East"
                      style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd" }}
                      disabled={saving}
                    />
                  </div>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>BHK</div>
                    <select
                      value={bhk}
                      onChange={(e) => setBhk(e.target.value)}
                      style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd" }}
                      disabled={saving}
                    >
                      <option value="1">1</option>
                      <option value="2">2</option>
                      <option value="3">3</option>
                      <option value="4">4</option>
                      <option value="5">5</option>
                      <option value="6">6</option>
                    </select>
                  </div>

                  <div>
                    <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Built-up size (sqft)</div>
                    <input
                      value={houseBuiltUpSqft}
                      onChange={(e) => setHouseBuiltUpSqft(e.target.value)}
                      placeholder="e.g. 1800"
                      style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd" }}
                      disabled={saving}
                    />
                  </div>

                  <div>
                    <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Carpet area (sqft)</div>
                    <input
                      value={houseCarpetSqft}
                      onChange={(e) => setHouseCarpetSqft(e.target.value)}
                      placeholder="e.g. 1400"
                      style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd" }}
                      disabled={saving}
                    />
                  </div>

                  <div>
                    <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>No. of floors</div>
                    <input
                      value={kind === "duplex" ? "2" : houseFloors}
                      onChange={(e) => setHouseFloors(e.target.value)}
                      placeholder="e.g. 2"
                      style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd" }}
                      disabled={saving || kind === "duplex"}
                    />
                    {kind === "duplex" ? <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>Duplex is fixed as 2 floors.</div> : null}
                  </div>

                  <div style={{ gridColumn: "1 / span 2" }}>
                    <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Plot area (sqft) (optional)</div>
                    <input
                      value={housePlotSqft}
                      onChange={(e) => setHousePlotSqft(e.target.value)}
                      placeholder="e.g. 2160"
                      style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd" }}
                      disabled={saving}
                    />
                  </div>
                </div>
              )}

              <div style={{ height: 14 }} />

<div style={{ fontWeight: 900, marginBottom: 10 }}>5A) Additional Details</div>

<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 }}>
  <div>
    <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Facing</div>
    <select
      value={facing}
      onChange={(e) => setFacing(e.target.value as any)}
      style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd" }}
      disabled={saving}
    >
      <option value="">— Select —</option>
      <option value="north">North</option>
      <option value="north_east">North-East</option>
      <option value="east">East</option>
      <option value="south_east">South-East</option>
      <option value="south">South</option>
      <option value="south_west">South-West</option>
      <option value="west">West</option>
      <option value="north_west">North-West</option>
    </select>
  </div>

  <div>
    <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Age of property (years)</div>
    <input
      value={propertyAgeYears}
      onChange={(e) => setPropertyAgeYears(e.target.value)}
      placeholder="e.g. 3"
      style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd" }}
      disabled={saving}
    />
  </div>

  <div>
    <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Furnishing</div>
    <select
      value={furnishing}
      onChange={(e) => setFurnishing(e.target.value as any)}
      style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd" }}
      disabled={saving}
    >
      <option value="">— Select —</option>
      <option value="unfurnished">Unfurnished</option>
      <option value="semi_furnished">Semi-furnished</option>
      <option value="fully_furnished">Fully furnished</option>
    </select>
  </div>

  <div>
    <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Ready to move</div>
    <select
      value={readyToMove}
      onChange={(e) => setReadyToMove(e.target.value as any)}
      style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd" }}
      disabled={saving}
    >
      <option value="yes">Yes</option>
      <option value="no">No</option>
    </select>
  </div>
</div>

              <div style={{ height: 16 }} />

              <div style={{ fontWeight: 900, marginBottom: 10 }}>6) Unit Code / Unit No.</div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 10 }}>
                <button
                  type="button"
                  onClick={() => setUnitCodeMode("auto")}
                  style={{
                    height: 38,
                    padding: "0 12px",
                    borderRadius: 10,
                    border: "1px solid #e5e7eb",
                    background: unitCodeMode === "auto" ? "#f3f4f6" : "white",
                    fontWeight: 900,
                    cursor: "pointer",
                  }}
                >
                  Auto (Series)
                </button>

                <button
                  type="button"
                  onClick={() => setUnitCodeMode("manual")}
                  style={{
                    height: 38,
                    padding: "0 12px",
                    borderRadius: 10,
                    border: "1px solid #e5e7eb",
                    background: unitCodeMode === "manual" ? "#f3f4f6" : "white",
                    fontWeight: 900,
                    cursor: "pointer",
                  }}
                >
                  Manual (Single)
                </button>

                <div style={{ fontSize: 12, opacity: 0.75 }}>
                  This is what helps you price the exact unit later in <b>Builder Inventory</b>.
                </div>
              </div>

              {unitCodeMode === "manual" ? (
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12, alignItems: "end" }}>
                  <div>
                    <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Unit Code (required)</div>
                    <input
                      value={unitCodeManual}
                      onChange={(e) => setUnitCodeManual(e.target.value)}
                      placeholder={kind === "flat" ? "e.g. B-503" : kind === "land_plot" ? "e.g. P-07" : "e.g. H-12"}
                      style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd" }}
                      disabled={saving}
                    />
                    <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>Manual mode works only with Quantity = 1.</div>
                  </div>

                  <div>
                    <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Preview</div>
                    <div style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #eee", fontWeight: 900 }}>
                      {unitCodeManual.trim() || "—"}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Prefix (Tower letter / Plot / House)</div>
                    <input
                      value={unitCodePrefix}
                      onChange={(e) => {
                        setUnitCodePrefixTouched(true);
                        setUnitCodePrefix(e.target.value);
                      }}
                      placeholder={kind === "flat" ? "e.g. B" : kind === "land_plot" ? "e.g. P" : kind === "duplex" ? "e.g. D" : "e.g. H"}
                      style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd" }}
                      disabled={saving}
                    />
                    <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>
                      Auto-syncs with Tower unless you manually edit it.
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Start No</div>
                    <input
                      value={unitCodeStartNo}
                      onChange={(e) => setUnitCodeStartNo(e.target.value)}
                      placeholder="1"
                      style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd" }}
                      disabled={saving}
                    />
                  </div>

                  <div>
                    <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Digits (01 / 001)</div>
                    <input
                      value={unitCodePadDigits}
                      onChange={(e) => setUnitCodePadDigits(e.target.value)}
                      placeholder="2"
                      style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd" }}
                      disabled={saving}
                    />
                  </div>

                  <div style={{ gridColumn: "1 / span 3" }}>
                    <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Preview (first 10)</div>
                    <div style={{ padding: 12, borderRadius: 12, border: "1px solid #eee", display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {unitCodePreview.length ? (
                        unitCodePreview.map((c) => (
                          <span key={c} style={{ padding: "6px 10px", borderRadius: 12, border: "1px solid #e5e7eb", fontWeight: 900 }}>
                            {c}
                          </span>
                        ))
                      ) : (
                        <span style={{ opacity: 0.7 }}>—</span>
                      )}
                    </div>

                    <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>
                      Flat example: <b>B-503</b> (Tower B, Floor 5, Unit 03). Plot example: <b>P-07</b>.
                    </div>
                  </div>
                </div>
              )}

              <div style={{ height: 16 }} />
             {/* ============================= */}
{/* 10) Detailed Room Configuration (Optional) */}
{/* ============================= */}

<div style={{ fontWeight: 900, marginBottom: 10 }}>7) Detailed Room Configuration (Optional)</div>

<div style={{ marginBottom: 10 }}>
  <ActionButton variant="secondary" onClick={() => setEnableRoomDetails((v) => !v)} disabled={saving}>
    {enableRoomDetails ? "Hide Detailed Room Configuration" : "Enable Detailed Room Configuration"}
  </ActionButton>
</div>

{enableRoomDetails ? (
  <>
    {/* Counts + quick add/remove */}
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
      {ROOM_TYPES.map((t) => {
        const type = t.key;
        const value = roomCounts[type] ?? "0";
        const n = clampCount(value);

        return (
          <div key={type} style={{ border: "1px solid #eee", borderRadius: 12, padding: 12 }}>
            <div style={{ fontWeight: 800, marginBottom: 8 }}>{t.label}</div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, alignItems: "end" }}>
              <div>
                <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Count</div>
                <input
                  value={value}
                  onChange={(e) => {
                    if (type === "bedroom") setBedroomCountTouched(true);
                    setRoomCount(type, e.target.value);
                  }}
                  placeholder="0"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "1px solid #ddd",
                  }}
                  disabled={saving}
                />
                <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>Auto-creates blocks</div>
              </div>

              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => {
                    if (type === "bedroom") setBedroomCountTouched(true);
                    removeOneRoom(type);
                  }}
                  disabled={saving || n <= 0}
                  style={{
                    height: 36,
                    padding: "0 10px",
                    borderRadius: 10,
                    border: "1px solid #e5e7eb",
                    background: "white",
                    fontWeight: 900,
                    cursor: "pointer",
                    opacity: n <= 0 ? 0.5 : 1,
                  }}
                >
                  − Remove
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (type === "bedroom") setBedroomCountTouched(true);
                    addOneRoom(type);
                  }}
                  disabled={saving}
                  style={{
                    height: 36,
                    padding: "0 10px",
                    borderRadius: 10,
                    border: "1px solid #e5e7eb",
                    background: "#f3f4f6",
                    fontWeight: 900,
                    cursor: "pointer",
                  }}
                >
                  + Add
                </button>
              </div>
            </div>

            <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75 }}>
              Current blocks: <b>{roomBlocks[type]?.length ?? 0}</b>
            </div>
          </div>
        );
      })}
    </div>

    {/* Detailed blocks */}
    <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 16 }}>
      {ROOM_TYPES.map((t) => {
        const type = t.key;
        const blocks = roomBlocks[type] || [];
        if (!blocks.length) return null;

        return (
          <div key={type} style={{ border: "1px solid #eee", borderRadius: 12, padding: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <div style={{ fontWeight: 900 }}>
                {t.label} Details <span style={{ opacity: 0.65 }}>({blocks.length})</span>
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  onClick={() => removeOneRoom(type)}
                  disabled={saving || blocks.length === 0}
                  style={{
                    height: 34,
                    padding: "0 10px",
                    borderRadius: 10,
                    border: "1px solid #e5e7eb",
                    background: "white",
                    fontWeight: 900,
                    cursor: "pointer",
                    opacity: blocks.length === 0 ? 0.5 : 1,
                  }}
                >
                  − Remove last
                </button>

                <button
                  type="button"
                  onClick={() => addOneRoom(type)}
                  disabled={saving}
                  style={{
                    height: 34,
                    padding: "0 10px",
                    borderRadius: 10,
                    border: "1px solid #e5e7eb",
                    background: "#f3f4f6",
                    fontWeight: 900,
                    cursor: "pointer",
                  }}
                >
                  + Add another
                </button>
              </div>
            </div>

            <div style={{ height: 12 }} />

            {blocks.map((room, idx) => {
              const area = areaSqft(room.length, room.width);

              return (
                <div key={room.id} style={{ padding: 14, border: "1px solid #f0f0f0", borderRadius: 12, marginBottom: 12 }}>
                  <div style={{ fontWeight: 800, marginBottom: 10 }}>{room.label}</div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>Length (ft)</div>
                      <input
                        value={room.length}
                        onChange={(e) => updateRoomBlock(type, idx, { length: e.target.value })}
                        style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd" }}
                        disabled={saving}
                      />
                    </div>

                    <div>
                      <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>Width (ft)</div>
                      <input
                        value={room.width}
                        onChange={(e) => updateRoomBlock(type, idx, { width: e.target.value })}
                        style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd" }}
                        disabled={saving}
                      />
                    </div>

                    <div>
                      <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>Area (sqft)</div>
                      <div style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #eee", fontWeight: 900 }}>
                        {area ? `${area} sqft` : "—"}
                      </div>
                    </div>

                    <div style={{ gridColumn: "1 / span 3" }}>
                      <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>Notes (optional)</div>
                      <input
                        value={room.notes}
                        onChange={(e) => updateRoomBlock(type, idx, { notes: e.target.value })}
                        placeholder="e.g. attached wardrobe, window on east side, tiles, etc."
                        style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd" }}
                        disabled={saving}
                      />
                    </div>

                    <div style={{ gridColumn: "1 / span 3" }}>
                      <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>Room Photos (max 5)</div>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        disabled={saving}
                        onChange={(e) => {
                          const files = Array.from(e.target.files ?? []).slice(0, 5);
                          updateRoomBlock(type, idx, { photos: files });
                        }}
                      />
                      <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>
                        Selected: <b>{room.photos?.length ?? 0}</b> / 5
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  </>
) : (
  <div style={{ fontSize: 13, opacity: 0.75 }}>
    Keep this OFF unless you want room-by-room measurements & photos (best for premium listings).
  </div>
)}

              <div style={{ fontWeight: 900, marginBottom: 10 }}>7) Unit Media (Photos / Video)</div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Unit photos (multiple)</div>
                  <input type="file" accept="image/*" multiple onChange={(e) => setUnitPhotos(Array.from(e.target.files ?? []))} disabled={saving} />
                  <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>Recommended: 5–20 photos.</div>
                </div>

                <div>
                  <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Unit video (single, optional)</div>
                  <input type="file" accept="video/*" onChange={(e) => setUnitVideo((e.target.files?.[0] as any) ?? null)} disabled={saving} />
                  <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>Recommended: 30–120 seconds.</div>
                </div>
              </div>

              <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>
                Note: Media uploads to Supabase Storage bucket: <b>builder-unit-media</b>. For media upload, create <b>1 unit at a time</b>.
              </div>

              <div style={{ height: 16 }} />

              <div style={{ fontWeight: 900, marginBottom: 10 }}>8) Amenities (defaults from project)</div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 10 }}>
                <ActionButton variant="secondary" onClick={() => setShowAmenities((v) => !v)} disabled={saving || amenitiesMaster.length === 0}>
                  {showAmenities ? "Hide Amenities" : "Show Amenities"}
                </ActionButton>

                <ActionButton
                  variant="secondary"
                  onClick={() => setSelectedAmenityIds(amenitiesMaster.map((a) => a.id))}
                  disabled={saving || amenitiesMaster.length === 0}
                >
                  Select All
                </ActionButton>

                <ActionButton variant="secondary" onClick={() => setSelectedAmenityIds([])} disabled={saving || amenitiesMaster.length === 0}>
                  Clear All
                </ActionButton>

                <div style={{ fontSize: 12, opacity: 0.75 }}>
                  Selected: <b>{selectedAmenityIds.length}</b> / {amenitiesMaster.length}
                </div>
              </div>

              {!showAmenities ? (
                <div style={{ fontSize: 13, opacity: 0.75 }}>
                  Amenities are hidden. Click <b>Show Amenities</b> to review / change.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {amenitiesByCategory.map(([cat, items]) => (
                    <div key={cat} style={{ padding: 12, border: "1px solid #eee", borderRadius: 12 }}>
                      <div style={{ fontWeight: 800, marginBottom: 10, textTransform: "capitalize" }}>{cat.replace(/_/g, " ")}</div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        {items.map((a) => (
                          <label key={a.id} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                            <input type="checkbox" checked={selectedAmenityIds.includes(a.id)} onChange={() => toggleAmenity(a.id)} disabled={saving} />
                            <span>{a.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ height: 16 }} />

              <div style={{ fontWeight: 900, marginBottom: 10 }}>9) Title, Quantity & Price</div>

              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Custom Title (optional)</div>
                  <input
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder={`Auto: ${buildAutoTitle()}`}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd" }}
                    disabled={saving}
                  />
                  <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>If empty, we auto-generate from your wizard inputs.</div>
                </div>

                <div>
                  <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Quantity</div>
                  <input
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="1"
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd" }}
                    disabled={saving}
                  />
                  <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>Max 200</div>
                </div>

                <div>
                  <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Price (optional)</div>
                  <input
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="e.g. 4500000"
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd" }}
                    disabled={saving}
                  />
                </div>
              </div>

              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Catalog</div>
                <select
                  value={selectedCatalogId}
                  onChange={(e) => setSelectedCatalogId(e.target.value)}
                  style={{
                    width: "100%",
                    maxWidth: 420,
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "1px solid #ddd",
                    background: "white",
                  }}
                  disabled={saving}
                >
                  <option value="">Select catalog</option>
                  {catalogs.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} [{c.kind}]
                    </option>
                  ))}
                </select>

                <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>
                  New units must belong to a project catalog so they appear correctly on the public project page.
                </div>
              </div>

              <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <ActionButton onClick={createUnits} disabled={saving || !userId || !projectId}>
                  {saving ? "Creating…" : "Create Units"}
                </ActionButton>

                <ActionButton
                  variant="secondary"
                  onClick={() => {
                    setCustomTitle("");
                    flashSuccess("Title reset to auto.");
                  }}
                  disabled={saving}
                >
                  Reset Title to Auto
                </ActionButton>
              </div>

              <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75 }}>
                After creation: go to <b>Units list</b> → then <b>Builder Inventory</b> for pricing, availability, and listing linking.
              </div>
            </CardBody>
          </Card>
        </>
      )}
    </Container>
  );
}
