import React from "react";
import { cn } from "@/lib/cn";

type BadgeProps = {
  children: React.ReactNode;
  className?: string;
};

export function Badge({ children, className }: BadgeProps) {
  return (
    <span
      className={cn(className)}
      style={{
        fontSize: 12,
        padding: "4px 8px",
        borderRadius: 12,
        background: "#f3f4f6",
        color: "#3f4754",
        whiteSpace: "nowrap",
        alignSelf: "flex-start",
      }}
    >
      {children}
    </span>
  );
}
