# Constitutional Migration Ledger

This ledger records every approved Project NEEV production implementation.
An unchecked verification item is not evidence of failure; it means the item
has not yet been completed with sufficient evidence.

## NEEV-F01 — Constitutional shell compatibility layer

**Approval:** Approved by the repository owner on 15 July 2026.

**Scope:** Root provider composition and presentation-only shell navigation.

**Compatibility boundary:** Existing authentication, permissions, routes,
APIs, database behavior, subscription logic and legacy menu destinations remain
authoritative and unchanged.

- [x] Audit completed
- [x] Constitutional mapping completed
- [x] Design approved
- [x] Implementation completed
- [x] Build passed
- [x] Type check passed
- [x] Desktop verified
- [x] Mobile verified
- [x] Production verified
- [x] Regression checked

### Verification evidence

- `npx tsc --noEmit --pretty false` passed on 15 July 2026.
- `next build` passed on 15 July 2026 with non-production placeholder service
  configuration. It compiled successfully, completed TypeScript validation,
  generated all 293 static pages and completed build traces. No production
  credentials or production files were used.
- Isolated Hostinger staging built successfully with the production-compatible
  environment and returned HTTP 200 on port 3100.
- Anonymous desktop and mobile shell rendering were verified through a private
  SSH tunnel. Mobile header, menu, actions, content stacking and footer rendered
  without visible horizontal overflow.
- Four programmatic shell resolver assertions passed: anonymous fallback,
  legacy menu preservation, ready workspace context and ambiguous-runtime
  fallback.
- Authenticated visual staging verification could not be completed because the
  existing OAuth callback correctly returned to the configured production
  origin. Production authentication settings were not weakened or modified.
- Production was promoted on 15 July 2026 through an isolated, health-checked
  Hostinger build. Critical public routes returned HTTP 200, the new PM2 process
  remained online with zero restarts and the previous process was retained in a
  stopped state for rollback.
- Authenticated production navigation preserved the complete legacy My Work
  menu. The observed account did not receive a contextual workspace group,
  indicating that its runtime context was not sufficiently ready and
  unambiguous. The constitutional fallback operated correctly instead of
  guessing identity; activation evidence is carried forward to the next
  identity-runtime audit.

### Files

- `app/layout.tsx`
- `components/layout/DesktopMegaNavClient.tsx`
- `components/layout/MobileMegaNavClient.tsx`
- `lib/3bos/navigation/resolve-shell-navigation.ts`
- `lib/3bos/navigation/index.ts`
- `docs/3bos/26-Constitutional-Migration-Ledger.md`

### Rollback

Remove the experience provider wrapper and restore both menu clients to their
legacy `MENUS.filter(...)` selection. Delete the presentation resolver. No
database, authentication, API, permission or route rollback is required.

## NEEV-F02A — Read-only Human Identity signal activation

**Approval:** Approved by the repository owner on 15 July 2026.

**Scope:** Supply existing active vendor module grants as compatibility
evidence to the authenticated Human Identity Runtime bootstrap.

**Compatibility boundary:** Existing authentication, registration, onboarding,
grant ownership, RLS, permissions, routes and legacy access resolution remain
authoritative and unchanged. This bridge never creates, repairs, deletes or
updates a module grant.

- [x] Audit completed
- [x] Constitutional mapping completed
- [x] Design approved
- [x] Implementation completed
- [x] Build passed
- [x] Type check passed
- [x] Desktop verified
- [x] Mobile verified
- [x] Production verified
- [x] Regression checked

### Implementation evidence

- The authenticated bootstrap reads only active `vendor_module_grants` rows for
  the current user and supplies their module keys to the existing legacy
  compatibility adapter.
- A denied, failed or timed-out grant read is non-blocking and preserves the
  previous profile-based runtime behavior.
- Ambiguous and multi-identity evidence continues to require human selection;
  this migration does not assign a person's identity.
- The legacy access resolver and its historical auto-heal write path are not
  called by the 3BOS bootstrap.
- `npx tsc --noEmit --pretty false` passed on 15 July 2026.
- `next build` passed on 15 July 2026 with non-production placeholder service
  configuration. It compiled successfully, validated types, generated all 293
  static pages and completed build traces.
- Source regression inspection confirmed that the new grant bridge contains no
  insert, update, upsert or delete operation. Existing ambiguous-runtime and
  legacy-navigation fallbacks remain unchanged.
- Isolated Hostinger staging built successfully with the production-compatible
  environment, passed an independent server-side type check and returned HTTP
  200 on port 3200. The PM2 staging process remained online with zero restarts.
- Anonymous desktop and mobile staging rendered the complete homepage, shell,
  marketplace content and footer without visible horizontal overflow.
- Authenticated staging remained on the isolated origin and loaded the existing
  completed onboarding record for a multi-business `hub_vendor`. The My Work
  menu preserved every legacy group and action because the evidence remained
  intentionally multi-identity and ambiguous; the runtime did not force a
  primary identity or replace the human workflow.
