// app/vendor/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function VendorPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard/vendor");
  }, [router]);

  return null;
}
