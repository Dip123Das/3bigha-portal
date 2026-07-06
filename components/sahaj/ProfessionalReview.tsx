import type { ReactNode } from "react";

export default function ProfessionalReview({ children }: { children?: ReactNode }) {
  return (
    <details className="rounded-2xl border p-4">
      <summary className="cursor-pointer font-black text-slate-950">
        Professional review optional
      </summary>
      <div className="mt-4 grid gap-3 text-sm font-bold text-slate-600">
        {children || (
          <>
            <p>Improve wording</p>
            <p>Add technical specifications</p>
            <p>Estimate pricing and timeline</p>
            <p>Recommend nearby vendors</p>
            <p>Detect missing information</p>
          </>
        )}
      </div>
    </details>
  );
}
