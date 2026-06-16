// app/dashboard/vendor/rfqs/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

import { Container } from "@/components/layout/Container";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ActionButton } from "@/components/ui/ActionButton";
import VendorWorkMenu from "@/components/vendor-erp/VendorWorkMenu";

type InboxRow = {
  rfq_id: string;
  rfq_no?: string | null;
  module?: string | null;
  rfq_status?: string | null;

  buyer_name?: string | null;
  city?: string | null;
  district?: string | null;
  locality_name?: string | null;
  pincode?: string | null;

  items_count?: number | null;
  quotes_count?: number | null;
  latest_quote_version?: number | null;
  latest_quote_status?: string | null;
  latest_quote_grand_total?: number | null;

  // optional fields if your view has them
  target_status?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
};

function safeText(x: any) {
  return String(x ?? "").trim();
}

export default function VendorRFQInboxPage() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowser(), []);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [rows, setRows] = useState<InboxRow[]>([]);
  const [needsLogin, setNeedsLogin] = useState(false);

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);
      setErr(null);
      setNeedsLogin(false);

      const { data: s, error: sErr } = await supabase.auth.getSession();
      if (sErr) {
        if (!alive) return;
        setErr(sErr.message);
        setRows([]);
        setLoading(false);
        return;
      }

      const session = s.session;
      if (!session) {
        if (!alive) return;
        setNeedsLogin(true);
        setErr("Not logged in. Please login as vendor.");
        setRows([]);
        setLoading(false);
        return;
      }

      // ✅ Direct query to view (RLS-scoped to vendor_user_id)
      const { data, error } = await supabase
        .from("vendor_inbox_v2")
        .select("*")
        .eq("module", "materials")
        .eq("rfq_status", "open")
        .order("created_at", { ascending: false })
        .limit(100);

      if (!alive) return;

      if (error) {
        setErr(error.message || "Failed to load RFQs.");
        setRows([]);
        setLoading(false);
        return;
      }

      setRows((Array.isArray(data) ? (data as InboxRow[]) : []) ?? []);
      setLoading(false);
    })();

    return () => {
      alive = false;
    };
  }, [supabase]);

  const loginHref = `/login?next=${encodeURIComponent("/dashboard/vendor/rfqs")}`;

  return (
    <Container>
      <SectionHeader title="Buyer Requirements" subtitle="Review buyer requirements, respond quickly and continue buyer conversation." />

      <VendorWorkMenu />

      <div style={{ marginBottom: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Link href="/vendor/inbox-v2" className="topBtn topBtnGhost" style={{ textDecoration: "none" }}>
          ← Back to Vendor Inbox
        </Link>

        {needsLogin ? (
          <>
            <ActionButton href={loginHref} variant="primary">
              Login →
            </ActionButton>
            <ActionButton href="/vendor" variant="secondary">
              Vendor Dashboard
            </ActionButton>
          </>
        ) : null}

        {!needsLogin ? (
          <button
            type="button"
            onClick={() => router.refresh()}
            style={{
              height: 40,
              padding: "0 14px",
              borderRadius: 12,
              border: "1px solid rgba(0,0,0,0.12)",
              background: "white",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            Refresh
          </button>
        ) : null}
      </div>

      {loading ? (
        <EmptyState message="Loading RFQs…" />
      ) : err ? (
        <EmptyState message={err} />
      ) : rows.length === 0 ? (
        <EmptyState message="No open RFQs right now." />
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {rows.map((r) => {
            const loc = [r.locality_name, r.city, r.district, r.pincode].map(safeText).filter(Boolean).join(", ");
            const who = safeText(r.buyer_name) || "Customer";
            const rfqLabel = r.rfq_no ?? r.rfq_id.slice(0, 8);

            const quoteText =
              r.latest_quote_version != null
                ? `v${r.latest_quote_version}${r.latest_quote_status ? ` • ${r.latest_quote_status}` : ""}`
                : "Not quoted";

            return (
              <Card key={r.rfq_id}>
                <CardBody>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontWeight: 950, fontSize: 15, lineHeight: 1.35 }}>
                        {who} {loc ? <span style={{ opacity: 0.7 }}>• {loc}</span> : null}
                      </div>

                      <div style={{ opacity: 0.78, fontSize: 12.5, marginTop: 6, lineHeight: 1.6 }}>
                        RFQ:{" "}
                        <strong style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}>
                          {rfqLabel}
                        </strong>
                        {"  "}• Items: <strong>{r.items_count ?? 0}</strong>
                        {"  "}• Quote: <strong>{quoteText}</strong>

                        <span className="trustInline">
                          ⚡ Active Buyer
                        </span>
                        {r.latest_quote_grand_total != null ? (
                          <>
                            {"  "}• Total: <strong>₹{Number(r.latest_quote_grand_total).toLocaleString("en-IN")}</strong>
                          </>
                        ) : null}
                      </div>

                      <details style={{ marginTop: 6 }}>
                        <summary style={{ cursor: "pointer", opacity: 0.7, fontSize: 12, fontWeight: 800 }}>
                          RFQ details
                        </summary>
                        <div style={{ opacity: 0.7, fontSize: 12, marginTop: 6, wordBreak: "break-all" }}>
                          RFQ ID:{" "}
                          <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}>
                            {r.rfq_id}
                          </span>
                        </div>
                      </details>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <div style={{ fontWeight: 900, opacity: 0.75, fontSize: 12, textTransform: "uppercase" }}>{r.rfq_status ?? "open"}</div>

                      <Link
                        href={`/vendor/inbox-v2/${r.rfq_id}`}
                        className="topBtn topBtnGhost"
                        style={{ textDecoration: "none" }}
                      >
                        Open →
                      </Link>
                    </div>
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}
    </Container>
  );
}