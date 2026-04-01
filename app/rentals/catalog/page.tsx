import { Suspense } from "react";
import RentalsCatalogPageClient from "./RentalsCatalogPageClient";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default function RentalsCatalogPage() {
  return (
    <Suspense fallback={<div>Loading rental catalog…</div>}>
      <RentalsCatalogPageClient />
    </Suspense>
  );
}