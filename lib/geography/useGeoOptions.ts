"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type GeoOption = {
  id: string;
  name: string;
  slug?: string | null;
  state_id?: string | null;
  district_id?: string | null;
  subdivision_id?: string | null;
  block_id?: string | null;
  pincode?: string | null;
  place_type?: string | null;
};

type UseGeoOptionsParams = {
  type: string;
  enabled?: boolean;
  stateId?: string;
  districtId?: string;
  subdivisionId?: string;
  blockId?: string;
  q?: string;
  limit?: number;
  offset?: number;
  debounceMs?: number;
};

type GeoOptionsResponse = {
  options: GeoOption[];
  hasMore?: boolean;
  nextOffset?: number;
};

const geoOptionsCache = new Map<string, GeoOptionsResponse>();

function cacheKey(params: UseGeoOptionsParams) {
  return JSON.stringify({
    type: params.type,
    stateId: params.stateId || "",
    districtId: params.districtId || "",
    subdivisionId: params.subdivisionId || "",
    blockId: params.blockId || "",
    q: params.q || "",
    limit: params.limit || 200,
    offset: params.offset || 0,
  });
}

export function useGeoOptions(params: UseGeoOptionsParams) {
  const {
    enabled = true,
    debounceMs = 250,
  } = params;

  const [data, setData] = useState<GeoOptionsResponse>({ options: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const key = useMemo(() => cacheKey(params), [params]);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!enabled || !params.type) {
      setData({ options: [] });
      setLoading(false);
      setError(null);
      return;
    }

    const cached = geoOptionsCache.get(key);
    if (cached) {
      setData(cached);
      setLoading(false);
      setError(null);
      return;
    }

    const timer = window.setTimeout(async () => {
      abortRef.current?.abort();

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        setLoading(true);
        setError(null);

        const url = new URL("/api/geography/options", window.location.origin);
        url.searchParams.set("type", params.type);

        if (params.stateId) url.searchParams.set("stateId", params.stateId);
        if (params.districtId) url.searchParams.set("districtId", params.districtId);
        if (params.subdivisionId) url.searchParams.set("subdivisionId", params.subdivisionId);
        if (params.blockId) url.searchParams.set("blockId", params.blockId);
        if (params.q) url.searchParams.set("q", params.q);
        if (params.limit) url.searchParams.set("limit", String(params.limit));
        if (params.offset) url.searchParams.set("offset", String(params.offset));

        const res = await fetch(url.toString(), {
          cache: "no-store",
          signal: controller.signal,
        });

        const json = await res.json();
        const nextData: GeoOptionsResponse = {
          options: Array.isArray(json.options) ? json.options : [],
          hasMore: Boolean(json.hasMore),
          nextOffset:
            typeof json.nextOffset === "number" ? json.nextOffset : undefined,
        };

        geoOptionsCache.set(key, nextData);
        setData(nextData);
      } catch (err: any) {
        if (err?.name !== "AbortError") {
          setError(err?.message || "Failed to load geography options");
          setData({ options: [] });
        }
      } finally {
        setLoading(false);
      }
    }, debounceMs);

    return () => {
      window.clearTimeout(timer);
      abortRef.current?.abort();
    };
  }, [enabled, debounceMs, key, params]);

  return {
    options: data.options,
    hasMore: Boolean(data.hasMore),
    nextOffset: data.nextOffset,
    loading,
    error,
  };
}
