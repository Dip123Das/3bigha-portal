import type { ThreeBOSRuntime } from "@/lib/3bos/runtime";

export type HomepageRuntimeEvidence = {
  status: "uninitialized" | "ready" | "ambiguous";
  runtime: ThreeBOSRuntime | null;
};

export type HomepageWorkspaceAction = {
  key: string;
  label: string;
  description: string;
  href: string;
};

export type HomepageProjection = {
  mode: "public" | "confirmed-workspace";
  workdeskLabel: string;
  workdeskTitle: string;
  workdeskDescription: string;
  primaryWorkspaceLabel: string | null;
  primaryWorkspaceHref: string;
  primaryWorkspaceActionLabel: string;
  workspaceActions: HomepageWorkspaceAction[];
};
