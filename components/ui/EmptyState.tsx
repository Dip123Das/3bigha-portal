import React from "react";

type EmptyStateProps = {
  message?: string;
};

export function EmptyState({ message = "No results found." }: EmptyStateProps) {
  return (
    <div style={{ marginTop: 16, color: "#5b6472" }}>
      {message}
    </div>
  );
}
