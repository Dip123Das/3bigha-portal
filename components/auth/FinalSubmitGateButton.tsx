"use client";

import { useRouter } from "next/navigation";
import { ensureBusinessProfileComplete } from "@/lib/ensureBusinessProfileComplete";

export function FinalSubmitGateButton(props: {
  returnTo: string;
  onAllowed: () => void | Promise<void>;
  label?: string;
}) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={async () => {
        const gate = await ensureBusinessProfileComplete(props.returnTo);
        if (!gate.ok) {
          router.push(gate.redirectTo);
          return;
        }
        await props.onAllowed();
      }}
      style={{ padding: 10, fontWeight: 700 }}
    >
      {props.label ?? "Final Submit"}
    </button>
  );
}
