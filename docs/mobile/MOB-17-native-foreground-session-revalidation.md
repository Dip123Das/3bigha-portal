# MOB-17 — Native Foreground Session Revalidation

MOB-17 keeps the root privacy surface visible while an authenticated app
returns to the foreground. Before the mounted application tree is revealed,
the saved session is refreshed through canonical Supabase authentication. A
valid session resumes the existing tree without reconstructing identity, role
or business authority on the device.

An absent or authoritatively rejected session returns to the existing signed-
out gateway. A temporary validation failure fails closed: cached work remains
hidden behind fixed privacy-safe language and the person can deliberately try
again. No raw authentication error, token, identity or business response is
rendered, logged or persisted by this boundary.

This sprint adds no dependency, permission, endpoint, schema, RLS policy,
identity resolver, role rule, approval path or business mutation. Physical
foreground restoration, revoked-session and offline-retry checks remain
release-device gates. Root/mobile TypeScript, resolved Expo configuration,
MOB-01 through MOB-17 assertions, and Android/iOS production exports must pass.
