# MOB-21 — Native Foreground Inactivity Lock

MOB-21 closes the local-human disclosure gap left when an authenticated native
application stays open and visible without interaction. After five minutes with
no local touch activity, the mounted application tree is hidden behind the
existing root privacy shield and the operating system must verify the returning
person before work is revealed again.

Touch activity only restarts an in-memory timer while authenticated work is
already visible. Backgrounding cancels that timer and remains governed by the
independent MOB-17 and MOB-18 foreground-return boundaries. Signing out cancels
the timer. No interaction timestamps or activity history are logged, persisted,
uploaded or exposed to application APIs.

Device verification receives only the operating system's success or failure
result. This local disclosure safeguard cannot establish identity, role,
approval, verification, entitlement or business authority.

This milestone adds no dependency, permission, backend endpoint, database,
schema, RLS policy, business mutation or workflow change. Root/mobile
TypeScript, resolved Expo configuration, MOB-01 through MOB-21 assertions, and
Android/iOS production exports must pass. Physical-device idle, unlock,
cancellation, background and sign-out checks remain release-device gates.
