"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import InvestmentDealRoomClient from "@/app/components/investment/InvestmentDealRoomClient";

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

export default function InvestorDealRoomDetailPage() {
  const params = useParams<{ id: string }>();
  const id = decodeURIComponent(String(params?.id || "")).trim();

  if (!id || id === "[id]" || !isUuid(id)) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="rounded-3xl border border-red-200 bg-red-50 p-6 shadow-sm">
          <div className="text-lg font-semibold text-red-800">
            Invalid deal room link
          </div>
          <div className="mt-2 text-sm text-red-700">
            This page needs a real deal room ID. The current URL contains an
            invalid value.
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/dashboard/investor/deal-rooms"
              className="inline-flex items-center rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-900 hover:text-slate-900"
            >
              Back to Deal Rooms
            </Link>

            <Link
              href="/dashboard/investor/applications"
              className="inline-flex items-center rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Go to Applications
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <InvestmentDealRoomClient roomId={id} viewerRole="investor" />;
}