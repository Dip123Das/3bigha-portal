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
- [x] Production verified
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
- Pull request #2 was merged into `main` at commit `7a8bd3b`. Production was
  promoted through a validated Nginx upstream switch from port 3200 to the
  healthy F02B1 process on port 3300.
- After cutover, `/`, `/login`, `/property`, `/materials`, `/services`,
  `/rentals` and `/rfq` all returned HTTP 200. The F02B1 process remained
  online with zero restarts and an empty error log; F02A was retained as the
  immediate rollback process during verification.

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

## NEEV-F02B2A — Context-aligned My Work presentation

**Approval:** Approved by the repository owner on 15 July 2026.

**Scope:** Present the actions belonging to the person's confirmed Human Work
Context first in My Work, while retaining all non-duplicate existing work
actions in an explicitly secondary compatibility section.

**Compatibility boundary:** This is presentation-only navigation resolution.
Authentication, legacy roles, grants, capabilities, permissions, routes,
Growth Plans, APIs, database records and session-context semantics are not
changed.

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

- A ready runtime with one clear Human Identity presents its matching workspace
  actions first in My Work.
- A person with several valid identities continues to see the complete familiar
  menu until they explicitly confirm what they want to work on.
- After confirmation, remaining non-duplicate legacy actions are retained under
  “Other existing work”; no route is deleted or silently reassigned.
- Runtime failure, ambiguity, an empty contextual action set or uninitialized
  context returns the legacy menu unchanged.
- `npx tsc --noEmit --pretty false` passed on 15 July 2026.
- `next build` passed on 15 July 2026 with non-production placeholder service
  configuration. It compiled successfully, validated types, generated all 293
  static pages and completed build traces.
- Source regression inspection confirmed that contextual presentation is gated
  by ready runtime state and explicit confirmation for multi-identity people,
  while every fallback returns the unchanged legacy menu.
- Anonymous desktop and 390-pixel mobile verification confirmed that the
  unchanged fallback shell renders without document-level horizontal overflow.
  Authenticated contextual desktop and mobile verification was then completed
  on isolated Hostinger staging at commit `66fc147` on port 3400.
- A multi-identity authenticated account retained the complete familiar My Work
  menu until the person selected a context. Selecting Rental Business opened
  the existing My Rentals workspace without changing its rental management,
  booking or lifecycle functionality.
- A clear Buyer identity presented My Requirements as the primary My Work group
  with requirement, conversation and marketplace actions first. Remaining
  legacy actions stayed available in the collapsed Other existing work section.
- The repository owner confirmed the same context-aligned behavior on mobile.
  The staging PM2 process remained online with zero restarts, returned HTTP 200
  on port 3400 and had an empty error log.
- Production promotion was completed on Hostinger from the exact merged `main`
  commit `8b3f9ea`. Type checking and the production build passed; the build
  generated all 3,897 static pages.
- Nginx was switched from the retained F02B1 runtime on port 3300 to the F02B2A
  runtime on port 3400 only after the new process was independently healthy.
  The rollback configuration is preserved at
  `/etc/nginx/sites-available/3bigha.neev-f02b2a.rollback`.
- Production regression checks returned HTTP 200 for `/`, `/login`,
  `/property`, `/materials`, `/services`, `/rentals` and `/rfq`. Authenticated
  desktop verification covered buyer, multi-identity, administrative and
  logged-out compatibility behavior. Authenticated mobile verification covered
  the Buyer Dashboard and My RFQs experience without broken navigation or 404s.
- After verification, the previous F02B1 process was stopped, the PM2 startup
  state was saved, only port 3400 remained listening, the F02B2A process stayed
  online with zero restarts and its error log remained empty.

### Files

- `app/globals.css`
- `components/layout/DesktopMegaNavClient.tsx`
- `components/layout/MobileMegaNavClient.tsx`
- `lib/3bos/navigation/resolve-shell-navigation.ts`
- `lib/navigation/main-menu.ts`
- `docs/3bos/26-Constitutional-Migration-Ledger.md`

### Rollback

