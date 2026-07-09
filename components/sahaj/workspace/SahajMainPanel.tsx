import type { ReactNode } from "react";

type SahajMainPanelProps = {
  children: ReactNode;
};

export default function SahajMainPanel({ children }: SahajMainPanelProps) {
  return <section className="sahajMainPanel">{children}</section>;
}
