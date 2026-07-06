"use client";

import { useRouter } from "next/navigation";
import {
  SahajLayout,
  SahajIntentChooser,
  ProfessionalReview,
} from "@/components/sahaj";
import type { SahajInputMode } from "@/lib/sahaj/types";

export default function SahajRfqClient() {
  const router = useRouter();

  function start(mode: SahajInputMode) {
    router.push(`/rfq/general/new?mode=${mode}`);
  }

  return (
    <SahajLayout
      title="Tell us your requirement"
      subtitle="Type, upload, speak, or ask for help. 3Bigha will prepare the professional RFQ."
    >
      <SahajIntentChooser onChoose={start} />

      <div className="mt-6 rounded-3xl bg-emerald-50 p-5">
        <h2 className="text-xl font-black text-slate-950">
          No form filling pressure
        </h2>
        <p className="mt-2 text-sm font-bold text-slate-600">
          You can upload a handwritten note, contractor list, photo, PDF, BOQ,
          drawing, or simply type one line. The RFQ engine will continue after that.
        </p>
      </div>

      <div className="mt-6">
        <ProfessionalReview>
          <p>AI will read your input quietly.</p>
          <p>It will prepare items, quantities, wording, specifications and vendor suggestions.</p>
          <p>You will review before final submission.</p>
        </ProfessionalReview>
      </div>
    </SahajLayout>
  );
}
