"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

type ExecutiveFlowMemoryProps = {
  pageKey?: string;
  minRestoreY?: number;
};

export default function ExecutiveFlowMemory({
  pageKey,
  minRestoreY = 160,
}: ExecutiveFlowMemoryProps) {
  const pathname = usePathname();
  const storageKey = `3bigha_executive_flow:${pageKey || pathname || "dashboard"}`;

  useEffect(() => {
    if (typeof window === "undefined") return;

    const savedY = Number(window.sessionStorage.getItem(storageKey) || 0);

    if (
      savedY > minRestoreY &&
      !window.location.hash &&
      window.scrollY < 80
    ) {
      window.requestAnimationFrame(() => {
        window.scrollTo({ top: savedY, behavior: "instant" as ScrollBehavior });
      });
    }

    let ticking = false;

    const remember = () => {
      if (ticking) return;
      ticking = true;

      window.requestAnimationFrame(() => {
        window.sessionStorage.setItem(storageKey, String(window.scrollY || 0));
        ticking = false;
      });
    };

    window.addEventListener("scroll", remember, { passive: true });
    window.addEventListener("beforeunload", remember);

    return () => {
      remember();
      window.removeEventListener("scroll", remember);
      window.removeEventListener("beforeunload", remember);
    };
  }, [storageKey, minRestoreY]);

  return null;
}
