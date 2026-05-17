import type { ReactNode } from "react";

export function VendorErpWorkspace({
  children,
  rightRail,
}: {
  children: ReactNode;
  rightRail?: ReactNode;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: rightRail ? "minmax(0, 1fr) 320px" : "1fr",
        gap: 16,
        alignItems: "start",
      }}
    >
      <div style={{ minWidth: 0 }}>{children}</div>

      {rightRail ? (
        <aside
          style={{
            position: "sticky",
            top: 90,
            display: "grid",
            gap: 12,
          }}
        >
          {rightRail}
        </aside>
      ) : null}
    </div>
  );
}