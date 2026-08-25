// app/property/projects/[slug]/page.tsx  (PUBLIC)
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { getSupabasePublicBrowser } from "@/lib/supabasePublicBrowser";

import { Container } from "@/components/layout/Container";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Grid } from "@/components/ui/Grid";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";

type AnyRow = Record<string, any>;

type ProjectRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  city: string | null;
  district: string | null;
  state: string | null;
  status: string | null;
  updated_at: string | null;
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

type InventoryRow = {
  id: string;
  project_id: string | null;
  catalog_id: string | null;
  listing_id: string | null;
  unit_code: string | null;
  title: string | null;
  availability_status: "available" | "hold" | "booked" | "sold" | string;
  price: number | null;
  updated_at: string | null;
};

type ListingPublicMini = {
  id: string;
  title: string | null;
  city: string | null;
  state: string | null;
  price: number | null;
  status: string | null;
  builder_project_id: string | null;
};

function txt(v: any) {
  const s = String(v ?? "").trim();
  return s ? s : null;
}

function num(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function fmt(iso?: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function money(v: number | null | undefined) {
  if (typeof v !== "number") return "₹ —";
  try {
    return `₹ ${new Intl.NumberFormat("en-IN", {
      maximumFractionDigits: 0,
    }).format(v)}`;
  } catch {
    return `₹ ${v}`;
  }
}

function kindLabel(k: string) {
  const s = String(k || "").toLowerCase();
  if (s === "plot") return "Plots";
  if (s === "apartment") return "Apartments / Flats";
  if (s === "villa") return "Villas / Duplex";
  if (s === "commercial") return "Commercial";
  return s ? s.toUpperCase() : "Catalog";
}

function normalizeForMatch(v: any) {
  return String(v ?? "")
    .toLowerCase()
    .replace(/[\[\]\(\)\-_,./]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function textIncludesEitherWay(a: string, b: string) {
  if (!a || !b) return false;
  return a.includes(b) || b.includes(a);
}

function normalizeInventoryRow(r: AnyRow): InventoryRow {
  return {
    id: String(r.id),
    project_id: txt(r.project_id) ?? txt(r.builder_project_id),
    catalog_id: txt(r.catalog_id),
    listing_id: txt(r.listing_id),
    unit_code: txt(r.unit_code),
    title: txt(r.title),
    availability_status: txt(r.availability_status) ?? "available",
    price: num(r.price),
    updated_at: txt(r.updated_at),
  };
}

function normalizeListingRow(r: AnyRow): ListingPublicMini {
  return {
    id: String(r.id),
    title: txt(r.title),
    city: txt(r.city),
    state: txt(r.state),
    price: num(r.price) ?? num(r.expected_price),
    status: txt(r.status),
    builder_project_id: txt(r.builder_project_id),
  };
}

function resolveLinkedListingForItem(
  it: InventoryRow,
  listingMap: Record<string, ListingPublicMini>,
  projectListings: ListingPublicMini[]
) {
  if (it.listing_id && listingMap[it.listing_id]) {
    return listingMap[it.listing_id];
  }

  const unitCode = normalizeForMatch(it.unit_code);
  const itemTitle = normalizeForMatch(it.title);

  if (!unitCode && !itemTitle) return null;

  for (const row of projectListings) {
    const listingTitle = normalizeForMatch(row.title);

    if (!listingTitle) continue;

    if (unitCode && textIncludesEitherWay(listingTitle, unitCode)) {
      return row;
    }

    if (itemTitle && textIncludesEitherWay(listingTitle, itemTitle)) {
      return row;
    }
  }

  return null;
}

export default function PropertyProjectPublicDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug;

  const supabase = useMemo(() => getSupabasePublicBrowser(), []);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [project, setProject] = useState<ProjectRow | null>(null);
  const [catalogs, setCatalogs] = useState<CatalogRow[]>([]);
  const [items, setItems] = useState<InventoryRow[]>([]);
  const [projectListings, setProjectListings] = useState<ListingPublicMini[]>([]);

  const [listingMap, setListingMap] = useState<Record<string, ListingPublicMini>>({});
  const [statusFilter, setStatusFilter] = useState<
    "all" | "available" | "hold" | "booked" | "sold"
  >("all");

  useEffect(() => {
    if (!slug) return;

    let alive = true;

    (async () => {
      setLoading(true);
      setErr(null);

      const projRes = await supabase
        .from("builder_projects")
        .select("id,name,slug,description,city,district,state,status,updated_at")
        .eq("slug", slug)
        .eq("status", "active")
        .eq("is_active", true)
        .maybeSingle();

      if (!alive) return;

      if (projRes.error) {
        setErr(projRes.error.message);
        setProject(null);
        setCatalogs([]);
        setItems([]);
        setProjectListings([]);
        setListingMap({});
        setLoading(false);
        return;
      }

      if (!projRes.data?.id) {
        setErr("Project not found (or inactive).");
        setProject(null);
        setCatalogs([]);
        setItems([]);
        setProjectListings([]);
        setListingMap({});
        setLoading(false);
        return;
      }

      const p = projRes.data as ProjectRow;
      setProject(p);

      const catRes = await supabase
        .from("builder_project_catalogs")
        .select("id,project_id,kind,name,slug,sort_order,is_active")
        .eq("project_id", p.id)
        .eq("is_active", true)
        .order("sort_order", { ascending: true, nullsFirst: false })
        .order("name", { ascending: true });

      if (!alive) return;

      if (catRes.error) {
        setErr(catRes.error.message);
        setCatalogs([]);
        setItems([]);
        setProjectListings([]);
        setListingMap({});
        setLoading(false);
        return;
      }

      const cats = (catRes.data ?? []) as CatalogRow[];
      setCatalogs(cats);

let inventoryRows: InventoryRow[] = [];

const invRes = await supabase
  .from("builder_inventory_items")
  .select("*")
  .eq("project_id", p.id)
  .order("sort_order", { ascending: true, nullsFirst: false })
  .order("updated_at", { ascending: false });

if (!alive) return;

if (invRes.error) {
  setErr(invRes.error.message);
  setItems([]);
  setLoading(false);
  return;
}

inventoryRows = (invRes.data ?? []).map(normalizeInventoryRow);
console.log("INVENTORY_ROWS_RUNTIME:", invRes.data);

      inventoryRows.sort((a, b) => {
        const ta = a.updated_at ? new Date(a.updated_at).getTime() : 0;
        const tb = b.updated_at ? new Date(b.updated_at).getTime() : 0;
        return tb - ta;
      });

      setItems(inventoryRows);

      let publicListings: ListingPublicMini[] = [];

      const listTry1 = await supabase
        .from("property_listings_public")
        .select("*")
        .eq("builder_project_id", p.id);

      if (!alive) return;

      if (!listTry1.error && Array.isArray(listTry1.data)) {
        publicListings = (listTry1.data as AnyRow[]).map(normalizeListingRow);
      } else {
        const listTry2 = await supabase
          .from("property_listings")
          .select("*")
          .eq("builder_project_id", p.id)
          .eq("is_public", true);

        if (!alive) return;

        if (!listTry2.error && Array.isArray(listTry2.data)) {
          publicListings = (listTry2.data as AnyRow[]).map(normalizeListingRow);
        }
      }

      const listingIdsFromInventory = Array.from(
        new Set(inventoryRows.map((x) => x.listing_id).filter(Boolean))
      ) as string[];

      if (listingIdsFromInventory.length > 0) {
        const listByIdsRes = await supabase
          .from("property_listings_public")
          .select("*")
          .in("id", listingIdsFromInventory);

        if (!alive) return;

        if (!listByIdsRes.error && Array.isArray(listByIdsRes.data)) {
          const byIds = (listByIdsRes.data as AnyRow[]).map(normalizeListingRow);
          const mergedMap: Record<string, ListingPublicMini> = {};

          for (const row of publicListings) {
            mergedMap[row.id] = row;
          }
          for (const row of byIds) {
            mergedMap[row.id] = row;
          }

          setProjectListings(Object.values(mergedMap));
          setListingMap(mergedMap);
        } else {
          const fallbackMap: Record<string, ListingPublicMini> = {};
          for (const row of publicListings) {
            fallbackMap[row.id] = row;
          }
          setProjectListings(Object.values(fallbackMap));
          setListingMap(fallbackMap);
        }
      } else {
        const fallbackMap: Record<string, ListingPublicMini> = {};
        for (const row of publicListings) {
          fallbackMap[row.id] = row;
        }
        setProjectListings(Object.values(fallbackMap));
        setListingMap(fallbackMap);
      }

      setLoading(false);
    })();

    return () => {
      alive = false;
    };
  }, [slug, supabase]);

  const byCatalog = useMemo(() => {
    const m: Record<string, InventoryRow[]> = {};
    for (const it of items) {
      const key = it.catalog_id || "__uncataloged__";
      if (!m[key]) m[key] = [];
      m[key].push(it);
    }
    return m;
  }, [items]);

  const listingOnlyItems = useMemo(() => {
    const represented = new Set(items.map((x) => x.listing_id).filter(Boolean) as string[]);
    return projectListings.filter((x) => !represented.has(x.id));
  }, [items, projectListings]);

  function passFilter(it: InventoryRow) {
    if (statusFilter === "all") return true;
    return String(it.availability_status) === statusFilter;
  }

  function renderInventoryCard(it: InventoryRow) {
    const linked = resolveLinkedListingForItem(it, listingMap, projectListings);
    const canLink = !!linked?.id;

    return (
      <Card key={it.id}>
        <CardBody style={{ padding: 12 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
            <Badge>{it.availability_status}</Badge>
            {it.unit_code ? <Badge>{it.unit_code}</Badge> : null}
            {it.price != null ? <Badge>{money(it.price)}</Badge> : null}
            {it.listing_id ? (
              <Badge>Linked</Badge>
            ) : linked?.id ? (
              <Badge>Matched</Badge>
            ) : (
              <Badge>Unlinked</Badge>
            )}
          </div>

          <div style={{ fontWeight: 900, fontSize: 15, lineHeight: 1.6, marginBottom: 6 }}>
            {canLink ? (
              <Link
                href={`/property/${linked!.id}`}
                style={{ textDecoration: "none", color: "inherit" }}
              >
                {(it.title ?? "").trim() || (linked?.title ?? "").trim() || "Inventory item"}
              </Link>
            ) : (
              <>{(it.title ?? "").trim() || (linked?.title ?? "").trim() || "Inventory item"}</>
            )}
          </div>

          <div style={{ opacity: 0.6, fontSize: 12, marginTop: 4 }}>
            Updated: {fmt(it.updated_at)}
          </div>

          {linked ? (
            <div
              style={{
                marginTop: 10,
                opacity: 0.85,
                fontSize: 13,
                lineHeight: 1.6,
              }}
            >
              <div>
                <b>Listing:</b> {(linked.title ?? "").trim() || "Untitled"}
              </div>
              <div>
                {(linked.city ?? "—")}
                {linked.state ? `, ${linked.state}` : ""} • {money(linked.price)}
              </div>
            </div>
          ) : (
            <div style={{ marginTop: 10, opacity: 0.7, fontSize: 13 }}>
              No linked or matched public listing found for this unit yet.
            </div>
          )}

          {canLink ? (
            <div style={{ marginTop: 12 }}>
              <Link
                href={`/property/${linked!.id}`}
                style={{ fontWeight: 900, textDecoration: "none" }}
              >
                View Listing →
              </Link>
            </div>
          ) : linked ? (
            <div style={{ marginTop: 12, opacity: 0.7, fontSize: 13 }}>
              Listing attached but could not be opened.
            </div>
          ) : null}
        </CardBody>
      </Card>
    );
  }

  return (
    <Container>
      <SectionHeader title="Project" subtitle="Public project details + catalogs + inventory" />

      <div
        style={{
          marginBottom: 16,
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <Link href="/property/projects" style={{ fontWeight: 900, textDecoration: "none" }}>
          ← Back to Projects
        </Link>

        <Link href="/property" style={{ fontWeight: 900, textDecoration: "none" }}>
          View Properties →
        </Link>

        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <span style={{ fontWeight: 900, opacity: 0.75 }}>Filter:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            style={{
              height: 38,
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.15)",
              padding: "0 12px",
              background: "white",
            }}
          >
            <option value="all">All</option>
            <option value="available">Available</option>
            <option value="hold">Hold</option>
            <option value="booked">Booked</option>
            <option value="sold">Sold</option>
          </select>
        </div>
      </div>

      <div style={{ marginBottom: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Badge>Catalogs: {catalogs.length}</Badge>
        <Badge>Units: {items.length}</Badge>
        <Badge>Filtered: {items.filter(passFilter).length}</Badge>
        <Badge>Uncataloged: {(byCatalog["__uncataloged__"] ?? []).length}</Badge>
        <Badge>Public Listings: {projectListings.length}</Badge>
      </div>

      {err ? (
        <EmptyState message={err} />
      ) : loading ? (
        <EmptyState message="Loading project…" />
      ) : !project ? (
        <EmptyState message="Project not found." />
      ) : (
        <>
          <Card>
            <CardBody style={{ padding: 14 }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                <Badge>Active</Badge>
                <Badge>Updated: {fmt(project.updated_at)}</Badge>
              </div>

              <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 10 }}>
                {project.name}
              </div>

              <div style={{ opacity: 0.85, marginBottom: 10, fontSize: 15 }}>
                {project.city ?? "—"}
                {project.district ? `, ${project.district}` : ""}
                {project.state ? `, ${project.state}` : ""}
              </div>

              {project.description ? (
                <div
                  style={{
                    opacity: 0.9,
                    lineHeight: 1.8,
                    fontSize: 15,
                    marginTop: 6,
                  }}
                >
                  {project.description}
                </div>
              ) : null}
            </CardBody>
          </Card>

          <div style={{ height: 16 }} />

          {catalogs.length === 0 &&
          !(byCatalog["__uncataloged__"]?.length > 0) &&
          listingOnlyItems.length === 0 ? (
            <EmptyState message="No catalogs or units found for this project." />
          ) : (
            <div style={{ display: "grid", gap: 16 }}>
              {catalogs.map((c) => {
                const list = (byCatalog[c.id] ?? []).filter(passFilter);

                return (
                  <Card key={c.id}>
                    <CardBody style={{ padding: 14 }}>
                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          flexWrap: "wrap",
                          alignItems: "center",
                          marginBottom: 10,
                        }}
                      >
                        <Badge>{kindLabel(c.kind)}</Badge>
                        <Badge>{c.name}</Badge>
                        <Badge>{list.length} item(s)</Badge>
                      </div>

                      {list.length === 0 ? (
                        <div style={{ opacity: 0.75 }}>No items match the selected filter.</div>
                      ) : (
                        <Grid style={{ gap: 16 }}>
                          {list.map((it) => renderInventoryCard(it))}
                        </Grid>
                      )}
                    </CardBody>
                  </Card>
                );
              })}

              {(byCatalog["__uncataloged__"] ?? []).filter(passFilter).length > 0 ? (
                <Card>
                  <CardBody style={{ padding: 14 }}>
                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        flexWrap: "wrap",
                        alignItems: "center",
                        marginBottom: 10,
                      }}
                    >
                      <Badge>Uncataloged Units</Badge>
                      <Badge>
                        {(byCatalog["__uncataloged__"] ?? []).filter(passFilter).length} item(s)
                      </Badge>
                    </div>

                    <Grid style={{ gap: 16 }}>
                      {(byCatalog["__uncataloged__"] ?? [])
                        .filter(passFilter)
                        .map((it) => renderInventoryCard(it))}
                    </Grid>
                  </CardBody>
                </Card>
              ) : null}

              {listingOnlyItems.length > 0 ? (
                <Card>
                  <CardBody style={{ padding: 14 }}>
                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        flexWrap: "wrap",
                        alignItems: "center",
                        marginBottom: 10,
                      }}
                    >
                      <Badge>Public Listings</Badge>
                      <Badge>{listingOnlyItems.length} item(s)</Badge>
                    </div>

                    <Grid style={{ gap: 16 }}>
                      {listingOnlyItems.map((it) => (
                        <Card key={it.id}>
                          <CardBody style={{ padding: 12 }}>
                            <div
                              style={{
                                display: "flex",
                                gap: 8,
                                flexWrap: "wrap",
                                marginBottom: 10,
                              }}
                            >
                              {it.status ? <Badge>{it.status}</Badge> : null}
                              {it.price != null ? <Badge>{money(it.price)}</Badge> : null}
                              <Badge>Public</Badge>
                            </div>

                            <div
                              style={{
                                fontWeight: 900,
                                fontSize: 15,
                                lineHeight: 1.6,
                                marginBottom: 6,
                              }}
                            >
                              {(it.title ?? "").trim() || "Project listing"}
                            </div>

                            <div style={{ opacity: 0.8, fontSize: 13, lineHeight: 1.6 }}>
                              {(it.city ?? "—")}
                              {it.state ? `, ${it.state}` : ""}
                            </div>

                            <div style={{ marginTop: 12 }}>
                              <Link
                                href={`/property/${it.id}`}
                                style={{ fontWeight: 900, textDecoration: "none" }}
                              >
                                View Listing →
                              </Link>
                            </div>
                          </CardBody>
                        </Card>
                      ))}
                    </Grid>
                  </CardBody>
                </Card>
              ) : null}
            </div>
          )}
        </>
      )}
    </Container>
  );
}