"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Result = {
  title: string;
  description: string;
  href: string;
  category?: string;
  status?: string;
};

function statusClass(status?: string) {
  if (status === "critical") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  if (status === "warning") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (status === "healthy") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  return "border-slate-200 bg-slate-100 text-slate-700";
}

export default function ProcurementCommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);

  async function runSearch(value: string) {
    try {
      const res = await fetch(
        "/api/ai/procurement-command-palette",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: value,
          }),
        }
      );

      const json = await res.json();

      if (json?.ok) {
        setResults(Array.isArray(json.results) ? json.results : []);
      }
    } catch {
      setResults([]);
    }
  }

  useEffect(() => {
    runSearch("");
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => {
      runSearch(query);
    }, 200);

    return () => {
      window.clearTimeout(t);
    };
  }, [query]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }

    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  const empty = useMemo(
    () => results.length === 0,
    [results]
  );

  return (
    <>
      <button
        aria-label="Open AI Procurement Command Center"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
      >
        ⌘ Procurement AI
      </button>

      {open ? (
        <div className="fixed inset-0 z-[9999] bg-black/40 p-4 backdrop-blur-sm">
          <div className="mx-auto mt-24 max-w-2xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl">
            <div className="border-b border-slate-200 bg-gradient-to-r from-slate-950 via-indigo-950 to-violet-950 px-5 py-4 text-white">
              <div className="text-xs font-black uppercase tracking-[0.14em] text-indigo-200">
                Enterprise AI Procurement OS
              </div>

              <div className="mt-1 text-lg font-black">
                AI Operational Command Center
              </div>
            </div>

            <div className="border-b border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-black text-emerald-700">
                  Live AI Procurement OS
                </span>

                <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[11px] font-black text-blue-700">
                  Operational Command Interface
                </span>
              </div>
            </div>

            <div className="border-b border-slate-200 p-5">
              <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                AI Procurement Command Palette
              </div>

              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Type procurement command..."
                className="mt-3 w-full rounded-2xl border border-slate-200 px-4 py-4 text-base font-semibold outline-none focus:border-slate-900"
              />
            </div>

            <div className="border-b border-slate-200 p-4">
              <div className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
                Quick Operational Actions
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
                <Link
                  href="/dashboard/procurement-anomaly"
                  onClick={() => setOpen(false)}
                  className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-left transition hover:border-rose-400"
                >
                  <div className="text-lg">🚨</div>

                  <div className="mt-2 text-xs font-black text-rose-700">
                    Urgent Workflows
                  </div>
                </Link>

                <Link
                  href="/dashboard/procurement-actions"
                  onClick={() => setOpen(false)}
                  className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-left transition hover:border-amber-400"
                >
                  <div className="text-lg">⚡</div>

                  <div className="mt-2 text-xs font-black text-amber-700">
                    AI Actions
                  </div>
                </Link>

                <Link
                  href="/dashboard/procurement-copilot"
                  onClick={() => setOpen(false)}
                  className="rounded-2xl border border-violet-200 bg-violet-50 p-3 text-left transition hover:border-violet-400"
                >
                  <div className="text-lg">🧠</div>

                  <div className="mt-2 text-xs font-black text-violet-700">
                    Ask Copilot
                  </div>
                </Link>

                <Link
                  href="/dashboard/procurement-live"
                  onClick={() => setOpen(false)}
                  className="rounded-2xl border border-blue-200 bg-blue-50 p-3 text-left transition hover:border-blue-400"
                >
                  <div className="text-lg">📡</div>

                  <div className="mt-2 text-xs font-black text-blue-700">
                    Live Stream
                  </div>
                </Link>
              </div>
            </div>

            <div className="max-h-[420px] overflow-y-auto p-4">
              {empty ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-500">
                  No procurement commands found.
                </div>
              ) : (
                <div className="space-y-3">
                  {results.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className="block rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-slate-900 hover:bg-slate-50"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        {item.category ? (
                          <span className="inline-flex rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-700">
                            {item.category}
                          </span>
                        ) : null}

                        {item.status ? (
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${statusClass(
                              item.status
                            )}`}
                          >
                            {item.status}
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-3 text-sm font-black text-slate-950">
                        {item.title}
                      </div>

                      <div className="mt-1 text-sm font-medium text-slate-500">
                        {item.description}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-slate-200 bg-slate-50 px-5 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs font-semibold text-slate-500">
                  Press Ctrl + K to open procurement AI command center.
                </div>

                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-black text-emerald-700">
                  Live Enterprise Procurement OS
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}