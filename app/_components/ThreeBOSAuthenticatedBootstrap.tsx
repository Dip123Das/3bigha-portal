"use client";

import { useEffect, useMemo, useRef } from "react";

import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

import {
  create3BOSRuntimeInputFromLegacy,
  type LegacyBusinessProfileRuntimeSource,
  type LegacyProfileRuntimeSource,
} from "@/lib/3bos/bootstrap";

import { use3BOSRuntime } from "@/lib/3bos/context";

type BootstrapProfileRow = LegacyProfileRuntimeSource;

type BootstrapBusinessProfileRow =
  LegacyBusinessProfileRuntimeSource;

function timeoutAfter(
  milliseconds: number,
  label: string
): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(
        new Error(
          `${label} timed out after ${milliseconds}ms`
        )
      );
    }, milliseconds);
  });
}

/**
 * Silently supplies authenticated compatibility signals to 3BOS.
 *
 * Important:
 * - renders no UI;
 * - performs read-only queries;
 * - does not redirect;
 * - does not decide permission;
 * - does not modify authentication;
 * - does not block the application.
 */
export default function ThreeBOSAuthenticatedBootstrap() {
  const supabase = useMemo(
    () => getSupabaseBrowser(),
    []
  );

  const {
    setRuntimeInput,
    clearRuntime,
  } = use3BOSRuntime();

  const activeUserIdRef =
    useRef<string | null>(null);

  useEffect(() => {
    let alive = true;
    let requestSequence = 0;

    async function bootstrapForUser(
      userId: string
    ) {
      const currentSequence = ++requestSequence;

      try {
        const profileResponse = await Promise.race([
          supabase
            .from("profiles")
            .select(
              [
                "id",
                "role",
                "requested_role",
                "portal_use_reason",
              ].join(",")
            )
            .eq("id", userId)
            .maybeSingle(),

          timeoutAfter(
            5000,
            "3BOS profile bootstrap"
          ),
        ]);

        if (
          !alive ||
          currentSequence !== requestSequence
        ) {
          return;
        }

        const profileError =
          (profileResponse as any)?.error ?? null;

        const profile =
          ((profileResponse as any)?.data ??
            null) as BootstrapProfileRow | null;

        if (profileError) {
          console.warn(
            "THREE_BOS_PROFILE_BOOTSTRAP_READ_FAILED",
            profileError
          );

          /*
           * Runtime remains empty.
           * Existing application behavior continues unchanged.
           */
          return;
        }

        if (!profile?.id) {
          /*
           * Do not create a profile here.
           * Existing registration and post-login flows remain authoritative.
           */
          clearRuntime();
          return;
        }

        let businessProfile:
          | BootstrapBusinessProfileRow
          | null = null;

        try {
          const businessProfileResponse =
            await Promise.race([
              supabase
                .from("business_profiles")
                .select(
                  [
                    "business_type",
                    "nature_of_business",
                  ].join(",")
                )
                .eq("user_id", userId)
                .maybeSingle(),

              timeoutAfter(
                5000,
                "3BOS business profile bootstrap"
              ),
            ]);

          if (
            !alive ||
            currentSequence !== requestSequence
          ) {
            return;
          }

          const businessProfileError =
            (businessProfileResponse as any)
              ?.error ?? null;

          if (businessProfileError) {
            console.warn(
              "THREE_BOS_BUSINESS_BOOTSTRAP_READ_FAILED",
              businessProfileError
            );
          } else {
            businessProfile =
              ((businessProfileResponse as any)
                ?.data ??
                null) as BootstrapBusinessProfileRow | null;
          }
        } catch (businessError) {
          /*
           * Business profile information is optional.
           * Identity can still be derived from the existing profile.
           */
          console.warn(
            "THREE_BOS_BUSINESS_BOOTSTRAP_FAILED",
            businessError
          );
        }

        if (
          !alive ||
          currentSequence !== requestSequence
        ) {
          return;
        }

        const bootstrap =
          create3BOSRuntimeInputFromLegacy({
            userId,
            profile,
            businessProfile,

            /*
             * Commercial access remains controlled by the
             * existing subscription/access system.
             *
             * Until its authoritative source is connected,
             * the adapter maps this compatibility value to Start.
             */
            access: {
              plan: "free",
            },
          });

        setRuntimeInput(bootstrap.input);
      } catch (error) {
        /*
         * Runtime bootstrap must never disrupt the application.
         */
        console.warn(
          "THREE_BOS_AUTHENTICATED_BOOTSTRAP_FAILED",
          error
        );
      }
    }

    async function applySession(
      session: {
        user?: {
          id?: string | null;
        } | null;
      } | null
    ) {
      if (!alive) return;

      const userId =
        session?.user?.id?.trim() || null;

      if (!userId) {
        activeUserIdRef.current = null;
        requestSequence += 1;
        clearRuntime();
        return;
      }

      if (
        activeUserIdRef.current === userId
      ) {
        return;
      }

      activeUserIdRef.current = userId;

      await bootstrapForUser(userId);
    }

    void supabase.auth
      .getSession()
      .then(({ data }) => {
        void applySession(
          data.session as any
        );
      })
      .catch((error) => {
        console.warn(
          "THREE_BOS_SESSION_BOOTSTRAP_FAILED",
          error
        );
      });

    const {
      data: authListener,
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!session?.user?.id) {
          activeUserIdRef.current = null;
          requestSequence += 1;
          clearRuntime();
          return;
        }

        const nextUserId =
          session.user.id.trim();

        if (
          !nextUserId ||
          activeUserIdRef.current ===
            nextUserId
        ) {
          return;
        }

        activeUserIdRef.current =
          nextUserId;

        void bootstrapForUser(
          nextUserId
        );
      }
    );

    return () => {
      alive = false;
      requestSequence += 1;

      authListener.subscription.unsubscribe();
    };
  }, [
    supabase,
    setRuntimeInput,
    clearRuntime,
  ]);

  return null;
}
