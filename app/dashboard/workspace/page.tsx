"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import ThreeBOSWorkContextChooser from "@/components/layout/ThreeBOSWorkContextChooser";
import BusinessIdentityCenter from "@/components/business-identity/BusinessIdentityCenter";
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
};

const OPERATING_AREAS: OperatingArea[] = [
  {
    key: "marketplace",
    label: "Marketplace",
    description: "Find, list and compare property, materials, services and rentals.",
  },
  {
    key: "procurement",
    label: "Procurement",
    description: "Create requirements, review quotations and continue supplier work.",
  },
  {
    key: "business",
    label: "Business",
    description: "Run listings, stock, billing, customers, dispatch and daily operations.",
  },
  {
    key: "finance",
    label: "Finance",
    description: "Understand funding, investment and financial decisions in one place.",
  },
  {
    key: "projects",
    label: "Projects",
    description: "Continue construction, builder and execution work with clear next steps.",
  },
  {
    key: "assistance",
    label: "Assistance",
    description: "Open conversations and contextual help when it genuinely supports your work.",
  },
];

const ACTION_AREA_OVERRIDES: Partial<Record<string, OperatingAreaKey>> = {
  marketplace: "marketplace",
  property_market: "marketplace",
  material_market: "marketplace",
  service_market: "marketplace",
  rental_market: "marketplace",
  my_properties: "marketplace",
  my_materials: "marketplace",
  my_services: "marketplace",
  my_rentals: "marketplace",
  add_property: "marketplace",
  add_material: "marketplace",
  add_service: "marketplace",
  add_rental: "marketplace",
  requirements: "procurement",
  submit_requirement: "procurement",
  buyer_requirements: "procurement",
  project_requirements: "procurement",
  rfqs: "procurement",
  inventory: "business",
  billing: "business",
  dispatch: "business",
  customers: "business",
  fleet: "business",
  finance: "finance",
  investments: "finance",
  opportunities: "finance",
  applications: "finance",
  deal_rooms: "finance",
  projects: "projects",
  construction_projects: "projects",
  inbox: "assistance",
  messages: "assistance",
  conversations: "assistance",
};

function resolveOperatingArea(action: ThreeBOSAvailableAction): OperatingAreaKey {
  const explicitArea = ACTION_AREA_OVERRIDES[action.key];
  if (explicitArea) return explicitArea;

  switch (action.capability) {
    case "rfq":
      return "procurement";
    case "finance":
    case "investment":
      return "finance";
    case "project_management":
      return "projects";
    case "communication":
    case "intelligent_assistance":
    case "business_insights":
      return "assistance";
    case "billing":
    case "customer_relationships":
    case "business_operations":
      return "business";
    case "marketplace":
    case "property_management":
      return "marketplace";
    default:
      return "business";
  }
}

