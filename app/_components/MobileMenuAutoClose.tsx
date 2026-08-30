"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function MobileMenuAutoClose() {
  const pathname = usePathname();
  const isAdminRoute = pathname.startsWith("/admin");

  useEffect(() => {
    let closeTimer: number | null = null;
    let layoutFrame: number | null = null;

    function isDesktop() {
      return window.matchMedia("(min-width: 981px)").matches;
    }

    function getManagedDetails() {
      return Array.from(
        document.querySelectorAll<HTMLDetailsElement>(
          "details.topMobileMenu, details.rfqToggle, details.searchMenu, details.postMenu, details.megaMenuItem"
        )
      );
    }

    function resetPanel(el: HTMLDetailsElement) {
      const panel = el.querySelector<HTMLElement>(".megaMenuPanel, .postMenuPanel");
      if (!panel) return;
      panel.style.removeProperty("display");
      panel.style.removeProperty("position");
      panel.style.removeProperty("top");
      panel.style.removeProperty("left");
      panel.style.removeProperty("right");
      panel.style.removeProperty("width");
      panel.style.removeProperty("max-width");
      panel.style.removeProperty("transform");
      panel.style.removeProperty("z-index");
    }

    function closeAll(except?: HTMLDetailsElement | null) {
      getManagedDetails().forEach((el) => {
        if (except && el === except) return;
        el.open = false;
        resetPanel(el);
      });
    }

    function clearCloseTimer() {
      if (closeTimer !== null) {
        window.clearTimeout(closeTimer);
        closeTimer = null;
      }
    }

    function clearHeaderMenuSpace() {
      if (layoutFrame !== null) {
        window.cancelAnimationFrame(layoutFrame);
        layoutFrame = null;
      }

      document
        .querySelector<HTMLElement>(".topHeader")
        ?.style.removeProperty("--threebigha-header-menu-space");
    }

    function syncHeaderMenuSpace() {
      clearHeaderMenuSpace();
      if (!isDesktop()) return;

      layoutFrame = window.requestAnimationFrame(() => {
        layoutFrame = null;

        const header = document.querySelector<HTMLElement>(".topHeader");
        if (!header) return;

        const panels = Array.from(
          document.querySelectorAll<HTMLElement>(
            "details.rfqToggle[open] .rfqTogglePanel, details.postMenu[open] .postMenuPanel, details.megaMenuItem[open] .megaMenuPanel"
          )
        ).filter((panel) => panel.getClientRects().length > 0);

        if (panels.length === 0) return;

        const headerBottom = header.getBoundingClientRect().bottom;
        const panelBottom = Math.max(
          ...panels.map((panel) => panel.getBoundingClientRect().bottom)
        );
        const reservedHeight = Math.max(
          0,
          Math.ceil(panelBottom - headerBottom + 12)
        );

        header.style.setProperty(
          "--threebigha-header-menu-space",
          `${reservedHeight}px`
        );
      });
    }

    function positionDesktopPanel(menu: HTMLDetailsElement) {
      const panel = menu.querySelector<HTMLElement>(".megaMenuPanel, .postMenuPanel");
      const summary = menu.querySelector<HTMLElement>("summary");
      if (!panel || !summary) return;

      const rect = summary.getBoundingClientRect();
      const nav = summary.closest(".desktopMegaNav");
      const navRect = nav?.getBoundingClientRect();
      const viewportW = window.innerWidth;
      const panelW = Math.min(760, viewportW - 32);

      let left = rect.left;
      if (left + panelW > viewportW - 16) left = viewportW - panelW - 16;
      if (left < 16) left = 16;

      const top = Math.round((navRect?.bottom ?? rect.bottom) - 1);

      panel.style.setProperty("display", "grid", "important");
      panel.style.setProperty("position", "fixed", "important");
      panel.style.setProperty("top", `${top}px`, "important");
      panel.style.setProperty("left", `${Math.round(left)}px`, "important");
      panel.style.setProperty("right", "auto", "important");
      panel.style.setProperty("width", `${Math.round(panelW)}px`, "important");
      panel.style.setProperty("max-width", "calc(100vw - 32px)", "important");
      panel.style.setProperty("transform", "none", "important");
      panel.style.setProperty("z-index", "10090", "important");
    }

    function onPointerOver(e: PointerEvent) {
      if (!isDesktop()) return;

      const target = e.target as HTMLElement | null;
      const menu = target?.closest("details.megaMenuItem, details.postMenu");

      if (menu instanceof HTMLDetailsElement) {
        clearCloseTimer();
        closeAll(menu);
        menu.open = true;
        positionDesktopPanel(menu);
      }
    }

    function onPointerOut(e: PointerEvent) {
      if (!isDesktop()) return;

      const target = e.target as HTMLElement | null;
      const menu = target?.closest("details.megaMenuItem, details.postMenu");

      if (!(menu instanceof HTMLDetailsElement)) return;

      const next = e.relatedTarget as Node | null;
      if (next && menu.contains(next)) return;

      clearCloseTimer();
      closeTimer = window.setTimeout(() => {
        menu.open = false;
        resetPanel(menu);
      }, 220);
    }

    function onClick(e: MouseEvent) {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      const clickedAction = target.closest(
        ".topMobilePanel a, .rfqTogglePanel a, .searchPanel a, .postMenuPanel a, .megaMenuPanel a, .rfqTogglePanel button, .postMenuPanel button, .searchPanel button"
      );

      if (clickedAction) {
        closeAll();
        return;
      }

      const clickedSummary = target.closest("summary");
      if (!clickedSummary) return;

      const parentDetails = clickedSummary.closest("details");
      if (!(parentDetails instanceof HTMLDetailsElement)) return;

      if (
        parentDetails.classList.contains("topMobileMenu") ||
        parentDetails.classList.contains("rfqToggle") ||
        parentDetails.classList.contains("searchMenu") ||
        parentDetails.classList.contains("postMenu") ||
        parentDetails.classList.contains("megaMenuItem")
      ) {
        setTimeout(() => {
          if (parentDetails.open) closeAll(parentDetails);
        }, 0);
      }
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") closeAll();
    }

    function onOutsideClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      const inside = target.closest(
        ".topMobileMenu, .rfqToggle, .searchMenu, .postMenu, .megaMenuItem"
      );
      if (!inside) closeAll();
    }

    function onResize() {
      closeAll();
      clearHeaderMenuSpace();
    }

    const managedDetails = getManagedDetails();
    managedDetails.forEach((menu) =>
      menu.addEventListener("toggle", syncHeaderMenuSpace)
    );

    document.addEventListener("pointerover", onPointerOver);
    document.addEventListener("pointerout", onPointerOut);
    document.addEventListener("click", onClick);
    document.addEventListener("click", onOutsideClick);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onResize);

    return () => {
      clearCloseTimer();
      clearHeaderMenuSpace();
      managedDetails.forEach((menu) =>
        menu.removeEventListener("toggle", syncHeaderMenuSpace)
      );
      document.removeEventListener("pointerover", onPointerOver);
      document.removeEventListener("pointerout", onPointerOut);
      document.removeEventListener("click", onClick);
      document.removeEventListener("click", onOutsideClick);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  useEffect(() => {
    const all = document.querySelectorAll<HTMLDetailsElement>(
      "details.topMobileMenu, details.rfqToggle, details.searchMenu, details.postMenu, details.megaMenuItem"
    );
    all.forEach((el) => {
      el.open = false;
    });
    document
      .querySelector<HTMLElement>(".topHeader")
      ?.style.removeProperty("--threebigha-header-menu-space");
  }, [pathname]);

  return isAdminRoute ? (
    <style jsx global>{`
      .topSubBar {
        display: none !important;
      }
    `}</style>
  ) : null;
}
