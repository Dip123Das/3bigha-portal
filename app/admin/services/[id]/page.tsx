// app/admin/services/[id]/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

import { Container } from "@/components/layout/Container";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { Card, CardBody, CardFooter } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ActionButton } from "@/components/ui/ActionButton";

type Status = "draft" | "pending" | "approved" | "rejected";

type Row = {
  id: string;
  owner_id: string;

  title: string | null;
  description: string | null;

  status: Status;
  published_at: string | null;
  created_at: string;
  updated_at: string;

  pricing_unit: string | null;
  rate: number | null;

  group: string | null;
  category: string | null;

  country: string | null;
  state: string | null;
  district: string | null;
  city: string | null;
  locality: string | null;
  pincode: string | null;

  photos: any[] | null;
};

function fmt(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function fmtMoney(n: number | null) {
  if (n == null) return "—";
  return `₹${n}`;
}

function pickFirstPhotoUrl(photos: any[] | null) {
  if (!photos || !Array.isArray(photos) || photos.length === 0) return null;
  const first = photos[0];
  if (typeof first === "string") return first;
  if (first && typeof first === "object" && typeof first.url === "string") return first.url;
  return null;
}

function isAdminRole(role: string | null | undefined) {
  return role === "master_admin" || role === "services_admin";
}

export default function AdminServiceDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = (params?.id ?? "") as string;

  const supabase = useMemo(() => getSupabaseBrowser(), []);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [role, setRole] = useState<string | null>(null);
  const [row, setRow] = useState<Row | null>(null);
  const [acting, setActing] = useState<Status | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    setRow(null);

    const { data: s } = await supabase.auth.getSession();
    const session = s.session;

    if (!session) {
      router.replace("/login");
      return;
    }

    const { data: prof, error: profErr } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .maybeSingle();

    if (profErr) {
      setErr(profErr.message);
      setLoading(false);
      return;
    }

    const r = (prof?.role ?? null) as string | null;
    setRole(r);

    if (!isAdminRole(r)) {
      setLoading(false);
      return;
    }

    if (!id) {
      setErr("Missing service id.");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("service_listings")
      .select(
        [
          "id",
          "owner_id",
          "title",
          "description",
          "status",
          "published_at",
          "created_at",
          "updated_at",
          "pricing_unit",
          "rate",
          "group",
          "category",
          "country",
          "state",
          "district",
          "city",
          "locality",
          "pincode",
          "photos",
        ].join(",")
      )
      .eq("id", id)
      .maybeSingle();

    if (error) {
      setErr(error.message);
      setRow(null);
      setLoading(false);
      return;
    }

    setRow((data ?? null) as unknown as Row | null);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function setStatus(next: Status) {
    if (!row) return;

    setActing(next);
    setErr(null);

    try {
      const response = await fetch(
        "/api/admin/services/decision",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "same-origin",
          body: JSON.stringify({
            listingId: row.id,
            decision: next,
          }),
        },
      );

      const result = await response
        .json()
        .catch(() => null);

      if (!response.ok || !result?.ok) {
        throw new Error(
          result?.trustedPublication?.message ||
            result?.error?.message ||
            (typeof result?.error === "string"
              ? result.error
              : null) ||
            "Unable to update service listing.",
        );
      }

      await load();
    } catch (error: any) {
      setErr(
        error?.message ||
          "Unable to update service listing.",
      );
    } finally {
      setActing(null);
    }
  }

  if (loading) {
    return (
      <Container>
        <SectionHeader title="Admin · Service Details" subtitle="Loading..." />
        <div style={{ opacity: 0.8 }}>Fetching service listing…</div>
      </Container>
    );
  }

  if (!isAdminRole(role)) {
    return (
      <Container>
        <SectionHeader title="Admin · Service Details" subtitle="" />
        <div style={{ color: "crimson", fontWeight: 900, marginBottom: 10 }}>
          Access denied. (Admin role required)
        </div>
        <Link href="/admin/services" style={{ fontWeight: 800 }}>
          ← Back to Admin Services
        </Link>
      </Container>
    );
  }

  if (err) {
    return (
      <Container>
        <SectionHeader title="Admin · Service Details" subtitle="" />
        <div style={{ color: "crimson", fontWeight: 800, marginBottom: 10 }}>{err}</div>
        <Link href="/admin/services" style={{ fontWeight: 800 }}>
          ← Back to Admin Services
        </Link>
      </Container>
    );
  }

  if (!row) {
    return (
      <Container>
        <SectionHeader title="Admin · Service Details" subtitle="" />
        <div style={{ opacity: 0.85, marginBottom: 10 }}>Not found.</div>
        <Link href="/admin/services" style={{ fontWeight: 800 }}>
          ← Back to Admin Services
        </Link>
      </Container>
    );
  }

  const location = [row.locality, row.city, row.district, row.state, row.country].filter(Boolean).join(", ");
  const firstPhoto = pickFirstPhotoUrl(row.photos);

  return (
    <Container>
      <SectionHeader title="Admin · Service Details" subtitle="Admin preview (any status)" />

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
        <Link href="/admin/services" style={{ fontWeight: 800 }}>
          ← Back to Admin Services
        </Link>

        <Badge>{row.status}</Badge>
        {row.group ? <Badge>{row.group}</Badge> : null}
        {row.category ? <Badge>{row.category}</Badge> : null}

        <Badge>Created: {fmt(row.created_at)}</Badge>
        <Badge>Updated: {fmt(row.updated_at)}</Badge>
        <Badge>Published: {fmt(row.published_at)}</Badge>
      </div>

      {err ? <div style={{ color: "crimson", fontWeight: 800, marginBottom: 10 }}>{err}</div> : null}

      <div style={{ display: "grid", gap: 14, gridTemplateColumns: "2fr 1fr" }}>
        <Card>
          <CardBody>
            <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 6 }}>
              {(row.title ?? "").trim() || "Untitled service"}
            </div>

            <div style={{ opacity: 0.85, marginBottom: 10 }}>
              {location || "—"}
              {row.pincode ? ` • ${row.pincode}` : ""}
            </div>

            {firstPhoto ? (
              <div style={{ marginBottom: 12 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={firstPhoto}
                  alt="Service photo"
                  style={{
                    width: "100%",
                    maxHeight: 340,
                    objectFit: "cover",
                    borderRadius: 12,
                    border: "1px solid rgba(0,0,0,0.08)",
                  }}
                />
              </div>
            ) : null}

            {row.description ? (
              <div style={{ lineHeight: 1.6, opacity: 0.9, whiteSpace: "pre-wrap" }}>{row.description}</div>
            ) : (
              <div style={{ opacity: 0.75 }}>No description provided.</div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div style={{ fontWeight: 900, marginBottom: 8 }}>Pricing</div>

            <div style={{ display: "grid", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <span style={{ opacity: 0.75 }}>Unit</span>
                <span style={{ fontWeight: 800 }}>{row.pricing_unit ?? "—"}</span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <span style={{ opacity: 0.75 }}>Rate</span>
                <span style={{ fontWeight: 800 }}>{fmtMoney(row.rate)}</span>
              </div>
            </div>

            <div style={{ marginTop: 12, opacity: 0.7, fontSize: 13 }}>
              Owner ID:{" "}
              <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}>
                {row.owner_id}
              </span>
            </div>
          </CardBody>

          <CardFooter>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <ActionButton variant="primary" onClick={() => setStatus("approved")} disabled={acting !== null}>
                {acting === "approved" ? "Approving..." : "Approve"}
              </ActionButton>

              <ActionButton variant="secondary" onClick={() => setStatus("rejected")} disabled={acting !== null}>
                {acting === "rejected" ? "Rejecting..." : "Reject"}
              </ActionButton>

              <ActionButton variant="secondary" onClick={() => setStatus("pending")} disabled={acting !== null}>
                {acting === "pending" ? "Setting..." : "Set Pending"}
              </ActionButton>
            </div>
          </CardFooter>
        </Card>
      </div>

      <div style={{ marginTop: 14, opacity: 0.65, fontSize: 12 }}>
        Reference ID:{" "}
        <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}>
          {row.id}
        </span>
      </div>
    </Container>
  );
}
