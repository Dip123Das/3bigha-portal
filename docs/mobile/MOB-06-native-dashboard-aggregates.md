# MOB-06 — Native Dashboard Aggregate Data

MOB-06 adds a separate authenticated, versioned and non-cacheable read-only dashboard summary. It does not enlarge bootstrap identity authority or create a mobile analytics store.

`GET /api/v1/mobile/dashboard` resolves the canonical dashboard on the server and returns only exact count cards appropriate to that dashboard. Every query uses the caller's authenticated Supabase client and explicit user ownership filters where the metric is personal. Existing RLS remains authoritative.

- No raw business, finance, message, profile or identity rows leave the endpoint.
- No service-role client, new table, policy, RPC, grant or mutation is introduced.
- A failed metric is returned as unavailable; it cannot block the native dashboard.
- The client renders data only when the endpoint dashboard key matches bootstrap.
- Every card links to the corresponding canonical production workspace.

Root and native TypeScript, MOB-01 through MOB-06 assertions, and Android/iOS production exports must pass before publication.
