import type { ReactNode } from "react";

export default function ContextualAiAssist({
  title = "AI help for this action",
  description = "Use AI only when you need support for the current work.",
  children,
  defaultOpen = false,
}: {
  title?: string;
  description?: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details
      open={defaultOpen}
      className="rounded-[1.5rem] border border-violet-200 bg-violet-50/60 p-3"
    >
      <summary className="cursor-pointer text-sm font-black text-violet-900">
        ✨ {title}
      </summary>

      <p className="mt-2 text-sm font-semibold leading-6 text-violet-800">
        {description}
      </p>

      <div className="mt-3 space-y-3">
        {children}
      </div>
    </details>
  );
}
