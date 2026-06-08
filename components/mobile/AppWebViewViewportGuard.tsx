"use client";

import { useEffect } from "react";

export default function AppWebViewViewportGuard() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const lockViewport = () => {
      document.documentElement.style.width = "100%";
      document.documentElement.style.maxWidth = "100%";
      document.documentElement.style.overflowX = "hidden";

      document.body.style.width = "100%";
      document.body.style.maxWidth = "100%";
      document.body.style.overflowX = "hidden";
      document.body.style.position = "relative";

      document.documentElement.scrollLeft = 0;
      document.body.scrollLeft = 0;
      window.scrollTo(0, window.scrollY);
    };

    lockViewport();

    const interval = window.setInterval(lockViewport, 500);

    window.addEventListener("resize", lockViewport);
    window.addEventListener("orientationchange", lockViewport);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("resize", lockViewport);
      window.removeEventListener("orientationchange", lockViewport);
    };
  }, []);

  return null;
}
