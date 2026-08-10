# MOB-18 — Native Device Reauthentication

MOB-18 closes the local-human trust gap that remains after canonical foreground
session validation. When an authenticated app has been away for at least one
minute, its privacy shield stays in place while the operating system verifies
the returning person with enrolled biometrics or the device's secure fallback.
Brief task switching remains interruption-free.

The authenticated application tree stays mounted. Its content is revealed only
after device verification and the independent MOB-17 Supabase refresh have both
succeeded. Cancellation, lockout, unavailable device security and unexpected
local-authentication failures disclose no cached work; the person can retry or
sign out safely on that device.

3Bigha receives only the operating system's success or failure result. It never
reads, stores, uploads or interprets biometric material. Device verification is
only a local disclosure gate: it cannot establish identity, role, approval,
verification, entitlement or business authority.

This milestone adds no backend API, database, RLS policy, permission, business
mutation or workflow change. Root/mobile TypeScript, resolved Expo
configuration, MOB-01 through MOB-18 assertions, and Android/iOS production
exports must pass before publication. Physical Face ID, Touch ID, Android
biometric and device-passcode fallback checks remain release-device gates.
