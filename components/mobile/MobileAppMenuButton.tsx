"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";

export default function MobileAppMenuButton() {
  const pathname = usePathname() || "";
  const [open, setOpen] = useState(false);

  if (pathname.startsWith("/login") || pathname.startsWith("/auth")) return null;

  return (
    <>
      <button
        type="button"
        className="mobile-app-menu-button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Open menu"
      >
        ☰
      </button>

      {open ? (
        <div className="mobile-app-menu-panel">
          <Link onClick={() => setOpen(false)} href="/">Home</Link>
          <Link onClick={() => setOpen(false)} href="/search">Search</Link>
          <Link onClick={() => setOpen(false)} href="/dashboard">My Dashboard</Link>
          <Link onClick={() => setOpen(false)} href="/property">Property</Link>
          <Link onClick={() => setOpen(false)} href="/materials">Materials</Link>
          <Link onClick={() => setOpen(false)} href="/services">Services</Link>
          <Link onClick={() => setOpen(false)} href="/rentals">Rentals</Link>
          <Link onClick={() => setOpen(false)} href="/rfq/general/new">Post Requirement</Link>
        </div>
      ) : null}
    </>
  );
}
