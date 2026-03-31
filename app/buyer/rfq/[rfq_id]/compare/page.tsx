// app/buyer/rfq/[rfq_id]/compare/page.tsx
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function BuyerRfqCompareAliasPage({
  params,
}: {
  params: { rfq_id: string };
}) {
  const rfqId = decodeURIComponent(params.rfq_id);

  // Keep your existing working compare page as source-of-truth
  redirect(`/dashboard/buyer/quote-compare/${encodeURIComponent(rfqId)}`);
}