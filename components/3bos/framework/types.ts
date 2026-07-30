import type { ReactNode } from "react";
import type { BusinessOsTone } from "@/lib/design/business-os-tokens";

export type BusinessOsAction = {
  key: string;
  label: string;
  description?: string;
  href: string;
  icon?: ReactNode;
  tone?: BusinessOsTone;
  count?: number | string;
};

export type BusinessOsMetric = {
  key: string;
  label: string;
  value: number | string;
  description?: string;
  href?: string;
  tone?: BusinessOsTone;
};

export type BusinessOsJourneyStage = {
  key: string;
  label: string;
  description?: string;
  href: string;
  icon?: ReactNode;
  status?: "complete" | "current" | "upcoming";
};

export type BusinessOsProjection = {
  identity: {
    eyebrow?: string;
    title: string;
    subtitle?: string;
    imageUrl?: string | null;
    trustLabels?: string[];
  };
  primaryAction?: BusinessOsAction;
  workNow: BusinessOsAction[];
  journey: BusinessOsJourneyStage[];
  priorities: BusinessOsAction[];
  pulse: BusinessOsMetric[];
  assistance?: {
    eyebrow?: string;
    title: string;
    description?: string;
    action?: BusinessOsAction;
  };
  mobileNavigation?: BusinessOsAction[];
};
