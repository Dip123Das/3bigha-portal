"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Result = {
  title: string;
  description: string;
  href: string;
};

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
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
      >
        ⌘ AI Command
      </button>

      {open ? (
        <div className="fixed inset-0 z-[9999] bg-black/40 p-4 backdrop-blur-sm">
          <div className="mx-auto mt-24 max-w-2xl rounded-[2rem] border border-slate-200 bg-white shadow-2xl">
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
                      <div className="text-sm font-black text-slate-950">
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

            <div className="border-t border-slate-200 px-5 py-3 text-xs font-semibold text-slate-500">
              Press Ctrl + K to open procurement AI command center.
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}