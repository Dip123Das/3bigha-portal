"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

type RfqRow = {
  id: string;
  title: string;
  city: string | null;
  locality: string | null;
  needed_by: string | null;
  status: string;
  created_at: string;
};

export default function VendorRfqsPage() {
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>("");
  const [rows, setRows] = useState<RfqRow[]>([]);

  useEffect(() => {
    let alive = true;

    (async () => {
      setErr("");
      setLoading(true);

      // Optional: if you want to force vendor login:
      const sess = await supabase.auth.getSession();
      if (!sess.data.session) {
        setErr("Please login as a vendor to view RFQs.");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("rfqs")
        .select("id,title,city,locality,needed_by,status,created_at")
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(100);

      if (!alive) return;

      if (error) {
        setErr(error.message);
        setRows([]);
      } else {
        setRows((data || []) as any);
      }
      setLoading(false);
    })();

    return () => {
      alive = false;
    };
  }, [supabase]);

  return (
    <div className="container pageBody" style={{ paddingTop: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
        <h1 style={{ fontSize: 22, marginBottom: 6 }}>Vendor RFQs</h1>
        <Link className="topBtn topBtnGhost" href="/rfq/new">
          Test: Submit RFQ →
        </Link>
      </div>

      <div style={{ opacity: 0.8, marginBottom: 16 }}>
        New requirements submitted by buyers. Open an RFQ and submit your quotation.
      </div>

      {err ? (
        <div style={{ background: "#ffecec", border: "1px solid #ffb3b3", padding: 12, borderRadius: 8, marginBottom: 12 }}>
          {err}
        </div>
      ) : null}

      {loading ? <div>Loading...</div> : null}

      {!loading && rows.length === 0 ? (
        <div style={{ opacity: 0.8 }}>No open RFQs yet.</div>
      ) : null}

      <div style={{ display: "grid", gap: 10 }}>
        {rows.map((r) => (
          <Link
            key={r.id}
            href={`/dashboard/vendor/rfqs/${r.id}`}
            style={{
              textDecoration: "none",
              border: "1px solid rgba(0,0,0,0.12)",
              borderRadius: 12,
              padding: 12,
              color: "inherit",
            }}
          >
            <div style={{ fontWeight: 700 }}>{r.title}</div>
            <div style={{ opacity: 0.8, marginTop: 4 }}>
              {(r.locality || r.city) ? (
                <span>📍 {[(r.locality || "").trim(), (r.city || "").trim()].filter(Boolean).join(", ")}</span>
              ) : (
                <span>📍 Location not specified</span>
              )}
              {"  "}•{"  "}
              <span>🗓️ Needed by: {r.needed_by || "Not specified"}</span>
              {"  "}•{"  "}
              <span>🕒 {new Date(r.created_at).toLocaleString()}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}