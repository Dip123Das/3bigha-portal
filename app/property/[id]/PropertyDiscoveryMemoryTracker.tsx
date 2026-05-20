"use client";

import { useEffect } from "react";
import { rememberDiscoveryView } from "@/lib/personalized-discovery/discovery-memory";

export default function PropertyDiscoveryMemoryTracker({
  id,
  title,
  city,
  district,
  locality,
  type,
  category,
  price,
}: {
  id: string;
  title: string;
  city?: string | null;
  district?: string | null;
  locality?: string | null;
  type?: string | null;
  category?: string | null;
  price?: number | null;
}) {
  useEffect(() => {
    rememberDiscoveryView({
      id,
      module: "property",
      title,
      href: `/property/${id}`,
      city,
      district,
      locality,
      type,
      category,
      price,
    });
  }, [id, title, city, district, locality, type, category, price]);

  return null;
}