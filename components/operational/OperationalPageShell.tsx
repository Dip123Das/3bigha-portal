import type { ReactNode } from "react";

export default function OperationalPageShell({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <main className={`w-full space-y-4 px-3 py-4 md:px-6 md:py-6 xl:px-8 ${className}`}>
      {children}
    </main>
  );
}
