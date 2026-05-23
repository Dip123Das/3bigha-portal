// app/dashboard/buyer/enquiries/[rfqId]/quotes/page.tsx
import { cookies } from "next/headers";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import QuoteCompareClient from "./quote-compare-client";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type RfqRow = {
  id: string;
  public_id: string | null;
};

export default async function BuyerQuoteComparePage({
  params,
}: {
  params: { rfqId: string };
}) {
  const supabase = getSupabaseServerClient(cookies());
  const rfqParam = decodeURIComponent(params.rfqId || "").trim();

  if (!rfqParam) {
    return (
      <div style={{ padding: 12 }}>
        <h1 style={{ fontSize: 18, fontWeight: 800 }}>RFQ not provided</h1>
      </div>
    );
  }

  // ✅ Resolve RFQ internal id by (id=uuid) OR (public_id=string)
  let rfq: RfqRow | null = null;

  if (UUID_RE.test(rfqParam)) {
    const { data, error } = await supabase
      .from("rfqs")
      .select("id,public_id")
      .eq("id", rfqParam)
      .maybeSingle();

    if (!error && data) rfq = data as any;
  } else {
    const { data, error } = await supabase
      .from("rfqs")
      .select("id,public_id")
      .eq("public_id", rfqParam)
      .maybeSingle();

    if (!error && data) rfq = data as any;
  }

  if (!rfq?.id) {
    return (
      <div style={{ padding: 12 }}>
        <h1 style={{ fontSize: 18, fontWeight: 800 }}>RFQ not found</h1>
        <div style={{ marginTop: 8, opacity: 0.7 }}>
          Tried to resolve RFQ by <code>id</code> or <code>public_id</code> using:{" "}
          <code>{rfqParam}</code>
        </div>
      </div>
    );
  }

  const rfqId = rfq.id;

  // ✅ RFQ items
  const { data: items, error: itemsErr } = await supabase
    .from("rfq_items")
    .select("id,line_no,title,description,qty,uom")
    .eq("rfq_id", rfqId)
    .order("line_no", { ascending: true });

  if (itemsErr) {
    return (
      <div style={{ padding: 12 }}>
        <pre style={{ color: "crimson" }}>{itemsErr.message}</pre>
      </div>
    );
  }

  // ✅ Fetch latest quote per vendor using "max version" strategy
  // Step A: get max version per vendor for this rfq
  const { data: maxVers, error: mxErr } = await supabase
    .from("rfq_quotes")
    .select("vendor_id,version")
    .eq("rfq_id", rfqId)
    .order("vendor_id", { ascending: true })
    .order("version", { ascending: false });

  if (mxErr) {
    return (
      <div style={{ padding: 12 }}>
        <pre style={{ color: "crimson" }}>{mxErr.message}</pre>
      </div>
    );
  }

  // pick latest per vendor
  const latestVersionByVendor = new Map<string, number>();
  for (const row of (maxVers ?? []) as any[]) {
    const vid = String(row.vendor_id);
    const v = Number(row.version);
    if (!latestVersionByVendor.has(vid)) latestVersionByVendor.set(vid, v);
  }

  const vendorIds = Array.from(latestVersionByVendor.keys());

  // If no quotes at all
  if (!vendorIds.length) {
    return (
      <QuoteCompareClient
        rfqPublicOrId={rfqParam}
        rfqInternalId={rfqId}
        rfqNo={rfq.public_id}
        items={(items ?? []) as any}
        latestQuotes={[] as any}
        quoteItems={[] as any}
      />
    );
  }

  // Step B: fetch those latest quotes
  // We'll fetch all quotes and filter in JS (simpler + safe)
  const { data: allQuotes, error: qErr } = await supabase
    .from("rfq_quotes")
    .select("id,rfq_id,vendor_id,version,status,gst_mode,gst_rate,subtotal,gst_amount,grand_total,updated_at")
    .eq("rfq_id", rfqId)
    .in("vendor_id", vendorIds);

  if (qErr) {
    return (
      <div style={{ padding: 12 }}>
        <pre style={{ color: "crimson" }}>{qErr.message}</pre>
      </div>
    );
  }

  const latestQuotes = ((allQuotes ?? []) as any[]).filter((q) => {
    const vid = String(q.vendor_id);
    const want = latestVersionByVendor.get(vid);
    return want != null && Number(q.version) === want;
  });

  const quoteIds = latestQuotes.map((q) => String(q.id));

  // Step C: fetch quote items for latest quotes
  const { data: qis, error: qiErr } = await supabase
    .from("rfq_quote_items")
    .select("quote_id,rfq_item_id,qty,unit_price,line_total")
    .in("quote_id", quoteIds);

  if (qiErr) {
    return (
      <div style={{ padding: 12 }}>
        <pre style={{ color: "crimson" }}>{qiErr.message}</pre>
      </div>
    );
  }

  return (
    <QuoteCompareClient
      rfqPublicOrId={rfqParam}
      rfqInternalId={rfqId}
      rfqNo={rfq.public_id}
      items={(items ?? []) as any}
      latestQuotes={latestQuotes as any}
      quoteItems={(qis ?? []) as any}
    />
  );
}