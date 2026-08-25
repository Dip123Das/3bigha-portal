"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

import { Container } from "@/components/layout/Container";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { Card, CardBody, CardFooter } from "@/components/ui/Card";
import { ActionButton } from "@/components/ui/ActionButton";
import { Grid } from "@/components/ui/Grid";
import { Badge } from "@/components/ui/Badge";

type Row = {
  id: string;
  owner_id: string;

  title: string;
  status: "draft" | "pending" | "approved" | "rejected" | string;

  created_at: string;
  updated_at: string;
  published_at: string | null;

  pricing_unit: string | null;
  rate: number | null;

  city: string | null;
  state: string | null;
};

function MessageBox(props: { title: string; description?: string }) {
  return (
    <div style={{ border: "1px solid rgba(0,0,0,0.08)", borderRadius: 12, padding: 12 }}>
      <div style={{ fontWeight: 800, marginBottom: 6 }}>{props.title}</div>
      {props.description ? <div style={{ opacity: 0.8, lineHeight: 1.5 }}>{props.description}</div> : null}
    </div>
  );
}

function fmt(iso: string) {
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

export default function AdminRentalsPage() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowser(), []);

  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<Row[]>([]);
  const [approved, setApproved] = useState<Row[]>([]);
  const [rejected, setRejected] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    async function guard() {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;

      if (!user) {
        router.replace(`/login?next=${encodeURIComponent("/admin/rentals")}`);
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
  }, [router, supabase]);

  async function load() {
    setLoading(true);
    setError(null);

    const baseSelect =
      "id,owner_id,title,status,created_at,updated_at,published_at,pricing_unit,rate,city,state";

    const { data: p1, error: e1 } = await supabase
      .from("rental_listings")
      .select(baseSelect)
      .eq("status", "pending")
      .order("updated_at", { ascending: false })
      .limit(100);

    const { data: p2, error: e2 } = await supabase
      .from("rental_listings")
      .select(baseSelect)
      .eq("status", "approved")
      .order("updated_at", { ascending: false })
      .limit(50);

    const { data: p3, error: e3 } = await supabase
      .from("rental_listings")
      .select(baseSelect)
      .eq("status", "rejected")
      .order("updated_at", { ascending: false })
      .limit(50);

    if (e1) setError(e1.message);
    if (e2) setError((prev) => prev ?? e2.message);
    if (e3) setError((prev) => prev ?? e3.message);

    setPending((p1 ?? []) as Row[]);
    setApproved((p2 ?? []) as Row[]);
    setRejected((p3 ?? []) as Row[]);
    setLoading(false);
  }

  useEffect(() => {
    if (!checking && isAdmin) load();
    if (!checking && !isAdmin) setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checking, isAdmin]);

  async function setStatus(
    id: string,
    status: "approved" | "rejected" | "pending",
  ) {
    setError(null);

    try {
      const response = await fetch(
        "/api/admin/rentals/decision",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "same-origin",
          body: JSON.stringify({
            listingId: id,
            decision: status,
          }),
        },
      );

      const result = await response
        .json()
        .catch(() => null);

      if (!response.ok || !result?.ok) {
        const trustedMessage =
          result?.trustedPublication?.message;

        throw new Error(
          trustedMessage ||
            result?.error?.message ||
            (typeof result?.error === "string"
              ? result.error
              : null) ||
            "Unable to update rental listing.",
        );
      }

      await load();
    } catch (error: any) {
      setError(
        error?.message ||
          "Unable to update rental listing.",
      );
    }
  }

  if (checking) {
    return (
      <Container>
        <SectionHeader title="Admin Rentals Review" subtitle="Checking access..." />
        <MessageBox title="Please wait" description="Verifying your admin access..." />
      </Container>
    );
  }

  if (!isAdmin) {
    return (
      <Container>
        <SectionHeader title="Admin Rentals Review" subtitle="" />
        <MessageBox title="Access denied" description="You are not a rentals admin." />
      </Container>
    );
  }

  if (loading) {
    return (
      <Container>
        <SectionHeader title="Admin Rentals Review" subtitle="Loading..." />
        <MessageBox title="Loading..." description="Fetching listings..." />
      </Container>
    );
  }

  return (
    <Container>
      <SectionHeader title="Admin Rentals Review" subtitle="Approve / Reject rental listings" />

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        <button
          type="button"
          onClick={() => load()}
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

      {error ? <div style={{ marginBottom: 12, color: "crimson", fontWeight: 700 }}>{error}</div> : null}

      <h2 style={{ fontSize: 18, fontWeight: 900, margin: "16px 0 10px" }}>Pending</h2>
      {pending.length === 0 ? (
        <MessageBox title="No pending listings" description="All clear." />
      ) : (
        <Grid>
          {pending.map((p) => (
            <Card key={p.id}>
              <CardBody>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 10 }}>
                  <Badge>pending</Badge>
                  <Badge>Updated: {fmt(p.updated_at)}</Badge>
                </div>

                <div style={{ fontWeight: 900, marginBottom: 6 }}>{p.title}</div>
                <div style={{ opacity: 0.8 }}>
                  {p.city ? p.city : "—"}
                  {p.state ? `, ${p.state}` : ""}
                  {" • "}
                  Rate: {fmtRate(p.rate, p.pricing_unit)}
                </div>
              </CardBody>

              <CardFooter>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {/* if you later add an admin preview route, keep this link.
                      For now it’s safe to keep it pointing to public detail (will only show if approved),
                      so we link to a future admin preview path. */}
                  <Link href={`/admin/rentals/${p.id}`} style={{ fontWeight: 700 }}>
                    Preview →
                  </Link>

                  <ActionButton variant="primary" onClick={() => setStatus(p.id, "approved")}>
                    Approve
                  </ActionButton>

                  <ActionButton variant="secondary" onClick={() => setStatus(p.id, "rejected")}>
                    Reject
                  </ActionButton>
                </div>
              </CardFooter>
            </Card>
          ))}
        </Grid>
      )}

      <h2 style={{ fontSize: 18, fontWeight: 900, margin: "22px 0 10px" }}>Approved (recent)</h2>
      {approved.length === 0 ? (
        <MessageBox title="No approved listings" description="None yet." />
      ) : (
        <Grid>
          {approved.map((p) => (
            <Card key={p.id}>
              <CardBody>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 10 }}>
                  <Badge>approved</Badge>
                  <Badge>Updated: {fmt(p.updated_at)}</Badge>
                  {p.published_at ? <Badge>Published: {fmt(p.published_at)}</Badge> : null}
                </div>

                <div style={{ fontWeight: 900, marginBottom: 6 }}>{p.title}</div>
                <div style={{ opacity: 0.8 }}>
                  {p.city ? p.city : "—"}
                  {p.state ? `, ${p.state}` : ""}
                  {" • "}
                  Rate: {fmtRate(p.rate, p.pricing_unit)}
                </div>
              </CardBody>

              <CardFooter>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <Link href={`/rentals/${p.id}`} style={{ fontWeight: 700 }}>
                    View →
                  </Link>

                  <Link href={`/admin/rentals/${p.id}`} style={{ fontWeight: 700 }}>
                    Admin Preview →
                  </Link>

                  <ActionButton variant="secondary" onClick={() => setStatus(p.id, "pending")}>
                    Send to Pending
                  </ActionButton>
                </div>
              </CardFooter>
            </Card>
          ))}
        </Grid>
      )}

      <h2 style={{ fontSize: 18, fontWeight: 900, margin: "22px 0 10px" }}>Rejected (recent)</h2>
      {rejected.length === 0 ? (
        <MessageBox title="No rejected listings" description="None." />
      ) : (
        <Grid>
          {rejected.map((p) => (
            <Card key={p.id}>
              <CardBody>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 10 }}>
                  <Badge>rejected</Badge>
                  <Badge>Updated: {fmt(p.updated_at)}</Badge>
                </div>

                <div style={{ fontWeight: 900, marginBottom: 6 }}>{p.title}</div>
                <div style={{ opacity: 0.8 }}>
                  {p.city ? p.city : "—"}
                  {p.state ? `, ${p.state}` : ""}
                  {" • "}
                  Rate: {fmtRate(p.rate, p.pricing_unit)}
                </div>
              </CardBody>

              <CardFooter>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <Link href={`/admin/rentals/${p.id}`} style={{ fontWeight: 700 }}>
                    Preview →
                  </Link>

                  <ActionButton variant="secondary" onClick={() => setStatus(p.id, "pending")}>
                    Send to Pending
                  </ActionButton>
                </div>
              </CardFooter>
            </Card>
          ))}
        </Grid>
      )}
    </Container>
  );
}
