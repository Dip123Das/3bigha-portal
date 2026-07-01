"use client";

import { useEffect, useState } from "react";

type OpportunityNotification = {
  id: string;
  title: string;
  message: string;
  priority?: string;
  created_at: string;
  is_read: boolean;
  data?: {
    action_label?: string;
    action_href?: string;
    confidence?: number;
    estimated_value?: number;
    reason?: string;
    priority?: string;
  } | null;
};

export default function MarketplaceOpportunityFeed() {
  const [rows, setRows] = useState<OpportunityNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/vendor/notifications?limit=5&type=marketplace_opportunity", {
          cache: "no-store",
        });

        const json = await res.json().catch(() => null);

        if (!cancelled) {
          setRows(
            Array.isArray(json?.rows) ? json.rows : []
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="text-xl font-black text-slate-900">
        🚀 Marketplace Opportunity Feed
      </div>

      {loading ? (
        <div className="mt-4 text-sm text-slate-500">
          Loading opportunities...
        </div>
      ) : rows.length === 0 ? (
        <div className="mt-4 text-sm text-slate-500">
          No marketplace opportunities available yet.
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {rows.map((r) => (
            <div
              key={r.id}
              className="rounded-xl border border-blue-100 bg-blue-50 p-4"
            >
              <div className="font-bold">{r.title}</div>

              <div className="mt-1 text-sm text-slate-700">
                {r.message}
              </div>

              {r.data?.reason ? (
                <div className="mt-2 text-xs font-semibold text-slate-600">
                  Why: {r.data.reason}
                </div>
              ) : null}

              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                {typeof r.data?.confidence === "number" ? (
                  <span className="rounded-full bg-white px-2 py-1 font-bold text-slate-700">
                    Confidence: {r.data.confidence}%
                  </span>
                ) : null}

                {Number(r.data?.estimated_value || 0) > 0 ? (
                  <span className="rounded-full bg-white px-2 py-1 font-bold text-slate-700">
                    Est. value: ₹{Number(r.data?.estimated_value || 0).toLocaleString("en-IN")}
                  </span>
                ) : null}

                <a
                  href={r.data?.action_href || "/dashboard/vendor"}
                  className="rounded-full bg-blue-700 px-3 py-1 font-black text-white"
                >
                  {r.data?.action_label || "Open"}
                </a>
              </div>

              <div className="mt-2 text-xs text-slate-500">
                {new Date(r.created_at).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
