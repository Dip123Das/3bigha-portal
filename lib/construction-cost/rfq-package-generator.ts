import {
  buildAutoConstructionRfqPlan,
  type AutoConstructionRfqInput,
  type AutoConstructionRfqPackage,
  type AutoConstructionRfqPlan,
} from "./auto-rfq-builder";

export type ConstructionRfqDraftPayload = {
  module: AutoConstructionRfqPackage["module"];
  title: string;
  description: string;
  priority: AutoConstructionRfqPackage["priority"];
  items: AutoConstructionRfqPackage["suggestedItems"];
  metadata: {
    source: "ai_construction_plan";
    packageKey: string;
    generatedAt: string;
  };
};

export type ConstructionRfqDraftResult = {
  ok: true;
  plan: AutoConstructionRfqPlan;
  drafts: ConstructionRfqDraftPayload[];
};

export function generateConstructionRfqDrafts(
  input: AutoConstructionRfqInput,
): ConstructionRfqDraftResult {
  const plan = buildAutoConstructionRfqPlan(input);

  const drafts: ConstructionRfqDraftPayload[] = plan.packages.map((pkg) => ({
    module: pkg.module,
    title: pkg.title,
    description: pkg.description,
    priority: pkg.priority,
    items: pkg.suggestedItems,
    metadata: {
      source: "ai_construction_plan",
      packageKey: pkg.key,
      generatedAt: new Date().toISOString(),
    },
  }));

  return {
    ok: true,
    plan,
    drafts,
  };
}