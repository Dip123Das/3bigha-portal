# MOB-05 — Native Role Dashboards and Capability Screens

## Decision

The native application renders its home surface only from the authenticated MOB-02 bootstrap contract. The server-owned `primaryDashboard` key selects presentation; registration state controls entry; canonical navigation and capability projections control what is visible.

MOB-05 introduces no mobile role resolver, workspace registry, grant mechanism or dashboard activation rule.

## Included

- Native dashboard presentation for administrator, editorial administrator, banker, investor, vendor, publisher and buyer keys.
- Registration gating back to MOB-04 whenever the canonical server requires another action.
- Authorised navigation destinations and a distinct Unified Workspace entry.
- Native capability groups and capability detail surfaces derived only from the server projection.
- Pull-to-refresh, dignified empty/error states and device-local sign-out.
- Explicit compatibility handoff to existing production web workflows that do not yet have native task screens.

## Authority boundary

The client never submits or infers roles, identities, approvals, grants, entitlements or capability activation. Unknown or absent server capabilities remain hidden. Unified Workspace remains separate from the primary role dashboard and no existing URL, permission, saved work or business workflow is replaced.

## Verification

Root and native TypeScript, MOB-01 through MOB-05 assertions, and Android/iOS production exports must pass before publication.