- Pull request #1 was merged into `main` at commit `1ce8038`. The two reported
  checks were obsolete external Vercel deployment contexts for a blocked Vercel
  account; Hostinger is the approved publisher and its isolated verification
  completed successfully.
- Production was promoted through a validated Nginx upstream switch from port
  3000 to the already healthy F02A process on port 3200. The previous F01
  process remained online throughout the route switch, so no production
  interruption was introduced.
- After cutover, `/`, `/login`, `/property`, `/materials`, `/services`,
  `/rentals` and `/rfq` all returned HTTP 200. The F02A process remained online
  with zero restarts and an empty error log.
- Authenticated production preserved the complete legacy My Work menu for the
  observed multi-business account. F01 was then retained in a stopped rollback
  state, F02A was saved as the persistent PM2 startup process, and only port
  3200 remained listening.
- The pre-cutover Nginx configuration is retained at
  `/etc/nginx/sites-available/3bigha.neev-f02a.rollback` for immediate routing
  rollback.

### Files

- `app/_components/ThreeBOSAuthenticatedBootstrap.tsx`
- `docs/3bos/26-Constitutional-Migration-Ledger.md`

### Rollback

Remove the optional active-grant read and stop supplying `moduleKeys` to the
bootstrap adapter. No database, authentication, permission, API or route
rollback is required because this migration creates no persistent state.

## NEEV-F02B1 — Session-based Human Work Context confirmation

**Approval:** Approved by the repository owner on 15 July 2026.

**Scope:** Allow an authenticated person with several valid Human Identity
suggestions to choose what they want to work on for the current browser session.

**Compatibility boundary:** The choice is non-authoritative browser-session
context. Existing authentication, roles, grants, Growth Plans, permissions,
routes, database records, onboarding and legacy menu actions remain unchanged.

- [x] Audit completed
- [x] Constitutional mapping completed
- [x] Design approved
- [x] Implementation completed
- [x] Build passed
- [x] Type check passed
- [x] Desktop verified
- [x] Mobile verified
- [ ] Production verified
- [x] Regression checked

### Implementation evidence

- The My Work menu asks “What would you like to work on now?” only when current
  compatibility evidence produces multiple valid identity suggestions.
- A choice is accepted only when it remains present in current suggestions and
  has a non-future workspace. A mismatched stored workspace is not accepted as
  the primary workspace for that identity.
- Session context is versioned, scoped to the authenticated user id, cleared on
  logout and never written to the database.
- Choosing or changing a work context does not modify authorization. Existing
  legacy My Work groups and actions remain visible beneath contextual help.
- `npx tsc --noEmit --pretty false` passed on 15 July 2026.
- `next build` passed on 15 July 2026 with non-production placeholder service
  configuration. It compiled successfully, validated types, generated all 293
  static pages and completed build traces.
- Focused runtime regression assertions confirmed that ambiguous compatibility
  evidence remains unselected, a valid human choice activates its matching
  workspace, and an identity absent from current suggestions is rejected.
- Initial Hostinger staging showed that a multi-identity account with one
  higher-scoring legacy suggestion remained runtime-ready and therefore did not
  see the confirmation prompt. The chooser condition was narrowed to depend on
  two or more valid work choices while retaining the inferred identity as the
  non-blocking fallback until the person confirms a choice.
- Corrected Hostinger staging at commit `4bb455f` passed an independent type
  check and production build with the production-compatible environment. The
  build generated all 3,897 static pages; the isolated PM2 process on port 3300
  remained online with zero restarts and an empty error log.
- Authenticated desktop staging displayed nine human-readable work choices at
  the top of My Work while preserving all existing menu groups beneath them.
  Selecting Materials changed the session context to Material Business without
  redirecting, changing authorization or hiding legacy actions, and Change
  restored the complete choice list.
- Mobile staging displayed both the choice list and confirmed-context state in
  the existing hamburger menu without visible horizontal overflow. Remaining
  on the current page after a choice was confirmed as intentional, non-blocking
  behavior; navigation continues only when the person selects an existing link.
- Separate 404 responses observed for historical Site Work and Activity Feed
  links pre-exist F02B1 and were not altered by this identity migration. They
  are retained for a future route-continuity audit rather than silently changed
  inside this scope.

### Files

- `app/_components/ThreeBOSAuthenticatedBootstrap.tsx`
- `app/globals.css`
- `components/layout/DesktopMegaNavClient.tsx`
- `components/layout/MobileMegaNavClient.tsx`
- `components/layout/ThreeBOSWorkContextChooser.tsx`
- `lib/3bos/identity/active-work-context.ts`
- `lib/3bos/identity/index.ts`
- `lib/3bos/runtime/resolve.ts`
- `lib/3bos/runtime/types.ts`
- `docs/3bos/26-Constitutional-Migration-Ledger.md`

### Rollback

Remove the chooser, active-context session utility and optional runtime input.
Restore the desktop and mobile My Work panels to rendering only resolved menu
groups. No database, authentication, permission, API or route rollback is
required because this migration creates no persistent institutional state.
