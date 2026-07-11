# API Standards

## Ownership

Every API must identify:

- owning 3BOS Engine;
- capability;
- identities served;
- permission requirement;
- database ownership.

## Security

- Authenticate before protected operations.
- Authorise the specific action, not only the account.
- Never trust client-supplied roles or entitlement values.
- Keep service-role usage limited and explicit.
- Validate ownership for record-level operations.
- Avoid exposing sensitive internal fields.

## Human-Centred Errors

API errors should support respectful user recovery.

Internal technical details may be logged, while public responses should clearly
explain what the person can do next.

## Stability

- Preserve existing contracts during migration.
- Version breaking changes.
- Use compatibility adapters where possible.
- Validate input and output consistently.
- Keep operations idempotent where appropriate.
- Record important administrative and automated actions.

## AI APIs

AI-assisted endpoints must define:

- source inputs;
- uncertainty or confidence where relevant;
- human review point;
- safe fallback;
- audit requirements.
