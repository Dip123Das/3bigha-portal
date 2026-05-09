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

type BuyerRfqMini = {
  id: string;
  title?: string | null;
  module?: string | null;
  status?: string | null;
  created_at?: string | null;
  needed_by?: string | null;
};

type BuyerProcurementStats = {
  totalRfqs: number;
  activeRfqs: number;
  closedRfqs: number;
  urgentRfqs: number;
  memoryCount: number;
  recentRfqs: BuyerRfqMini[];
};

type BuyerAiInsight = {
  title: string;
  detail: string;
  tone: "ok" | "warn" | "neutral";
  href: string;
  cta: string;
};

export default function BuyerDashboardPage() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowser(), []);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  const [procurementStats, setProcurementStats] = useState<BuyerProcurementStats>({
    totalRfqs: 0,
    activeRfqs: 0,
    closedRfqs: 0,
    urgentRfqs: 0,
    memoryCount: 0,
    recentRfqs: [],
  });

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

    try {
      const { data: rfqs } = await supabase
        .from("rfqs")
        .select("id,title,module,status,created_at,needed_by")
        .order("created_at", { ascending: false })
        .limit(20);

      const rows = Array.isArray(rfqs) ? (rfqs as BuyerRfqMini[]) : [];

      let memoryCount = 0;
      try {
        const raw = localStorage.getItem("rfq_procurement_conversation_memory_v1");
        const parsed = raw ? JSON.parse(raw) : [];
        memoryCount = Array.isArray(parsed) ? parsed.length : 0;
      } catch {
        memoryCount = 0;
      }

      const today = new Date();

      const urgentRfqs = rows.filter((x) => {
        if (!x.needed_by) return false;
        const d = new Date(x.needed_by);
        const days = Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return days <= 7;
      }).length;

      const closedRfqs = rows.filter((x) => String(x.status || "").toLowerCase() === "closed").length;

      setProcurementStats({
        totalRfqs: rows.length,
        activeRfqs: rows.filter((x) => String(x.status || "").toLowerCase() !== "closed").length,
        closedRfqs,
        urgentRfqs,
        memoryCount,
        recentRfqs: rows.slice(0, 5),
      });
    } catch {
      // Dashboard intelligence should never block dashboard loading.
    }

    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

    const procurementHealthScore = Math.max(
    1,
    Math.min(
      100,
      Math.round(
        procurementStats.totalRfqs * 12 +
          procurementStats.activeRfqs * 10 +
          procurementStats.closedRfqs * 16 +
          procurementStats.memoryCount * 8 -
          procurementStats.urgentRfqs * 6
      )
    )
  );

  const procurementHealthTone =
    procurementHealthScore >= 75 ? "ok" : procurementHealthScore >= 45 ? "warn" : "neutral";

  const rfqSuccessPrediction =
    procurementHealthScore >= 75
      ? "High"
      : procurementHealthScore >= 45
        ? "Medium"
        : "Needs RFQ activity";

  const buyerAiInsights: BuyerAiInsight[] = [
    {
      title: "Create next procurement RFQ",
      detail:
        procurementStats.totalRfqs === 0
          ? "You have no RFQs yet. Start with the AI Procurement Copilot to get matched vendors faster."
          : "Use the upgraded RFQ workspace for structured procurement, vendor discovery and AI readiness scoring.",
      tone: procurementStats.totalRfqs === 0 ? "warn" : "ok",
      href: "/rfq/general/new",
      cta: "Open AI RFQ Workspace",
    },
    {
      title: "Review active procurement decisions",
      detail:
        procurementStats.activeRfqs > 0
          ? `${procurementStats.activeRfqs} active RFQ(s) may need comparison, negotiation or follow-up.`
          : "No active RFQ pressure detected right now.",
      tone: procurementStats.activeRfqs > 0 ? "warn" : "ok",
      href: "/dashboard/buyer/rfqs",
      cta: "Open RFQs",
    },
    {
      title: "Check vendor conversations",
      detail:
        "Continue vendor negotiation from unified chat and use AI deal intelligence before closing.",
      tone: "neutral",
      href: "/dashboard/inbox",
      cta: "Open Inbox",
    },
    {
      title: "Reuse procurement memory",
      detail:
        procurementStats.memoryCount > 0
          ? `${procurementStats.memoryCount} procurement memory item(s) found from previous RFQ drafting.`
          : "Procurement memory will grow as you save RFQ drafts and repeat requirements.",
      tone: procurementStats.memoryCount > 0 ? "ok" : "neutral",
      href: "/rfq/general/new",
      cta: "Reuse Memory",
    },
  ];

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

                <div
          style={{
            border: "1px solid rgba(37,99,235,0.25)",
            background: "linear-gradient(135deg, rgba(37,99,235,0.08), #ffffff)",
            borderRadius: 18,
            padding: 16,
            marginBottom: 16,
            boxShadow: "0 14px 30px rgba(37,99,235,0.08)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 1000, color: "#1e3a8a" }}>
                🧠 AI Procurement Dashboard Intelligence
              </div>
              <div style={{ marginTop: 4, color: "#475569", fontSize: 14, fontWeight: 800 }}>
                AI summary of your RFQs, vendor conversations, procurement memory and next best actions.
              </div>
            </div>

            <div
              style={{
                background:
                  procurementHealthTone === "ok"
                    ? "#dcfce7"
                    : procurementHealthTone === "warn"
                      ? "#fef3c7"
                      : "#f8fafc",
                color:
                  procurementHealthTone === "ok"
                    ? "#166534"
                    : procurementHealthTone === "warn"
                      ? "#92400e"
                      : "#334155",
                borderRadius: 999,
                padding: "9px 14px",
                fontWeight: 1000,
                alignSelf: "center",
                border: "1px solid rgba(15,23,42,0.08)",
              }}
            >
              Procurement Health {procurementHealthScore}/100
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 10, marginTop: 14 }}>
            {[
              ["Total RFQs", procurementStats.totalRfqs, "📄"],
              ["Active RFQs", procurementStats.activeRfqs, "⚡"],
              ["Closed RFQs", procurementStats.closedRfqs, "✅"],
              ["Urgent", procurementStats.urgentRfqs, "⏱️"],
              ["Memory", procurementStats.memoryCount, "🧠"],
            ].map(([label, value, icon]) => (
              <div
                key={label}
                style={{
                  border: "1px solid #e2e8f0",
                  background: "#ffffff",
                  borderRadius: 14,
                  padding: 12,
                }}
              >
                <div style={{ fontSize: 12, color: "#64748b", fontWeight: 900 }}>
                  {icon} {label}
                </div>
                <div style={{ marginTop: 5, color: "#0f172a", fontWeight: 1000, fontSize: 22 }}>
                  {value}
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 }}>
            <div style={{ border: "1px solid #bbf7d0", background: "#f0fdf4", borderRadius: 12, padding: 10 }}>
              <div style={{ color: "#166534", fontWeight: 1000, marginBottom: 4 }}>
                RFQ Success Prediction
              </div>
              <div style={{ color: "#14532d", fontSize: 13, fontWeight: 800 }}>
                {rfqSuccessPrediction}. Improve by using structured RFQ, vendor comparison, and negotiation chat.
              </div>
            </div>

            <div style={{ border: "1px solid #bfdbfe", background: "#eff6ff", borderRadius: 12, padding: 10 }}>
              <div style={{ color: "#1e3a8a", fontWeight: 1000, marginBottom: 4 }}>
                AI Procurement Focus
              </div>
              <div style={{ color: "#1e40af", fontSize: 13, fontWeight: 800 }}>
                {procurementStats.activeRfqs > 0
                  ? "Compare active RFQs, follow up with vendors, and close the best-value quote."
                  : "Create a new AI RFQ or continue marketplace discovery."}
              </div>
            </div>
          </div>

          <div style={{ marginTop: 14 }}>
            <div style={{ fontWeight: 1000, color: "#0f172a", marginBottom: 8 }}>
              🎯 AI Next Best Actions
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
              {buyerAiInsights.map((x) => (
                <div
                  key={x.title}
                  style={{
                    border: "1px solid rgba(15,23,42,0.10)",
                    background:
                      x.tone === "ok"
                        ? "#f0fdf4"
                        : x.tone === "warn"
                          ? "#fffbeb"
                          : "#ffffff",
                    borderRadius: 14,
                    padding: 12,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                    <div style={{ maxWidth: 680 }}>
                      <div style={{ color: "#0f172a", fontWeight: 1000 }}>{x.title}</div>
                      <div style={{ marginTop: 5, color: "#475569", fontSize: 13, fontWeight: 800, lineHeight: 1.5 }}>
                        {x.detail}
                      </div>
                    </div>

                    <ActionButton href={x.href} variant={x.tone === "warn" ? "primary" : "secondary"}>
                      {x.cta} →
                    </ActionButton>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {procurementStats.recentRfqs.length > 0 ? (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontWeight: 1000, color: "#0f172a", marginBottom: 8 }}>
                🕒 Recent Procurement Activity
              </div>

              <div style={{ display: "grid", gap: 8 }}>
                {procurementStats.recentRfqs.map((r) => (
                  <div
                    key={r.id}
                    style={{
                      border: "1px solid rgba(15,23,42,0.08)",
                      background: "#ffffff",
                      borderRadius: 12,
                      padding: 10,
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 10,
                      flexWrap: "wrap",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 900, color: "#0f172a" }}>
                        {r.title || "Untitled RFQ"}
                      </div>
                      <div style={{ marginTop: 3, color: "#64748b", fontSize: 12, fontWeight: 800 }}>
                        {(r.module || "general").toUpperCase()} • Status: {r.status || "open"}
                        {r.needed_by ? ` • Needed by: ${r.needed_by}` : ""}
                      </div>
                    </div>

                    <ActionButton href={`/dashboard/buyer/quote-compare/${encodeURIComponent(r.id)}`} variant="secondary">
                      Compare →
                    </ActionButton>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <ActionButton href="/rfq/general/new" variant="primary">
              + New AI Procurement RFQ
            </ActionButton>
            <ActionButton href="/dashboard/buyer/rfqs" variant="secondary">
              View RFQs
            </ActionButton>
            <ActionButton href="/dashboard/inbox" variant="secondary">
              Vendor Inbox
            </ActionButton>
          </div>
        </div>

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
          Buyer dashboard now connects procurement creation, RFQ comparison, vendor chat, inbox, marketplace discovery and AI procurement intelligence.
        </div>
      </Container>
    </main>
  );
}