import React from "react";
import { cn } from "@/lib/cn";

export type ExecutiveStatItem = {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  description?: React.ReactNode;
  tone?: "dark" | "light" | "blue" | "green" | "amber" | "violet";
};

export function ExecutiveStatCard({
  label,
  value,
  icon,
  description,
  tone = "dark",
}: ExecutiveStatItem) {
  return (
    <div className={cn("executive-stat-card", `executive-stat-card--${tone}`)}>
      {icon ? <span className="executive-stat-card__icon">{icon}</span> : null}
      <div className="executive-stat-card__body">
        <strong>{value}</strong>
        <small>{label}</small>
        {description ? <em>{description}</em> : null}
      </div>
    </div>
  );
}

export function ExecutiveStatGrid({
  items,
  className,
}: {
  items: ExecutiveStatItem[];
  className?: string;
}) {
  return (
    <div className={cn("executive-stat-grid", className)}>
      {items.map((item) => (
        <ExecutiveStatCard key={item.label} {...item} />
      ))}
    </div>
  );
}
