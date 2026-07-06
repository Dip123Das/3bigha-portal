import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

export const revalidate = 3600;

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

export const metadata = {
  title: "Public Marketplace RFQs | 3Bigha",
  description:
    "Browse public marketplace demand signals from buyers looking for materials, services, rentals and property opportunities.",
};

export default async function PublicRfqIndexPage() {
  const supabase = getSupabase();

  let rows: any[] = [];

  if (supabase) {
    const { data } = await supabase
      .from("rfq_public_seo")
      .select("slug, seo_title, seo_description, created_at")
      .eq("is_indexable", true)
      .order("created_at", { ascending: false })
      .limit(100);

    rows = data || [];
  }

  return (
    <main className="w-full px-4 py-6">
      <section className="rounded-3xl border bg-white p-6">
        <h1 className="text-3xl font-black">
          Public Marketplace RFQs
        </h1>

        <p className="mt-3 text-slate-600">
          Explore public marketplace demand signals across property,
          materials, services and rentals.
        </p>
      </section>

      <section className="mt-6 grid gap-4">
        {rows.map((row) => (
          <Link
            key={row.slug}
            href={`/market-rfq/${row.slug}`}
            className="rounded-2xl border bg-white p-5 no-underline hover:border-emerald-500"
          >
            <h2 className="text-xl font-black text-slate-900">
              {row.seo_title}
            </h2>

            <p className="mt-2 text-sm text-slate-600">
              {row.seo_description}
            </p>
          </Link>
        ))}
      </section>
    </main>
  );
}
