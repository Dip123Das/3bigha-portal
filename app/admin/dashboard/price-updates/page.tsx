"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

type PriceUpdateRow = {
  id: string;
  category: string | null;
  item: string | null;
  brand: string | null;
  grade: string | null;
  price_min: number | null;
  price_max: number | null;
  unit: string | null;
  location: string | null;
  trend: string | null;
  offer: string | null;
  source_type: string | null;
  created_by: string | null;
  verified: boolean | null;
  created_at: string | null;
};

export default function AdminPriceUpdatesPage() {
  const supabase = getSupabaseBrowser();

  const [rows, setRows] = useState<PriceUpdateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  async function loadRows() {
    setLoading(true);
    setMsg("");

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        setMsg("Please login as master admin.");
        return;
      }

      const res = await fetch("/api/admin/price-updates", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const text = await res.text();
      const json = text ? JSON.parse(text) : {};

      if (!res.ok) {
        setMsg(json?.error || `Failed to load price updates. Status: ${res.status}`);
        return;
      }

      setRows(json.rows || []);
    } catch (e: any) {
      setMsg(e?.message || "Failed to load price updates.");
    } finally {
      setLoading(false);
    }
  }

  async function act(id: string, action: "verify" | "reject") {
    const confirmText =
      action === "verify"
        ? "Verify this price update?"
        : "Reject and delete this price update?";

    if (!window.confirm(confirmText)) return;

    setWorkingId(id);
    setMsg("");

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;

    if (!token) {
      setMsg("Please login again.");
      setWorkingId(null);
      return;
    }

    const res = await fetch("/api/admin/price-updates", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ id, action }),
    });

    const json = await res.json();

    if (!res.ok) {
      setMsg(json?.error || "Action failed.");
      setWorkingId(null);
      return;
    }

    setRows((prev) => prev.filter((row) => row.id !== id));
    setMsg(action === "verify" ? "✅ Price verified." : "✅ Price rejected.");
    setWorkingId(null);
  }

  useEffect(() => {
    loadRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="min-h-screen bg-[#f8faf7] p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-5">
          <Link href="/admin/dashboard" className="text-sm font-bold text-emerald-700">
            ← Back to Admin Dashboard
          </Link>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow">
          <h1 className="text-2xl font-black">Admin · Price Verification</h1>
          <p className="mt-2 text-sm font-semibold text-slate-600">
            Verify genuine vendor prices. Reject removes fake or doubtful submissions.
          </p>

          {msg ? <div className="mt-4 text-sm font-bold">{msg}</div> : null}

          {loading ? (
            <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-600">
              Loading pending price updates...
            </div>
          ) : rows.length === 0 ? (
            <div className="mt-6 rounded-2xl bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
              No pending price updates.
            </div>
          ) : (
            <div className="mt-6 grid gap-4">
              {rows.map((row) => (
                <div
                  key={row.id}
                  className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-black uppercase tracking-wide text-slate-400">
                        {row.category || "Category"} · {row.location || "Location"}
                      </div>

                      <h2 className="mt-1 text-xl font-black text-slate-950">
                        {row.item || "Item"}
                      </h2>

                      <div className="mt-2 text-sm font-bold text-slate-700">
                        Brand/source: {row.brand || "—"} · Grade: {row.grade || "Standard"}
                      </div>

                      <div className="mt-1 text-sm font-bold text-slate-700">
                        Source type: {row.source_type || "vendor"} · Trend: {row.trend || "Stable"}
                      </div>

                      <div className="mt-3 text-2xl font-black text-emerald-700">
                        ₹{row.price_min ?? "—"} - ₹{row.price_max ?? "—"} / {row.unit || "unit"}
                      </div>

                      {row.offer ? (
                        <div className="mt-3 rounded-2xl bg-amber-50 p-3 text-sm font-bold text-slate-700">
                          Offer: {row.offer}
                        </div>
                      ) : null}

                      <div className="mt-3 text-xs font-semibold text-slate-500">
                        Submitted by: {row.created_by || "—"}
                        <br />
                        Submitted at: {row.created_at ? new Date(row.created_at).toLocaleString("en-IN") : "—"}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={workingId === row.id}
                        onClick={() => act(row.id, "verify")}
                        className="rounded-2xl bg-emerald-700 px-4 py-3 text-sm font-black text-white disabled:opacity-60"
                      >
                        Verify
                      </button>

                      <button
                        type="button"
                        disabled={workingId === row.id}
                        onClick={() => act(row.id, "reject")}
                        className="rounded-2xl bg-red-600 px-4 py-3 text-sm font-black text-white disabled:opacity-60"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}