Remove the compatibility marker and secondary presentation, then restore the
resolver to append the unchanged legacy groups directly after contextual
actions. No authentication, database, permission, API or route rollback is
required because this migration creates no persistent institutional state.

## NEEV-F03A — Context-aligned Open My Work bridge

**Approval:** Approved by the repository owner on 15 July 2026.

**Scope:** After a person explicitly confirms a Human Work Context, make the
existing Open My Work entry lead to that registered workspace's existing
landing page.

**Compatibility boundary:** This is presentation-only navigation resolution.
The `/dashboard` route, authentication, post-login redirects, legacy roles,
grants, permissions, APIs, database records and every workspace route remain
unchanged. Any unconfirmed, ambiguous, unavailable, future or invalid context
continues to use `/dashboard`.

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

- The existing shell resolver changes only the My Work menu item's displayed
  destination after explicit Human Work Context confirmation.
- The destination must be a non-future registered workspace landing path that
  begins with `/`; otherwise the unchanged legacy `/dashboard` destination is
  retained.
- The existing workspace actions, compatibility groups and destination-page
  authorization remain unchanged.
- Five focused navigation assertions passed for confirmed, unconfirmed,
  future, invalid-path and uninitialized runtime states.
- TypeScript completed with no errors. The Next.js production build compiled,
  validated types and generated all 293 static pages using non-production
  placeholder service configuration.
- Isolated Hostinger staging at port `3500` built successfully with the real
  environment and generated all 3,897 static pages.
- The repository owner verified on desktop and mobile that a confirmed Rental
  Business context makes Open My Work lead to the existing `/rentals/my`
  workspace. Production remained on the prior F02B2A process during testing.

### Files

- `lib/3bos/navigation/resolve-shell-navigation.ts`
- `scripts/verify-neev-f03a-navigation.mjs`
- `docs/3bos/26-Constitutional-Migration-Ledger.md`

### Rollback

Remove the conditional My Work `href` override from the shell resolver. The
existing `/dashboard` entry immediately becomes authoritative again. No data,
authentication, permission, route or infrastructure rollback is required.

## NEEV-H02A — Homepage internal constitutional alignment

**Approval:** Approved by the repository owner on 17 July 2026.

**Scope:** Align the existing production homepage's internal meaning with the
3BOS constitution while preserving its proven visual structure, journeys,
navigation, URLs and mobile/desktop behavior.

**Compatibility boundary:** No layout, CSS, shell, navigation, authentication,
middleware, API, database or route changes. Confirmed workspace evidence is
read-only and presentation-only. Missing, ambiguous, unconfirmed, invalid or
future evidence preserves the existing public fallback.

- [x] Audit completed
- [x] Constitutional mapping completed
- [x] Design approved
- [x] Implementation completed
- [x] Build passed
- [x] Type check passed
- [ ] Desktop verified
- [ ] Mobile verified
- [ ] Production verified
- [x] Regression checked

### Implementation evidence

- The eight existing human journeys and their legacy destinations remain
  present.
- AI remains an optional assistant. Human-facing operational language now
  describes business activity, prepared guidance and human review instead of
  presenting AI as the decision maker.
- The existing Business Workdesk can present actions from a confirmed,
  non-future workspace without granting access or changing authorization.
- Public, ambiguous and unconfirmed visitors retain the generic homepage
  workdesk and existing links.
- Focused homepage assertions passed for runtime fallback, confirmed workspace
  projection, all eight human journeys, legacy destinations and Human First AI
  language.
- TypeScript completed with no errors. The Next.js production build compiled,
  validated types and generated all 293 static pages using non-production
  placeholder service configuration.
- Desktop, mobile and production verification remain approval-controlled
  staging steps; they are not claimed by this local implementation record.

### Files

- `app/page.tsx`
- `lib/3bos/homepage/types.ts`
- `lib/3bos/homepage/resolve-homepage-projection.ts`
- `lib/3bos/homepage/index.ts`
- `scripts/verify-neev-h02a-homepage.mjs`
- `docs/3bos/26-Constitutional-Migration-Ledger.md`

