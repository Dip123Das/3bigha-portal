# MOB-14 — Native Network Resilience and Safe Request Delivery

MOB-14 gives every canonical mobile API call one bounded, privacy-safe request
contract. Bootstrap, dashboard, onboarding and push-device traffic now share a
finite timeout, cancellation cleanup, authenticated headers, explicit no-store
semantics and strict JSON-envelope validation.

Network, timeout, service and malformed-response failures are translated into
human-readable categories without displaying request bodies, tokens, raw
exceptions or server traces. Retryable status is explicit for the existing
offline push-device queue, while identity and onboarding mutations are never
automatically replayed because their safe idempotency remains server-owned.

This sprint adds no endpoint, dependency, permission, cache, diagnostic store,
API schema, database object, RLS policy, identity resolver, role rule, approval
path or business mutation. Physical-device validation on weak, interrupted and
recovered networks remains a release gate.
