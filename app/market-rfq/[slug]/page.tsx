import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getPublicRfqBySlug,
  getPublicRfqMetadata,
  getPublicRfqSchema,
} from "@/lib/seo/rfq-public-seo";

export const revalidate = 3600;

type PageProps = {
  params: {
    slug: string;
  };
};

export async function generateMetadata({ params }: PageProps) {
  return getPublicRfqMetadata(params.slug);
}

export default async function PublicMarketRfqPage({ params }: PageProps) {
  const rfq = await getPublicRfqBySlug(params.slug);
  if (!rfq) notFound();

  const schema = getPublicRfqSchema(rfq);

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">
          Public Marketplace RFQ
        </p>

        <h1 className="mt-3 text-2xl font-black leading-tight text-slate-950 sm:text-4xl">
          {rfq.seo_title}
        </h1>

        <p className="mt-4 text-base font-semibold leading-7 text-slate-700">
          {rfq.seo_description}
        </p>
      </section>

      <section className="mt-5 rounded-3xl border border-emerald-200 bg-emerald-50 p-5 sm:p-7">
        <h2 className="text-xl font-black text-slate-950">
          Are you a vendor for this requirement?
        </h2>

        <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">
          Join 3Bigha to discover buyer demand for materials, services, rentals,
          property and construction-related business opportunities.
        </p>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/vendor-opportunities"
            className="rounded-2xl bg-slate-950 px-5 py-3 text-center text-sm font-black text-white no-underline"
          >
            View Vendor Opportunities
          </Link>

          <Link
            href="/search"
            className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-center text-sm font-black text-slate-900 no-underline"
          >
            Browse Marketplace
          </Link>
        </div>
      </section>

      <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 sm:p-7">
        <h2 className="text-lg font-black text-slate-950">
          Privacy-safe public RFQ summary
        </h2>

        <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
          This page shows only marketplace demand information. Buyer identity,
          contact details, private chats and workflow data are not displayed.
        </p>
      </section>
    </main>
  );
}
