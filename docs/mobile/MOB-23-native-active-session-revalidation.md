# MOB-23 — Native Active-Session Revalidation

MOB-23 closes the server-authority gap left when an authenticated native app
remains continuously active. Returning from the background is already governed
by MOB-17, but mounted work must not wait indefinitely for the ordinary token
lifecycle to discover a remotely revoked or otherwise invalid session.

While an authenticated app remains active, one root-owned timer reuses the
existing canonical Supabase refresh path every five minutes. The mounted tree
stays behind the existing privacy shield during the check. A canonical 400,
401 or 403 rejection clears the local session and returns to sign-in. A
temporary transport or service failure remains fail-closed and offers the
existing human-controlled retry.

Backgrounding, sign-out and provider unmount cancel the timer. Returning to the
foreground uses the independent MOB-17 check and starts a fresh interval.
Overlapping lifecycle triggers share one in-flight validation so they cannot
create competing refreshes or contradictory disclosure state.

The interval stores and transmits no activity history and creates no mobile
authentication authority. This milestone adds no dependency, permission,
backend endpoint, database change, schema, RLS policy, identity, role, approval,
entitlement, business mutation or workflow change. Root/mobile TypeScript,
resolved Expo configuration, MOB-01 through MOB-23 assertions, and Android/iOS
production exports must pass. Physical-device continuous-use, remote-revocation,
offline-retry, background and sign-out checks remain release-device gates.
