"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export default function BuildConVendorPopup() {
  const pathname = usePathname();
  const [show, setShow] = useState(false);

  useEffect(() => {
    const blocked =
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
    </aside>
  );
}
