# MOB-22 — Native Cold-Start Session Lock

MOB-22 closes the local disclosure gap left when the operating system starts a
new 3Bigha application process and restores an existing authenticated session.
The mounted application tree remains behind the existing root privacy shield
until operating-system device verification succeeds.

The cold-start decision is made once in memory after canonical session
restoration completes. A person who starts signed out and completes a new
sign-in in the same process is not asked for a second, redundant device check.
Cancellation, lockout or verification failure keeps restored work hidden and
offers the existing safe retry and local sign-out choices.

3Bigha receives only the operating system's success or failure result. No
biometric material, cold-start history or verification result is logged,
persisted or transmitted. Device verification remains a local disclosure gate
and cannot establish identity, role, approval, verification, entitlement or
business authority.

This milestone adds no dependency, permission, backend endpoint, database,
schema, RLS policy, business mutation or workflow change. Root/mobile
TypeScript, resolved Expo configuration, MOB-01 through MOB-22 assertions, and
Android/iOS production exports must pass. Physical-device terminated-process,
unlock, cancellation, signed-out start and new-sign-in checks remain release
device gates.