### Rollback

Restore the homepage's previous internal labels and static workdesk actions,
then remove the homepage projection module and focused verification script.
No data, authentication, permission, route, CSS, shell or infrastructure
rollback is required.

## P04-A — Preferred unified 3BOS workspace entry

- Added `/dashboard/workspace` as a preferred human-first operating hub.
- Composes canonical runtime-resolved actions into Marketplace, Procurement,
  Business, Finance, Projects and Assistance; it does not duplicate business
  logic or introduce a parallel permission system.
- Preserves `/dashboard` as the legacy role resolver and preserves every
  existing module route, API, database contract and workflow.
- Ambiguous identities remain explicitly human-selected through the existing
  work-context chooser.
- Database migration: none.
- Rollback: remove `app/dashboard/workspace` and the focused P04 audit script.

## P04-B — Unified workspace visual and classification refinement

- Compacted the active identity and workspace row.
- Moved the complete human identity chooser behind an explicit user-controlled
  “Change work context” disclosure.
- Replaced overlapping workspace heuristics with deterministic, single-area
  action classification so every resolved action appears in only one operating
  area.
- Preserved the canonical runtime action set, all routes, permissions, APIs and
  databases.
- Database migration: none.

## P04-C1 — Visible unified entry and work-first hierarchy

- Made `/dashboard/workspace` the preferred post-login destination for
  ordinary users while retaining the specialist admin and blog-admin entries.
- Preserved every buyer, vendor, builder, author, marketplace and module URL as
  a directly accessible production destination.
- Added an opt-in work-first dashboard-shell order used only by the unified
  workspace: identity first, continuation second, real work third and recent
  activity afterward.
- Existing dashboard pages retain their original shell order by default.
- Database migration: none.

## P04-C2 — Coherent identity and primary work

- Prevented a stale session workspace preference from overriding the workspace
  implied by the currently resolved identity.
- Preferred workspace choices are now honoured only when paired with a valid,
  human-confirmed identity.
- The prominent “do now” action is selected from the primary workspace rather
  than from cross-workspace actions.
- No identity, workspace, permission or route record is mutated.

## P04-C3 — Displayed identity/workspace invariant

- Enforced that the identity displayed to the human always determines the
  primary workspace displayed beside it.
- A confirmed identity may use its compatible saved workspace preference; an
  inferred identity uses its canonical production workspace.
- Removed alphabetical legacy-workspace fallback from the visible primary
  workspace decision.
- Database migration: none.

## P04-C4 — Current-work focus with preserved cross-workspace access

- Limited the six primary operating-area cards to actions from the current
  primary workspace.
- Moved other resolved identities and their existing actions into an explicit,
  collapsed “Other workspaces” section controlled by the human.
- Preserved every resolved cross-workspace action and destination while
  removing them from the current business’s immediate decision surface.
- Database migration: none.

## P04-C5 — Hub-vendor multi-business workspace

- Made the existing `multi_business` workspace primary for the explicit
  `hub_vendor` operational role without converting that legacy role into a
  human identity.
- Presents the respectful operating label “Multi-business operator.”
- Projects all already-resolved authorised segment actions across the six main
  operating areas for hub vendors.
- Retains the focused primary-workspace experience for ordinary single-segment
  vendors.
- Database migration: none.

## P04-C6 — Hub-vendor segment capability projection

- Resolved the explicit `hub_vendor` role across the existing commercial
  segment workspaces instead of limiting discovery to the last inferred
  business identity.
- Aggregated capability relevance from those resolved workspaces while keeping
  the current Growth Plan as the effective capability ceiling.
- Preserved specialised segment routes for the explicit hub-vendor Scale
  compatibility context where the older Growth Plan catalogue is silent;
  existing route permissions and verification remain authoritative.
- Kept banker, financial-institution, government and author workspaces behind
  their existing identity signals; the hub-vendor bridge does not grant a
  regulated or identity-specific role.
- Preserved every existing route and enforcement boundary.
- Database migration: none.
