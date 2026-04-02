"use client";

import { useEffect } from "react";

export default function MobileMenuAutoClose() {
  useEffect(() => {
    function closeAllMobileMenus() {
      document
        .querySelectorAll<HTMLDetailsElement>("details.topMobileMenu")
        .forEach((el) => {
          el.open = false;
        });
    }

    function onClick(e: MouseEvent) {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      const clickedLink = target.closest(".topMobilePanel a");
      if (clickedLink) {
        closeAllMobileMenus();
      }
    }

    document.addEventListener("click", onClick);

    return () => {
      document.removeEventListener("click", onClick);
    };
  }, []);

  return null;
}