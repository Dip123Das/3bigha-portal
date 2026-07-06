export default function WorkflowFooter({
  onBack,
  onNext,
  nextLabel = "Next",
  backLabel = "Back",
  nextDisabled = false,
}: {
  onBack?: () => void;
  onNext?: () => void;
  nextLabel?: string;
  backLabel?: string;
  nextDisabled?: boolean;
}) {
  return (
    <div className="mt-5 flex flex-wrap gap-3">
      {onBack ? (
        <button type="button" onClick={onBack} className="rounded-2xl border px-5 py-3 font-black">
          {backLabel}
        </button>
      ) : null}

      {onNext ? (
        <button
          type="button"
          onClick={onNext}
          disabled={nextDisabled}
          className="rounded-2xl bg-emerald-600 px-5 py-3 font-black text-white disabled:opacity-40"
        >
          {nextLabel}
        </button>
      ) : null}
    </div>
  );
}
