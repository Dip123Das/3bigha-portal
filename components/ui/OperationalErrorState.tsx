import React from "react";

type OperationalErrorStateProps = {
  title?: string;
  message?: string;
  onRetry?: () => void;
};

export function OperationalErrorState({
  title = "Could not load this section",
  message = "Please check your connection and try again. Your workflow is safe.",
  onRetry,
}: OperationalErrorStateProps) {
  return (
    <div className="ui-operational-state ui-operational-state-error">
      <div className="ui-operational-state-icon">⚠️</div>
      <div>
        <h3>{title}</h3>
        <p>{message}</p>
      </div>

      {onRetry ? (
        <div className="ui-operational-state-actions">
          <button className="ui-btn ui-btn--secondary" type="button" onClick={onRetry}>
            Try again
          </button>
        </div>
      ) : null}
    </div>
  );
}
