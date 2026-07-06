import React from "react";
import { ActionButton } from "@/components/ui/ActionButton";

type EmptyStateProps = {
  message?: string;
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  actionHref?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
};

export function EmptyState({
  message,
  title = "Nothing to show yet",
  description,
  icon = "📭",
  actionLabel,
  actionHref,
  secondaryLabel,
  secondaryHref,
}: EmptyStateProps) {
  const body = description || message || "When new activity appears, it will show up here.";

  return (
    <div className="ui-empty-state">
      <div className="ui-empty-state__icon">{icon}</div>
      <h3 className="ui-empty-state__title">{title}</h3>
      <p className="ui-empty-state__description">{body}</p>

      {(actionLabel && actionHref) || (secondaryLabel && secondaryHref) ? (
        <div className="ui-empty-state__actions">
          {actionLabel && actionHref ? (
            <ActionButton href={actionHref}>{actionLabel}</ActionButton>
          ) : null}

          {secondaryLabel && secondaryHref ? (
            <ActionButton href={secondaryHref} variant="secondary">
              {secondaryLabel}
            </ActionButton>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
