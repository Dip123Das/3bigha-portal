import Link from "next/link";
import React from "react";

type OperationalEmptyStateProps = {
  icon?: string;
  title?: string;
  message?: string;
  actionLabel?: string;
  actionHref?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
};

export function OperationalEmptyState({
  icon = "📭",
  title = "Nothing here yet",
  message = "Start with a simple action. 3Bigha will guide the next step.",
  actionLabel,
  actionHref,
  secondaryLabel,
  secondaryHref,
}: OperationalEmptyStateProps) {
  return (
    <div className="ui-operational-state">
      <div className="ui-operational-state-icon">{icon}</div>
      <div>
        <h3>{title}</h3>
        <p>{message}</p>
      </div>

      {(actionLabel && actionHref) || (secondaryLabel && secondaryHref) ? (
        <div className="ui-operational-state-actions">
          {actionLabel && actionHref ? (
            <Link className="ui-btn ui-btn--primary" href={actionHref}>
              {actionLabel}
            </Link>
          ) : null}

          {secondaryLabel && secondaryHref ? (
            <Link className="ui-btn ui-btn--secondary" href={secondaryHref}>
              {secondaryLabel}
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
