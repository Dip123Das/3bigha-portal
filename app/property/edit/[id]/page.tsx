// app/property/edit/[id]/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

import { Container } from "@/components/layout/Container";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { Card, CardBody, CardFooter } from "@/components/ui/Card";
import { ActionButton } from "@/components/ui/ActionButton";
import { Badge } from "@/components/ui/Badge";

type Intent = "sell" | "rent" | "lease" | "pg";
type PropertyType = "Land / Plot" | "House(s)";

type LandSubtype = "Residential" | "Commercial" | "Agricultural" | "Industrial" | "Others";

type HouseSubtype =
  | "Independent / Builder Floor"
  | "Independent House / Villa"
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

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function MessageBox(props: { title: string; description?: string }) {
  return (
    <div
      style={{
        border: "1px solid rgba(0,0,0,0.08)",
        borderRadius: 12,
        padding: 16,
        background: "rgba(0,0,0,0.02)",
      }}
    >
      <div style={{ fontWeight: 800, marginBottom: 6 }}>{props.title}</div>
      {props.description ? <div style={{ opacity: 0.8, lineHeight: 1.5 }}>{props.description}</div> : null}
    </div>
  );
}

type Row = {
  id: string;

  owner_user_id: string | null;
  owner_id: string | null;

  listing_intent: Intent;
  type_id: string;
  subtype_id: string;

  title: string;
  slug: string | null;
  description: string | null;

  expected_price: number | null;

  city: string;
  state: string | null;
  address_text: string | null;

  status: "draft" | "pending" | "approved" | "rejected";
  updated_at: string;
  rejected_reason: string | null;

  // NOTE: cover_image_url is NOT included here intentionally because your pasted schema
  // for property_listings did NOT show this column. We keep UI and updates SAFE via safeUpdate.
};

