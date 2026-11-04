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
        <main className="min-h-screen bg-slate-50">
          <Container>
            <EmptyState message="Loading property form..." />
          </Container>
        </main>
      }
    >
      <AddPropertyPageClient />
    </Suspense>
  );
}
