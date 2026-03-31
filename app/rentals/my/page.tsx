// app/rentals/my/page.tsx  (VENDOR - AUTH REQUIRED, but redirects public to /rentals)
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

import { Container } from "@/components/layout/Container";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { Card, CardBody, CardFooter } from "@/components/ui/Card";
import { Grid } from "@/components/ui/Grid";
import { Badge } from "@/components/ui/Badge";
import { ActionButton } from "@/components/ui/ActionButton";

type Row = {
  id: string;
  owner_id: string;
  title: string | null;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;

  pricing_unit: string | null;
  rate: number | null;
  rate_unit_label: string | null;
  security_deposit: number | null;

  country: string | null;
  state: string | null;
  district: string | null;
  city: string | null;
  locality: string | null;
  pincode: string | null;

  photos: any | null; // jsonb
};

function fmt(iso: string | null | undefined) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return String(iso);
  }
}

function money(v: number | null | undefined) {
  if (typeof v !== "number") return "₹ —";
  return `₹ ${v}`;
}

function fmtRate(rate: number | null, pricingUnit: string | null, rateUnitLabel?: string | null) {
  if (rate == null) return "Rate: —";
  const unit = rateUnitLabel || pricingUnit || "";
  return `Rate: ${money(rate)}${unit ? `/${unit}` : ""}`;
}

function firstPhotoUrl(photos: any): string | null {
  if (!photos) return null;

  if (Array.isArray(photos)) {
    const first = photos[0];
    if (!first) return null;
    if (typeof first === "string") return first;
    if (typeof first === "object") {
      const u = (first as any).url ?? (first as any).src ?? null;
      return u ? String(u) : null;
    }
    return null;
  }

  if (typeof photos === "object") {
    const u = (photos as any).url ?? (photos as any).src ?? null;
    return u ? String(u) : null;
  }

  return null;
}

