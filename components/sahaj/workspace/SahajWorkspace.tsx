import type { ReactNode } from "react";

type SahajWorkspaceProps = {
  children: ReactNode;
};

export default function SahajWorkspace({ children }: SahajWorkspaceProps) {
  return <div className="sahajWorkspace">{children}</div>;
}
