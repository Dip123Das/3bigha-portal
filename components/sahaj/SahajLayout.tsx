import type { ReactNode } from "react";

export default function SahajLayout({
  eyebrow = "Project SAHAJ",
  title,
  subtitle,
  children,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <main className="w-full px-4 py-6">
      <section className="mx-auto max-w-5xl rounded-3xl border bg-white p-5 shadow-sm">
        <p className="text-sm font-black text-emerald-700">{eyebrow}</p>
        <h1 className="mt-2 text-3xl font-black text-slate-950">{title}</h1>
        {subtitle ? <p className="mt-2 text-slate-600">{subtitle}</p> : null}
      </section>

      <section className="mx-auto mt-5 max-w-5xl rounded-3xl border bg-white p-5">
        {children}
      </section>
    </main>
  );
}
