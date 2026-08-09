# MOB-15 — Native Authentication Deep-Link Integrity

MOB-15 gives email and Google sign-in one canonical native callback trust
boundary. Cold-start links, live links and browser-completion results must match
the exact callback URL produced for the installed 3Bigha app before a PKCE
authorization code can reach Supabase session exchange.

The validator rejects another scheme, host or route; embedded credentials;
fragments; missing, oversized or duplicate codes; and every unexpected query
parameter. One accepted callback is consumed once in memory. A deliberate new
email or Google sign-in attempt resets that gate, so duplicate operating-system
delivery cannot repeat an exchange while a person can still begin again.

Callback URLs and authorization codes are never logged, stored, transmitted to
a diagnostic service or shown back to the person. Failures use bounded,
human-readable language and leave the person signed out with a clear recovery
path.

This sprint adds no endpoint, dependency, permission, backend configuration,
schema, RLS policy, identity resolver, role rule, approval path or business
mutation. Root/mobile TypeScript, resolved Expo configuration, MOB-01 through
MOB-15 assertions, and Android/iOS production exports must pass.
