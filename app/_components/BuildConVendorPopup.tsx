"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export default function BuildConVendorPopup() {
  const pathname = usePathname();
  const [show, setShow] = useState(false);

  useEffect(() => {
    const blocked =
      pathname === "/" ||
      pathname?.startsWith("/admin") ||
      pathname?.startsWith("/dashboard") ||
      pathname?.startsWith("/onboarding") ||
      pathname?.startsWith("/auth");

    setShow(!blocked);
  }, [pathname]);

  if (!show) return null;

  return (
    <aside className="foundingPartnerPopup" aria-label="3Bigha Founding Partners Programme">
      <button className="foundingPartnerPopupClose" onClick={() => setShow(false)} aria-label="Close founding partner offer">
        ×
      </button>

      <p className="foundingPartnerPopupKicker">🏆 Founding Partners Programme</p>
      <h2>Reserve Your Founder Seat</h2>

      <p className="foundingPartnerPopupText">
        Only 1 trusted business per category in each district gets Founder status.
      </p>

      <p className="foundingPartnerPopupNote">
        Free first year • Founder badge • AI priority • Lifetime preferential pricing.
      </p>

      <div className="foundingPartnerPopupActions">
        <Link className="foundingPartnerPopupPrimary" href="/onboarding/business?source=district-founder&program=district-founding-vendor">
          🏆 Reserve My Seat
        </Link>

        <Link className="foundingPartnerPopupSecondary" href="/founding-vendors">
          View Benefits
        </Link>

        <a className="foundingPartnerPopupSecondary" href="https://wa.me/919614657110?text=Hello%20Dipankar%20Da%2C%20I%20want%20to%20apply%20as%20a%203Bigha%20Founding%20Partner.">
          WhatsApp
        </a>
      </div>

      <style jsx>{`
        /* FOUNDING PARTNER POPUP COMPONENT FIX */
        .foundingPartnerPopup {
          position: fixed;
          right: 22px;
          bottom: 92px;
          z-index: 10060;
          width: 360px;
          max-width: calc(100vw - 28px);
          border-radius: 22px;
          padding: 18px;
          background: linear-gradient(135deg, #f97316, #7c3aed);
          color: #fff;
          box-shadow: 0 28px 80px rgba(124, 58, 237, .34);
          border: 1px solid rgba(255,255,255,.18);
        }

        .foundingPartnerPopupClose {
          position: absolute;
          right: 10px;
          top: 10px;
          width: 28px;
          height: 28px;
          border: 0;
          border-radius: 999px;
          background: rgba(255,255,255,.18);
          color: #fff;
          font-size: 18px;
          cursor: pointer;
        }

        .foundingPartnerPopupKicker {
          margin: 0;
          font-size: 12px;
          font-weight: 1000;
          letter-spacing: .12em;
          text-transform: uppercase;
          color: #fff;
        }

        .foundingPartnerPopup h2 {
          margin: 10px 0 0;
          color: #fff;
          font-size: 22px;
          line-height: 1.15;
          font-weight: 1000;
        }

        .foundingPartnerPopupText,
        .foundingPartnerPopupNote {
          color: rgba(255,255,255,.92);
          font-size: 13px;
          line-height: 1.5;
          font-weight: 750;
        }

        .foundingPartnerPopupNote {
          background: rgba(255,255,255,.13);
          border-radius: 14px;
          padding: 10px;
        }

        .foundingPartnerPopupActions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 12px;
        }

        .foundingPartnerPopupPrimary,
        .foundingPartnerPopupSecondary {
          text-decoration: none;
          border-radius: 999px;
          padding: 9px 12px;
          font-size: 12px;
          font-weight: 1000;
        }

        .foundingPartnerPopupPrimary {
          background: #fff;
          color: #7c2d12;
        }

        .foundingPartnerPopupSecondary {
          background: rgba(255,255,255,.16);
          color: #fff;
          border: 1px solid rgba(255,255,255,.18);
        }

        @media (max-width: 760px) {
          .foundingPartnerPopup {
            left: 12px;
            right: 12px;
            bottom: 76px;
            width: auto;
          }
        }
      `}</style>
    </aside>
  );
}
