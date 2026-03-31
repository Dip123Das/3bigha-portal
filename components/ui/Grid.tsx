import React from "react";
import { cn } from "@/lib/cn";

type GridProps = {
  children: React.ReactNode;
  min?: number; // min card width in px
  gap?: number; // gap in px
  className?: string;
  style?: React.CSSProperties;
};

export function Grid({ children, min = 260, gap = 14, className, style }: GridProps) {
  return (
    <div
      className={cn(className)}
      style={{
        display: "grid",
        gap,
        gridTemplateColumns: `repeat(auto-fit, minmax(${min}px, 1fr))`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
