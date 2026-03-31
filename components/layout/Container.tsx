import React from "react";
import { cn } from "@/lib/cn";

type Props = React.HTMLAttributes<HTMLDivElement>;

export function Container({ className, ...props }: Props) {
  return <div className={cn("layout-container", className)} {...props} />;
}