export default function RentalsMyPage() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowser(), []);

  const [authLoading, setAuthLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");

  // ---- auth guard ----
  useEffect(() => {
    let alive = true;

    async function loadUser() {
      setAuthLoading(true);

      const { data, error } = await supabase.auth.getUser();
      if (!alive) return;

      const uid = data?.user?.id ?? null;

      // ✅ CHANGE: If not logged in, go to PUBLIC rentals (no login required)
      if (error || !uid) {
        setUserId(null);
        setAuthLoading(false);
        router.replace("/rentals");
        return;
      }

      setUserId(uid);
      setAuthLoading(false);
    }

    loadUser();
    const { data: sub } = supabase.auth.onAuthStateChange(() => loadUser());

    return () => {
      alive = false;
      sub?.subscription?.unsubscribe();
    };
  }, [supabase, router]);

  async function loadMine(uid: string) {
    setLoading(true);
    setErr(null);

    const { data, error } = await supabase
      .from("rental_listings")
      .select(
        [
          "id",
          "owner_id",
          "title",
          "status",
          "created_at",
          "updated_at",
          "pricing_unit",
          "rate",
          "rate_unit_label",
          "security_deposit",
          "country",
          "state",
          "district",
          "city",
          "locality",
          "pincode",
          "photos",
        ].join(",")
      )
      .eq("owner_id", uid)
      .order("updated_at", { ascending: false })
      .limit(400);

    if (error) {
      setErr(error.message);
      setRows([]);
      setLoading(false);
      return;
    }

    setRows((data ?? []) as unknown as Row[]);
    setLoading(false);
  }

  useEffect(() => {
    if (authLoading) return;
    if (!userId) return;
    loadMine(userId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, userId]);

  const statuses = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) if (r.status) set.add(String(r.status).toLowerCase());
    return ["all", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [rows]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();

    return rows
      .filter((r) => {
        if (status === "all") return true;
        return String(r.status ?? "").toLowerCase() === status;
      })
      .filter((r) => {
        if (!query) return true;
        const loc = [r.locality, r.city, r.district, r.state, r.country].filter(Boolean).join(", ");
        const hay = [r.title ?? "", loc, r.pricing_unit ?? "", r.rate_unit_label ?? ""].join(" ").toLowerCase();
        return hay.includes(query);
      });
  }, [rows, q, status]);

  if (authLoading) {
    return (
      <Container>
        <SectionHeader title="My Rentals" subtitle="Checking login..." />
        <div style={{ opacity: 0.8 }}>Checking login…</div>
      </Container>
    );
  }

  // If redirect is happening, show nothing (avoid flashing UI)
  if (!userId) return null;

  return (
    <Container>
      <SectionHeader title="My Rentals" subtitle="Manage your draft/published rental listings" />

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
        <ActionButton variant="primary" href="/rentals/add">
          + Add Rental Listing
        </ActionButton>

        <ActionButton variant="secondary" href="/rentals">
          Public Rentals →
        </ActionButton>

        <button
          type="button"
          onClick={() => userId && loadMine(userId)}
          disabled={loading}
          style={{
            height: 40,
            padding: "0 14px",
            borderRadius: 12,
            border: "1px solid rgba(0,0,0,0.12)",
            background: "white",
            fontWeight: 800,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.6 : 1,
          }}
        >
          Refresh
        </button>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search my rentals (title, location, unit)…"
            style={{
              width: "100%",
              height: 40,
              borderRadius: 12,
              border: "1px solid rgba(0,0,0,0.12)",
              padding: "0 12px",
              outline: "none",
            }}
          />
        </div>

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          style={{
            height: 40,
            borderRadius: 12,
            border: "1px solid rgba(0,0,0,0.12)",
            padding: "0 10px",
            background: "white",
            fontWeight: 700,
          }}
        >
          {statuses.map((s) => (
            <option key={s} value={s}>
              {s === "all" ? "All status" : s}
            </option>
          ))}
        </select>

        <Badge>Total: {filtered.length}</Badge>
      </div>

      {err ? <div style={{ marginBottom: 12, color: "crimson", fontWeight: 800 }}>{err}</div> : null}

      {loading ? (
        <div style={{ opacity: 0.8 }}>Loading your rentals…</div>
      ) : filtered.length === 0 ? (
        <div style={{ opacity: 0.8 }}>
          No rentals found. Create one from{" "}
          <Link href="/rentals/add" style={{ fontWeight: 800 }}>
            /rentals/add
          </Link>
          .
        </div>
      ) : (
        <Grid>
          {filtered.map((r) => {
            const loc = [r.locality, r.city, r.district, r.state, r.country].filter(Boolean).join(", ");
            const cover = firstPhotoUrl(r.photos);

            return (
              <Card key={r.id}>
                <CardBody>
                  {cover ? (
                    <div style={{ marginBottom: 12 }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={cover}
                        alt={r.title ?? "Rental"}
                        style={{
                          width: "100%",
                          height: 180,
                          objectFit: "cover",
                          borderRadius: 12,
                          border: "1px solid rgba(0,0,0,0.08)",
                        }}
                      />
                    </div>
                  ) : null}

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 10 }}>
                    <Badge>{String(r.status ?? "draft").toLowerCase()}</Badge>
                    <Badge>Updated: {fmt(r.updated_at)}</Badge>
                    {r.pricing_unit ? <Badge>Unit: {r.pricing_unit}</Badge> : null}
                  </div>

                  <div style={{ fontWeight: 900, marginBottom: 6 }}>{(r.title ?? "").trim() || "Untitled rental"}</div>

                  <div style={{ opacity: 0.85 }}>
                    {loc ? loc : "—"} • {fmtRate(r.rate, r.pricing_unit, r.rate_unit_label)}
                    {r.security_deposit != null ? ` • Deposit: ${money(r.security_deposit)}` : ""}
                  </div>
                </CardBody>

                <CardFooter>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <Link href={`/rentals/${r.id}`} style={{ fontWeight: 800 }}>
                      Public view →
                    </Link>
                  </div>
                </CardFooter>
              </Card>
            );
          })}
        </Grid>
      )}
    </Container>
  );
}
