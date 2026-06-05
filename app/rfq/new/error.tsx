"use client";

import { Container } from "@/components/layout/Container";
import { OperationalErrorState } from "@/components/ui/OperationalErrorState";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <Container>
      <div style={{ paddingTop: 18, paddingBottom: 32 }}>
        <OperationalErrorState
          title="This page could not load"
          message={error?.message || "Please check your connection and try again."}
          onRetry={reset}
        />
      </div>
    </Container>
  );
}
