import React from "react";
import { cn } from "@/lib/cn";

type SkeletonProps = React.HTMLAttributes<HTMLDivElement> & {
  lines?: number;
};

export function Skeleton({ className, ...props }: SkeletonProps) {
  return <div className={cn("ui-skeleton", className)} {...props} />;
}

export function TextSkeleton({ lines = 3, className, ...props }: SkeletonProps) {
  return (
    <div className={cn("ui-skeleton-stack", className)} {...props}>
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className={cn(
            "ui-skeleton ui-skeleton-line",
            index === lines - 1 ? "ui-skeleton-line-short" : ""
          )}
        />
      ))}
    </div>
  );
}

export function CardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="ui-card ui-skeleton-card" aria-hidden="true">
      <div className="ui-card__body">
        <div className="ui-skeleton ui-skeleton-title" />
        <TextSkeleton lines={lines} />
      </div>
    </div>
  );
}

export function SectionSkeleton({ cards = 3 }: { cards?: number }) {
  return (
    <div className="ui-section-skeleton" aria-label="Loading content">
      {Array.from({ length: cards }).map((_, index) => (
        <CardSkeleton key={index} lines={index === 0 ? 4 : 3} />
      ))}
    </div>
  );
}
