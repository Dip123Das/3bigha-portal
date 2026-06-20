"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const STORAGE_KEY = "buildcon_founding_vendor_popup_closed";
const VALID_UNTIL = new Date("2026-07-16T00:00:00+05:30").getTime();

export default function BuildConVendorPopup() {
  const pathname = usePathname();
  const [show, setShow] = useState(false);

  useEffect(() => {
    const blocked =
      pathname?.startsWith("/admin") ||
      pathname?.startsWith("/dashboard") ||
      pathname?.startsWith("/onboarding") ||
      pathname?.startsWith("/auth");

    const expired = Date.now() >= VALID_UNTIL;
    const closed =
      typeof window !== "undefined" &&
      window.localStorage.getItem(STORAGE_KEY) === "1";

    setShow(!blocked && !expired && !closed);
  }, [pathname]);

  if (!show) return null;

  function closePopup() {
    window.localStorage.setItem(STORAGE_KEY, "1");
    setShow(false);
  }

  return (
    <aside className="buildconVendorPopup" aria-label="Bharat BuildCon founding vendor offer">
      <button className="buildconPopupClose" onClick={closePopup} aria-label="Close BuildCon offer">
        ×
      </button>

      <p className="buildconPopupKicker">🎉 Bharat BuildCon Special</p>
      <h2>100 Founding Vendors Wanted</h2>

      <p className="buildconPopupText">
        Free registration + free listing access for building materials,
        contractors, services, rentals and property businesses.
      </p>

      <p className="buildconPopupValid">
        Yashobhoomi, New Delhi visitors · Valid until 15 July 2026
      </p>

      <p className="buildconPopupNote">
        Profiles and listings are reviewed by 3Bigha before public visibility.
      </p>

      <div className="buildconPopupActions">
        <Link
          className="buildconPopupPrimary"
          href="/onboarding/business?source=buildcon&program=founding-vendor"
        >
          Register Free
        </Link>

        <a
          className="buildconPopupSecondary"
          href="https://wa.me/919614657110?text=Hello%20Dipankar%20Da%2C%20I%20want%20to%20join%203Bigha%20as%20a%20BuildCon%20Founding%20Vendor."
        >
          WhatsApp
        </a>
      </div>
    </aside>
  );
}