export default function PropertyEditPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";

  const supabase = useMemo(() => getSupabaseBrowser(), []);

  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [isAdmin, setIsAdmin] = useState(false);
  const [row, setRow] = useState<Row | null>(null);
  const [error, setError] = useState<string | null>(null);

  // UI state (editable)
  const [intent, setIntent] = useState<Intent>("sell");
  const [type, setType] = useState<PropertyType | "">("");
  const [subtype, setSubtype] = useState<PropertySubtype | "">("");

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [expectedPrice, setExpectedPrice] = useState<string>("");

  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [addressText, setAddressText] = useState("");

  // We keep this UI field, but we DO NOT select it (since column may not exist).
  // Saving uses safeUpdatePropertyListing so it won't crash if column doesn't exist.
  const [coverImageUrl, setCoverImageUrl] = useState("");

  // cache resolved ids (avoid repeat DB hits)
  const [resolvedTypeId, setResolvedTypeId] = useState<string | null>(null);
  const [resolvedSubtypeId, setResolvedSubtypeId] = useState<string | null>(null);

  // --------- Guards ---------
  useEffect(() => {
    let alive = true;

    async function guard() {
      const { data } = await supabase.auth.getSession();
      if (!alive) return;

      if (!data.session) {
        router.replace(`/login?next=${encodeURIComponent(`/property/edit/${id}`)}`);
        return;
      }

      const { data: isAdminBool } = await supabase.rpc("is_current_user_property_admin");
      if (!alive) return;

      setIsAdmin(!!isAdminBool);
      setChecking(false);
    }

    if (id) guard();
    return () => {
      alive = false;
    };
  }, [router, supabase, id]);

  // --------- Load listing ---------
  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setError(null);

      // IMPORTANT:
      // Your property_listings schema you pasted did NOT show cover_image_url,
      // so we do NOT select it here to avoid runtime errors.
      const { data, error } = await supabase
        .from("property_listings")
        .select(
          [
            "id",
            "owner_user_id",
            "owner_id",
            "listing_intent",
            "type_id",
            "subtype_id",
            "title",
            "slug",
            "description",
            "expected_price",
            "city",
            "state",
            "address_text",
            "status",
            "updated_at",
            "rejected_reason",
          ].join(",")
        )
        .eq("id", id)
        .single();

      if (!alive) return;

      if (error) {
        setError(error.message);
        setRow(null);
        setLoading(false);
        return;
      }

      const r = data as unknown as Row;
      setRow(r);

      // Base fields
      setTitle(r.title ?? "");
      setSlug(r.slug ?? "");
      setDescription(r.description ?? "");
      setExpectedPrice(r.expected_price == null ? "" : String(r.expected_price));

      setCity(r.city ?? "");
      setState(r.state ?? "");
      setAddressText(r.address_text ?? "");

      // coverImageUrl: cannot hydrate safely without selecting column
      // Keep what user types; or if you later add column in DB, we can start selecting it.

      // Required ids/intents
      setIntent(r.listing_intent);
      setResolvedTypeId(r.type_id);
      setResolvedSubtypeId(r.subtype_id);

      // Hydrate UI chips from IDs
      // 1) type_id -> type name
      const { data: typeRow, error: tErr } = await supabase
        .from("property_types")
        .select("id,name,slug")
        .eq("id", r.type_id)
        .maybeSingle();

      if (!tErr && typeRow?.name) {
        const name = String(typeRow.name);
        if (name === "Land / Plot" || name === "House(s)") setType(name);
      }

      // 2) subtype_id -> subtype name + ensure type is aligned
      const { data: subRow, error: sErr } = await supabase
        .from("property_subtypes")
        .select("id,type_id,name,slug")
        .eq("id", r.subtype_id)
        .maybeSingle();

      if (!sErr && subRow?.name) {
        setSubtype(String(subRow.name) as any);

        if (!typeRow?.name && subRow.type_id) {
          const { data: t2 } = await supabase.from("property_types").select("name").eq("id", subRow.type_id).maybeSingle();
          if (t2?.name === "Land / Plot" || t2?.name === "House(s)") setType(t2.name as any);
        }
      }

      setLoading(false);
    }

    if (id && !checking) load();
    return () => {
      alive = false;
    };
  }, [supabase, id, checking]);

  // Reset subtype cache when type changes (EDIT PAGE SAFE)
  useEffect(() => {
    // when type changes, subtype must be re-picked
    setSubtype("");
    setResolvedSubtypeId(null);

    // DO NOT clear resolvedTypeId here (edit page loads it from DB)
  }, [type]);

  const canOwnerEdit = row ? row.status === "draft" || row.status === "pending" || row.status === "rejected" : false;
  const canEdit = isAdmin || canOwnerEdit;

  // --------- Resolvers (DB is the source of truth) ---------
  async function resolveTypeIdOrThrow(typeName: PropertyType): Promise<string> {
    if (resolvedTypeId) return resolvedTypeId;

    const normalizedType = String(typeName).trim();

    // 1) Try exact name
    const byName = await supabase.from("property_types").select("id,name,slug").eq("name", normalizedType).maybeSingle();
    if (!byName.error && byName.data?.id) {
      setResolvedTypeId(byName.data.id as string);
      return byName.data.id as string;
    }

    // 2) Try slug candidates
    const slugCandidates =
      normalizedType === "House(s)"
        ? ["houses", "house-s", "house"]
        : normalizedType === "Land / Plot"
          ? ["land-plot", "land", "plot"]
          : [slugify(normalizedType)];

    const bySlug = await supabase.from("property_types").select("id,name,slug").in("slug", slugCandidates).maybeSingle();
    if (!bySlug.error && bySlug.data?.id) {
      setResolvedTypeId(bySlug.data.id as string);
      return bySlug.data.id as string;
    }

    throw new Error(`type_id is required but could not be found for "${normalizedType}". Please seed property_types.`);
  }

  async function resolveSubtypeIdOrThrow(typeId: string, subtypeName: PropertySubtype): Promise<string> {
    if (resolvedSubtypeId) return resolvedSubtypeId;

    const normalizedSubtype = String(subtypeName).trim();
    const wantedSlug = slugify(normalizedSubtype);

    const byName = await supabase
      .from("property_subtypes")
      .select("id,type_id,name,slug")
      .eq("type_id", typeId)
      .eq("name", normalizedSubtype)
      .maybeSingle();

    if (!byName.error && byName.data?.id) {
      setResolvedSubtypeId(byName.data.id as string);
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
      return bySlug.data.id as string;
    }

    throw new Error(`subtype_id is required but could not be found for "${normalizedSubtype}" under this property type.`);
  }

  // --------- Safe update (auto-drop missing columns) ---------
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
    const m1 = msg.match(/could not find the '([^']+)' column/i);
    if (m1?.[1]) return m1[1];

    const m2 = msg.match(/column "([^"]+)" .* does not exist/i);
    if (m2?.[1]) return m2[1];

    return null;
  }

  async function safeUpdatePropertyListing(listingId: string, payload: Record<string, any>) {
    let attemptObj = { ...payload };

    for (let i = 0; i < 6; i++) {
      const res = await supabase.from("property_listings").update(attemptObj as any).eq("id", listingId);

      if (!res.error) return res;

      const msg = String(res.error.message || "");
      if (!looksLikeMissingColumnError(msg)) return res;

      const missing = extractMissingColumnName(msg);
      if (!missing) return res;

      if (missing in attemptObj) {
        const copy = { ...attemptObj };
        delete copy[missing];
        attemptObj = copy;
        continue;
      }

      return res;
    }

    return await supabase.from("property_listings").update(attemptObj as any).eq("id", listingId);
  }

  // --------- Save ---------
  async function save() {
    if (!row) return;
    if (!canEdit) return;

    setError(null);

    if (!intent) return setError("Intent is required.");
    if (!type) return setError("Property Type is required.");
    if (!subtype) return setError("Property Subtype is required.");

    const t = title.trim();
    if (!t) return setError("Title is required.");

    const c = city.trim();
    if (!c) return setError("City is required (cannot be blank).");

    const finalSlug = slugify(slug || title);
    if (!finalSlug) return setError("Slug is required.");

    const expectedPriceNum = expectedPrice.trim() ? Number(expectedPrice.trim()) : null;
    if (expectedPrice.trim() && Number.isNaN(expectedPriceNum)) return setError("Expected Price must be a number.");

    setSaving(true);

    try {
      const typeId = await resolveTypeIdOrThrow(type as PropertyType);
      const subtypeId = await resolveSubtypeIdOrThrow(typeId, subtype as PropertySubtype);

      // Payload includes cover_image_url, but SAFE update will auto-drop it if column doesn't exist.
      const payload: Record<string, any> = {
        listing_intent: intent,
        type_id: typeId,
        subtype_id: subtypeId,

        title: t,
        slug: finalSlug,

        description: description.trim() || null,
        expected_price: expectedPriceNum,

        city: c,
        state: state.trim() || null,
        address_text: addressText.trim() || null,

        // OPTIONAL COLUMN (may not exist in DB)
        cover_image_url: coverImageUrl.trim() || null,
      };

      const { error } = await safeUpdatePropertyListing(id, payload);
      if (error) throw error;

      // Refresh (DO NOT select cover_image_url to avoid schema mismatch)
      const { data: refreshed, error: e2 } = await supabase
        .from("property_listings")
        .select(
          [
            "id",
            "owner_user_id",
            "owner_id",
            "listing_intent",
            "type_id",
            "subtype_id",
            "title",
            "slug",
            "description",
            "expected_price",
            "city",
            "state",
            "address_text",
            "status",
            "updated_at",
            "rejected_reason",
          ].join(",")
        )
        .eq("id", id)
        .single();

      if (e2) throw e2;

      setRow(refreshed as unknown as Row);
    } catch (e: any) {
      setError(e?.message ? String(e.message) : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function submitForReview() {
    if (!row) return;
    if (row.status !== "draft" && row.status !== "rejected") return;

    setSaving(true);
    setError(null);

    try {
      if (!type || !subtype) throw new Error("Type/Subtype missing. Please re-select them before submitting.");
      const typeId = await resolveTypeIdOrThrow(type as PropertyType);
      const subtypeId = await resolveSubtypeIdOrThrow(typeId, subtype as PropertySubtype);

      const payload: Record<string, any> = {
        status: "pending",
        type_id: typeId,
        subtype_id: subtypeId,
        listing_intent: intent,
      };

      const { error } = await safeUpdatePropertyListing(id, payload);
      if (error) throw error;

      const { data: refreshed, error: e2 } = await supabase
        .from("property_listings")
        .select(
          [
            "id",
            "owner_user_id",
            "owner_id",
            "listing_intent",
            "type_id",
            "subtype_id",
            "title",
            "slug",
            "description",
            "expected_price",
            "city",
            "state",
            "address_text",
            "status",
            "updated_at",
            "rejected_reason",
          ].join(",")
        )
        .eq("id", id)
        .single();

      if (e2) throw e2;

      setRow(refreshed as unknown as Row);
    } catch (e: any) {
      setError(e?.message ? String(e.message) : "Submit failed.");
    } finally {
      setSaving(false);
    }
  }

  if (checking) {
    return (
      <Container>
        <SectionHeader title="Edit Property" subtitle="Checking login..." />
        <MessageBox title="Please wait" description="Verifying your session..." />
      </Container>
    );
  }

  if (loading) {
    return (
      <Container>
        <SectionHeader title="Edit Property" subtitle="Loading..." />
        <MessageBox title="Loading..." description="Fetching listing..." />
      </Container>
    );
  }

  if (!row) {
    return (
      <Container>
        <SectionHeader title="Edit Property" subtitle="" />
        <MessageBox title="Unable to open listing" description={error ?? "Not found or access denied."} />
      </Container>
    );
  }

  return (
    <Container>
      <SectionHeader title="Edit Property" subtitle="Update your listing details" />

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 16 }}>
        <Badge>Status: {row.status}</Badge>
        <Badge>Updated: {new Date(row.updated_at).toLocaleString()}</Badge>
        {isAdmin ? <Badge>Admin</Badge> : null}
        {row.status === "rejected" && row.rejected_reason ? <Badge>Rejected: {row.rejected_reason}</Badge> : null}
      </div>

      {error ? <div style={{ marginBottom: 12, color: "crimson", fontWeight: 700 }}>{error}</div> : null}

      {!canEdit ? (
        <MessageBox
          title="Editing locked"
          description="Approved listings are locked for owners. Admin can still edit, or admin can send it back to pending."
        />
      ) : null}

      <Card>
        <CardBody>
          <div style={{ fontWeight: 900, marginBottom: 8 }}>Listing Basics (Required)</div>

          <label style={{ display: "block", fontWeight: 700, marginBottom: 6 }}>Intent</label>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
            {(["sell", "rent", "lease", "pg"] as Intent[]).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setIntent(k)}
                disabled={!canEdit}
                style={{
                  height: 40,
                  padding: "0 12px",
                  borderRadius: 12,
                  border: "1px solid #e5e7eb",
                  background: intent === k ? "#111827" : "white",
                  color: intent === k ? "white" : "#111827",
                  cursor: canEdit ? "pointer" : "not-allowed",
                  fontWeight: 700,
                  opacity: canEdit ? 1 : 0.6,
                }}
              >
                {k === "pg" ? "PG" : k.toUpperCase()}
              </button>
            ))}
          </div>

          <label style={{ display: "block", fontWeight: 700, marginBottom: 6 }}>Property Type</label>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
            {(["Land / Plot", "House(s)"] as PropertyType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                disabled={!canEdit}
                style={{
                  height: 40,
                  padding: "0 12px",
                  borderRadius: 12,
                  border: "1px solid #e5e7eb",
                  background: type === t ? "#111827" : "white",
                  color: type === t ? "white" : "#111827",
                  cursor: canEdit ? "pointer" : "not-allowed",
                  fontWeight: 700,
                  opacity: canEdit ? 1 : 0.6,
                }}
              >
                {t}
              </button>
            ))}
          </div>

          <label style={{ display: "block", fontWeight: 700, marginBottom: 6 }}>Subtype</label>
          {!type ? (
            <div style={{ color: "#5b6472", fontSize: 13, marginBottom: 12 }}>Select a Property Type first.</div>
          ) : (
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
              {subtypeList(type).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSubtype(s)}
                  disabled={!canEdit}
                  style={{
                    height: 40,
                    padding: "0 12px",
                    borderRadius: 12,
                    border: "1px solid #e5e7eb",
                    background: subtype === s ? "#111827" : "white",
                    color: subtype === s ? "white" : "#111827",
                    cursor: canEdit ? "pointer" : "not-allowed",
                    fontWeight: 700,
                    opacity: canEdit ? 1 : 0.6,
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          <hr style={{ margin: "14px 0", border: "none", borderTop: "1px solid #eee" }} />

          <label style={{ display: "block", fontWeight: 700, marginBottom: 6 }}>Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{ width: "100%", padding: 10, marginBottom: 12 }}
            disabled={!canEdit}
          />

          <label style={{ display: "block", fontWeight: 700, marginBottom: 6 }}>Slug</label>
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            style={{ width: "100%", padding: 10, marginBottom: 12 }}
            disabled={!canEdit}
          />

          <label style={{ display: "block", fontWeight: 700, marginBottom: 6 }}>Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{ width: "100%", padding: 10, minHeight: 120, marginBottom: 12 }}
            disabled={!canEdit}
          />

          <label style={{ display: "block", fontWeight: 700, marginBottom: 6 }}>Expected Price (₹)</label>
          <input
            value={expectedPrice}
            onChange={(e) => setExpectedPrice(e.target.value)}
            style={{ width: "100%", padding: 10, marginBottom: 12 }}
            disabled={!canEdit}
          />

          <label style={{ display: "block", fontWeight: 700, marginBottom: 6 }}>City (Required)</label>
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            style={{ width: "100%", padding: 10, marginBottom: 12 }}
            disabled={!canEdit}
          />

          <label style={{ display: "block", fontWeight: 700, marginBottom: 6 }}>State</label>
          <input
            value={state}
            onChange={(e) => setState(e.target.value)}
            style={{ width: "100%", padding: 10, marginBottom: 12 }}
            disabled={!canEdit}
          />

          <label style={{ display: "block", fontWeight: 700, marginBottom: 6 }}>Address</label>
          <input
            value={addressText}
            onChange={(e) => setAddressText(e.target.value)}
            style={{ width: "100%", padding: 10, marginBottom: 12 }}
            disabled={!canEdit}
          />

          <label style={{ display: "block", fontWeight: 700, marginBottom: 6 }}>
            Cover Image URL{" "}
            <span style={{ fontWeight: 600, opacity: 0.6 }}>(optional; saved only if DB has cover_image_url)</span>
          </label>
          <input
            value={coverImageUrl}
            onChange={(e) => setCoverImageUrl(e.target.value)}
            style={{ width: "100%", padding: 10 }}
            disabled={!canEdit}
            placeholder="https://..."
          />
        </CardBody>

        <CardFooter>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <ActionButton variant="primary" onClick={save} disabled={saving || !canEdit}>
              {saving ? "Saving..." : "Save"}
            </ActionButton>

            {!isAdmin && (row.status === "draft" || row.status === "rejected") ? (
              <ActionButton variant="secondary" onClick={submitForReview} disabled={saving}>
                Submit for Review
              </ActionButton>
            ) : null}

            <Link href="/property/my" style={{ fontWeight: 700 }}>
              Back to My Properties →
            </Link>
          </div>
        </CardFooter>
      </Card>
    </Container>
  );
}
