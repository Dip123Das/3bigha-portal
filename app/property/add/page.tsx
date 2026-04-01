import { Suspense } from "react";
import { Container } from "@/components/layout/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import AddPropertyPageClient from "./AddPropertyPageClient";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default function AddPropertyPage() {
  return (
    <Suspense
      fallback={
        <main>
          <Container>
            <EmptyState message="Loading property form..." />
          </Container>
          <style jsx global>{`
            header,
            footer {
              display: none !important;
            }
            body {
              background: #f8fafc;
            }
          `}</style>
        </main>
      }
    >
      <AddPropertyPageClient />
    </Suspense>
  );
}