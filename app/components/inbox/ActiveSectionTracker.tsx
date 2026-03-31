"use client";

import { useEffect } from "react";

export default function ActiveSectionTracker() {
  useEffect(() => {
    const sections = ["investment-section", "rfq-section", "direct-section"];

    const onScroll = () => {
      let current = "";

      for (const id of sections) {
        const el = document.getElementById(id);
        if (!el) continue;

        const rect = el.getBoundingClientRect();
        if (rect.top <= 120) {
          current = id;
        }
      }

      sections.forEach((id) => {
        const link = document.querySelector(`[href="#${id}"]`);
        if (!link) return;

        if (id === current) {
          link.classList.add("ring-2", "ring-slate-900/20");
        } else {
          link.classList.remove("ring-2", "ring-slate-900/20");
        }
      });
    };

    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return null;
}