// app/admin/property/inventory/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

import { Container } from "@/components/layout/Container";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Grid } from "@/components/ui/Grid";
import { ActionButton } from "@/components/ui/ActionButton";
import { Badge } from "@/components/ui/Badge";

type ProjectRow = { id: string; name: string };

type InventoryRow = {
  id: string;
  project_id: string;
  catalog_id?: string | null; // legacy safe
  listing_id: string | null;

  unit_code: string | null;
  title: string | null;
  availability_status: string | null; // comes from builder_inventory_units.status::text
  price: number | null; // comes from builder_inventory_pricing.price_total

  created_at: string | null;
  updated_at: string | null;
};

type ListingRow = {
  id: string;
  status: string | null;
  title: string | null;
  slug: string | null;

  builder_project_id?: string | null;
  is_builder_listing?: boolean | null;

  created_at?: string | null;
};

// ✅ Unit amenities master + selection
type AmenityRow = {
  id: string;
  name: string;
  slug: string | null;
  category: string | null;
  is_active: boolean;
  sort_order: number | null;
};

// ✅ Canonical read + write targets
const INVENTORY_UI_VIEW = "v_builder_inventory_items_ui" as const;
const UNIT_AMENITIES_UI_VIEW = "v_builder_inventory_unit_amenities_ui" as const;

type UnitAmenityRow = {
  unit_id?: string | null; // view may expose or not (safe)
  unit_code: string | null;
  amenity_name: string | null;
  amenity_slug: string | null;
  amenity_category: string | null;
};

const UNITS_TABLE = "builder_inventory_units" as const;
const PRICING_TABLE = "builder_inventory_pricing" as const;
const SOURCES_TABLE = "property_listing_sources" as const;

const LISTING_TABLE = "property_listings" as const;

const PROJECT_TABLE_PRIMARY = "builder_projects" as const;
const PROJECT_TABLE_FALLBACK = "projects" as const;

// ✅ amenities tables
const AMENITIES_MASTER_TABLE = "amenities_master" as const;
const UNIT_AMENITIES_TABLE = "builder_inventory_unit_amenities" as const;

const STATUS_AVAILABLE = "available";
const STATUS_RESERVED = "reserved";
const STATUS_SOLD = "sold";

function normalizeAvailability(v: string | null | undefined): string {
  const s = String(v ?? "").trim().toLowerCase();
  if (!s) return STATUS_AVAILABLE;
  return s;
}

function formatMoneyINR(value: number | null): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "";
  try {
    return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(value);
  } catch {
    return String(value);
  }
}

function parsePrice(input: string): number | null {
  const cleaned = String(input ?? "").replace(/[₹,\s]/g, "");
  if (!cleaned) return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return null;
  if (n < 0) return null;
  return Math.round(n);
}

function allowedNextStatuses(current: string): string[] {
  const c = normalizeAvailability(current);

  if (c === STATUS_AVAILABLE) return [STATUS_AVAILABLE, STATUS_RESERVED];
  if (c === STATUS_RESERVED) return [STATUS_RESERVED, STATUS_SOLD];
  if (c === STATUS_SOLD) return [STATUS_SOLD];

  return [c];
}

function friendlyDbError(err: any): string {
  return String(err?.message ?? err?.hint ?? err?.details ?? err ?? "Unknown error");
}

function getRowLabel(row: InventoryRow): string {
  return row.unit_code ? row.unit_code : row.id.slice(0, 8);
}

function setUrlParams(next: { project_id?: string; projectId?: string; listing_id?: string }) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);

  // ✅ prefer projectId in URL, but accept legacy project_id
const nextPid = next.projectId !== undefined ? next.projectId : next.project_id;

if (nextPid !== undefined) {
  if (nextPid) url.searchParams.set("projectId", nextPid);
  else url.searchParams.delete("projectId");

  // keep URL clean: remove legacy key always
  url.searchParams.delete("project_id");
}
  if (next.listing_id !== undefined) {
    if (next.listing_id) url.searchParams.set("listing_id", next.listing_id);
    else url.searchParams.delete("listing_id");
  }

  // hard-remove old param
  url.searchParams.delete("catalog_id");

  window.history.replaceState({}, "", url.toString());
}

function isJwtExpiredError(err: any): boolean {
  const msg = String(err?.message ?? err?.details ?? err ?? "").toLowerCase();
  return msg.includes("jwt expired");
}

type Flash = { kind: "success" | "error"; message: string } | null;

