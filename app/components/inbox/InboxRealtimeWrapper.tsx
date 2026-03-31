"use client";

import { useRouter } from "next/navigation";
import useInboxRealtime from "@/app/components/inbox/useInboxRealtime";

export default function InboxRealtimeWrapper() {
  const router = useRouter();

  useInboxRealtime({
    onChange: () => {
      router.refresh();
    },
    debounceMs: 250,
  });

  return null;
}