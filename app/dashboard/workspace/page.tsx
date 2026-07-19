"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import ThreeBOSWorkContextChooser from "@/components/layout/ThreeBOSWorkContextChooser";
import UniversalDashboardShell from "@/components/operational/UniversalDashboardShell";
import { SectionSkeleton } from "@/components/ui/Skeleton";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
import { useOptional3BOSRuntime } from "@/lib/3bos/context";
import type { ThreeBOSAvailableAction } from "@/lib/3bos/runtime";

import styles from "./workspace.module.css";

type OperatingAreaKey =
  | "marketplace"
  | "procurement"
  | "business"
  | "finance"
  | "projects"
  | "assistance";

type OperatingArea = {
  key: OperatingAreaKey;
  label: string;
  description: string;
  actionKeys: string[];
  capabilityKeys: string[];
  workspaceKeys: string[];
};

const OPERATING_AREAS: OperatingArea[] = [
  {
    key: "marketplace",
    label: "Marketplace",
    description: "Find, list and compare property, materials, services and rentals.",
    actionKeys: ["marketplace", "property_market", "material_market", "service_market", "rental_market"],
    capabilityKeys: ["marketplace", "property_management"],
    workspaceKeys: ["property", "material_business", "rental_business", "contractor", "professional"],
  },
  {
    key: "procurement",
    label: "Procurement",
    description: "Create requirements, review quotations and continue supplier work.",
    actionKeys: ["requirements", "submit_requirement", "buyer_requirements", "rfqs"],
    capabilityKeys: ["rfq", "procurement"],
    workspaceKeys: ["customer"],
  },
  {
    key: "business",
    label: "Business",
    description: "Run listings, stock, billing, customers, dispatch and daily operations.",
    actionKeys: ["inventory", "billing", "dispatch", "customers", "my_materials", "my_services", "my_rentals"],
    capabilityKeys: ["business_operations", "billing", "inventory", "customer_relationships", "communication"],
    workspaceKeys: ["material_business", "rental_business", "contractor", "professional"],
  },
  {
    key: "finance",
    label: "Finance",
    description: "Understand funding, investment and financial decisions in one place.",
    actionKeys: ["finance", "investments", "opportunities", "applications"],
    capabilityKeys: ["finance", "investment"],
    workspaceKeys: ["investor", "banker"],
  },
  {
    key: "projects",
    label: "Projects",
    description: "Continue construction, builder and execution work with clear next steps.",
    actionKeys: ["projects", "construction_projects", "deal_rooms"],
    capabilityKeys: ["project_management", "construction"],
    workspaceKeys: ["builder", "construction_business"],
  },
  {
    key: "assistance",
    label: "Assistance",
    description: "Open conversations and contextual help when it genuinely supports your work.",
    actionKeys: ["inbox", "messages", "conversations"],
    capabilityKeys: ["communication", "intelligent_assistance", "business_insights"],
    workspaceKeys: [],
  },
];

function belongsToArea(action: ThreeBOSAvailableAction, area: OperatingArea) {
  return (
    area.actionKeys.includes(action.key) ||
    area.capabilityKeys.includes(action.capability) ||
    area.workspaceKeys.includes(action.workspaceKey)
  );
}

export default function UnifiedWorkspacePage() {
  const router = useRouter();
  const context = useOptional3BOSRuntime();
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const [sessionChecked, setSessionChecked] = useState(false);

  useEffect(() => {
    let active = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;

      if (!data.session) {
        router.replace("/login?next=/dashboard/workspace");
        return;
      }

      setSessionChecked(true);
    });

    return () => {
      active = false;
    };
  }, [router, supabase]);

  const actions = context?.actionProjection.allAvailableActions ?? [];
  const primaryWorkspace = context?.runtime?.workspaces.primary ?? null;
  const needsHumanChoice = Boolean(
    context?.runtime?.identity.requiresHumanSelection &&
      !context.runtime.identity.humanConfirmed
  );

  if (!sessionChecked || !context || !context.runtime) {
    return (
      <UniversalDashboardShell
        eyebrow="My Workspace"
        title="Preparing your 3BOS workspace"
        subtitle="Bringing your existing work together without changing your access or workflows."
      >
        <SectionSkeleton cards={6} />
      </UniversalDashboardShell>
    );
  }

  if (needsHumanChoice || !primaryWorkspace) {
    return (
      <UniversalDashboardShell
        eyebrow="My Workspace"
        title="Choose what you want to work on"
        subtitle="3Bigha will not guess your business identity. Choose your work area; you can change it at any time."
      >
        <ThreeBOSWorkContextChooser />
        <div className={styles.compatibilityNote}>
          Your existing dashboards, permissions and saved work remain unchanged.
          <Link href="/dashboard">Open the existing dashboard</Link>
        </div>
      </UniversalDashboardShell>
    );
  }

  return (
    <UniversalDashboardShell
      eyebrow="India's Human-First Business Operating System"
      title="My 3BOS Workspace"
      subtitle="See what needs attention, continue your work and move naturally between every part of your business. AI remains available as assistance; you remain in control."
    >
      <section className={styles.identityBar} aria-label="Current work context">
        <div>
          <span>Working as</span>
          <strong>{context.runtime.identity.primary?.label ?? "3Bigha member"}</strong>
        </div>
        <div>
          <span>Current workspace</span>
          <strong>{primaryWorkspace.label}</strong>
        </div>
        <ThreeBOSWorkContextChooser />
      </section>

      <section className={styles.nextStep} aria-labelledby="workspace-next-step">
        <div>
          <span className={styles.eyebrow}>Continue your work</span>
          <h2 id="workspace-next-step">What would you like to do now?</h2>
          <p>Choose a familiar business activity. Each link opens the existing production workflow.</p>
        </div>
        {actions[0] ? (
          <Link href={actions[0].href} className={styles.primaryAction}>
            {actions[0].label} <span aria-hidden="true">→</span>
          </Link>
        ) : null}
      </section>

      <section className={styles.areaGrid} aria-label="3BOS operating areas">
        {OPERATING_AREAS.map((area) => {
          const areaActions = actions.filter((action) => belongsToArea(action, area));
          const uniqueActions = areaActions.filter(
            (action, index, collection) =>
              collection.findIndex((candidate) => candidate.href === action.href) === index
          );
          const displayedActions = uniqueActions.slice(0, 4);

          return (
            <article key={area.key} className={styles.areaCard}>
              <header>
                <span className={styles.areaNumber} aria-hidden="true">
                  {String(OPERATING_AREAS.indexOf(area) + 1).padStart(2, "0")}
                </span>
                <div>
                  <h2>{area.label}</h2>
                  <p>{area.description}</p>
                </div>
              </header>

              <div className={styles.actionList}>
                {displayedActions.length > 0 ? (
                  displayedActions.map((action) => (
                    <Link key={`${action.workspaceKey}:${action.key}:${action.href}`} href={action.href}>
                      <span>
                        <strong>{action.label}</strong>
                        <small>{action.workspaceLabel}</small>
                      </span>
                      <span aria-hidden="true">→</span>
                    </Link>
                  ))
                ) : (
                  <div className={styles.inactiveArea}>
                    This area is not active in your current workspace.
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </section>

      <div className={styles.compatibilityNote}>
        This workspace brings existing modules together. No saved work, URL, permission or dashboard has been replaced.
        <Link href="/dashboard">Open the existing dashboard resolver</Link>
      </div>
    </UniversalDashboardShell>
  );
}
