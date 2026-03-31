// app/rentals/catalog/page.tsx  (PUBLIC)
"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getSupabasePublicBrowser } from "@/lib/supabasePublicBrowser";

type Cat = {
  id: string;
  name: string;
  slug: string;
  sort_order: number | null;
  is_system_others: boolean | null;
};

type SubJoin = {
  id: string;
  name: string;
  slug: string;
  is_system_others: boolean | null;

  // Supabase join shape can be:
  // - object (many-to-one)
  // - array  (one-to-many)
  rental_categories?: Cat | Cat[] | null;
};

type EqJoin = {
  id: string;
  name: string;
  slug: string;
  sort_order: number | null;
  is_system_others: boolean | null;

  // Supabase join shape can be:
  // - object (many-to-one)
  // - array  (one-to-many)
  rental_subcategories?: SubJoin | SubJoin[] | null;
};

function slugifyLite(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

// ✅ helper: return first item if array, else return object
function firstOf<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  if (Array.isArray(v)) return (v[0] as T) ?? null;
  return v as T;
}

export default function RentalsCatalogPage() {
  const supabase = useMemo(() => getSupabasePublicBrowser(), []);
  const sp = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [categories, setCategories] = useState<Cat[]>([]);
  const [equipment, setEquipment] = useState<EqJoin[]>([]);

  const [activeCatSlug, setActiveCatSlug] = useState<string>("all");
  const [q, setQ] = useState<string>("");

  useEffect(() => {
    const cat = sp.get("cat");
    if (cat) setActiveCatSlug(cat);
  }, [sp]);

  useEffect(() => {
    let alive = true;

    async function run() {
      setLoading(true);
      setErr(null);

      const catRes = await supabase
        .from("rental_categories")
        .select("id,name,slug,sort_order,is_system_others")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });

      const eqRes = await supabase
        .from("rental_equipment")
        .select(
          `
          id,name,slug,sort_order,is_system_others,
          rental_subcategories (
            id,name,slug,is_system_others,
            rental_categories ( id,name,slug,sort_order,is_system_others )
          )
        `
        )
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });

      if (!alive) return;

      if (catRes.error) {
        setErr(catRes.error.message);
        setCategories([]);
        setEquipment([]);
        setLoading(false);
        return;
      }
      if (eqRes.error) {
        setErr(eqRes.error.message);
        setCategories((catRes.data ?? []) as Cat[]);
        setEquipment([]);
        setLoading(false);
        return;
      }

      setCategories((catRes.data ?? []) as Cat[]);
      setEquipment((eqRes.data ?? []) as unknown as EqJoin[]);
      setLoading(false);
    }

    run();
    return () => {
      alive = false;
    };
  }, [supabase]);

  const visibleCategories = useMemo(
    () => categories.filter((c) => !c.is_system_others && c.slug !== "others"),
    [categories]
  );

  const othersCategory = useMemo(
    () => categories.find((c) => c.is_system_others || c.slug === "others") ?? null,
    [categories]
  );

  // ✅ robust join readers (supports object OR array)
  function getJoinSub(e: EqJoin): SubJoin | null {
    return firstOf<SubJoin>(e.rental_subcategories);
  }
  function getJoinCat(e: EqJoin): Cat | null {
    const sub = getJoinSub(e);
    return firstOf<Cat>(sub?.rental_categories as any);
  }
  function getJoinCatSlug(e: EqJoin) {
    return getJoinCat(e)?.slug ?? "";
  }
  function getJoinCatName(e: EqJoin) {
    return getJoinCat(e)?.name ?? "Category";
  }
  function getJoinSubName(e: EqJoin) {
    return getJoinSub(e)?.name ?? "Subcategory";
  }
  function getJoinSubSlug(e: EqJoin) {
    const sub = getJoinSub(e);
    return sub?.slug ?? slugifyLite(getJoinSubName(e));
  }

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();

    return equipment
      .filter((e) => !e.is_system_others && e.slug !== "others")
      .filter((e) => {
        const catSlug = getJoinCatSlug(e);
        if (activeCatSlug === "all") return true;

        // If catSlug is missing, do not hide silently — but we still filter strictly:
        return catSlug === activeCatSlug;
      })
      .filter((e) => {
        if (!query) return true;
        const catName = getJoinCatName(e);
        const subName = getJoinSubName(e);

        return (
          (e.name ?? "").toLowerCase().includes(query) ||
          (e.slug ?? "").toLowerCase().includes(query) ||
          subName.toLowerCase().includes(query) ||
          catName.toLowerCase().includes(query)
        );
      });
  }, [equipment, activeCatSlug, q]);

  const activeLabel = useMemo(() => {
    if (activeCatSlug === "all") return "All";
    const c = visibleCategories.find((x) => x.slug === activeCatSlug);
    return c?.name ?? "All";
  }, [activeCatSlug, visibleCategories]);

  // Optional: show quick debug count of items missing category join
  const missingCatCount = useMemo(() => {
    return equipment.filter((e) => !getJoinCatSlug(e)).length;
  }, [equipment]);

  return (
    <main className="page">
      <div className="container">
        <div className="top">
          <div>
            <h1 className="h1">Rental Catalog</h1>
            <p className="p">
              Browse rental equipment taxonomy (Category → Subcategory → Equipment). Public users can view this without
              login.
            </p>
            {!loading && !err && missingCatCount > 0 ? (
              <div style={{ marginTop: 6, fontSize: 12, color: "#777" }}>
                Note: {missingCatCount} equipment item(s) have no category join (they will only appear in “All”).
              </div>
            ) : null}
          </div>

          <div className="topRight">
            <Link className="btn btnOutline" href="/rentals/add">
              Vendor: Add Rental Listing
            </Link>
          </div>
        </div>

        <div style={{ marginTop: 10 }}>
          <Link href="/rentals" style={{ fontWeight: 800 }}>
            ← Back to Rentals
          </Link>
        </div>

        <div className="filterRow">
          <div className="chips">
            <button
              type="button"
              className={`chip ${activeCatSlug === "all" ? "chipActive" : ""}`}
              onClick={() => setActiveCatSlug("all")}
            >
              All
            </button>

            {visibleCategories.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`chip ${activeCatSlug === c.slug ? "chipActive" : ""}`}
                onClick={() => setActiveCatSlug(c.slug)}
              >
                {c.name}
              </button>
            ))}
          </div>

          <div className="searchWrap">
            <input
              className="search"
              placeholder={`Search in ${activeLabel}…`}
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>

        {loading ? <div className="state">Loading rental catalog…</div> : null}

        {!loading && err ? (
          <div className="state stateErr">
            <div className="stateTitle">Error</div>
            <div className="mono">{err}</div>
            <div className="stateHint">
              Ensure public SELECT is allowed on <span className="mono">rental_categories</span>,{" "}
              <span className="mono">rental_subcategories</span>, <span className="mono">rental_equipment</span>.
            </div>
          </div>
        ) : null}

        {!loading && !err ? (
          <>
            <div className="grid">
              {filtered.map((e) => {
                const catName = getJoinCatName(e);
                const subName = getJoinSubName(e);
                const catSlug = getJoinCatSlug(e) || "all";
                const subSlug = getJoinSubSlug(e);

                return (
                  <article key={e.id} className="card" id={subSlug}>
                    <div className="cardHead">
                      <div className="cardTitle">{e.name}</div>
                      <span className="badge">{catName}</span>
                    </div>

                    <div className="cardMeta">
                      <div className="metaRow">
                        <span className="metaKey">Category:</span> <span>{catName}</span>
                      </div>
                      <div className="metaRow">
                        <span className="metaKey">Subcategory:</span> <span>{subName}</span>
                      </div>
                      <div className="metaRow">
                        <span className="metaKey">Public view:</span>{" "}
                        <span className="muted">No provider details shown</span>
                      </div>
                    </div>

                    <div className="cardBottom">
                      <Link className="btn btnSoft" href={`/rentals/catalog/${e.id}?cat=${encodeURIComponent(catSlug)}`}>
                        View details →
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>

            {filtered.length === 0 ? (
              <div className="state">No results found. Try another category or clear the search.</div>
            ) : null}

            <div className="callout">
              <div className="calloutTitle">Can’t find your equipment?</div>
              <div className="calloutText">
                Use <b>Others (specify)</b> while adding a listing. “Others” exists at every level: category,
                subcategory, and equipment.
              </div>
              <div className="calloutActions">
                <Link className="btn btnPrimary" href="/rentals/add">
                  Add with Others (specify)
                </Link>
                {othersCategory ? (
                  <span className="tiny">
                    System option: <span className="mono">{othersCategory.slug}</span>
                  </span>
                ) : null}
              </div>
            </div>
          </>
        ) : null}
      </div>

      <style jsx>{`
        .page {
          padding: 26px 0 64px;
          background: #fff;
        }
        .container {
          width: min(1120px, 92vw);
          margin: 0 auto;
        }
        .top {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
        }
        .h1 {
          margin: 0;
          font-size: 38px;
          line-height: 1.1;
          letter-spacing: -0.3px;
        }
        .p {
          margin: 10px 0 0;
          color: #6b6b6b;
          font-size: 14px;
          max-width: 75ch;
        }
        .filterRow {
          margin-top: 18px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          flex-wrap: wrap;
        }
        .chips {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          align-items: center;
        }
        .chip {
          border: 1px solid #e6e6e6;
          background: #fff;
          color: #222;
          padding: 7px 12px;
          border-radius: 999px;
          font-size: 13px;
          cursor: pointer;
        }
        .chip:hover {
          background: #f7f7f7;
        }
        .chipActive {
          background: #eef4ff;
          border-color: #d6e6ff;
          color: #1b3a7a;
        }
        .searchWrap {
          flex: 1;
          min-width: 220px;
          display: flex;
          justify-content: flex-end;
        }
        .search {
          width: min(360px, 100%);
          border: 1px solid #e6e6e6;
          border-radius: 12px;
          padding: 10px 12px;
          font-size: 13px;
          outline: none;
        }
        .search:focus {
          border-color: #cddcff;
          box-shadow: 0 0 0 3px rgba(82, 132, 255, 0.12);
        }
        .grid {
          margin-top: 18px;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
        }
        @media (max-width: 980px) {
          .grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 640px) {
          .grid {
            grid-template-columns: 1fr;
          }
        }
        .card {
          border: 1px solid #eeeeee;
          background: #fff;
          border-radius: 16px;
          padding: 16px;
          box-shadow: 0 1px 0 rgba(0, 0, 0, 0.02);
        }
        .cardHead {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 10px;
        }
        .cardTitle {
          font-weight: 650;
          font-size: 16px;
          line-height: 1.25;
        }
        .badge {
          font-size: 12px;
          color: #555;
          background: #f2f2f2;
          border: 1px solid #ededed;
          padding: 4px 10px;
          border-radius: 999px;
          white-space: nowrap;
        }
        .cardMeta {
          margin-top: 10px;
          color: #444;
          font-size: 13px;
        }
        .metaRow {
          margin-top: 4px;
        }
        .metaKey {
          color: #777;
        }
        .muted {
          color: #777;
        }
        .cardBottom {
          margin-top: 14px;
          display: flex;
          justify-content: flex-end;
        }
        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          padding: 10px 12px;
          font-size: 13px;
          text-decoration: none;
          border: 1px solid transparent;
          user-select: none;
        }
        .btnOutline {
          background: #fff;
          color: #111;
          border-color: #e1e1e1;
        }
        .btnOutline:hover {
          background: #f7f7f7;
        }
        .btnSoft {
          background: #f4f6ff;
          color: #1b3a7a;
          border-color: #e3e9ff;
        }
        .btnSoft:hover {
          opacity: 0.95;
        }
        .btnPrimary {
          background: #111;
          color: #fff;
          border-color: #111;
        }
        .btnPrimary:hover {
          opacity: 0.92;
        }
        .state {
          margin-top: 18px;
          border: 1px solid #eeeeee;
          border-radius: 14px;
          padding: 14px;
          color: #555;
          font-size: 13px;
          background: #fff;
        }
        .stateErr {
          border-color: #f2b8b8;
          background: #fff5f5;
          color: #7a1b1b;
        }
        .stateTitle {
          font-weight: 650;
          margin-bottom: 8px;
        }
        .stateHint {
          margin-top: 8px;
          color: #7a1b1b;
          font-size: 12px;
        }
        .callout {
          margin-top: 18px;
          padding: 16px;
          border-radius: 16px;
          border: 1px dashed #d7d7d7;
          background: #fafafa;
        }
        .calloutTitle {
          font-weight: 650;
          margin-bottom: 6px;
        }
        .calloutText {
          color: #555;
          font-size: 13px;
          margin-bottom: 12px;
        }
        .calloutActions {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          align-items: center;
        }
        .mono {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono",
            "Courier New", monospace;
        }
        .tiny {
          font-size: 12px;
          color: #666;
        }
      `}</style>
    </main>
  );
}