export default function AdminPropertyInventoryPage() {
  const searchParams = useSearchParams();

  /**
   * ✅ Fix TS2589 (deep/infinite instantiation)
   * Cast factory to any BEFORE calling it, so TS doesn't evaluate Supabase generics.
   */
  const supabase: any = useMemo(() => {
    const factory: any = getSupabaseBrowser as any;
    return factory();
  }, []);

  // --- responsive UI breakpoint (UI-only) ---
  const [isNarrow, setIsNarrow] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;

    const calc = () => setIsNarrow(window.innerWidth < 900);

    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);

  // --- UI-only polish helpers ---
  const ui = useMemo(() => {
    const controlBase: React.CSSProperties = {
      width: "100%",
      padding: "10px 12px",
      borderRadius: 10,
      border: "1px solid #ddd",
      outline: "none",
    };

    return {
      label: { fontSize: 12, opacity: 0.75, marginBottom: 6 } as React.CSSProperties,
      hint: { fontSize: 12, opacity: 0.75, lineHeight: 1.35 } as React.CSSProperties,
      input: (disabled: boolean): React.CSSProperties => ({
        ...controlBase,
        background: disabled ? "#f3f3f3" : "white",
      }),
      select: (disabled: boolean): React.CSSProperties => ({
        ...controlBase,
        background: disabled ? "#f3f3f3" : "white",
      }),
      stickyCardWrap: { position: "sticky", top: 12, zIndex: 20 } as React.CSSProperties,
      stickyCardBg: {
        background: "#fff",
        borderRadius: 14,
        boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
      } as React.CSSProperties,
      panel: {
        padding: "12px 12px",
        borderRadius: 12,
        border: "1px solid #e8e8e8",
        background: "#fafafa",
      } as React.CSSProperties,
      sectionTitle: { fontSize: 12, fontWeight: 800, opacity: 0.85, marginBottom: 8 } as React.CSSProperties,
      subCard: {
        borderRadius: 12,
        border: "1px solid #eee",
        background: "#fbfbfb",
        padding: 12,
      } as React.CSSProperties,
      pill: {
        fontSize: 12,
        padding: "4px 8px",
        borderRadius: 999,
        border: "1px solid #e1e1e1",
        background: "#fff",
        opacity: 0.92,
        whiteSpace: "nowrap",
        lineHeight: 1.1,
      } as React.CSSProperties,
      arrow: { fontSize: 12, opacity: 0.55, padding: "0 4px", whiteSpace: "nowrap", lineHeight: 1.1 } as React.CSSProperties,
      rowButtons: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" } as React.CSSProperties,
      dangerBox: {
        marginTop: 12,
        padding: "10px 12px",
        borderRadius: 12,
        border: "1px solid #f3c1c1",
        background: "#fff5f5",
        fontSize: 13,
      } as React.CSSProperties,
      helperValue: { marginTop: 6, fontSize: 12, opacity: 0.7 } as React.CSSProperties,

      // ✅ amenities UI
      amenityWrap: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: 10,
        marginTop: 10,
      } as React.CSSProperties,
      amenityCat: {
        border: "1px solid #ececec",
        borderRadius: 12,
        background: "#fff",
        padding: 10,
      } as React.CSSProperties,
      amenityCatTitle: { fontSize: 12, fontWeight: 900, opacity: 0.85, marginBottom: 8 } as React.CSSProperties,
      amenityItem: { display: "flex", gap: 8, alignItems: "center", padding: "6px 0" } as React.CSSProperties,
      miniBtn: {
        padding: "8px 10px",
        borderRadius: 10,
        border: "1px solid #e3e3e3",
        background: "#fff",
        fontWeight: 800,
        fontSize: 12,
        cursor: "pointer",
      } as React.CSSProperties,
    };
  }, []);

  const [loading, setLoading] = useState(true);
  const [refreshTick, setRefreshTick] = useState(0);

  const [projectTable, setProjectTable] = useState<string>("");
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");

  const [selectedListingId, setSelectedListingId] = useState<string>("");

  const [inventory, setInventory] = useState<InventoryRow[]>([]);
  const [unitAmenitiesByUnitId, setUnitAmenitiesByUnitId] = useState<Record<string, UnitAmenityRow[]>>({});

  // ✅ pagination (UI-only)
  const PAGE_SIZES = [12, 24, 48, 96] as const;
  const [pageSize, setPageSize] = useState<number>(24);
  const [page, setPage] = useState<number>(1);

  const totalItems = inventory.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(page, totalPages);

  const pageFrom = (safePage - 1) * pageSize;
  const pageTo = pageFrom + pageSize;
  const visibleInventory = useMemo(() => inventory.slice(pageFrom, pageTo), [inventory, pageFrom, pageTo]);

  const [listingById, setListingById] = useState<Record<string, ListingRow>>({});
  const [projectListings, setProjectListings] = useState<ListingRow[]>([]);

  const [globalError, setGlobalError] = useState<string>("");
  const [rowError, setRowError] = useState<Record<string, string>>({});
  const [savingRow, setSavingRow] = useState<Record<string, boolean>>({});

  const [draftTitle, setDraftTitle] = useState<Record<string, string>>({});
  const [draftPrice, setDraftPrice] = useState<Record<string, string>>({});
  const [draftAvailability, setDraftAvailability] = useState<Record<string, string>>({});

  const [draftLinkListingId, setDraftLinkListingId] = useState<Record<string, string>>({});
  const [linkWorkingRow, setLinkWorkingRow] = useState<Record<string, boolean>>({});

  const [flash, setFlash] = useState<Flash>(null);

  // ✅ amenities states
  const [amenitiesMaster, setAmenitiesMaster] = useState<AmenityRow[]>([]);
  const [amenitiesLoaded, setAmenitiesLoaded] = useState(false);

  const [activeAmenitiesUnitId, setActiveAmenitiesUnitId] = useState<string>("");
  const [unitAmenityIds, setUnitAmenityIds] = useState<Record<string, boolean>>({});
  const [amenitiesWorking, setAmenitiesWorking] = useState(false);
  const [amenitiesError, setAmenitiesError] = useState<string>("");

  function flashSuccess(message: string) {
    setFlash({ kind: "success", message });
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      window.setTimeout(() => setFlash(null), 4000);
    }
  }

  function flashError(message: string) {
    setFlash({ kind: "error", message });
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      window.setTimeout(() => setFlash(null), 6000);
    }
  }

  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [bulkPrice, setBulkPrice] = useState<string>("");
  const [bulkWorking, setBulkWorking] = useState(false);
  const [bulkMessage, setBulkMessage] = useState<string>("");

  useEffect(() => {
  // ✅ accept both param names (builder page sends projectId)
  const urlProjectId =
    String(searchParams.get("projectId") ?? "").trim() ||
    String(searchParams.get("project_id") ?? "").trim();

  const urlListingId = String(searchParams.get("listing_id") ?? "").trim();

  if (urlProjectId) setSelectedProjectId(urlProjectId);
  if (urlListingId) setSelectedListingId(urlListingId);
}, [searchParams]);

  async function runWithJwtRetry(makeQuery: () => Promise<any>): Promise<any> {
    const res1: any = await makeQuery();
    if (!res1?.error) return res1;

    if (isJwtExpiredError(res1.error)) {
      try {
        await supabase.auth.refreshSession();
      } catch {
        // ignore
      }
      return await makeQuery();
    }

    return res1;
  }

  // ✅ Load amenities master once
  useEffect(() => {
    let cancelled = false;

    async function loadAmenitiesMaster() {
      setAmenitiesLoaded(false);
      setAmenitiesMaster([]);

      const aRes = await runWithJwtRetry(() =>
        supabase
          .from(AMENITIES_MASTER_TABLE)
          .select("id,name,category,is_active,sort_order")
          .eq("is_active", true)
          .order("category", { ascending: true })
          .order("sort_order", { ascending: true })
          .order("name", { ascending: true })
      );

      if (!cancelled && aRes.error) {
        // Don't block page if amenities missing; just keep empty and show error when open panel
        setAmenitiesMaster([]);
        setAmenitiesLoaded(true);
        return;
      }

      if (!cancelled) {
        setAmenitiesMaster((aRes.data ?? []) as AmenityRow[]);
        setAmenitiesLoaded(true);
      }
    }

    loadAmenitiesMaster();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTick]);

  const amenitiesByCategory = useMemo(() => {
    const map: Record<string, AmenityRow[]> = {};
    for (const a of amenitiesMaster) {
      const cat = (a.category ?? "Other").trim() || "Other";
      if (!map[cat]) map[cat] = [];
      map[cat].push(a);
    }
    return map;
  }, [amenitiesMaster]);

  function getAmenityNameById(id: string): string {
    const a = amenitiesMaster.find((x) => x.id === id);
    return a?.name ?? id.slice(0, 8);
  }

  const activeAmenityCount = useMemo(() => Object.keys(unitAmenityIds).filter((k) => unitAmenityIds[k]).length, [unitAmenityIds]);

  async function openUnitAmenities(unitId: string) {
    setActiveAmenitiesUnitId(unitId);
    setAmenitiesError("");
    setAmenitiesWorking(true);
    setUnitAmenityIds({});

    // If master did not load (e.g. RLS), show helpful error
    if (!amenitiesLoaded) {
      // still proceed to load unit selections
    }

    const selRes = await runWithJwtRetry(() =>
      supabase.from(UNIT_AMENITIES_TABLE).select("amenity_id").eq("unit_id", unitId)
    );

    if (selRes.error) {
      setAmenitiesWorking(false);
      setAmenitiesError(friendlyDbError(selRes.error));
      return;
    }

    const rows = (selRes.data ?? []) as { amenity_id: string }[];
    const next: Record<string, boolean> = {};
    for (const r of rows) next[r.amenity_id] = true;

    setUnitAmenityIds(next);
    setAmenitiesWorking(false);
  }

  function closeUnitAmenities() {
    setActiveAmenitiesUnitId("");
    setUnitAmenityIds({});
    setAmenitiesError("");
    setAmenitiesWorking(false);
  }

  function toggleAmenity(amenityId: string, checked: boolean) {
    setUnitAmenityIds((prev) => ({ ...prev, [amenityId]: checked }));
  }

  function selectAllAmenitiesInCategory(cat: string) {
    const list = amenitiesByCategory[cat] ?? [];
    setUnitAmenityIds((prev) => {
      const next = { ...prev };
      for (const a of list) next[a.id] = true;
      return next;
    });
  }

  function clearAllAmenitiesInCategory(cat: string) {
    const list = amenitiesByCategory[cat] ?? [];
    setUnitAmenityIds((prev) => {
      const next = { ...prev };
      for (const a of list) next[a.id] = false;
      return next;
    });
  }

  function clearAllAmenities() {
    setUnitAmenityIds({});
  }

  async function saveUnitAmenities() {
    if (!activeAmenitiesUnitId) return;

    setAmenitiesError("");
    setAmenitiesWorking(true);

    const selectedAmenityIds = Object.keys(unitAmenityIds).filter((k) => unitAmenityIds[k]);

    // 1) delete old
    const delRes = await runWithJwtRetry(() =>
      supabase.from(UNIT_AMENITIES_TABLE).delete().eq("unit_id", activeAmenitiesUnitId)
    );

    if (delRes.error) {
      setAmenitiesWorking(false);
      setAmenitiesError(friendlyDbError(delRes.error));
      return;
    }

    // 2) insert new
    if (selectedAmenityIds.length > 0) {
      const payload = selectedAmenityIds.map((amenity_id) => ({
        unit_id: activeAmenitiesUnitId,
        amenity_id,
      }));

      const insRes = await runWithJwtRetry(() => supabase.from(UNIT_AMENITIES_TABLE).insert(payload).select("unit_id"));

      if (insRes.error) {
        setAmenitiesWorking(false);
        setAmenitiesError(friendlyDbError(insRes.error));
        return;
      }
    }

    setAmenitiesWorking(false);
    flashSuccess(`Amenities saved (${selectedAmenityIds.length}) for unit ${activeAmenitiesUnitId.slice(0, 8)}.`);
    setRefreshTick((x) => x + 1);
    closeUnitAmenities();
    // keep panel open, but refresh may be useful if you later show counts from DB
  }

  // boot projects
  useEffect(() => {
    let cancelled = false;

    async function boot() {
      setLoading(true);
      setGlobalError("");

      const tryPrimary = await runWithJwtRetry(() =>
        supabase.from(PROJECT_TABLE_PRIMARY).select("id,name").order("name", { ascending: true })
      );

      if (!tryPrimary.error) {
        const pData = (tryPrimary.data ?? []) as ProjectRow[];
        if (!cancelled) {
          setProjectTable(PROJECT_TABLE_PRIMARY);
          setProjects(pData);
          setSelectedProjectId((prev) => prev || (pData[0]?.id ?? ""));
        }
        setLoading(false);
        return;
      }

      const tryFallback = await runWithJwtRetry(() =>
        supabase.from(PROJECT_TABLE_FALLBACK).select("id,name").order("name", { ascending: true })
      );

      if (tryFallback.error) {
        if (!cancelled) {
          setProjectTable("");
          setProjects([]);
          setGlobalError(
            `Could not load projects from either table.\n\n` +
              `Tried: ${PROJECT_TABLE_PRIMARY} → ${friendlyDbError(tryPrimary.error)}\n` +
              `Tried: ${PROJECT_TABLE_FALLBACK} → ${friendlyDbError(tryFallback.error)}`
          );
        }
        setLoading(false);
        return;
      }

      const pData = (tryFallback.data ?? []) as ProjectRow[];
      if (!cancelled) {
        setProjectTable(PROJECT_TABLE_FALLBACK);
        setProjects(pData);
        setSelectedProjectId((prev) => prev || (pData[0]?.id ?? ""));
      }

      setLoading(false);
    }

    boot();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTick]);

  useEffect(() => {
    if (!selectedProjectId) return;

    setUrlParams({ projectId: selectedProjectId, listing_id: selectedListingId });

    // ✅ pagination reset on filter change
    setPage(1);
  }, [selectedProjectId, selectedListingId]);

  // ✅ load project listings (BUILDER ONLY)
  useEffect(() => {
    let cancelled = false;

    async function loadProjectListings() {
      setProjectListings([]);
      if (!selectedProjectId) return;

      const lRes = await runWithJwtRetry(() =>
        supabase
          .from(LISTING_TABLE)
          .select("id,status,title,slug,created_at,is_builder_listing,builder_project_id")
          .eq("builder_project_id", selectedProjectId)
          .eq("is_builder_listing", true)
          .order("created_at", { ascending: false })
      );

      if (!cancelled && lRes.error) {
        setGlobalError((prev) => prev || friendlyDbError(lRes.error));
        return;
      }

      if (!cancelled) {
        const raw = (lRes.data ?? []) as ListingRow[];
        const onlyBuilder = raw.filter(
          (x) => String(x.builder_project_id ?? "") === String(selectedProjectId) && x.is_builder_listing === true
        );
        setProjectListings(onlyBuilder);
      }
    }

    loadProjectListings();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProjectId, refreshTick]);

  // load inventory (READ FROM VIEW)
  useEffect(() => {
    let cancelled = false;

    async function loadInventory() {
      setGlobalError("");
      setRowError({});
      setInventory([]);
      setListingById({});
      setDraftTitle({});
      setDraftPrice({});
      setDraftAvailability({});
      setDraftLinkListingId({});
      setLinkWorkingRow({});
      setUnitAmenitiesByUnitId({});

      setSelectedIds({});
      setBulkMessage("");
      setBulkPrice("");

      // close amenities panel when inventory reloads
      closeUnitAmenities();

      if (!selectedProjectId) return;

      setLoading(true);

      let q: any = supabase
        .from(INVENTORY_UI_VIEW)
        .select("id,project_id,listing_id,unit_code,title,availability_status,price,created_at,updated_at")
        .eq("project_id", selectedProjectId)
        .order("created_at", { ascending: false });

      if (selectedListingId) {
        q = q.eq("listing_id", selectedListingId);
      }

      const invRes = await runWithJwtRetry(() => q);

      if (!cancelled && invRes.error) {
        setGlobalError(friendlyDbError(invRes.error));
        setInventory([]);
        setLoading(false);
        return;
      }

      const invData = (invRes.data ?? []) as InventoryRow[];
      // ✅ Load unit amenities for these units (batch)
try {
  const unitIds = Array.from(new Set(invData.map((r) => r.id).filter(Boolean)));

  if (unitIds.length > 0) {
    const aRes = await runWithJwtRetry(() =>
      supabase
        .from(UNIT_AMENITIES_UI_VIEW)
        .select("unit_id,unit_code,amenity_name,amenity_slug,amenity_category")
        .in("unit_id", unitIds)
    );

    if (!cancelled && !aRes.error) {
      const aData = (aRes.data ?? []) as UnitAmenityRow[];
      const map: Record<string, UnitAmenityRow[]> = {};

      for (const r of aData) {
        const uid = String((r as any).unit_id ?? "");
        if (!uid) continue;
        if (!map[uid]) map[uid] = [];
        map[uid].push(r);
      }

      // sort for stable UI
      for (const k of Object.keys(map)) {
        map[k].sort((x, y) => String(x.amenity_name ?? "").localeCompare(String(y.amenity_name ?? "")));
      }

      setUnitAmenitiesByUnitId(map);
    }
  }
} catch {
  // ignore UI-only failure
}
      const t: Record<string, string> = {};
      const p: Record<string, string> = {};
      const a: Record<string, string> = {};
      const linkDraft: Record<string, string> = {};

      for (const row of invData) {
        t[row.id] = row.title ?? "";
        p[row.id] = row.price === null ? "" : String(row.price);
        a[row.id] = normalizeAvailability(row.availability_status);
        linkDraft[row.id] = row.listing_id ?? "";
      }

      const listingIds = Array.from(new Set(invData.map((r) => r.listing_id).filter((x): x is string => !!x)));

      let listingMap: Record<string, ListingRow> = {};
      if (listingIds.length > 0) {
        const lRes = await runWithJwtRetry(() =>
          supabase.from(LISTING_TABLE).select("id,status,title,slug").in("id", listingIds)
        );
        if (!cancelled && !lRes.error) {
          const lData = (lRes.data ?? []) as ListingRow[];
          const nextMap: Record<string, ListingRow> = {};
          for (const lr of lData) nextMap[lr.id] = lr;
          listingMap = nextMap;
        }
      }

      if (!cancelled) {
        setInventory(invData);
        setDraftTitle(t);
        setDraftPrice(p);
        setDraftAvailability(a);
        setDraftLinkListingId(linkDraft);
        setListingById(listingMap);
      }
      setPage(1); // ✅ reset page on reload
      setLoading(false);
    }

    loadInventory();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProjectId, selectedListingId, refreshTick]);

  const projectName = useMemo(
    () => projects.find((x) => x.id === selectedProjectId)?.name ?? "",
    [projects, selectedProjectId]
  );

  async function saveRow(row: InventoryRow) {
    const id = row.id;

    setRowError((prev) => ({ ...prev, [id]: "" }));
    setSavingRow((prev) => ({ ...prev, [id]: true }));
    setGlobalError("");
    setBulkMessage("");

    const current = normalizeAvailability(row.availability_status);
    const next = normalizeAvailability(draftAvailability[id] ?? current);
    const allowed = allowedNextStatuses(current);
    if (!allowed.includes(next)) {
      const msg = `Invalid transition: ${current} → ${next}. Allowed: ${allowed.join(" → ")}`;
      setRowError((prev) => ({ ...prev, [id]: msg }));
      setSavingRow((prev) => ({ ...prev, [id]: false }));
      flashError(`${getRowLabel(row)}: ${msg}`);
      return;
    }

    const nextTitle = (draftTitle[id] ?? "").trim();
    const nextPrice = parsePrice(draftPrice[id] ?? "");

    // 1) Update unit master (title + status)
    const unitRes = await runWithJwtRetry(() =>
      supabase
        .from(UNITS_TABLE)
        .update({
          title: nextTitle ? nextTitle : null,
          status: next,
        })
        .eq("id", id)
        .select("id")
        .maybeSingle()
    );

    if (unitRes.error) {
      const msg = friendlyDbError(unitRes.error);
      setRowError((prev) => ({ ...prev, [id]: msg }));
      setSavingRow((prev) => ({ ...prev, [id]: false }));
      flashError(`${getRowLabel(row)}: Save failed — ${msg}`);
      return;
    }

    // 2) Upsert pricing (price_total)
    // If price is cleared, we delete pricing rows for this unit to avoid stale price.
    if (nextPrice === null) {
      const delRes = await runWithJwtRetry(() => supabase.from(PRICING_TABLE).delete().eq("unit_id", id));
      if (delRes.error) {
        const msg = friendlyDbError(delRes.error);
        setRowError((prev) => ({ ...prev, [id]: msg }));
        setSavingRow((prev) => ({ ...prev, [id]: false }));
        flashError(`${getRowLabel(row)}: Price clear failed — ${msg}`);
        return;
      }
    } else {
      const upPriceRes = await runWithJwtRetry(() =>
        supabase
          .from(PRICING_TABLE)
          .upsert(
            {
              unit_id: id,
              pricing_kind: "total",
              price_total: nextPrice,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "unit_id" }
          )
          .select("id")
          .maybeSingle()
      );

      if (upPriceRes.error) {
        const msg = friendlyDbError(upPriceRes.error);
        setRowError((prev) => ({ ...prev, [id]: msg }));
        setSavingRow((prev) => ({ ...prev, [id]: false }));
        flashError(`${getRowLabel(row)}: Price save failed — ${msg}`);
        return;
      }
    }

    setSavingRow((prev) => ({ ...prev, [id]: false }));
    flashSuccess(`${getRowLabel(row)}: Inventory saved successfully.`);
    setRefreshTick((x) => x + 1);
  }

  function resetRow(row: InventoryRow) {
    const id = row.id;
    setRowError((prev) => ({ ...prev, [id]: "" }));
    setDraftTitle((prev) => ({ ...prev, [id]: row.title ?? "" }));
    setDraftPrice((prev) => ({ ...prev, [id]: row.price === null ? "" : String(row.price) }));
    setDraftAvailability((prev) => ({ ...prev, [id]: normalizeAvailability(row.availability_status) }));
    setDraftLinkListingId((prev) => ({ ...prev, [id]: row.listing_id ?? "" }));
    flashSuccess(`${getRowLabel(row)}: Changes reset.`);
  }

  async function applyLink(row: InventoryRow) {
    const id = row.id;
    const nextListingId = String(draftLinkListingId[id] ?? "").trim() || null;

    setRowError((prev) => ({ ...prev, [id]: "" }));
    setLinkWorkingRow((prev) => ({ ...prev, [id]: true }));
    setGlobalError("");
    setBulkMessage("");

    // Always clear any existing source rows for this unit (one unit -> one listing)
    const delOld = await runWithJwtRetry(() => supabase.from(SOURCES_TABLE).delete().eq("unit_id", id));
    if (delOld.error) {
      const msg = friendlyDbError(delOld.error);
      setRowError((prev) => ({ ...prev, [id]: msg }));
      setLinkWorkingRow((prev) => ({ ...prev, [id]: false }));
      flashError(`${getRowLabel(row)}: Unlink old failed — ${msg}`);
      return;
    }

    if (nextListingId) {
      // Link this unit to property listing via property_listing_sources
      const insRes = await runWithJwtRetry(() =>
        supabase
          .from(SOURCES_TABLE)
          .upsert(
            {
              property_id: nextListingId,
              source_kind: "builder_inventory",
              project_id: selectedProjectId,
              unit_id: id,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "property_id" }
          )
          .select("id")
          .maybeSingle()
      );

      if (insRes.error) {
        const msg = friendlyDbError(insRes.error);
        setRowError((prev) => ({ ...prev, [id]: msg }));
        setLinkWorkingRow((prev) => ({ ...prev, [id]: false }));
        flashError(`${getRowLabel(row)}: Link failed — ${msg}`);
        return;
      }
    }

    setLinkWorkingRow((prev) => ({ ...prev, [id]: false }));

    if (nextListingId) flashSuccess(`${getRowLabel(row)}: Linked successfully.`);
    else flashSuccess(`${getRowLabel(row)}: Listing cleared.`);

    setRefreshTick((x) => x + 1);
  }

  async function unlinkRow(row: InventoryRow) {
    const id = row.id;
    setDraftLinkListingId((prev) => ({ ...prev, [id]: "" }));
    await applyLink(row);
  }

  const selectedIdList = useMemo(() => Object.keys(selectedIds).filter((k) => selectedIds[k]), [selectedIds]);

  const selectedRows = useMemo(() => {
    const set = new Set(selectedIdList);
    return inventory.filter((r) => set.has(r.id));
  }, [inventory, selectedIdList]);

  function toggleSelected(id: string, checked: boolean) {
    setSelectedIds((prev) => ({ ...prev, [id]: checked }));
  }

  function selectAllVisible() {
    const next: Record<string, boolean> = {};
    for (const row of visibleInventory) next[row.id] = true;

    // merge with existing selection (so you can select page-1 then page-2)
    setSelectedIds((prev) => ({ ...prev, ...next }));

    flashSuccess(`Selected ${visibleInventory.length} items on this page.`);
  }

  function clearSelection() {
    setSelectedIds({});
    flashSuccess("Selection cleared.");
  }

  async function bulkApplyPrice() {
    setBulkMessage("");
    setGlobalError("");

    const targetPrice = parsePrice(bulkPrice);
    if (targetPrice === null) {
      const msg = "Bulk price is invalid/empty. Enter a valid number (e.g. 4500000).";
      setBulkMessage(msg);
      flashError(msg);
      return;
    }

    if (selectedRows.length === 0) {
      const msg = "Select at least 1 inventory item first.";
      setBulkMessage(msg);
      flashError(msg);
      return;
    }

    setBulkWorking(true);

    let okCount = 0;
    let failCount = 0;

    setRowError((prev) => {
      const next = { ...prev };
      for (const r of selectedRows) next[r.id] = "";
      return next;
    });

    for (const row of selectedRows) {
      const id = row.id;
      setDraftPrice((prev) => ({ ...prev, [id]: String(targetPrice) }));

      const upPriceRes = await runWithJwtRetry(() =>
        supabase
          .from(PRICING_TABLE)
          .upsert(
            {
              unit_id: id,
              pricing_kind: "total",
              price_total: targetPrice,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "unit_id" }
          )
          .select("id")
          .maybeSingle()
      );

      if (upPriceRes.error) {
        failCount += 1;
        setRowError((prev) => ({ ...prev, [id]: friendlyDbError(upPriceRes.error) }));
        continue;
      }

      okCount += 1;
    }

    setBulkWorking(false);
    const msg = `Bulk price done: ${okCount} updated, ${failCount} failed.`;
    setBulkMessage(msg);
    if (failCount > 0) flashError(msg);
    else flashSuccess(msg);

    setRefreshTick((x) => x + 1);
  }

  async function bulkTransition(toStatus: "reserved" | "sold") {
    setBulkMessage("");
    setGlobalError("");

    if (selectedRows.length === 0) {
      const msg = "Select at least 1 inventory item first.";
      setBulkMessage(msg);
      flashError(msg);
      return;
    }

    const invalid: string[] = [];
    const eligible: InventoryRow[] = [];

    for (const row of selectedRows) {
      const cur = normalizeAvailability(row.availability_status);
      if (toStatus === "reserved") {
        if (cur !== STATUS_AVAILABLE) invalid.push(`${getRowLabel(row)} (${cur})`);
        else eligible.push(row);
      } else {
        if (cur !== STATUS_RESERVED) invalid.push(`${getRowLabel(row)} (${cur})`);
        else eligible.push(row);
      }
    }

    if (invalid.length > 0) {
      const msg = `Bulk transition blocked. Not eligible: ${invalid.slice(0, 10).join(", ")}${
        invalid.length > 10 ? " …" : ""
      }`;
      setBulkMessage(msg);
      flashError(msg);
      return;
    }

    setBulkWorking(true);

    let okCount = 0;
    let failCount = 0;

    setRowError((prev) => {
      const next = { ...prev };
      for (const r of eligible) next[r.id] = "";
      return next;
    });

    for (const row of eligible) {
      const id = row.id;
      setDraftAvailability((prev) => ({ ...prev, [id]: toStatus }));

      const upRes = await runWithJwtRetry(() =>
        supabase
          .from(UNITS_TABLE)
          .update({ status: toStatus, updated_at: new Date().toISOString() })
          .eq("id", id)
          .select("id")
          .maybeSingle()
      );

      if (upRes.error) {
        failCount += 1;
        setRowError((prev) => ({ ...prev, [id]: friendlyDbError(upRes.error) }));
        continue;
      }

      okCount += 1;
    }

    setBulkWorking(false);
    const msg = `Bulk status → ${toStatus}: ${okCount} updated, ${failCount} failed.`;
    setBulkMessage(msg);
    if (failCount > 0) flashError(msg);
    else flashSuccess(msg);

    setRefreshTick((x) => x + 1);
  }

  function clearListingFilter() {
    setSelectedListingId("");
    setUrlParams({ listing_id: "" });
    flashSuccess("Listing filter cleared.");
  }

  const isListingFiltered = !!selectedListingId;

  function refreshNow() {
    setRefreshTick((x) => x + 1);
    flashSuccess("Refreshed.");
  }

  // responsive columns
  const detailsCols = isNarrow ? "1fr" : "minmax(260px,1fr) minmax(180px,220px) minmax(180px,220px)";

  return (
    <Container>
      <SectionHeader
        title="Property • Builder Inventory"
        subtitle="Edit units + pricing + listing link. Reads from v_builder_inventory_items_ui, writes to builder_inventory_units / builder_inventory_pricing / property_listing_sources."
        right={
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <ActionButton variant="secondary" onClick={refreshNow}>
              Refresh
            </ActionButton>
          </div>
        }
      />

      {flash ? (
        <div
          style={{
            position: "sticky",
            top: 12,
            zIndex: 999,
            marginTop: 10,
            marginBottom: 12,
            border:
              flash.kind === "success"
                ? "1px solid rgba(46, 160, 67, 0.25)"
                : "1px solid rgba(220, 53, 69, 0.25)",
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

      <div style={ui.stickyCardWrap}>
        <div style={ui.stickyCardBg}>
          <Card>
            <CardBody>
              <div style={ui.sectionTitle}>Filters</div>

              <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                {/* Project */}
                <div style={{ minWidth: 240, flex: "0 0 auto" }}>
                  <div style={ui.label}>Project</div>
                  <select
                    value={selectedProjectId}
                    onChange={(e) => {
                      const next = e.target.value;
                      setSelectedProjectId(next);
                      setSelectedListingId("");
                      setUrlParams({ projectId: next, listing_id: "" });
                      flashSuccess("Project changed.");
                    }}
                    style={ui.select(false)}
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  {projectTable ? <div style={{ marginTop: 6, ...ui.hint }}>Source: {projectTable}</div> : null}
                </div>

                {/* Builder listings only */}
                <div style={{ minWidth: 360, flex: "0 0 auto" }}>
                  <div style={ui.label}>Listing (optional)</div>
                  <select
                    value={selectedListingId}
                    onChange={(e) => {
                      const next = e.target.value;
                      setSelectedListingId(next);
                      setUrlParams({ listing_id: next });
                      flashSuccess(next ? "Listing filter applied." : "All listings.");
                    }}
                    style={ui.select(!selectedProjectId || projectListings.length === 0)}
                    disabled={!selectedProjectId || projectListings.length === 0}
                  >
                    <option value="">All listings</option>
                    {projectListings.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.title ?? "(untitled)"} • {l.status ?? "?"} {l.slug ? `• ${l.slug}` : ""}
                      </option>
                    ))}
                  </select>

                  {!selectedProjectId ? (
                    <div style={{ marginTop: 6, ...ui.hint }}>Select a project first.</div>
                  ) : projectListings.length === 0 ? (
                    <div style={{ marginTop: 6, ...ui.hint }}>
                      No builder listings found for this project yet. (Requires property_listings.builder_project_id = project id and
                      is_builder_listing=true.)
                    </div>
                  ) : (
                    <div style={{ marginTop: 6, ...ui.hint }}>
                      Listings loaded via property_listings.builder_project_id + is_builder_listing=true.
                    </div>
                  )}
                </div>

                {/* badges */}
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  {projectName ? <Badge>{projectName}</Badge> : null}
                  {isListingFiltered ? <Badge>listing filter: ON</Badge> : null}
                  <Badge>
                    Showing {visibleInventory.length} of {inventory.length}
                  </Badge>

                  {/* ✅ pagination controls */}
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <div style={{ fontSize: 12, opacity: 0.75 }}>Page size</div>

                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setPage(1);
                      }}
                      style={{ ...ui.select(false), width: 120 }}
                    >
                      {PAGE_SIZES.map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>

                    <ActionButton variant="secondary" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage <= 1}>
                      Prev
                    </ActionButton>

                    <Badge>
                      Page {safePage} / {totalPages}
                    </Badge>

                    <ActionButton
                      variant="secondary"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={safePage >= totalPages}
                    >
                      Next
                    </ActionButton>
                  </div>

                  {isListingFiltered ? (
                    <ActionButton variant="secondary" onClick={clearListingFilter}>
                      Clear Listing Filter
                    </ActionButton>
                  ) : null}
                </div>
              </div>

              {isListingFiltered ? (
                <div style={{ marginTop: 14 }}>
                  <div style={ui.panel}>
                    <div
                      style={{
                        display: "flex",
                        gap: 10,
                        flexWrap: "wrap",
                        alignItems: "center",
                        justifyContent: "space-between",
                        width: "100%",
                      }}
                    >
                      <div style={ui.rowButtons}>
                        <Badge>{selectedIdList.length} selected</Badge>

                        <ActionButton variant="secondary" onClick={selectAllVisible} disabled={bulkWorking || inventory.length === 0}>
                          Select All (visible)
                        </ActionButton>

                        <ActionButton
                          variant="secondary"
                          onClick={clearSelection}
                          disabled={bulkWorking || selectedIdList.length === 0}
                        >
                          Clear Selection
                        </ActionButton>
                      </div>

                      <div style={ui.rowButtons}>
                        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                          <div style={{ fontSize: 12, opacity: 0.75 }}>Bulk price (₹)</div>
                          <input
                            value={bulkPrice}
                            onChange={(e) => setBulkPrice(e.target.value)}
                            placeholder="e.g. 4500000"
                            inputMode="numeric"
                            style={{ ...ui.input(bulkWorking), width: 180 }}
                            disabled={bulkWorking}
                          />
                          <ActionButton onClick={bulkApplyPrice} disabled={bulkWorking || selectedIdList.length === 0}>
                            {bulkWorking ? "Working…" : "Apply Price"}
                          </ActionButton>
                        </div>

                        <ActionButton
                          variant="secondary"
                          onClick={() => bulkTransition("reserved")}
                          disabled={bulkWorking || selectedIdList.length === 0}
                        >
                          Mark Reserved
                        </ActionButton>

                        <ActionButton onClick={() => bulkTransition("sold")} disabled={bulkWorking || selectedIdList.length === 0}>
                          Mark Sold
                        </ActionButton>
                      </div>
                    </div>

                    {bulkMessage ? <div style={{ marginTop: 10, fontSize: 13, whiteSpace: "pre-wrap" }}>{bulkMessage}</div> : null}

                    <div style={{ marginTop: 10, fontSize: 12, opacity: 0.8 }}>
                      Bulk status buttons enforce strict transitions. DB triggers remain final authority; any DB errors will show per row.
                    </div>
                  </div>
                </div>
              ) : null}

              {globalError ? (
                <div style={ui.dangerBox}>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>Error</div>
                  <div style={{ whiteSpace: "pre-wrap" }}>{globalError}</div>
                </div>
              ) : null}
            </CardBody>
          </Card>
        </div>
      </div>

      <div style={{ height: 14 }} />

      {/* ✅ Unit amenities editor panel (works without unit edit page) */}
      {activeAmenitiesUnitId ? (
        <Card>
          <CardBody>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 900, fontSize: 14 }}>Unit Amenities</div>
                <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75 }}>
                  Unit: <b>{activeAmenitiesUnitId.slice(0, 8)}</b> • Selected: <b>{activeAmenityCount}</b>
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <ActionButton variant="secondary" onClick={clearAllAmenities} disabled={amenitiesWorking}>
                  Clear all
                </ActionButton>
                <ActionButton onClick={saveUnitAmenities} disabled={amenitiesWorking}>
                  {amenitiesWorking ? "Saving…" : "Save amenities"}
                </ActionButton>
                <ActionButton variant="secondary" onClick={closeUnitAmenities} disabled={amenitiesWorking}>
                  Close
                </ActionButton>
              </div>
            </div>

            {!amenitiesLoaded ? (
              <div style={{ marginTop: 10, fontSize: 13, opacity: 0.8 }}>Loading amenities…</div>
            ) : amenitiesMaster.length === 0 ? (
              <div style={ui.dangerBox}>
                <div style={{ fontWeight: 800, marginBottom: 4 }}>Amenities master not available</div>
                <div style={{ opacity: 0.9 }}>
                  Table <b>{AMENITIES_MASTER_TABLE}</b> returned no rows. Check:
                  <ul style={{ margin: "8px 0 0 18px" }}>
                    <li>Does the table exist?</li>
                    <li>Is RLS blocking admin read?</li>
                    <li>Do you have is_active=true rows?</li>
                    <li>Are column names: id, name, category, is_active, sort_order?</li>
                  </ul>
                </div>
              </div>
            ) : (
              <div style={ui.amenityWrap}>
                {Object.keys(amenitiesByCategory).map((cat) => (
                  <div key={cat} style={ui.amenityCat}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                      <div style={ui.amenityCatTitle}>{cat}</div>

                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <button
                          type="button"
                          style={ui.miniBtn}
                          onClick={() => selectAllAmenitiesInCategory(cat)}
                          disabled={amenitiesWorking}
                        >
                          All
                        </button>
                        <button
                          type="button"
                          style={ui.miniBtn}
                          onClick={() => clearAllAmenitiesInCategory(cat)}
                          disabled={amenitiesWorking}
                        >
                          None
                        </button>
                      </div>
                    </div>

                    {(amenitiesByCategory[cat] ?? []).map((a) => (
                      <label key={a.id} style={ui.amenityItem}>
                        <input
                          type="checkbox"
                          checked={!!unitAmenityIds[a.id]}
                          onChange={(e) => toggleAmenity(a.id, e.target.checked)}
                          disabled={amenitiesWorking}
                        />
                        <span style={{ fontSize: 13 }}>{a.name}</span>
                      </label>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {amenitiesError ? (
              <div style={ui.dangerBox}>
                <div style={{ fontWeight: 800, marginBottom: 4 }}>Amenities operation failed</div>
                <div style={{ whiteSpace: "pre-wrap" }}>{amenitiesError}</div>
              </div>
            ) : null}
          </CardBody>
        </Card>
      ) : null}

      {loading ? (
        <Card>
          <CardBody>Loading…</CardBody>
        </Card>
      ) : inventory.length === 0 ? (
        <Card>
          <CardBody>
            <div style={{ fontWeight: 800, fontSize: 14 }}>No inventory items</div>
            <div style={{ marginTop: 6, opacity: 0.8 }}>
              {selectedListingId ? "No inventory items linked to this listing." : "Select a project to see inventory here."}
            </div>
          </CardBody>
        </Card>
      ) : (
        <Grid>
          {visibleInventory.map((row) => {
            const id = row.id;
            const unitAmenities = unitAmenitiesByUnitId[id] ?? [];
            const listing = row.listing_id ? listingById[row.listing_id] : null;

            const current = normalizeAvailability(row.availability_status);
            const allowed = allowedNextStatuses(current);

            const dTitle = draftTitle[id] ?? "";
            const dPrice = draftPrice[id] ?? "";
            const dAvail = draftAvailability[id] ?? current;

            const linkDraft = String(draftLinkListingId[id] ?? "").trim();
            const linkChanged = (row.listing_id ?? "") !== linkDraft;

            const dbListingStatus = (listing?.status ?? "").toLowerCase();
            const isListingPublished = dbListingStatus === "published";
            const isPriceMissing = parsePrice(dPrice) === null;

            const hasUnsaved =
              dTitle.trim() !== (row.title ?? "").trim() ||
              String(parsePrice(dPrice) ?? "") !== String(row.price ?? "") ||
              normalizeAvailability(dAvail) !== normalizeAvailability(row.availability_status);

            const checked = !!selectedIds[id];
            const busy = !!savingRow[id] || !!linkWorkingRow[id] || bulkWorking || amenitiesWorking;

            return (
              <Card key={id}>
                <CardBody>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                      {isListingFiltered ? (
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => toggleSelected(id, e.target.checked)}
                          style={{ marginTop: 4 }}
                        />
                      ) : null}

                      <div>
                        <div style={{ fontWeight: 800, fontSize: 14 }}>
                          {row.unit_code ? row.unit_code : "UNIT"}
                          {row.listing_id ? (
                            <span style={{ marginLeft: 8, fontWeight: 600, opacity: 0.7 }}>• Linked listing</span>
                          ) : (
                            <span style={{ marginLeft: 8, fontWeight: 600, opacity: 0.7 }}>• No listing</span>
                          )}
                        </div>

                        <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                          <Badge>{normalizeAvailability(row.availability_status)}</Badge>
                          {row.price !== null ? <Badge>₹ {formatMoneyINR(row.price)}</Badge> : <Badge>₹ (not set)</Badge>}
                          {listing ? <Badge>listing: {listing.status ?? "unknown"}</Badge> : null}
                        </div>
                      </div>
                    </div>

                    <div style={ui.rowButtons}>
                      {/* ✅ NEW: Unit amenities button */}
                      <ActionButton
                        variant="secondary"
                        onClick={() => openUnitAmenities(id)}
                        disabled={busy}
                      >
                        Amenities
                      </ActionButton>

                      <ActionButton variant="secondary" onClick={() => resetRow(row)} disabled={!hasUnsaved || busy}>
                        Reset
                      </ActionButton>
                      <ActionButton onClick={() => saveRow(row)} disabled={!hasUnsaved || busy}>
                        {savingRow[id] ? "Saving…" : "Save"}
                      </ActionButton>
                    </div>
                  </div>
                  
                  <div style={{ marginTop: 12, ...ui.subCard }}>
  <div style={ui.sectionTitle}>Unit amenities</div>

  {unitAmenities.length === 0 ? (
    <div style={{ fontSize: 12, opacity: 0.75 }}>No unit amenities linked.</div>
  ) : (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
      {unitAmenities.map((a, idx) => (
        <Badge key={`${a.amenity_slug ?? a.amenity_name ?? "a"}-${idx}`}>
          {a.amenity_name ?? "(amenity)"}
        </Badge>
      ))}
    </div>
  )}
</div>

                  <div style={{ marginTop: 12, ...ui.subCard }}>
                    <div style={ui.sectionTitle}>Listing link</div>

                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "stretch" }}>
                      <div style={{ flex: "1 1 520px", minWidth: 260 }}>
                        <select
                          value={linkDraft}
                          onChange={(e) => setDraftLinkListingId((prev) => ({ ...prev, [id]: e.target.value }))}
                          style={{ ...ui.select(busy || projectListings.length === 0), height: 42 }}
                          disabled={busy || projectListings.length === 0}
                        >
                          <option value="">(none)</option>
                          {projectListings.map((l) => (
                            <option key={l.id} value={l.id}>
                              {l.title ?? "(untitled)"} • {l.status ?? "?"} {l.slug ? `• ${l.slug}` : ""}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "stretch" }}>
                        <div style={{ display: "flex", alignItems: "stretch" }}>
                          <ActionButton variant="secondary" onClick={() => applyLink(row)} disabled={busy || !linkChanged}>
                            {linkWorkingRow[id] ? "Linking…" : "Apply Link"}
                          </ActionButton>
                        </div>

                        <div style={{ display: "flex", alignItems: "stretch" }}>
                          <ActionButton variant="secondary" onClick={() => unlinkRow(row)} disabled={busy || !row.listing_id}>
                            Unlink
                          </ActionButton>
                        </div>
                      </div>
                    </div>

                    {listing ? (
                      <div style={{ marginTop: 8, fontSize: 12, opacity: 0.85 }}>
                        Linked: <b>{listing.title ?? "(untitled)"}</b> {listing.slug ? `• /property/${listing.slug}` : ""} • status:{" "}
                        <b>{listing.status ?? "unknown"}</b>
                      </div>
                    ) : null}
                  </div>


                  <div style={{ marginTop: 12, ...ui.subCard }}>
                    <div style={ui.sectionTitle}>Inventory details</div>

                    <div style={{ display: "grid", gridTemplateColumns: detailsCols, gap: 12 }}>
                      <div>
                        <div style={ui.label}>Title</div>
                        <input
                          value={dTitle}
                          onChange={(e) => setDraftTitle((prev) => ({ ...prev, [id]: e.target.value }))}
                          placeholder="e.g. 2BHK Unit – A-302"
                          style={ui.input(busy)}
                          disabled={busy}
                        />
                      </div>

                      <div>
                        <div style={ui.label}>Price (₹)</div>
                        <input
                          value={dPrice}
                          onChange={(e) => setDraftPrice((prev) => ({ ...prev, [id]: e.target.value }))}
                          placeholder="e.g. 4500000"
                          inputMode="numeric"
                          style={ui.input(busy)}
                          disabled={busy}
                        />
                        <div style={ui.helperValue}>
                          {parsePrice(dPrice) === null ? "Not set" : `₹ ${formatMoneyINR(parsePrice(dPrice))}`}
                        </div>
                      </div>

                      <div>
                        <div style={ui.label}>Availability</div>

                        <select
                          value={normalizeAvailability(dAvail)}
                          onChange={(e) =>
                            setDraftAvailability((prev) => ({
                              ...prev,
                              [id]: normalizeAvailability(e.target.value),
                            }))
                          }
                          style={ui.select(busy)}
                          disabled={busy}
                        >
                          {allowed.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>

                        <div style={{ marginTop: 8, fontSize: 12, opacity: 0.75 }}>
                          <div>Allowed:</div>

                          <div
                            style={{
                              marginTop: 6,
                              display: "flex",
                              flexWrap: "wrap",
                              gap: 8,
                              alignItems: "center",
                            }}
                          >
                            {allowed.map((s, idx) => (
                              <span key={s} style={{ display: "inline-flex", alignItems: "center", gap: 8, whiteSpace: "nowrap" }}>
                                {idx > 0 ? <span style={{ ...ui.arrow, whiteSpace: "nowrap" }}>→</span> : null}
                                <span style={{ ...ui.pill, whiteSpace: "nowrap" }}>{s}</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {isListingPublished && isPriceMissing ? (
                    <div style={ui.dangerBox}>
                      <div style={{ fontWeight: 800, marginBottom: 4 }}>Action required</div>
                      <div>
                        This unit is linked to a <b>published</b> listing, but price is empty in UI. Set a valid price and Save.
                      </div>
                    </div>
                  ) : null}

                  {rowError[id] ? (
                    <div style={ui.dangerBox}>
                      <div style={{ fontWeight: 800, marginBottom: 4 }}>Operation failed</div>
                      <div style={{ whiteSpace: "pre-wrap" }}>{rowError[id]}</div>
                      <div style={{ marginTop: 6, opacity: 0.8 }}>This is the DB trigger/guard message (exact).</div>
                    </div>
                  ) : null}
                </CardBody>
              </Card>
            );
          })}
        </Grid>
      )}
    </Container>
  );
}
