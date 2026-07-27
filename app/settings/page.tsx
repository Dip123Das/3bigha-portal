import ExperienceModeSettings from "@/components/experience/ExperienceModeSettings";
import UnifiedProfileSettings from "@/components/profile/UnifiedProfileSettings";

export const metadata = {
  title: "My Profile & Settings | 3bigha.com",
  description:
    "Manage your profile, business identity, profile photo, subscription and 3Bigha experience.",
};

export default function SettingsPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="w-full space-y-5">
        <UnifiedProfileSettings />

        <section id="experience">
          <ExperienceModeSettings />
        </section>
      </div>
    </main>
  );
}
