// app/dashboard/buyer/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

import { Container } from "@/components/layout/Container";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { Card, CardBody, CardFooter } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ActionButton } from "@/components/ui/ActionButton";
import { Grid } from "@/components/ui/Grid";
import { EmptyState } from "@/components/ui/EmptyState";

function Pill({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "warn" | "ok";
}) {
  const base =
    "inline-flex items-center rounded-full px-3 py-1 text-xs font-extrabold border";
  const cls =
    tone === "warn"
      ? `${base} border-amber-200 bg-amber-50 text-amber-900`
      : tone === "ok"
      ? `${base} border-emerald-200 bg-emerald-50 text-emerald-900`
      : `${base} border-neutral-200 bg-neutral-50 text-neutral-800`;

  return <span className={cls}>{children}</span>;
}

export default function BuyerDashboardPage() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowser(), []);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);

    const { data: s, error: sErr } = await supabase.auth.getSession();
    if (sErr) {
      setErr(sErr.message);
      setLoading(false);
      return;
    }

    const session = s.session;
    if (!session) {
      router.replace("/login?next=/dashboard/buyer");
      return;
    }

    setEmail(session.user.email ?? null);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <main>
        <Container>
          <SectionHeader title="Buyer Dashboard" subtitle="Loading..." />
          <div style={{ opacity: 0.8 }}>Preparing your buyer workspace…</div>
        </Container>
      </main>
    );
  }

  if (err) {
    return (
      <main>
        <Container>
          <SectionHeader title="Buyer Dashboard" subtitle="" />
          <EmptyState message="Something went wrong while loading your buyer dashboard." />
          <div style={{ marginTop: 12, color: "crimson", fontWeight: 800 }}>{err}</div>

          <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <ActionButton href="/dashboard" variant="secondary">
              ← All Dashboards
            </ActionButton>
            <button
              type="button"
              onClick={() => load()}
              style={{
                height: 40,
                padding: "0 14px",
                borderRadius: 12,
                border: "1px solid rgba(0,0,0,0.12)",
                background: "white",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              Retry
            </button>
          </div>
        </Container>
      </main>
    );
  }

  return (
    <main>
      <Container>
        <SectionHeader
          title="Buyer Dashboard"
          subtitle="Browse, enquire, compare quotes, and continue your conversations with vendors."
        />

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
          <ActionButton href="/dashboard" variant="secondary">
            ← All Dashboards
          </ActionButton>

          <ActionButton href="/" variant="secondary">
            Public Home
          </ActionButton>

          <button
            type="button"
            onClick={() => load()}
            style={{
              height: 40,
              padding: "0 14px",
              borderRadius: 12,
              border: "1px solid rgba(0,0,0,0.12)",
              background: "white",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            Refresh
          </button>

          <div
            style={{
              marginLeft: "auto",
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <Badge>{email ?? "—"}</Badge>
            <Pill>buyer</Pill>
          </div>
        </div>

        <Grid min={280} gap={12}>
          <Card>
            <CardBody>
              <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 6 }}>Buyer Inbox</div>
              <div style={{ color: "#5b6472", fontSize: 13, lineHeight: 1.5 }}>
                Open your direct listing conversations from Property, Materials, Services and Rentals.
              </div>

              <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Pill>listing chat</Pill>
                <Pill>buyer</Pill>
                <Pill>direct</Pill>
              </div>
            </CardBody>
            <CardFooter>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", width: "100%" }}>
                <ActionButton href="/dashboard/buyer/inbox" variant="primary">
                  Open Buyer Inbox →
                </ActionButton>
                <Link href="/dashboard/buyer/inbox" style={{ fontWeight: 800, alignSelf: "center" }}>
                  /dashboard/buyer/inbox
                </Link>
              </div>
            </CardFooter>
          </Card>

          <Card>
            <CardBody>
              <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 6 }}>Unified Inbox</div>
              <div style={{ color: "#5b6472", fontSize: 13, lineHeight: 1.5 }}>
                Open buyer and vendor side inbox access from one common place.
              </div>

              <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Pill>buyer</Pill>
                <Pill>vendor</Pill>
                <Pill>unified</Pill>
              </div>
            </CardBody>
            <CardFooter>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", width: "100%" }}>
                <ActionButton href="/dashboard/inbox" variant="primary">
                  Open Unified Inbox →
                </ActionButton>
                <Link href="/dashboard/inbox" style={{ fontWeight: 800, alignSelf: "center" }}>
                  /dashboard/inbox
                </Link>
              </div>
            </CardFooter>
          </Card>

          <Card>
            <CardBody>
              <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 6 }}>Legacy Enquiries</div>
              <div style={{ color: "#5b6472", fontSize: 13, lineHeight: 1.5 }}>
                View your older enquiry threads and continue follow-ups where needed.
              </div>

              <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Pill>legacy</Pill>
                <Pill>thread</Pill>
                <Pill>follow-up</Pill>
              </div>
            </CardBody>
            <CardFooter>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", width: "100%" }}>
                <ActionButton href="/dashboard/buyer/enquiries" variant="secondary">
                  Open Legacy Enquiries →
                </ActionButton>
                <Link href="/dashboard/buyer/enquiries" style={{ fontWeight: 800, alignSelf: "center" }}>
                  /dashboard/buyer/enquiries
                </Link>
              </div>
            </CardFooter>
          </Card>

          <Card>
            <CardBody>
              <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 6 }}>My RFQs / Compare Quotes</div>
              <div style={{ color: "#5b6472", fontSize: 13, lineHeight: 1.5 }}>
                Track vendor responses, compare quotations, and continue RFQ decisions.
              </div>

              <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Pill>rfq</Pill>
                <Pill>quotes</Pill>
                <Pill>compare</Pill>
              </div>
            </CardBody>
            <CardFooter>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", width: "100%" }}>
                <ActionButton href="/dashboard/buyer/rfqs" variant="primary">
                  Open RFQs →
                </ActionButton>
                <Link href="/dashboard/buyer/rfqs" style={{ fontWeight: 800, alignSelf: "center" }}>
                  /dashboard/buyer/rfqs
                </Link>
              </div>
            </CardFooter>
          </Card>

          <Card>
            <CardBody>
              <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 6 }}>Browse Marketplace</div>
              <div style={{ color: "#5b6472", fontSize: 13, lineHeight: 1.5 }}>
                Explore listings across Property, Materials, Services and Rentals.
              </div>

              <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Pill>property</Pill>
                <Pill>materials</Pill>
                <Pill>services</Pill>
                <Pill>rentals</Pill>
              </div>
            </CardBody>
            <CardFooter>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", width: "100%" }}>
                <ActionButton href="/property" variant="primary">
                  Browse Property →
                </ActionButton>
                <ActionButton href="/materials" variant="secondary">
                  Materials
                </ActionButton>
                <Link href="/services" style={{ fontWeight: 800, alignSelf: "center" }}>
                  Services
                </Link>
                <Link href="/rentals" style={{ fontWeight: 800, alignSelf: "center" }}>
                  Rentals
                </Link>
              </div>
            </CardFooter>
          </Card>

          <Card>
            <CardBody>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                <div>
                  <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 6 }}>Saved / Shortlist</div>
                  <div style={{ color: "#5b6472", fontSize: 13, lineHeight: 1.5 }}>
                    Save properties/materials/services/rentals to compare later.
                  </div>
                </div>
                <Pill tone="warn">Coming soon</Pill>
              </div>

              <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Pill>compare</Pill>
                <Pill>alerts</Pill>
                <Pill>notes</Pill>
              </div>

              <div style={{ marginTop: 10, color: "#5b6472", fontSize: 13, lineHeight: 1.5 }}>
                This feature will need a small table later, but it is not required for listing chat.
              </div>
            </CardBody>
            <CardFooter>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", width: "100%" }}>
                <ActionButton href="/property" variant="secondary">
                  Start browsing →
                </ActionButton>
              </div>
            </CardFooter>
          </Card>

          <Card>
            <CardBody>
              <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 6 }}>Blog / News</div>
              <div style={{ color: "#5b6472", fontSize: 13, lineHeight: 1.5 }}>
                Read blog posts and updates from across the platform.
              </div>

              <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Pill>read</Pill>
                <Pill>learn</Pill>
                <Pill>updates</Pill>
              </div>
            </CardBody>
            <CardFooter>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", width: "100%" }}>
                <ActionButton href="/blog" variant="primary">
                  Browse Blog →
                </ActionButton>
                <Link href="/blog" style={{ fontWeight: 800, alignSelf: "center" }}>
                  /blog
                </Link>
              </div>
            </CardFooter>
          </Card>
        </Grid>

        <div style={{ marginTop: 16, opacity: 0.75, fontSize: 13 }}>
          Buyer side now aligns with three paths: <b>/dashboard/buyer/inbox</b>, <b>/dashboard/inbox</b>, and{" "}
          <b>/dashboard/buyer/enquiries</b>.
        </div>
      </Container>
    </main>
  );
}