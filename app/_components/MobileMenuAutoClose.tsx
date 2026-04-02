"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function MobileMenuAutoClose() {
  const pathname = usePathname();

  useEffect(() => {
    function getManagedDetails() {
      return Array.from(
        document.querySelectorAll<HTMLDetailsElement>(
          "details.topMobileMenu, details.rfqToggle, details.searchMenu, details.postMenu"
        )
      );
    }

    function closeAll(except?: HTMLDetailsElement | null) {
      getManagedDetails().forEach((el) => {
        if (except && el === except) return;
        el.open = false;
      });
    }

    function onClick(e: MouseEvent) {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      const clickedAction = target.closest(
        ".topMobilePanel a, .rfqTogglePanel a, .searchPanel a, .postMenuPanel a, .rfqTogglePanel button, .postMenuPanel button, .searchPanel button"
      );

      if (clickedAction) {
        closeAll();
        return;
      }

      const clickedSummary = target.closest("summary");
      if (!clickedSummary) return;

      const parentDetails = clickedSummary.closest("details");
      if (!parentDetails) return;

      if (
        parentDetails.classList.contains("topMobileMenu") ||
        parentDetails.classList.contains("rfqToggle") ||
        parentDetails.classList.contains("searchMenu") ||
        parentDetails.classList.contains("postMenu")
      ) {
        setTimeout(() => {
          if (parentDetails instanceof HTMLDetailsElement && parentDetails.open) {
            closeAll(parentDetails);
          }
        }, 0);
      }
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        closeAll();
      }
    }

    function onOutsideClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      const inside = target.closest(
        ".topMobileMenu, .rfqToggle, .searchMenu, .postMenu"
      );

      if (!inside) {
        closeAll();
      }
    }

    document.addEventListener("click", onClick);
    document.addEventListener("click", onOutsideClick);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("click", onOutsideClick);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  useEffect(() => {
    const all = document.querySelectorAll<HTMLDetailsElement>(
      "details.topMobileMenu, details.rfqToggle, details.searchMenu, details.postMenu"
    );
    all.forEach((el) => {
      el.open = false;
    });
  }, [pathname]);

  return null;
}