export default function UnifiedWorkspacePage() {
  const router = useRouter();
  const context = useOptional3BOSRuntime();
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [changingContext, setChangingContext] = useState(false);
  const [showingOtherWork, setShowingOtherWork] = useState(false);

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

  const primaryActions = context?.primaryWorkspaceActions ?? [];
  const crossWorkspaceActions = context?.crossWorkspaceActions ?? [];
  const primaryWorkspace = context?.runtime?.workspaces.primary ?? null;
  const isMultiBusinessWorkspace = primaryWorkspace?.key === "multi_business";
  const currentActions = isMultiBusinessWorkspace
    ? context?.actionProjection.allAvailableActions ?? []
    : primaryActions;
  const primaryNextAction =
    currentActions.find((action) => action.key === "business_overview") ??
    currentActions[0] ??
    null;
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
        workFirst
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
        workFirst
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
      workFirst
    >
      <section className={styles.identityBar} aria-label="Current work context">
        <div>
          <span>Working as</span>
          <strong>
            {isMultiBusinessWorkspace
              ? "Multi-business operator"
              : context.runtime.identity.primary?.label ?? "3Bigha member"}
          </strong>
        </div>
        <div>
          <span>Current workspace</span>
          <strong>{primaryWorkspace.label}</strong>
        </div>
        <button
          type="button"
          className={styles.changeContextButton}
          aria-expanded={changingContext}
          aria-controls="workspace-context-chooser"
          onClick={() => setChangingContext((current) => !current)}
        >
          {changingContext ? "Close" : "Change work context"}
        </button>
      </section>

      {changingContext ? (
        <div id="workspace-context-chooser" className={styles.contextChooserPanel}>
          <ThreeBOSWorkContextChooser />
        </div>
      ) : null}

      <BusinessIdentityCenter />

      <section className={styles.nextStep} aria-labelledby="workspace-next-step">
        <div>
          <span className={styles.eyebrow}>Continue your work</span>
          <h2 id="workspace-next-step">What would you like to do now?</h2>
          <p>Choose a familiar business activity. Each link opens the existing production workflow.</p>
        </div>
        {primaryNextAction ? (
          <Link href={primaryNextAction.href} className={styles.primaryAction}>
            {primaryNextAction.label} <span aria-hidden="true">→</span>
          </Link>
        ) : null}
      </section>

      <section className={styles.areaGrid} aria-label="3BOS operating areas">
        {OPERATING_AREAS.map((area) => {
          const presentedArea =
            isMultiBusinessWorkspace && area.key === "finance"
              ? {
                  ...area,
                  label: "Investment",
                  description:
                    "Explore investment opportunities, applications and deal rooms without implying banking access.",
                }
              : area;
          const areaActions = currentActions.filter(
            (action) => resolveOperatingArea(action) === area.key
          );
          const uniqueActions = areaActions.filter(
            (action, index, collection) =>
              collection.findIndex((candidate) => candidate.href === action.href) === index
          );
          const representativeActions = uniqueActions.filter(
            (action, index, collection) =>
              collection.findIndex(
                (candidate) => candidate.workspaceKey === action.workspaceKey
              ) === index
          );
          const additionalActions = uniqueActions.filter(
            (action) => !representativeActions.includes(action)
          );
          const orderedActions = isMultiBusinessWorkspace
            ? [...representativeActions, ...additionalActions]
            : uniqueActions;
          const previewLimit = isMultiBusinessWorkspace
            ? representativeActions.length
            : 4;
          const displayedActions = orderedActions.slice(0, previewLimit);
          const disclosedActions = orderedActions.slice(previewLimit);

          return (
            <article key={area.key} className={styles.areaCard}>
              <header>
                <span className={styles.areaNumber} aria-hidden="true">
                  {String(OPERATING_AREAS.indexOf(area) + 1).padStart(2, "0")}
                </span>
                <div>
                  <h2>{presentedArea.label}</h2>
                  <p>{presentedArea.description}</p>
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

              {disclosedActions.length > 0 ? (
                <details className={styles.moreActions}>
                  <summary>
                    Show {disclosedActions.length} more {presentedArea.label.toLowerCase()} {disclosedActions.length === 1 ? "action" : "actions"}
                  </summary>
                  <div className={`${styles.actionList} ${styles.additionalActionList}`}>
                    {disclosedActions.map((action) => (
                      <Link key={`${action.workspaceKey}:${action.key}:${action.href}`} href={action.href}>
                        <span>
                          <strong>{action.label}</strong>
                          <small>{action.workspaceLabel}</small>
                        </span>
                        <span aria-hidden="true">→</span>
                      </Link>
                    ))}
                  </div>
                </details>
              ) : null}
            </article>
          );
        })}
      </section>

      {!isMultiBusinessWorkspace && crossWorkspaceActions.length > 0 ? (
        <section className={styles.otherWorkSection} aria-labelledby="other-workspaces-title">
          <div className={styles.otherWorkHeading}>
            <div>
              <span className={styles.eyebrow}>Available when you need them</span>
              <h2 id="other-workspaces-title">Other workspaces</h2>
              <p>
                Keep your current business focused. Open another resolved workspace only when you want to work there.
              </p>
            </div>
            <button
              type="button"
              aria-expanded={showingOtherWork}
              aria-controls="other-workspace-actions"
              onClick={() => setShowingOtherWork((current) => !current)}
            >
              {showingOtherWork
                ? "Hide other workspaces"
                : `Show other workspaces (${context.runtime.workspaces.available.length - 1})`}
            </button>
          </div>

          {showingOtherWork ? (
            <div id="other-workspace-actions" className={styles.otherWorkspaceGrid}>
              {Object.entries(
                crossWorkspaceActions.reduce<Record<string, ThreeBOSAvailableAction[]>>(
                  (groups, action) => {
                    const group = groups[action.workspaceLabel] ?? [];
                    if (!group.some((item) => item.href === action.href)) {
                      group.push(action);
                    }
                    groups[action.workspaceLabel] = group;
                    return groups;
                  },
                  {}
                )
              ).map(([workspaceLabel, workspaceActions]) => (
                <article key={workspaceLabel} className={styles.otherWorkspaceCard}>
                  <h3>{workspaceLabel}</h3>
                  <div className={styles.actionList}>
                    {workspaceActions.slice(0, 4).map((action) => (
                      <Link key={`${action.workspaceKey}:${action.key}:${action.href}`} href={action.href}>
                        <span>
                          <strong>{action.label}</strong>
                          <small>{OPERATING_AREAS.find((area) => area.key === resolveOperatingArea(action))?.label}</small>
                        </span>
                        <span aria-hidden="true">→</span>
                      </Link>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      <div className={styles.compatibilityNote}>
        This workspace brings existing modules together. No saved work, URL, permission or dashboard has been replaced.
        <Link href="/dashboard">Open the existing dashboard resolver</Link>
      </div>
    </UniversalDashboardShell>
  );
}
