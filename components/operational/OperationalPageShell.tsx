import type { ReactNode } from "react";

export default function OperationalPageShell({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <main className={`mx-auto w-full max-w-7xl space-y-4 px-3 py-4 md:px-6 md:py-6 ${className}`}>
      {children}
    </main>
  );
}
