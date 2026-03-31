// app/admin/property/[id]/page.tsx
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
  slug: string;
  status: "draft" | "pending" | "approved" | "rejected";
  created_at: string;
  updated_at: string;
  published_at?: string | null;
  price: number | null;
  city: string | null;
  state: string | null;

  admin_note?: string | null;
  rejected_reason?: string | null;
  decision_at?: string | null;
  approved_by?: string | null;
  rejected_by?: string | null;
};

function MessageBox(props: { title: string; description?: string }) {
  return (
    <div style={{ border: "1px solid rgba(0,0,0,0.08)", borderRadius: 12, padding: 16 }}>
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

function isUuid(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

export default function AdminPropertyDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const id = String(params?.id ?? "");
  const validId = !!id && isUuid(id);

  const supabase = useMemo(() => getSupabaseBrowser(), []);

  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const [loading, setLoading] = useState(true);
  const [row, setRow] = useState<Row | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [actionNote, setActionNote] = useState<string | null>(null);
  const [acting, setActing] = useState(false);

  // Auto-hide success note after a few seconds (optional but nice)
  useEffect(() => {
    if (!actionNote) return;
    const t = window.setTimeout(() => setActionNote(null), 3500);
    return () => window.clearTimeout(t);
  }, [actionNote]);

  useEffect(() => {
    let alive = true;

    async function guard() {
      // If invalid id, do NOT run auth checks; just stop checking and show invalid screen.
      if (!validId) {
        if (!alive) return;
        setChecking(false);
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;

      if (!user) {
        router.replace(`/login?next=${encodeURIComponent(`/admin/property/${id}`)}`);
        return;
      }

      const { data: isAdminBool } = await supabase.rpc("is_current_user_property_admin");
      if (!alive) return;

      setIsAdmin(!!isAdminBool);
      setChecking(false);
    }

    guard();
    return () => {
      alive = false;
    };
  }, [router, supabase, id, validId]);

  async function load() {
    if (!validId) return;

    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from("property_listings")
      .select(
        "id,owner_id,title,slug,status,created_at,updated_at,published_at,price,city,state,admin_note,rejected_reason,decision_at,approved_by,rejected_by"
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
    if (!validId) return;
    if (!checking && isAdmin) load();
    if (!checking && !isAdmin) setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checking, isAdmin, validId]);

  async function setStatus(status: "approved" | "rejected" | "pending") {
    if (!row) return;

    setError(null);
    setActing(true);

    try {
      const { data: sess } = await supabase.auth.getSession();
      const adminId = sess.session?.user?.id ?? null;

      const patch: any = { status };

      if (status === "approved") {
        const note = window.prompt("Admin note (optional):", row.admin_note ?? "") ?? "";
        patch.admin_note = note.trim() || null;
        patch.rejected_reason = null;
        patch.decision_at = new Date().toISOString();
        patch.approved_by = adminId;
        patch.rejected_by = null;
        patch.published_at = new Date().toISOString();
      }

      if (status === "rejected") {
        const reason = window.prompt("Rejected reason (required):", row.rejected_reason ?? "") ?? "";
        if (!reason.trim()) {
          setError("Rejected reason is required.");
          return;
        }
        const note = window.prompt("Admin note (optional):", row.admin_note ?? "") ?? "";
        patch.rejected_reason = reason.trim();
        patch.admin_note = note.trim() || null;
        patch.decision_at = new Date().toISOString();
        patch.rejected_by = adminId;
        patch.approved_by = null;
        patch.published_at = null;
      }

      if (status === "pending") {
        patch.published_at = null;
        patch.admin_note = null;
        patch.rejected_reason = null;
        patch.decision_at = null;
        patch.approved_by = null;
        patch.rejected_by = null;
      }

      const { error } = await supabase.from("property_listings").update(patch).eq("id", row.id);
      if (error) {
        setError(error.message);
        return;
      }

      await load();

      if (status === "approved") setActionNote("✅ Listing approved & published successfully.");
      if (status === "rejected") setActionNote("✅ Listing rejected successfully.");
      if (status === "pending") setActionNote("✅ Listing sent back to pending.");
    } finally {
      setActing(false);
    }
  }

  // ✅ Invalid id screen (safe: hooks already ran)
  if (!validId) {
    return (
      <Container>
        <SectionHeader title="Admin Property Preview" subtitle="" />
        <MessageBox title="Invalid id" description="This URL must contain a valid property listing UUID." />
        <div style={{ marginTop: 12 }}>
          <Link href="/admin/property" style={{ fontWeight: 800 }}>
            ← Back to Admin Property
          </Link>
        </div>
      </Container>
    );
  }

  if (checking) {
    return (
      <Container>
        <SectionHeader title="Admin Property Preview" subtitle="Checking access..." />
        <MessageBox title="Please wait" description="Verifying your admin access..." />
      </Container>
    );
  }

  if (!isAdmin) {
    return (
      <Container>
        <SectionHeader title="Admin Property Preview" subtitle="" />
        <MessageBox title="Access denied" description="You are not a property admin." />
      </Container>
    );
  }

  if (loading) {
    return (
      <Container>
        <SectionHeader title="Admin Property Preview" subtitle="Loading..." />
        <MessageBox title="Loading..." description="Fetching listing..." />
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <SectionHeader title="Admin Property Preview" subtitle="" />
        <MessageBox title="Could not load" description={error} />
        <div style={{ marginTop: 12 }}>
          <Link href="/admin/property" style={{ fontWeight: 800 }}>
            ← Back to Admin Property
          </Link>
        </div>
      </Container>
    );
  }

  if (!row) {
    return (
      <Container>
        <SectionHeader title="Admin Property Preview" subtitle="" />
        <MessageBox title="Not found" description="No listing found for this id." />
        <div style={{ marginTop: 12 }}>
          <Link href="/admin/property" style={{ fontWeight: 800 }}>
            ← Back to Admin Property
          </Link>
        </div>
      </Container>
    );
  }

  const isApproved = row.status === "approved";
  const publicHref = row.slug ? `/property/${row.slug}` : `/property/${row.id}`;

  return (
    <Container>
      <SectionHeader title="Admin Property Preview" subtitle="Review & update status" />

      {/* ✅ Success / status note */}
      {actionNote ? (
        <div
          style={{
            marginBottom: 12,
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid rgba(0,0,0,0.08)",
            background: "rgba(0,120,255,0.08)",
            fontWeight: 800,
          }}
        >
          {actionNote}
        </div>
      ) : null}

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
        <Link href="/admin/property" style={{ fontWeight: 800 }}>
          ← Back
        </Link>

        {isApproved ? (
          <Link href={publicHref} style={{ fontWeight: 800 }}>
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
            <Badge>Decision: {fmt(row.decision_at ?? null)}</Badge>
          </div>

          <div style={{ fontWeight: 900, marginBottom: 6 }}>{row.title}</div>

          <div style={{ opacity: 0.85 }}>
            {row.city ? row.city : "—"}
            {row.state ? `, ${row.state}` : ""}
            {row.price != null ? ` • ₹${row.price}` : ""}
          </div>

          <div style={{ marginTop: 10, opacity: 0.75, fontSize: 13, lineHeight: 1.5 }}>
            <div>
              <b>ID:</b> {row.id}
            </div>
            <div>
              <b>Owner ID:</b> {row.owner_id}
            </div>
            <div>
              <b>Slug:</b> {row.slug || "—"}
            </div>
            <div>
              <b>Created:</b> {fmt(row.created_at)}
            </div>
            <div>
              <b>Admin note:</b> {row.admin_note || "—"}
            </div>
            <div>
              <b>Rejected reason:</b> {row.rejected_reason || "—"}
            </div>
            <div>
              <b>Approved by:</b> {row.approved_by || "—"}
            </div>
            <div>
              <b>Rejected by:</b> {row.rejected_by || "—"}
            </div>
          </div>
        </CardBody>

        <CardFooter>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <ActionButton
              variant="secondary"
              onClick={async () => {
                setActing(true);
                try {
                  await load();
                  setActionNote("✅ Listing refreshed successfully.");
                } finally {
                  setActing(false);
                }
              }}
              disabled={acting}
            >
              {acting ? "Refreshing..." : "Refresh"}
            </ActionButton>

            <ActionButton variant="primary" onClick={() => setStatus("approved")} disabled={acting}>
              {acting ? "Working..." : "Approve"}
            </ActionButton>

            <ActionButton variant="secondary" onClick={() => setStatus("rejected")} disabled={acting}>
              {acting ? "Working..." : "Reject"}
            </ActionButton>

            <ActionButton variant="secondary" onClick={() => setStatus("pending")} disabled={acting}>
              {acting ? "Working..." : "Send to Pending"}
            </ActionButton>
          </div>
        </CardFooter>
      </Card>
    </Container>
  );
}
