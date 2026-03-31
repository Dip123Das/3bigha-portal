import React from "react";
import { Container } from "@/components/layout/Container";

type PageShellProps = {
  children: React.ReactNode;
};

export function PageShell({ children }: PageShellProps) {
  return (
    <main>
      <Container>{children}</Container>
    </main>
  );
}
