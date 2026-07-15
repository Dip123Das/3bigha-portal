"use client";

import { useMemo } from "react";

import { useOptional3BOSRuntime } from "@/lib/3bos/context";
import {
  clearActiveWorkContext,
  persistActiveWorkContext,
  type HumanIdentityKey,
} from "@/lib/3bos/identity";
import {
  getWorkspacesForIdentity,
  type WorkspaceDefinition,
} from "@/lib/3bos/workspace";

const WORK_CHOICE_LABELS: Partial<
  Record<HumanIdentityKey, string>
> = {
  customer: "Manage my requirements",
  property_owner: "Manage properties",
  builder: "Manage building projects",
  construction_business: "Manage construction work",
  contractor: "Manage contract work",
  material_business: "Manage materials",
  rental_business: "Manage rentals",
  professional: "Offer professional services",
  skilled_workforce: "Find skilled work",
  investor: "Explore investments",
  author: "Write and manage articles",
};

function chooseWorkspace(
  identityKey: HumanIdentityKey
): WorkspaceDefinition | null {
  const workspaces = getWorkspacesForIdentity(identityKey).filter(
    (workspace) => workspace.status !== "future"
  );

  return (
    workspaces.find(
      (workspace) => workspace.status === "production"
    ) ??
    workspaces[0] ??
    null
  );
}

export default function ThreeBOSWorkContextChooser() {
  const context = useOptional3BOSRuntime();

  const choices = useMemo(() => {
    const suggestions =
      context?.runtime?.identity.suggestions ?? [];

    return suggestions
      .map((suggestion) => {
        const workspace = chooseWorkspace(
          suggestion.identity.key
        );

        if (!workspace) return null;

        return {
          identity: suggestion.identity,
          workspace,
          label:
            WORK_CHOICE_LABELS[
              suggestion.identity.key
            ] ?? `Open ${workspace.shortLabel}`,
        };
      })
      .filter(
        (choice): choice is NonNullable<typeof choice> =>
          choice != null
      );
  }, [context?.runtime?.identity.suggestions]);

  if (!context?.runtime?.userId) return null;

  const { runtime } = context;

  if (runtime.identity.humanConfirmed && runtime.identity.primary) {
    return (
      <section className="threeBOSWorkContextChooser threeBOSWorkContextActive">
        <div>
          <strong>Working on</strong>
          <span>{runtime.workspaces.primary?.shortLabel ?? runtime.identity.primary.label}</span>
        </div>
        <button
          type="button"
          onClick={() => {
            clearActiveWorkContext();
            context.updateRuntimeInput({
              activeIdentityKey: null,
              preferredWorkspaceKey: null,
            });
          }}
        >
          Change
        </button>
      </section>
    );
  }

  if (choices.length < 2) {
    return null;
  }

  return (
    <section
      className="threeBOSWorkContextChooser"
      aria-labelledby="three-bos-work-context-title"
    >
      <div className="threeBOSWorkContextHeading">
        <strong id="three-bos-work-context-title">
          What would you like to work on now?
        </strong>
        <span>
          Choose a work area for this session. You can change it anytime.
        </span>
      </div>

      <div className="threeBOSWorkContextChoices">
        {choices.map((choice) => (
          <button
            key={choice.identity.key}
            type="button"
            onClick={() => {
              persistActiveWorkContext({
                version: 1,
                userId: runtime.userId!,
                identityKey: choice.identity.key,
                workspaceKey: choice.workspace.key,
              });

              context.updateRuntimeInput({
                activeIdentityKey: choice.identity.key,
                preferredWorkspaceKey: choice.workspace.key,
              });
            }}
          >
            {choice.label}
          </button>
        ))}
      </div>

      <small>
        Your existing menu and access stay unchanged.
      </small>
    </section>
  );
}
