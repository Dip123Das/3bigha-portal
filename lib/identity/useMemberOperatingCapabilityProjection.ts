"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
import { loadMemberCanonicalIdentityKeys } from "@/lib/identity/loadMemberCanonicalIdentityKeys";
import {
  loadOperatingCapabilityProjection,
  type OperatingCapabilityProjection,
} from "@/lib/identity/loadOperatingCapabilityProjection";

type OperatingProjectionState = {
  loading: boolean;
  error: string | null;
  userId: string | null;
  identityKeys: string[];
  projection: OperatingCapabilityProjection;
};

const EMPTY_PROJECTION: OperatingCapabilityProjection = {
  capabilityKeys: [],
  groups: {},
  defaultPaths: {},
};

export function useMemberOperatingCapabilityProjection() {
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const [state, setState] = useState<OperatingProjectionState>({
    loading: true,
    error: null,
    userId: null,
    identityKeys: [],
    projection: EMPTY_PROJECTION,
  });

  const reload = useCallback(async () => {
    setState((current) => ({
      ...current,
      loading: true,
      error: null,
    }));

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        setState({
          loading: false,
          error: null,
          userId: null,
          identityKeys: [],
          projection: EMPTY_PROJECTION,
        });
        return;
      }

      const identitySources =
        await loadMemberCanonicalIdentityKeys(
          supabase,
          user.id
        );

      const projection =
        await loadOperatingCapabilityProjection(
          supabase,
          identitySources.allIdentityKeys
        );

      setState({
        loading: false,
        error: null,
        userId: user.id,
        identityKeys: identitySources.allIdentityKeys,
        projection,
      });
    } catch (error: any) {
      setState({
        loading: false,
        error:
          error?.message ||
          "Could not resolve 3BOS operating capabilities.",
        userId: null,
        identityKeys: [],
        projection: EMPTY_PROJECTION,
      });
    }
  }, [supabase]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return {
    ...state,
    reload,
    hasCapability: (capabilityKey: string) =>
      state.projection.capabilityKeys.includes(
        capabilityKey
      ),
  };
}
