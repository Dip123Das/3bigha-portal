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


type RentalAssetRow = {
  id: string;
  rental_listing_id: string | null;
  asset_name: string;
  asset_code: string | null;
  asset_type: string;
  quantity: number;
  availability_status: string;
  daily_rate: number;
  operator_available: boolean;
};

type RentalBookingRow = {
  id: string;
  rental_asset_id: string | null;
  customer_name: string;
  customer_phone: string | null;
  booking_status: string;
  booking_start: string | null;
  booking_end: string | null;
  security_deposit: number | null;
  operator_required: boolean | null;
  transport_required: boolean | null;
};
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

  const [assets, setAssets] = useState<RentalAssetRow[]>([]);
  const [bookings, setBookings] = useState<RentalBookingRow[]>([]);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [bookingAssetId, setBookingAssetId] = useState("");
  const [bookingCustomer, setBookingCustomer] = useState("");
  const [bookingPhone, setBookingPhone] = useState("");
  const [bookingStart, setBookingStart] = useState("");
  const [bookingEnd, setBookingEnd] = useState("");
  const [bookingDeposit, setBookingDeposit] = useState("");
  const [bookingOperator, setBookingOperator] = useState(false);
  const [bookingTransport, setBookingTransport] = useState(false);
  const [bookingSaving, setBookingSaving] = useState(false);


  // ---- auth guard ----

  async function createBooking() {

    if (!userId) return;

    if (!bookingAssetId) {
      setErr("Please select a rental asset.");
      return;
    }

    if (!bookingCustomer.trim()) {
      setErr("Please enter customer name.");
      return;
    }

    if (!bookingStart || !bookingEnd) {
      setErr("Please select booking dates.");
      return;
    }

    setBookingSaving(true);
    setErr(null);

    try {

      const asset = assets.find(
        (a) => a.id === bookingAssetId
      );

      if (!asset) {
        throw new Error("Rental asset not found.");
      }

      const { error: bookingError } =
        await supabase
          .from("rental_bookings")
          .insert({
            vendor_user_id: userId,
            rental_asset_id: bookingAssetId,
            customer_name: bookingCustomer.trim(),
            customer_phone: bookingPhone.trim() || null,
            booking_status: "booked",
            booking_start: bookingStart,
            booking_end: bookingEnd,
            security_deposit:
              Number(bookingDeposit || 0) || null,
            operator_required: bookingOperator,
            transport_required: bookingTransport,
          });

      if (bookingError) throw bookingError;

      const { error: assetError } =
        await supabase
          .from("rental_assets")
          .update({
            availability_status: "booked",
          })
          .eq("id", bookingAssetId);

      if (assetError) throw assetError;

      await supabase
        .from("operational_events")
        .insert({
          vendor_user_id: userId,
          module: "rentals",
          event_type: "rental_booking_created",
          title: "Rental Booking Created",
          description:
            asset.asset_name +
            " booked for " +
            bookingCustomer.trim(),
        });

      setBookingAssetId("");
      setBookingCustomer("");
      setBookingPhone("");
      setBookingStart("");
      setBookingEnd("");
      setBookingDeposit("");
      setBookingOperator(false);
      setBookingTransport(false);

      await loadMine(userId);

    } catch (e: any) {
      setErr(
        e?.message || "Failed to create booking."
      );
    } finally {
      setBookingSaving(false);
    }
  }


  async function markBookingReturned(
    bookingId: string,
    assetId: string | null
  ) {

    if (!userId || !assetId) return;

    try {

      await supabase
        .from("rental_bookings")
        .update({
          booking_status: "returned",
        })
        .eq("id", bookingId);

      await supabase
        .from("rental_assets")
        .update({
          availability_status: "available",
        })
        .eq("id", assetId);

      await supabase
        .from("operational_events")
        .insert({
          vendor_user_id: userId,
          module: "rentals",
          event_type: "rental_returned",
          title: "Rental Returned",
          description:
            "Rental asset returned successfully",
        });

      await loadMine(userId);

    } catch (e) {
      console.error(e);
    }
  }

  async function markAssetMaintenance(
    assetId: string
  ) {

    if (!userId) return;

    try {

      await supabase
        .from("rental_assets")
        .update({
          availability_status: "maintenance",
        })
        .eq("id", assetId);

      await supabase
        .from("operational_events")
        .insert({
          vendor_user_id: userId,
          module: "rentals",
          event_type: "rental_maintenance_started",
          title: "Asset Under Maintenance",
          description:
            "Rental asset moved to maintenance",
        });

      await loadMine(userId);

    } catch (e) {
      console.error(e);
    }
  }

  async function markAssetAvailable(
    assetId: string
  ) {

    if (!userId) return;

    try {

      await supabase
        .from("rental_assets")
        .update({
          availability_status: "available",
        })
        .eq("id", assetId);

      await supabase
        .from("operational_events")
        .insert({
          vendor_user_id: userId,
          module: "rentals",
          event_type: "rental_maintenance_completed",
          title: "Asset Available Again",
          description:
            "Rental asset restored from maintenance",
        });

      await loadMine(userId);

    } catch (e) {
      console.error(e);
    }
  }

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
        setLoading(false);
        router.replace("/rentals");
        return;
      }

      setUserId(uid);
      setAuthLoading(false);
      setLoading(false);
    }

    loadUser();

    const fallback = window.setTimeout(() => {
      if (!alive) return;
      setAuthLoading(false);
      setLoading(false);
    }, 2500);

    const { data: sub } = supabase.auth.onAuthStateChange(() => loadUser());

    return () => {
      alive = false;
      window.clearTimeout(fallback);
      sub?.subscription?.unsubscribe();
    };
  }, [supabase, router]);

  async function loadMine(uid: string) {
    setLoading(true);
    setErr(null);

    const [
      listingsRes,
      assetsRes,
      bookingsRes,
    ] = await Promise.all([

      supabase
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
      .limit(400),

      supabase
        .from("rental_assets")
        .select("*")
        .eq("vendor_user_id", uid)
        .order("created_at", { ascending: false }),

      supabase
        .from("rental_bookings")
        .select("*")
        .eq("vendor_user_id", uid)
        .order("created_at", { ascending: false })

    ]);

    if (listingsRes.error) {
      setErr(listingsRes.error.message);
      setRows([]);
      setLoading(false);
      return;
    }

    if (assetsRes.error) {
      setErr(assetsRes.error.message);
      setLoading(false);
      return;
    }

    if (bookingsRes.error) {
      setErr(bookingsRes.error.message);
      setLoading(false);
      return;
    }

    setRows((listingsRes.data ?? []) as unknown as Row[]);
    setAssets((assetsRes.data ?? []) as RentalAssetRow[]);
    setBookings((bookingsRes.data ?? []) as RentalBookingRow[]);

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
        <div style={{ maxWidth: "100%", overflowX: "hidden", opacity: 0.8 }}>Checking login…</div>
      </Container>
    );
  }

  // If redirect is happening, show nothing (avoid flashing UI)
  if (!userId) return null;

  return (
    <Container>
      <SectionHeader title="My Rentals" subtitle="Manage your draft/published rental listings" />

      <div style={{ maxWidth: "100%", overflowX: "hidden", display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
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
          style={{ maxWidth: "100%", overflowX: "hidden", height: 40, padding: "0 14px", borderRadius: 12, border: "1px solid rgba(0, 0, 0.12)", background: "white", fontWeight: 800, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1 }}
        >
          Refresh
        </button>
      </div>

      <div style={{ maxWidth: "100%", overflowX: "hidden", display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
        <div style={{ maxWidth: "100%", overflowX: "hidden", flex: 1, minWidth: 220 }}>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search my rentals (title, location, unit)…"
            style={{ maxWidth: "100%", overflowX: "hidden", width: "100%", height: 40, borderRadius: 12, border: "1px solid rgba(0, 0, 0.12)", padding: "0 12px", outline: "none" }}
          />
        </div>

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          style={{ maxWidth: "100%", overflowX: "hidden", height: 40, borderRadius: 12, border: "1px solid rgba(0, 0, 0.12)", padding: "0 10px", background: "white", fontWeight: 700 }}
        >
          {statuses.map((s) => (
            <option key={s} value={s}>
              {s === "all" ? "All status" : s}
            </option>
          ))}
        </select>

        <Badge>Total: {filtered.length}</Badge>
      </div>

      {err ? <div style={{ maxWidth: "100%", overflowX: "hidden", marginBottom: 12, color: "crimson", fontWeight: 800 }}>{err}</div> : null}



      <div
        style={{ maxWidth: "100%", overflowX: "hidden", border: "1px solid rgba(0, 0, 0.08)", borderRadius: 18, padding: 18, background: "#fff", marginBottom: 18 }}
      >
        <div
          style={{ maxWidth: "100%", overflowX: "hidden", fontSize: 18, fontWeight: 950, marginBottom: 14 }}
        >
          Rental Booking Execution
        </div>

        <div
          style={{ maxWidth: "100%", overflowX: "hidden", display: "grid", gridTemplateColumns:
              "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}
        >
          <select
            value={bookingAssetId}
            onChange={(e) =>
              setBookingAssetId(e.target.value)
            }
            style={{ maxWidth: "100%", overflowX: "hidden", height: 42, borderRadius: 12, border: "1px solid rgba(0, 0, 0.12)", padding: "0 12px" }}
          >
            <option value="">
              Select rental asset
            </option>

            {assets
              .filter(
                (a) =>
                  a.availability_status ===
                  "available"
              )
              .map((asset) => (
                <option
                  key={asset.id}
                  value={asset.id}
                >
                  {asset.asset_name}
                </option>
              ))}
          </select>

          <input
            value={bookingCustomer}
            onChange={(e) =>
              setBookingCustomer(e.target.value)
            }
            placeholder="Customer name"
            style={{ maxWidth: "100%", overflowX: "hidden", height: 42, borderRadius: 12, border: "1px solid rgba(0, 0, 0.12)", padding: "0 12px" }}
          />

          <input
            value={bookingPhone}
            onChange={(e) =>
              setBookingPhone(e.target.value)
            }
            placeholder="Customer phone"
            style={{ maxWidth: "100%", overflowX: "hidden", height: 42, borderRadius: 12, border: "1px solid rgba(0, 0, 0.12)", padding: "0 12px" }}
          />

          <input
            type="datetime-local"
            value={bookingStart}
            onChange={(e) =>
              setBookingStart(e.target.value)
            }
            style={{ maxWidth: "100%", overflowX: "hidden", height: 42, borderRadius: 12, border: "1px solid rgba(0, 0, 0.12)", padding: "0 12px" }}
          />

          <input
            type="datetime-local"
            value={bookingEnd}
            onChange={(e) =>
              setBookingEnd(e.target.value)
            }
            style={{ maxWidth: "100%", overflowX: "hidden", height: 42, borderRadius: 12, border: "1px solid rgba(0, 0, 0.12)", padding: "0 12px" }}
          />

          <input
            value={bookingDeposit}
            onChange={(e) =>
              setBookingDeposit(e.target.value)
            }
            placeholder="Security deposit"
            style={{ maxWidth: "100%", overflowX: "hidden", height: 42, borderRadius: 12, border: "1px solid rgba(0, 0, 0.12)", padding: "0 12px" }}
          />
        </div>

        <div
          style={{ maxWidth: "100%", overflowX: "hidden", display: "flex", flexWrap: "wrap", gap: 18, marginTop: 14 }}
        >
          <label
            style={{ maxWidth: "100%", overflowX: "hidden", display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", fontWeight: 700 }}
          >
            <input
              type="checkbox"
              checked={bookingOperator}
              onChange={(e) =>
                setBookingOperator(e.target.checked)
              }
            />
            Operator Required
          </label>

          <label
            style={{ maxWidth: "100%", overflowX: "hidden", display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", fontWeight: 700 }}
          >
            <input
              type="checkbox"
              checked={bookingTransport}
              onChange={(e) =>
                setBookingTransport(e.target.checked)
              }
            />
            Transport Required
          </label>
        </div>

        <button
          type="button"
          onClick={createBooking}
          disabled={bookingSaving}
          style={{ maxWidth: "100%", overflowX: "hidden", marginTop: 18, height: 44, padding: "0 18px", borderRadius: 12, border: "none", background: "#0f172a", color: "#fff", fontWeight: 900, cursor: "pointer", opacity: bookingSaving ? 0.7 : 1 }}
        >
          {bookingSaving
            ? "Creating Booking..."
            : "Create Rental Booking"}
        </button>
      </div>

      <div
        style={{ maxWidth: "100%", overflowX: "hidden", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 18 }}
      >
        {[
          [
            "Rental Assets",
            String(assets.length),
          ],
          [
            "Available",
            String(
              assets.filter(
                (a) =>
                  a.availability_status === "available"
              ).length
            ),
          ],
          [
            "Booked",
            String(
              bookings.filter(
                (b) =>
                  b.booking_status === "booked"
              ).length
            ),
          ],
          [
            "Maintenance",
            String(
              assets.filter(
                (a) =>
                  a.availability_status === "maintenance"
              ).length
            ),
          ],
        ].map(([label, value]) => (
          <div
            key={label}
            style={{ maxWidth: "100%", overflowX: "hidden", border: "1px solid rgba(0, 0, 0.08)", borderRadius: 18, padding: 16, background: "#fff" }}
          >
            <div
              style={{ maxWidth: "100%", overflowX: "hidden", fontSize: 12, fontWeight: 800, opacity: 0.7 }}
            >
              {label}
            </div>

            <div
              style={{ maxWidth: "100%", overflowX: "hidden", marginTop: 6, fontSize: 26, fontWeight: 950 }}
            >
              {value}
            </div>
          </div>
        ))}
      </div>


      <div
        style={{ maxWidth: "100%", overflowX: "hidden", border: "1px solid rgba(0, 0, 0.08)", borderRadius: 18, padding: 18, background: "#fff", marginBottom: 18 }}
      >
        <div
          style={{ maxWidth: "100%", overflowX: "hidden", fontSize: 18, fontWeight: 950, marginBottom: 14 }}
        >
          Rental ERP Lifecycle
        </div>

        <div
          style={{ maxWidth: "100%", overflowX: "hidden", display: "grid", gap: 12 }}
        >
          {bookings.slice(0, 8).map((booking) => {

            const asset = assets.find(
              (a) => a.id === booking.rental_asset_id
            );

            return (
              <div
                key={booking.id}
                style={{ maxWidth: "100%", overflowX: "hidden", border: "1px solid rgba(0, 0, 0.08)", borderRadius: 14, padding: 14, background: "#f8fafc" }}
              >
                <div
                  style={{ maxWidth: "100%", overflowX: "hidden", display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 12 }}
                >
                  <div>
                    <div
                      style={{ maxWidth: "100%", overflowX: "hidden", fontWeight: 900, fontSize: 16 }}
                    >
                      {asset?.asset_name || "Rental Asset"}
                    </div>

                    <div
                      style={{ maxWidth: "100%", overflowX: "hidden", marginTop: 4, fontSize: 13, opacity: 0.7 }}
                    >
                      Customer: {booking.customer_name}
                    </div>

                    <div
                      style={{ maxWidth: "100%", overflowX: "hidden", marginTop: 4, fontSize: 13, opacity: 0.7 }}
                    >
                      {fmt(booking.booking_start)}
                      {" → "}
                      {fmt(booking.booking_end)}
                    </div>
                  </div>

                  <div
                    style={{ maxWidth: "100%", overflowX: "hidden", display: "flex", flexWrap: "wrap", gap: 10 }}
                  >
                    {booking.booking_status === "booked" ? (
                      <button
                        type="button"
                        onClick={() =>
                          markBookingReturned(
                            booking.id,
                            booking.rental_asset_id
                          )
                        }
                        style={{ maxWidth: "100%", overflowX: "hidden", border: "none", borderRadius: 10, padding: "10px 14px", background: "#16a34a", color: "#fff", fontWeight: 900, cursor: "pointer" }}
                      >
                        Mark Returned
                      </button>
                    ) : null}

                    {asset && asset.availability_status !==
                    "maintenance" ? (
                      <button
                        type="button"
                        onClick={() =>
                          markAssetMaintenance(asset.id)
                        }
                        style={{ maxWidth: "100%", overflowX: "hidden", border: "none", borderRadius: 10, padding: "10px 14px", background: "#ea580c", color: "#fff", fontWeight: 900, cursor: "pointer" }}
                      >
                        Maintenance
                      </button>
                    ) : asset ? (
                      <button
                        type="button"
                        onClick={() =>
                          markAssetAvailable(asset.id)
                        }
                        style={{ maxWidth: "100%", overflowX: "hidden", border: "none", borderRadius: 10, padding: "10px 14px", background: "#2563eb", color: "#fff", fontWeight: 900, cursor: "pointer" }}
                      >
                        Restore Asset
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div style={{ maxWidth: "100%", overflowX: "hidden", opacity: 0.8 }}>Loading your rentals…</div>
      ) : filtered.length === 0 ? (
        <div style={{ maxWidth: "100%", overflowX: "hidden", opacity: 0.8 }}>
          No rentals found. Create one from{" "}
          <Link href="/rentals/add" style={{ maxWidth: "100%", overflowX: "hidden", fontWeight: 800 }}>
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
                    <div style={{ maxWidth: "100%", overflowX: "hidden", marginBottom: 12 }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={cover}
                        alt={r.title ?? "Rental"}
                        style={{ maxWidth: "100%", overflowX: "hidden", width: "100%", height: 180, objectFit: "cover", borderRadius: 12, border: "1px solid rgba(0, 0, 0.08)" }}
                      />
                    </div>
                  ) : null}

                  <div style={{ maxWidth: "100%", overflowX: "hidden", display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 10 }}>
                    <Badge>{String(r.status ?? "draft").toLowerCase()}</Badge>
                    <Badge>Updated: {fmt(r.updated_at)}</Badge>
                    {r.pricing_unit ? <Badge>Unit: {r.pricing_unit}</Badge> : null}
                  </div>

                  <div style={{ maxWidth: "100%", overflowX: "hidden", fontWeight: 900, marginBottom: 6 }}>{(r.title ?? "").trim() || "Untitled rental"}</div>

                  <div style={{ maxWidth: "100%", overflowX: "hidden", opacity: 0.85 }}>
                    {loc ? loc : "—"} • {fmtRate(r.rate, r.pricing_unit, r.rate_unit_label)}
                    {r.security_deposit != null ? ` • Deposit: ${money(r.security_deposit)}` : ""}
                  </div>
                </CardBody>

                <CardFooter>
                  <div style={{ maxWidth: "100%", overflowX: "hidden", display: "flex", flexWrap: "wrap", gap: 12 }}>
                    <Link href={`/rentals/${r.id}`} style={{ maxWidth: "100%", overflowX: "hidden", fontWeight: 800 }}>
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
