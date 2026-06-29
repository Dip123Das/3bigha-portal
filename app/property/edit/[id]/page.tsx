"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Container } from "@/components/layout/Container";
import { EmptyState } from "@/components/ui/EmptyState";

export default function PropertyEditRedirectPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id || "";

  useEffect(() => {
    if (id) {
      router.replace(`/property/add?edit=${encodeURIComponent(id)}`);
    }
  }, [id, router]);

  return (
    <Container>
      <EmptyState message="Opening the modern property editor..." />
    </Container>
  );
}
