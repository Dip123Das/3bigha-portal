import Link from "next/link";

export default function OpportunityNotFound() {
  return (
    <div className="min-h-[60vh] bg-slate-50">
      <div className="mx-auto flex max-w-3xl flex-col items-center justify-center px-4 py-20 text-center sm:px-6 lg:px-8">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-2xl">
          📄
        </div>

        <h1 className="mt-6 text-2xl font-semibold text-slate-900">
          Opportunity not found
        </h1>

        <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">
          This investment opportunity may be unavailable, inactive, private, or removed.
        </p>

        <Link
          href="/investment/opportunities"
          className="mt-6 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
        >
          Back to Opportunities
        </Link>
      </div>
    </div>
  );
}