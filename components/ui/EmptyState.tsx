import React from "react";

type EmptyStateProps = {
  message?: string;
};

export function EmptyState({ message = "No results found." }: EmptyStateProps) {
  return (
    <div className="ui-empty-state">
      {message}
    </div>
  );
}
