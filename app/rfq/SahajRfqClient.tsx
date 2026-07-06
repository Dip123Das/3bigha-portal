"use client";

import { useRouter } from "next/navigation";
import { SahajLayout } from "@/components/sahaj";

type ModuleChoice = "materials" | "services" | "rentals" | "properties";
type InputMode = "type" | "photo" | "document" | "voice" | "guided";

const modules: Array<{
  value: ModuleChoice;
  icon: string;
  title: string;
  text: string;
}> = [
  {
    value: "materials",
    icon: "🧱",
    title: "I need materials",
    text: "Cement, sand, bricks, steel, tiles, paint and other supplies.",
  },
  {
    value: "services",
    icon: "🛠️",
    title: "I need a service",
    text: "Electrician, plumber, architect, mason, engineer or contractor.",
  },
  {
    value: "rentals",
    icon: "🚜",
    title: "I need machinery / rentals",
    text: "JCB, mixer, scaffolding, tools, vehicles or equipment.",
  },
  {
    value: "properties",
    icon: "🏡",
    title: "I need property help",
    text: "Land, house, flat, project, seller, buyer or property service.",
  },
];

const modes: Array<{
  value: InputMode;
  icon: string;
  title: string;
  text: string;
}> = [
  {
    value: "type",
    icon: "✍️",
    title: "Type it",
    text: "Write one line or a full requirement.",
  },
  {
    value: "photo",
    icon: "📷",
    title: "Upload handwritten note / photo",
    text: "Use a notebook page, contractor list or item photo.",
  },
  {
    value: "document",
    icon: "📄",
    title: "Upload PDF / BOQ / drawing",
    text: "Use an existing file, estimate, BOQ, Excel or drawing.",
  },
  {
    value: "voice",
    icon: "🎤",
    title: "Speak it",
    text: "Describe your requirement in your own words.",
  },
  {
    value: "guided",
    icon: "🤝",
    title: "Help me step by step",
    text: "3Bigha will ask simple questions.",
  },
];

export default function SahajRfqClient() {
  const router = useRouter();

  function start(module: ModuleChoice, mode: InputMode) {
    router.push(`/rfq/general/new?module=${module}&mode=${mode}`);
  }

  return (
    <SahajLayout
      title="Tell us your requirement"
      subtitle="Choose what you need, then choose the easiest way to tell us. 3Bigha will prepare the professional RFQ."
    >
      <div className="grid gap-6">
        <section>
          <h2 className="text-2xl font-black text-slate-950">
            What do you need?
          </h2>
          <p className="mt-2 text-sm font-bold text-slate-600">
            Start with your real-world need. No technical knowledge required.
          </p>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {modules.map((module) => (
              <div
                key={module.value}
                className="rounded-3xl border bg-white p-5"
              >
                <div className="text-3xl">{module.icon}</div>
                <h3 className="mt-3 text-xl font-black text-slate-950">
                  {module.title}
                </h3>
                <p className="mt-1 text-sm font-bold text-slate-600">
                  {module.text}
                </p>

                <div className="mt-4 grid gap-2">
                  {modes.map((mode) => (
                    <button
                      key={`${module.value}-${mode.value}`}
                      type="button"
                      onClick={() => start(module.value, mode.value)}
                      className="rounded-2xl border bg-slate-50 px-4 py-3 text-left font-black hover:border-emerald-500 hover:bg-emerald-50"
                    >
                      <span className="mr-2">{mode.icon}</span>
                      {mode.title}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl bg-emerald-50 p-5">
          <h2 className="text-xl font-black text-slate-950">
            You can upload instead of typing
          </h2>
          <p className="mt-2 text-sm font-bold text-slate-600">
            Handwritten list, photo, BOQ, PDF, drawing, Excel or voice note —
            all can start the requirement. The existing RFQ engine continues
            after this screen.
          </p>
        </section>
      </div>
    </SahajLayout>
  );
}
