import type { ReactNode } from "react";
import { SectionHeader } from "@/components/layout/SectionHeader";

export type PageHeaderProps = {
  title: string;
  description?: string;
  right?: ReactNode;
};

export function PageHeader({ title, description, right }: PageHeaderProps) {
  return <SectionHeader title={title} subtitle={description} right={right} />;
}
