"use client";

import { useState } from "react";
import Link from "next/link";

export default function GlobalAiCopilot() {
  const [aiOpen, setAiOpen] = useState(false);

  return (
    <>
      <button
        className="floatingAi"
        type="button"
        onClick={() => setAiOpen((v) => !v)}
        aria-expanded={aiOpen}
        aria-label="Open 3Bigha AI Assistant"
      >
        🤖 <span>3Bigha AI</span>
      </button>

      {aiOpen ? (
        <div className="aiPanel">
          <div className="aiPanelHeader">
            <strong>3Bigha AI Assistant</strong>
            <small>Choose what you want AI to help with</small>
          </div>

          <div className="aiPanelGrid">
            <Link href="/search">🔍 AI Smart Search</Link>
            <Link href="/rfq/general/new">📝 Draft RFQ</Link>
            <Link href="/price-today">📈 Price Prediction</Link>
            <Link href="/vendor/discovery">🤝 Find Vendors</Link>
            <Link href="/construction-cost">🏗️ Cost Calculator</Link>
            <Link href="/emi-calculator">🏦 EMI Calculator</Link>
            <Link href="/materials/rfq/new">🧱 Material RFQ</Link>
            <Link href="/services/turnkey">🏠 Turnkey Package</Link>
            <Link href="/dashboard/inbox-v2">💬 AI Inbox</Link>
            <Link href="/support/new">🛡️ Support AI</Link>
          </div>
        </div>
      ) : null}
    </>
  );
}