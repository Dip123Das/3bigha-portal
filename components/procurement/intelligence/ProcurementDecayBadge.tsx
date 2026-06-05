import {
  evaluateProcurementDecay,
  type ProcurementDecaySignals,
} from "@/lib/procurement/intelligence/decay-signals";
import { presentProcurementDecay } from "@/lib/procurement/intelligence/decay-presentation";

type Props = {
  signals: ProcurementDecaySignals;
  compact?: boolean;
};

export default function ProcurementDecayBadge({
  signals,
  compact = false,
}: Props) {
  const decay = evaluateProcurementDecay(signals);
  const presentation = presentProcurementDecay(decay);

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
      title={decay.reasons.join(" ")}
    >
      <span>{presentation.shortLabel}</span>

      {!compact ? (
        <>
          <span style={{ fontSize: 12, fontWeight: 700 }}>
            {presentation.label}
          </span>

          {presentation.recommendedAction ? (
            <span style={{ fontSize: 12, fontWeight: 700 }}>
              {presentation.recommendedAction}
            </span>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
