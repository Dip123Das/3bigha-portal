"use client";

import { useEffect, useState } from "react";

export default function FloatingUnreadButton({
  href,
}: {
  href: string | null;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!href) return;

    const onScroll = () => {
        setVisible(window.scrollY > 300);
    };

    window.addEventListener("scroll", onScroll);

    // 🔔 Title blinking
    const originalTitle = document.title;
    let toggle = false;

    const interval = setInterval(() => {
      if (document.visibilityState !== "visible") {
        document.title = toggle ? originalTitle : "🔔 New Messages";
        toggle = !toggle;
      } else {
        document.title = originalTitle;
      }
    }, 2000);

    return () => {
        window.removeEventListener("scroll", onScroll);
        clearInterval(interval);
        document.title = originalTitle;
    };
    }, [href]);

    useEffect(() => {
      if (!href) return;

      if (document.visibilityState === "visible") return;

      const audio = new Audio("/notification.mp3");
      audio.volume = 0.4;

      audio.play().catch(() => {});
    }, [href]);

  if (!href || !visible) return null;

  return (
    <a
      href={href}
      className="fixed bottom-6 right-6 z-50 inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:opacity-90"
    >
      ↓ Jump to unread
    </a>
  );
}