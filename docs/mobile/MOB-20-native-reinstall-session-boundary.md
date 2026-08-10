# MOB-20 — Native Reinstall Session Boundary

MOB-20 closes the session-restoration gap created by platform credential stores
that can outlive application removal. Encrypted Supabase session storage is now
paired with a non-secret sentinel in ordinary application storage. A normal
upgrade retains both values and preserves the existing session.

If ordinary application storage is absent while the encrypted sentinel remains,
the app treats the launch as a reinstall or cleared application. Any surviving
encrypted Supabase session requested during client restoration is deleted before
it can become an authenticated session, so the new installation begins signed
out and must authenticate against canonical Supabase authority again.

The sentinel contains only the fixed word `present`. It contains no user ID,
token, identity, role, verification, approval, entitlement or business data.
It cannot grant authority, and the check does not contact a new service, create
an installation identity or alter canonical authentication behavior.

This milestone adds one Expo-compatible native storage dependency and no
backend API, database, RLS policy, business mutation or workflow change.
Root/mobile TypeScript, resolved Expo configuration, MOB-01 through MOB-20
assertions, and Android/iOS production exports must pass before publication.
Physical upgrade, uninstall/reinstall and cleared-app-data checks remain
release-device gates.
