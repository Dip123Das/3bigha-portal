"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

export default function ActiveLink({
  href,
  children,
  className,
  activeClassName = "isActive",
  exact = false,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
  activeClassName?: string;
  exact?: boolean;
}) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isActive = useMemo(() => {
    if (!mounted) return false; // ✅ avoids hydration mismatch
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  }, [mounted, pathname, href, exact]);

  const cls = `${className ?? ""} ${isActive ? activeClassName : ""}`.trim();

  return (
    <Link href={href} className={cls} aria-current={isActive ? "page" : undefined}>
      {children}
    </Link>
  );
}