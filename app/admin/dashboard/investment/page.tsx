import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

function isInvestmentAdminRole(role: string | null | undefined) {
  return role === "master_admin" || role === "investment_admin";
}

type StatCardProps = {
  label: string;
  value: string;
  hint: string;
};

function StatCard({ label, value, hint }: StatCardProps) {
  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
        {label}
      </div>
      <div className="mt-3 text-3xl font-bold tracking-tight text-gray-900">
        {value}
      </div>
      <div className="mt-2 text-sm text-gray-500">{hint}</div>
    </div>
  );
}

type ModuleCardProps = {
  eyebrow: string;
  title: string;
  description: string;
  href: string;
  cta: string;
  badges: string[];
};

function ModuleCard({
  eyebrow,
  title,
  description,
  href,
  cta,
  badges,
}: ModuleCardProps) {
  return (
    <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
      <div className="p-6">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
          {eyebrow}
        </div>

        <h2 className="mt-3 text-xl font-bold tracking-tight text-gray-900">
          {title}
        </h2>

        <p className="mt-3 text-sm leading-6 text-gray-600">{description}</p>

        <div className="mt-5 flex flex-wrap gap-2">
          {badges.map((badge) => (
            <span
              key={badge}
              className="inline-flex rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-700"
            >
              {badge}
            </span>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-6 py-4">
        <Link
          href={href}
          className="inline-flex items-center rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          {cta}
        </Link>

        <Link
          href={href}
          className="text-sm font-semibold text-gray-700 hover:text-black"
        >
          {href}
        </Link>
      </div>
    </div>
  );
}

export default async function AdminInvestmentDashboardPage() {
  const cookieStore = await cookies();
  const supabase = getSupabaseServerClient(cookieStore);

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login?next=/admin/dashboard/investment");
  }

  const email = user.email ?? null;

  const { data: prof, error: profErr } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const role = (prof?.role ?? null) as string | null;

  if (!isInvestmentAdminRole(role)) {
    return (
      <main className="w-full px-4 py-8">
        <div className="rounded-3xl border border-red-200 bg-red-50 p-6">
          <h1 className="text-2xl font-bold text-red-700">
            Access denied for Investment Admin
          </h1>
          <p className="mt-3 text-sm text-red-600">
            You do not have permission to open this module.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/admin/dashboard"
              className="rounded-2xl bg-black px-4 py-2 text-sm font-semibold text-white"
            >
              Back to Admin Dashboard
            </Link>
            <Link
              href="/"
              className="rounded-2xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700"
            >
              Public Home
            </Link>
          </div>

          <div className="mt-5 text-sm text-gray-700">
            Signed in as: <b>{email ?? "—"}</b>
            <br />
            Role: <b>{role ?? "none"}</b>
            {profErr?.message ? (
              <>
                <br />
                Error: <b>{profErr.message}</b>
              </>
            ) : null}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="w-full px-4 py-8">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
            Admin Investment Control
          </div>

          <h1 className="mt-4 text-4xl font-bold tracking-tight text-gray-900">
            Investment & Participation Plan Master
          </h1>

          <p className="mt-4 max-w-3xl text-sm leading-7 text-gray-600">
            Manage the executive framework for builder-project participation
            across cash investment, joint venture land contribution, and hybrid
            models. This module will control the approved plans that builders
            can attach to their projects and later show publicly to attract
            investors and land-contributing partners.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex rounded-full border border-gray-200 bg-white px-3 py-1 text-sm text-gray-700">
            {email ?? "—"}
          </span>
          <span className="inline-flex rounded-full border border-gray-200 bg-white px-3 py-1 text-sm text-gray-700">
            role: {role}
          </span>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard
          label="Phase"
          value="Stage 1"
          hint="Admin participation-plan master setup"
        />
        <StatCard
          label="Coverage"
          value="3 Models"
          hint="Cash investment · JV land · Hybrid"
        />
        <StatCard
          label="Status"
          value="Ready"
          hint="Safe starting point without disturbing live deal room"
        />
      </div>

      <div className="mb-8 rounded-3xl border border-gray-200 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 p-6 text-white shadow-sm">
        <div className="max-w-4xl">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-200">
            Executive Direction
          </div>

          <h2 className="mt-3 text-2xl font-bold tracking-tight">
            Build the discovery layer before advanced lifecycle expansion
          </h2>

          <p className="mt-3 text-sm leading-7 text-gray-200">
            The deal room is already stable. Now the next business priority is
            to create attractive, admin-controlled participation plans so that
            builders can later attach them to projects and visitors can discover
            investment-ready or joint-venture-ready opportunities directly from
            the public portal.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <ModuleCard
          eyebrow="Plan Master"
          title="Participation Plans"
          description="Create and manage approved builder-project participation plans. This will cover cash investment plans, joint venture land contribution plans, and hybrid models with executive public highlights, risk notes, return summaries, terms, and disclaimers."
          href="/admin/dashboard/investment/plans"
          cta="Open Plan Master"
          badges={[
            "cash_investment",
            "joint_venture_land",
            "hybrid",
            "admin-controlled",
          ]}
        />

        <ModuleCard
          eyebrow="Review Queue"
          title="Investment Opportunities"
          description="Review submitted investment opportunities, moderate status, and continue using the existing approval workflow already present in your investment admin side."
          href="/admin/dashboard/investment/opportunities"
          cta="Review Opportunities"
          badges={[
            "pending_review",
            "approved",
            "rejected",
            "changes_requested",
          ]}
        />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="text-sm font-semibold text-gray-900">
            Cash Investment
          </div>
          <p className="mt-3 text-sm leading-6 text-gray-600">
            For investors who contribute money and expect return through fixed
            return, profit share, revenue share, or discount-entry style plans.
          </p>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="text-sm font-semibold text-gray-900">
            Joint Venture Land Contribution
          </div>
          <p className="mt-3 text-sm leading-6 text-gray-600">
            For landowners or adjacent land partners who contribute land instead
            of cash and participate in value creation through area share,
            revenue share, profit share, or hybrid structures.
          </p>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="text-sm font-semibold text-gray-900">
            Hybrid Participation
          </div>
          <p className="mt-3 text-sm leading-6 text-gray-600">
            For projects that combine monetary investment and strategic land or
            structured contribution models under one approved framework.
          </p>
        </div>
      </div>

      <div className="mt-8 rounded-3xl border border-dashed border-gray-300 bg-gray-50 p-6">
        <div className="text-sm font-semibold text-gray-900">
          Next module sequence
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-4">
          {[
            "1. Admin Participation Plan Master",
            "2. Builder Project Investment Enablement",
            "3. Unit-wise Investment Presentation",
            "4. Public Investor Discovery + Deal Room Entry",
          ].map((item) => (
            <div
              key={item}
              className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700"
            >
              {item}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/admin/dashboard"
          className="rounded-2xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:text-black"
        >
          ← Back to Admin Dashboard
        </Link>

        <Link
          href="/"
          className="rounded-2xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:text-black"
        >
          Public Home
        </Link>
      </div>
    </main>
  );
}