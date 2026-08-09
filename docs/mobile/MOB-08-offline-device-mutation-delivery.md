# MOB-08 — Offline-Safe Device Mutation Delivery

MOB-08 provides a deliberately narrow offline retry boundary for the idempotent push-device enable and disable operations introduced in MOB-07. A person’s latest choice for one installation is encrypted on that device, coalesced to one pending operation, and retried with the current authenticated session when connectivity returns.

The queue contains no access token, password, service credential, role, approval or financial data. It is user- and installation-scoped, bounded to eight entries, and never changes server state without re-authentication. A non-retryable server rejection removes the rejected item instead of retrying forever.

The interface immediately explains that the choice is saved locally and still waiting for internet. The dashboard remains usable, and a later enable/disable choice replaces the older pending choice for that installation.

## Deliberate exclusions

Identity declaration, onboarding, verification evidence, approval, RFQ, inventory, billing and every other business mutation remain online-only. They require task-specific idempotency, conflict and stale-data rules before they can safely enter any offline workflow. MOB-08 does not create a generic mutation authority.

Root/mobile TypeScript, MOB-01 through MOB-08 assertions, and Android/iOS production exports must pass before publication.
