"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";

export default function MobileAppHeader() {
  const pathname = usePathname() || "";
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);

  if (pathname.startsWith("/login") || pathname.startsWith("/auth")) return null;

  const submit = () => {
    const text = q.trim();
    if (!text) return;
    router.push(`/search?q=${encodeURIComponent(text)}`);
  };

  return (
    <div className="mobile-app-header">
      <div className="mobile-app-header-row">
        <Link href="/login" className="mobile-app-header-login">
          Login
        </Link>

        <Link href="/" className="mobile-app-header-logo" aria-label="3Bigha home">
          <Image src="/logo.png" alt="3Bigha" width={88} height={34} priority />
        </Link>

        <button
          type="button"
          className="mobile-app-header-menu"
          onClick={() => setOpen((v) => !v)}
          aria-label="Open menu"
        >
          ☰
        </button>
      </div>

      <div className="mobile-app-header-search">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
          placeholder="Search property, materials, services..."
        />
        <button type="button" onClick={submit}>
          Search
        </button>
      </div>

      {open ? (
        <div className="mobile-app-header-panel">
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
    </div>
  );
}
