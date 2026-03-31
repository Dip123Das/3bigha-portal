"use client";

export default function TestGptButton() {
  return (
    <button
      type="button"
      onClick={async () => {
        const res = await fetch("/api/inbox-ai", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: "Investment Deal Room",
            subtitle: "Builder discussion",
            counterpart: "Test Builder",
            statusLabel: "Active",
            stageLabel: "Discussion",
            module: "investment",
            side: "investor",
            unreadCount: 1,
            metaLine: "demo",
          }),
        });

        const data = await res.json();
        console.log("GPT RESULT:", data);
        alert(JSON.stringify(data, null, 2));
      }}
      className="inline-flex items-center rounded-2xl bg-black px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
    >
      Test GPT
    </button>
  );
}