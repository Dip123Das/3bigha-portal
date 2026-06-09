"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";

export default function MobileAppSearchBar() {
  const router = useRouter();
  const pathname = usePathname() || "";
  const [q, setQ] = useState("");

  if (pathname.startsWith("/login") || pathname.startsWith("/auth")) return null;

  const submit = () => {
    const text = q.trim();
    if (!text) return;
    router.push(`/search?q=${encodeURIComponent(text)}`);
  };

  return (
    <div className="mobile-app-search-bar">
      <div className="mobile-app-search-inner">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
          placeholder="Search property, materials, services..."
        />
        <button type="button" onClick={submit}>Search</button>
      </div>
    </div>
  );
}
