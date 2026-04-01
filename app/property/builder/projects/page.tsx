import { Suspense } from "react";
import BuilderProjectsPageClient from "./BuilderProjectsPageClient";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default function BuilderProjectsPage() {
  return (
    <Suspense fallback={<div>Loading projects…</div>}>
      <BuilderProjectsPageClient />
    </Suspense>
  );
}