import { Suspense } from "react";
import PublicInventoryPageClient from "./PublicInventoryPageClient";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default function PublicInventoryPage() {
  return (
    <Suspense fallback={<div>Loading inventory…</div>}>
      <PublicInventoryPageClient />
    </Suspense>
  );
}