export default function ProgressHeader({
  steps,
  activeIndex,
}: {
  steps: string[];
  activeIndex: number;
}) {
  return (
    <div className="mb-5 flex flex-wrap gap-2 text-xs font-black">
      {steps.map((step, index) => (
        <span
          key={step}
          className={`rounded-full px-3 py-2 ${
            activeIndex === index
              ? "bg-slate-950 text-white"
              : "bg-slate-100 text-slate-600"
          }`}
        >
          {index + 1}. {step}
        </span>
      ))}
    </div>
  );
}
