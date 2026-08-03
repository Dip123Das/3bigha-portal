"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  initialQuery?: string;
};

export default function MemberSidebarLiveSearch({
  initialQuery = "",
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState(initialQuery);

  useEffect(() => {
    const root = rootRef.current;
    const sidebar = root?.closest("aside");
    if (!sidebar) return;

    const normalized = query.trim().toLowerCase();
    const items = Array.from(
      sidebar.querySelectorAll<HTMLElement>("[data-member-search-item]")
    );

    let visible = 0;

    for (const item of items) {
      const haystack = (item.dataset.memberSearchText || "").toLowerCase();
      const matches = !normalized || haystack.includes(normalized);
      item.hidden = !matches;
      if (matches) visible += 1;
    }

    const count = sidebar.querySelector<HTMLElement>(
      "[data-member-search-count]"
    );
    if (count) {
      count.textContent = `${visible} matching ${
        visible === 1 ? "member" : "members"
      }`;
    }
  }, [query]);

  return (
    <div ref={rootRef} className="member-sidebar-live-search">
      <label htmlFor="member-sidebar-live-search">Find a member</label>

      <div>
        <input
          id="member-sidebar-live-search"
          type="search"
          value={query}
          autoComplete="off"
          placeholder="Name, email, business or role"
          onChange={(event) => setQuery(event.target.value)}
          aria-label="Find a member instantly"
        />

        {query ? (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Clear member search"
          >
            Clear
          </button>
        ) : (
          <button type="button" aria-label="Live member search is active">
            Search
          </button>
        )}
      </div>

      <small>Results update automatically while you type.</small>
    </div>
  );
}
