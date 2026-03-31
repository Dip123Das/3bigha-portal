"use client";

import React from "react";
import { FilterPill } from "@/components/ui/FilterPill";

export type FilterBarItem = {
  key: string;
  label: string;
};

type FilterBarProps = {
  items: FilterBarItem[];
  activeKey: string;
  onChange: (key: string) => void;

  /** Optional: add a left label like "All" group name later */
  ariaLabel?: string;

  /** Optional: spacing control */
  gap?: number;
};

export function FilterBar({
  items,
  activeKey,
  onChange,
  ariaLabel = "Filters",
  gap = 10,
}: FilterBarProps) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      style={{
        display: "flex",
        gap,
        flexWrap: "wrap",
        marginTop: 10,
      }}
    >
      {items.map((item) => (
        <FilterPill
          key={item.key}
          label={item.label}
          selected={activeKey === item.key}
          onClick={() => onChange(item.key)}
        />
      ))}
    </div>
  );
}
