"use client";

import { useParams } from "next/navigation";
import InvestmentDealRoomClient from "@/app/components/investment/InvestmentDealRoomClient";

export default function BuilderDealRoomDetailPage() {
  const params = useParams<{ id: string }>();
  const id = decodeURIComponent(String(params?.id || "")).trim();

  if (!id) {
    return (
      <div style={{ padding: 12 }}>
        Invalid investment deal room id.
      </div>
    );
  }

  return <InvestmentDealRoomClient roomId={id} viewerRole="builder" />;
}