import {
  evaluateProcurementMemoryProfile,
  type ProcurementMemoryProfile,
} from "@/lib/procurement/intelligence/memory/procurement-memory-profile";

import { presentProcurementMemory } from "@/lib/procurement/intelligence/memory/memory-presentation";

type Props = {
  profile: ProcurementMemoryProfile;
  compact?: boolean;
};

export default function ProcurementMemoryBadge({
  profile,
  compact = false,
}: Props) {
  const memory = evaluateProcurementMemoryProfile(profile);

  const presentation = presentProcurementMemory(memory);

  return (
    <div
      style={{
        border: `1px solid ${presentation.border}`,
        background: presentation.background,
        color: presentation.color,
        borderRadius: compact ? 999 : 14,
        padding: compact ? "4px 10px" : 12,
        fontSize: compact ? 11 : 13,
        fontWeight: 900,
        display: "inline-flex",
        flexDirection: compact ? "row" : "column",
        gap: compact ? 6 : 4,
        alignItems: compact ? "center" : "flex-start",
      }}
      title={memory.reasons.join(" ")}
    >
      <span>{presentation.shortLabel}</span>

      {!compact ? (
        <>
          <span style={{ fontSize: 12, fontWeight: 700 }}>
            {presentation.label}
          </span>

          <span style={{ fontSize: 12, fontWeight: 700 }}>
            {presentation.operationalMessage}
          </span>
        </>
      ) : null}
    </div>
  );
}
