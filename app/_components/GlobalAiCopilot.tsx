"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export default function GlobalAiCopilot() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const links = [
    ["🔍 AI Smart Search", "/search"],
    ["📝 Draft RFQ", "/rfq/general/new"],
    ["📈 Price Prediction", "/price-today"],
    ["🔎 Find Vendors", "/vendor-opportunities"],
    ["📐 Cost Calculator", "/cost-calculator"],
    ["📏 Land Area Calculator", "/land-area-calculator"],
    ["🏦 EMI Calculator", "/emi-calculator"],
    ["🧱 Material RFQ", "/materials/rfq/new"],
    ["🏠 Turnkey Package", "/services/turnkey"],
    ["💬 AI Inbox", "/dashboard/inbox-v2"],
    ["🛡️ Support AI", "/support/new"],
  ];

  return (
    <div className={open ? "globalAiShell globalAiShellOpen" : "globalAiShell"}>
      <button
        type="button"
        className="globalAiButton"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label={open ? "Close 3Bigha AI" : "Open 3Bigha AI"}
      >
        <span className="globalAiIcon">🤖</span>
        <span className="globalAiText">
          <strong>3Bigha AI</strong>
          <small>{open ? "Close" : "Ask AI"}</small>
        </span>
      </button>

      {open ? (
        <>
          <button
            type="button"
            className="globalAiBackdrop"
            onClick={() => setOpen(false)}
            aria-label="Close AI Assistant"
          />

          <section className="globalAiPanel" role="dialog" aria-label="3Bigha AI Assistant">
            <div className="globalAiPanelHeader">
              <div>
                <strong>3Bigha AI Assistant</strong>
                <span>Choose one action</span>
              </div>

              <button
                type="button"
                className="globalAiClose"
                onClick={() => setOpen(false)}
                aria-label="Close AI Assistant"
              >
                ×
              </button>
            </div>

            <div className="globalAiLinks">
              {links.map(([label, href]) => (
                <Link key={href} href={href} onClick={() => setOpen(false)}>
                  {label}
                </Link>
              ))}
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
