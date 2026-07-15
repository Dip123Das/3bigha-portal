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
- [ ] Desktop verified
- [ ] Mobile verified
- [ ] Production verified
- [ ] Regression checked

### Verification evidence

- `npx tsc --noEmit --pretty false` passed on 15 July 2026.
- `next build` passed on 15 July 2026 with non-production placeholder service
  configuration. It compiled successfully, completed TypeScript validation,
  generated all 293 static pages and completed build traces. No production
  credentials or production files were used.
- Desktop and mobile browser verification remain pending because the local
  in-app browser runtime could not start in the current Windows permission
  environment.
- Production verification remains pending; no deployment was attempted.

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
