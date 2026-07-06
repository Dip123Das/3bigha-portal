import type { ReactNode } from "react";
import { SectionHeader } from "@/components/layout/SectionHeader";

export type PageHeaderProps = {
  title: string;
  description?: string;
  eyebrow?: string;
  right?: ReactNode;
  children?: ReactNode;
};

export function PageHeader({
  title,
  description,
  eyebrow,
  right,
  children,
}: PageHeaderProps) {
  return (
    <SectionHeader
      title={title}
      subtitle={description}
      eyebrow={eyebrow}
      right={right}
    >
      {children}
    </SectionHeader>
  );
}
