import type { ReactNode } from "react";

type SahajAssistantPanelProps = {
  title?: string;
  children: ReactNode;
};

export default function SahajAssistantPanel({
  title = "3Bigha Assistant",
  children,
}: SahajAssistantPanelProps) {
  return (
    <aside className="sahajAssistantPanel">
      <div className="sahajAssistantTitle">{title}</div>
      {children}
    </aside>
  );
}
