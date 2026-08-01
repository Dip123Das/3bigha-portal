import Link from "next/link";

export const metadata = {
  title: "Team & Users | Vendor Dashboard | 3Bigha",
  description:
    "Manage the people who help operate your 3Bigha vendor workspace.",
};

const accessAreas = [
  {
    title: "Business identity and account",
    detail:
      "Review the primary account, verified identity and general workspace preferences.",
    href: "/settings",
    action: "Open profile and access settings",
  },
  {
    title: "Operational support",
    detail:
      "Ask 3Bigha Support to help with authorised user access, role correction or account recovery.",
    href: "/support/new",
    action: "Create a support request",
  },
  {
    title: "Existing support requests",
    detail:
      "Review the status of access, identity or team-related support requests already submitted.",
    href: "/support/my",
    action: "View support requests",
  },
];

export default function VendorTeamPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-6">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">
            Vendor workspace
          </p>
          <h1 className="mt-2 text-3xl font-black text-slate-950">
            Team &amp; Users
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Manage the people and account-access matters connected with your
            vendor workspace. Sensitive access changes remain human-controlled
            and can be reviewed through 3Bigha Support.
          </p>
        </div>

        <section className="grid gap-4 md:grid-cols-3">
          {accessAreas.map((area) => (
            <article
              key={area.title}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <h2 className="text-lg font-black text-slate-900">
                {area.title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {area.detail}
              </p>
              <Link
                href={area.href}
                className="mt-5 inline-flex rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white hover:bg-blue-700"
              >
                {area.action} →
              </Link>
            </article>
          ))}
        </section>

        <div className="mt-6">
          <Link
            href="/dashboard/vendor"
            className="text-sm font-black text-blue-700 hover:underline"
          >
            ← Return to Vendor Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
