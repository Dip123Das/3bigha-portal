"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef } from "react";
import { usePathname } from "next/navigation";

function startsWithPath(pathname: string, base: string) {
  if (!base) return false;
  if (base === "/") return pathname === "/";
  return pathname === base || pathname.startsWith(base + "/");
}

function NavLink({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link className={`topNavLink ${active ? "isActive" : ""}`} href={href}>
      {label}
    </Link>
  );
}

function Icon({
  name,
}: {
  name: "property" | "builder" | "materials" | "services" | "rentals" | "blog";
}) {
  const common = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
  };

  if (name === "property")
    return (
      <svg {...common}>
        <path d="M3 11l9-8 9 8" />
        <path d="M5 10v10h14V10" />
      </svg>
    );

  if (name === "builder")
    return (
      <svg {...common}>
        <path d="M3 21h18" />
        <path d="M6 21V8l6-4 6 4v13" />
        <path d="M9 21v-6h6v6" />
      </svg>
    );

  if (name === "materials")
    return (
      <svg {...common}>
        <path d="M20 7l-8-4-8 4 8 4 8-4Z" />
        <path d="M4 7v10l8 4 8-4V7" />
        <path d="M12 11v10" />
      </svg>
    );

  if (name === "services")
    return (
      <svg {...common}>
        <path d="M12 12a4 4 0 1 0-4-4" />
        <path d="M16 8a4 4 0 0 0-4-4" />
        <path d="M2 21c1.5-4 5-6 10-6s8.5 2 10 6" />
      </svg>
    );

  if (name === "rentals")
    return (
      <svg {...common}>
        <path d="M3 17h18" />
        <path d="M6 17V7h12v10" />
        <path d="M9 7V4h6v3" />
      </svg>
    );

  return (
    <svg {...common}>
      <path d="M4 4h12a4 4 0 0 1 4 4v12H8a4 4 0 0 1-4-4V4Z" />
      <path d="M8 8h8" />
      <path d="M8 12h8" />
      <path d="M8 16h6" />
    </svg>
  );
}

export default function SiteHeader() {
  const pathname = usePathname() || "/";
  const postMenuRef = useRef<HTMLDetailsElement | null>(null);
  const mobileMenuRef = useRef<HTMLDetailsElement | null>(null);

  const active = useMemo(() => {
    return {
      property: startsWithPath(pathname, "/property"),
      materials: startsWithPath(pathname, "/materials"),
      services: startsWithPath(pathname, "/services"),
      rentals: startsWithPath(pathname, "/rentals"),
      blog: startsWithPath(pathname, "/blog"),
    };
  }, [pathname]);

  useEffect(() => {
    if (postMenuRef.current) postMenuRef.current.open = false;
    if (mobileMenuRef.current) mobileMenuRef.current.open = false;
  }, [pathname]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const el = postMenuRef.current;
      if (!el || !el.open) return;
      if (!el.contains(e.target as Node)) el.open = false;
    }

    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function closePostMenu() {
    if (postMenuRef.current) postMenuRef.current.open = false;
  }

  return (
    <header className="topHeader">
      <div className="topHeaderInner">
        {/* Brand */}
        <div className="topBrand">
          <Link className="topBrandLink" href="/">
            <div className="topBrandName">3Bigha.com</div>
            <div className="topBrandTagline">
              Real Estate & Construction Ecosystem
            </div>
          </Link>
        </div>

        {/* Desktop nav */}
        <nav className="topNav" aria-label="Primary">
          <NavLink href="/property" label="Property" active={active.property} />
          <NavLink href="/materials" label="Materials" active={active.materials} />
          <NavLink href="/services" label="Services" active={active.services} />
          <NavLink href="/rentals" label="Rentals" active={active.rentals} />
          <NavLink href="/blog" label="Blog / News" active={active.blog} />
        </nav>

        {/* Actions */}
        <div className="topActions">
          <Link className="topBtn topBtnGhost" href="/dashboard">
            Dashboard
          </Link>

          <details className="postMenu" ref={postMenuRef}>
            <summary className="topBtn topBtnPrimary postMenuBtn">
              Post / List <span className="postMenuCaret">▾</span>
            </summary>

            <div className="postMenuPanel">
              <div className="postMenuFooter">
                <div className="postMenuFootNote">
                  Track leads in{" "}
                  <Link
                    className="postMenuInlineLink"
                    href="/dashboard/buyer/enquiries"
                    onClick={closePostMenu}
                  >
                    My Enquiries
                  </Link>{" "}
                  &{" "}
                  {/* ✅ UPDATED HERE */}
                  <Link
                    className="postMenuInlineLink"
                    href="/vendor/inbox-v2"
                    onClick={closePostMenu}
                  >
                    Vendor Inbox
                  </Link>
                  .
                </div>
              </div>
            </div>
          </details>

          <Link className="topBtn topBtnGhost" href="/login">
            Login
          </Link>

          <details className="topMobileMenu" ref={mobileMenuRef}>
            <summary className="topHamburger">
              <span />
              <span />
              <span />
            </summary>

            <div className="topMobilePanel">
              <div className="topMobileGroup">
                <div className="topMobileTitle">Account</div>
                <Link className="topMobileLink" href="/dashboard">
                  Dashboard
                </Link>
                {/* ✅ UPDATED HERE */}
                <Link className="topMobileLink" href="/vendor/inbox-v2">
                  Vendor Inbox
                </Link>
                <Link className="topMobileLink" href="/login">
                  Login
                </Link>
              </div>
            </div>
          </details>
        </div>
      </div>

      {/* Sub Bar */}
      <div className="topSubBar">
        <div className="topSubBarInner">
          <div className="topHint">
            Browse verified listings • Compare rates • Contact vendors • Track enquiries
          </div>
          <div className="topSubLinks">
            <Link className="topSubLink" href="/dashboard/buyer/enquiries">
              My Enquiries
            </Link>

            {/* ✅ UPDATED HERE */}
            <Link className="topSubLink" href="/vendor/inbox-v2">
              Vendor Inbox
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}