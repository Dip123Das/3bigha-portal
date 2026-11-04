// app/buyer/rfq/[rfq_id]/compare/page.tsx
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function BuyerRfqCompareAliasPage({
  params,
}: {
  params: Promise<{ rfq_id: string }>;
}) {
  const { rfq_id } = await params;
  const rfqId = decodeURIComponent(rfq_id);

  // Keep your existing working compare page as source-of-truth
  redirect(`/dashboard/buyer/quote-compare/${encodeURIComponent(rfqId)}`);
}