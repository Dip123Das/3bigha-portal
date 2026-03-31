import React from "react";
import { cn } from "@/lib/cn";

type CardProps = React.HTMLAttributes<HTMLDivElement>;

export function Card({ className, ...props }: CardProps) {
  return <div className={cn("ui-card", className)} {...props} />;
}

export function CardHeader({ className, ...props }: CardProps) {
  return <div className={cn("ui-card__header", className)} {...props} />;
}

export function CardBody({ className, ...props }: CardProps) {
  return <div className={cn("ui-card__body", className)} {...props} />;
}

export function CardFooter({ className, ...props }: CardProps) {
  return <div className={cn("ui-card__footer", className)} {...props} />;
}
