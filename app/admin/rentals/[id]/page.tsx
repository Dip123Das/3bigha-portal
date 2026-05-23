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

type Row = {
  id: string;
  owner_id: string;

  title: string;
  status: "draft" | "pending" | "approved" | "rejected";

  created_at: string;
  updated_at: string;
  published_at?: string | null;

  pricing_unit: string | null;
  rate: number | null;

  city: string | null;
  state: string | null;

  category_id: string;
  subcategory_id: string;
  equipment_id: string | null;

  other_category_text: string | null;
  other_subcategory_text: string | null;
  other_equipment_text: string | null;
};

function MessageBox(props: { title: string; description?: string }) {
  return (
    <div style={{ border: "1px solid rgba(0,0,0,0.08)", borderRadius: 12, padding: 12 }}>
      <div style={{ fontWeight: 800, marginBottom: 6 }}>{props.title}</div>
      {props.description ? <div style={{ opacity: 0.8, lineHeight: 1.5 }}>{props.description}</div> : null}
    </div>
  );
}

function fmt(iso?: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function fmtRate(rate: number | null, unit: string | null) {
  if (rate == null) return "—";
  const u = unit ? `/${unit}` : "";
  return `₹${rate}${u}`;
}

export default function AdminRentalsDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = (params?.id ?? "") as string;

  const supabase = useMemo(() => getSupabaseBrowser(), []);

  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const [loading, setLoading] = useState(true);
  const [row, setRow] = useState<Row | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    async function guard() {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;

      if (!user) {
        router.replace(`/login?next=${encodeURIComponent(`/admin/rentals/${id}`)}`);
        return;
      }

      const { data: isAdminBool } = await supabase.rpc("is_current_user_rentals_admin");
      if (!alive) return;

      setIsAdmin(!!isAdminBool);
      setChecking(false);
    }

    guard();
    return () => {
      alive = false;
    };
  }, [router, supabase, id]);

  async function load() {
    if (!id) return;
    setLoading(true);
    setError(null);

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
          "published_at",
          "pricing_unit",
          "rate",
          "city",
          "state",
          "category_id",
          "subcategory_id",
          "equipment_id",
          "other_category_text",
          "other_subcategory_text",
          "other_equipment_text",
        ].join(",")
      )
      .eq("id", id)
      .maybeSingle();

    if (error) {
      setError(error.message);
      setRow(null);
    } else {
      setError(null);
      setRow((data ?? null) as Row | null);
    }

    setLoading(false);
  }

  useEffect(() => {
    if (!checking && isAdmin) load();
    if (!checking && !isAdmin) setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checking, isAdmin]);

  async function setStatus(status: "approved" | "rejected" | "pending") {
    if (!row) return;
    setError(null);

    const patch: any = { status };
    if (status === "approved") patch.published_at = new Date().toISOString();
    if (status === "pending") patch.published_at = null;

    const { error } = await supabase.from("rental_listings").update(patch).eq("id", row.id);
    if (error) return setError(error.message);

    await load();
  }

  if (checking) {
    return (
      <Container>
        <SectionHeader title="Admin Rentals Preview" subtitle="Checking access..." />
        <MessageBox title="Please wait" description="Verifying your admin access..." />
      </Container>
    );
  }

  if (!isAdmin) {
    return (
      <Container>
        <SectionHeader title="Admin Rentals Preview" subtitle="" />
        <MessageBox title="Access denied" description="You are not a rentals admin." />
      </Container>
    );
  }

  if (loading) {
    return (
      <Container>
        <SectionHeader title="Admin Rentals Preview" subtitle="Loading..." />
        <MessageBox title="Loading..." description="Fetching listing..." />
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <SectionHeader title="Admin Rentals Preview" subtitle="" />
        <MessageBox title="Could not load" description={error} />
        <div style={{ marginTop: 12 }}>
          <Link href="/admin/rentals" style={{ fontWeight: 800 }}>
            ← Back to Admin Rentals
          </Link>
        </div>
      </Container>
    );
  }

  if (!row) {
    return (
      <Container>
        <SectionHeader title="Admin Rentals Preview" subtitle="" />
        <MessageBox title="Not found" description="No listing found for this id." />
        <div style={{ marginTop: 12 }}>
          <Link href="/admin/rentals" style={{ fontWeight: 800 }}>
            ← Back to Admin Rentals
          </Link>
        </div>
      </Container>
    );
  }

  const isApproved = row.status === "approved";

  return (
    <Container>
      <SectionHeader title="Admin Rentals Preview" subtitle="Review & update status" />

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
        <Link href="/admin/rentals" style={{ fontWeight: 800 }}>
          ← Back
        </Link>

        {isApproved ? (
          <Link href={`/rentals/${row.id}`} style={{ fontWeight: 800 }}>
            Open Public Page →
          </Link>
        ) : null}
      </div>

      <Card>
        <CardBody>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 10 }}>
            <Badge>{row.status}</Badge>
            <Badge>Updated: {fmt(row.updated_at)}</Badge>
            <Badge>Published: {fmt(row.published_at ?? null)}</Badge>
          </div>

          <div style={{ fontWeight: 900, marginBottom: 6 }}>{row.title}</div>

          <div style={{ opacity: 0.85 }}>
            {row.city ? row.city : "—"}
            {row.state ? `, ${row.state}` : ""}
            {" • "}
            Rate: {fmtRate(row.rate, row.pricing_unit)}
          </div>

          <div style={{ marginTop: 10, opacity: 0.7, fontSize: 13 }}>
            <div>ID: {row.id}</div>
            <div>Owner ID: {row.owner_id}</div>
            <div>Created: {fmt(row.created_at)}</div>
            <div>Category ID: {row.category_id}</div>
            <div>Subcategory ID: {row.subcategory_id}</div>
            <div>Equipment ID: {row.equipment_id ?? "—"}</div>
            {row.other_category_text ? <div>Other Category: {row.other_category_text}</div> : null}
            {row.other_subcategory_text ? <div>Other Subcategory: {row.other_subcategory_text}</div> : null}
            {row.other_equipment_text ? <div>Other Equipment: {row.other_equipment_text}</div> : null}
          </div>
        </CardBody>

        <CardFooter>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <ActionButton variant="secondary" onClick={load}>
              Refresh
            </ActionButton>

            <ActionButton variant="primary" onClick={() => setStatus("approved")}>
              Approve
            </ActionButton>

            <ActionButton variant="secondary" onClick={() => setStatus("rejected")}>
              Reject
            </ActionButton>

            <ActionButton variant="secondary" onClick={() => setStatus("pending")}>
              Send to Pending
            </ActionButton>
          </div>
        </CardFooter>
      </Card>
    </Container>
  );
}
