"use client";

import { useEffect, useMemo, useState } from "react";

import type {
  CanonicalTrustModel,
  CanonicalTrustSubject,
} from "@/lib/trust";

type TrustByUserId = Record<string, CanonicalTrustModel>;

type UseMarketplaceTrustOptions = {
  subject?: CanonicalTrustSubject;
  enabled?: boolean;
};

function normalizeUserIds(
  userIds: readonly (string | null | undefined)[]
) {
  return Array.from(
    new Set(
      userIds
        .map((value) => String(value ?? "").trim())
        .filter(Boolean)
    )
  );
}

export function useMarketplaceTrust(
  userIds: readonly (string | null | undefined)[],
  options: UseMarketplaceTrustOptions = {}
) {
  const normalizedIds = useMemo(
    () => normalizeUserIds(userIds),
    [userIds]
  );

  const requestKey = normalizedIds.join(",");
  const enabled = options.enabled !== false;

  const [trustByUserId, setTrustByUserId] =
    useState<TrustByUserId>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;

    if (!enabled || normalizedIds.length === 0) {
      setTrustByUserId({});
      setLoading(false);
      return () => {
        active = false;
      };
    }

    setLoading(true);

    fetch("/api/trust/bulk", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userIds: normalizedIds,
        subject: options.subject,
      }),
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            payload?.error ||
              "Unable to load marketplace trust."
          );
        }

        return (
          payload?.trustByUserId as
            | TrustByUserId
            | undefined
        ) ?? {};
      })
      .then((next) => {
        if (active) setTrustByUserId(next);
      })
      .catch((error) => {
        console.warn(
          "MARKETPLACE_TRUST_LOAD_FAILED",
          error
        );

        if (active) setTrustByUserId({});
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [enabled, requestKey, options.subject]);

  return {
    trustByUserId,
    loading,
  };
}

export type {
  TrustByUserId,
  UseMarketplaceTrustOptions,
};
