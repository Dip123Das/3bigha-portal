import React from "react";
import { Container } from "@/components/layout/Container";

type PageShellProps = {
  children: React.ReactNode;
};

export function PageShell({ children }: PageShellProps) {
  return (
    <main className="w-full">
      <Container>{children}</Container>
    </main>
  );
}
