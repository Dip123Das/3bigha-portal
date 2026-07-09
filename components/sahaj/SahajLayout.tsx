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
      {(eyebrow || title || subtitle) ? (
        <section className="mx-auto max-w-5xl rounded-3xl border bg-white p-5 shadow-sm">
          {eyebrow ? <p className="text-sm font-black text-emerald-700">{eyebrow}</p> : null}
          {title ? <h1 className="mt-2 text-3xl font-black text-slate-950">{title}</h1> : null}
          {subtitle ? <p className="mt-2 text-slate-600">{subtitle}</p> : null}
        </section>
      ) : null}

      <section className={`mx-auto max-w-5xl rounded-3xl border bg-white p-5 ${(eyebrow || title || subtitle) ? "mt-5" : ""}`}>
        {children}
      </section>
    </main>
  );
}
