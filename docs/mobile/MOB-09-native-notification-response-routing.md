# MOB-09 — Native Notification Response Routing

MOB-09 completes the response side of the existing native push lifecycle. Android and iOS notification taps are handled during cold start, background return and active-app use. A tapped alert is presented only after the canonical native session is available, and the dashboard refreshes its server-owned bootstrap and aggregate state before the person continues.

Only a bounded relative path from the existing server push payload may become an action. External origins, protocol-relative values, backslash variants, oversized values and malformed URLs are rejected. Silent sync notifications never create a visible action. Missing or rejected targets fall back to the refreshed native dashboard with a clear explanation.

The app does not derive a role, entitlement, approval or destination from a notification category, conversation ID or RFQ ID. It creates no notification inbox, navigation authority, schema, RLS policy or grant. Complete business tasks continue through the existing canonical workspace while task-specific native screens evolve.

Root/mobile TypeScript, MOB-01 through MOB-09 assertions, and Android/iOS production exports must pass before publication.
