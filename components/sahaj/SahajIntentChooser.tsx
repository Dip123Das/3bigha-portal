import type { SahajInputMode } from "@/lib/sahaj/types";

const choices: Array<{
  mode: SahajInputMode;
  icon: string;
  title: string;
  description: string;
}> = [
  { mode: "type", icon: "✍️", title: "Type it", description: "I will type my requirement." },
  { mode: "photo", icon: "📷", title: "Upload photo", description: "I have a handwritten note or photo." },
  { mode: "document", icon: "📄", title: "Upload document", description: "I have PDF, BOQ, Excel or drawing." },
  { mode: "voice", icon: "🎤", title: "Speak it", description: "I will describe it by voice." },
  { mode: "guided", icon: "🤝", title: "Help me", description: "Ask me simple questions." },
];

export default function SahajIntentChooser({
  onChoose,
}: {
  onChoose: (mode: SahajInputMode) => void;
}) {
  return (
    <div className="grid gap-4">
      <div>
        <h2 className="text-2xl font-black text-slate-950">
          How would you like to tell us your requirement?
        </h2>
        <p className="mt-2 text-slate-600">
          Choose the easiest option. 3Bigha will prepare the professional format.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {choices.map((choice) => (
          <button
            key={choice.mode}
            type="button"
            onClick={() => onChoose(choice.mode)}
            className="rounded-3xl border bg-white p-5 text-left hover:border-emerald-500 hover:bg-emerald-50"
          >
            <div className="text-3xl">{choice.icon}</div>
            <div className="mt-3 text-xl font-black text-slate-950">{choice.title}</div>
            <div className="mt-1 text-sm font-bold text-slate-600">{choice.description}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
