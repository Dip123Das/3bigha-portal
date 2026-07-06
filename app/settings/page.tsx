import ExperienceModeSettings from "@/components/experience/ExperienceModeSettings";

export const metadata = {
  title: "Settings | 3bigha.com",
  description:
    "Manage your 3bigha experience mode, visibility, notifications and workspace preferences.",
};

export default function SettingsPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="w-full space-y-5">
        <ExperienceModeSettings />

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
            Coming Next
          </div>
          <h2 className="mt-2 text-xl font-black text-slate-950">
            More settings will be added here
          </h2>
          <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-600">
            Chat preferences, notification controls, AI assistance, language,
            appearance and mobile experience settings can be added safely in this
            settings area.
          </p>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {[
              ["Chat", "Smart replies, sound, translation and conversation preferences."],
              ["Notifications", "RFQ alerts, vendor replies, project updates and price alerts."],
              ["AI Assistance", "Choose how visible AI suggestions and workflow help should be."],
            ].map(([title, text]) => (
              <div key={title} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="font-black text-slate-900">{title}</div>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
                  {text}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
