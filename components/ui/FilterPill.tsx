import React from "react";
import { cn } from "@/lib/cn";

type FilterPillProps = {
  label: string;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
  title?: string;
};

export function FilterPill({ label, selected, onClick, className, title }: FilterPillProps) {
  return (
    <button
      type="button"
      className={cn("ui-pill", selected ? "ui-pill--selected" : "", className)}
      onClick={onClick}
      title={title}
      aria-pressed={selected ? "true" : "false"}
    >
      {label}
    </button>
  );
}
