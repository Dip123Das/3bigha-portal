import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Vendor Demand Opportunities | 3Bigha",
  description:
    "Browse public vendor demand opportunities where 3Bigha marketplace intelligence is identifying supplier, service, rental and property business gaps.",
};

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) return null;

  return createClient(url, key, {
    auth: { persistSession: false },
  });
}

export default async function NeedIndexPage() {
  const supabase = getSupabase();

  let rows: any[] = [];

  if (supabase) {
    const { data } = await supabase
      .from("vendor_opportunity_seo")
      .select("slug, seo_title, seo_description, created_at")
      .eq("is_indexable", true)
      .order("created_at", { ascending: false })
      .limit(100);

    rows = data || [];
  }

  return (
    <main className="w-full px-4 py-6">
      <section className="rounded-3xl border bg-white p-6 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">
          Vendor Demand SEO
        </p>

        <h1 className="mt-3 text-3xl font-black text-slate-950">
          Vendor Demand Opportunities
        </h1>

        <p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-slate-600">
          Browse public vendor demand opportunities where 3Bigha marketplace
          intelligence is identifying supplier, service, rental and property
          business gaps.
        </p>
      </section>

      <section className="mt-6 grid gap-4">
        {rows.length > 0 ? (
          rows.map((row) => (
            <Link
              key={row.slug}
              href={`/need/${row.slug}`}
              className="rounded-2xl border bg-white p-5 no-underline shadow-sm hover:border-emerald-500"
            >
              <h2 className="text-xl font-black text-slate-900">
                {row.seo_title}
              </h2>

              <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
                {row.seo_description}
              </p>

              <p className="mt-3 text-sm font-black text-emerald-700">
                View opportunity →
              </p>
            </Link>
          ))
        ) : (
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <h2 className="text-xl font-black text-slate-900">
              Vendor opportunities are being prepared
            </h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
              3Bigha is preparing public vendor demand pages from marketplace
              intelligence signals.
            </p>
            <Link
              href="/vendor-opportunities"
              className="mt-4 inline-flex rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white no-underline"
            >
              View Vendor Opportunities
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
