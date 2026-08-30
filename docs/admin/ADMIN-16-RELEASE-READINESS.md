# ADMIN-16 — Production Readiness and Closure

Status: **implementation verified; production release not approved**.

This document is the handoff contract for merging and deploying the Admin BOS branch. It does not authorize a production change.

## Proven on the release branch

- ADMIN-01 through ADMIN-16 source assertions pass.
- Trusted Listing Media authority assertions pass.
- TypeScript passes.
- Next.js 14.2.35 production build passes with 327 routes.
- The branch is a linear descendant of the audited `main` baseline.
- Twelve cron/system refresh routes share a header-only, fail-closed scheduler boundary.

## Blocking gates

- [ ] Rehearse the three migrations on a production-like snapshot.
- [ ] Review migration SQL and record forward/rollback ownership.
- [ ] Verify RLS, grants, functions, triggers and private evidence storage.
- [ ] Configure a strong production `CRON_SECRET` outside Git.
- [ ] Update every scheduler to send `Authorization: Bearer …` or `x-cron-secret`.
- [ ] Prove missing scheduler configuration returns 503 and invalid credentials return 401.
- [ ] Run authenticated browser smoke tests for every Admin command surface.
- [ ] Run mobile-width and keyboard/accessibility checks.
- [ ] Run bounded load and database-query tests.
- [ ] Run security testing and close or accept findings explicitly.
- [ ] Record successful database and private-media restore tests, including RPO/RTO.
- [ ] Review and disposition the 21 known locked production dependency advisories.
- [ ] Obtain founder, security and operations sign-off.

## Migration order

1. `20260822000100_trusted_listing_media_foundation.sql`
2. `20260827000100_admin_listing_media_moderation.sql`
3. `20260827000200_user_security_event_authority.sql`

Take a verified database and private-media backup first. Apply only in timestamp order. Do not allow application deployment to apply schema implicitly.

## Deployment sequence

1. Freeze the approved commit and record its full SHA.
2. Capture database and private evidence backups.
3. verify environment prerequisites without printing values.
4. Rehearse and then apply migrations.
5. Verify RLS, grants, functions, triggers, indexes and storage behavior.
6. Build the exact approved commit.
7. Deploy the application.
8. Test login, delegated access, Admin APIs, TLM capture/publication, moderation, security-event recording and every scheduler.
9. Observe logs, host resources, error signals and operational queues.
10. Record human acceptance or execute rollback.

## Rollback

Prefer application rollback to the previous known-good commit. Because the migrations are additive, retain the schema unless an independently reviewed database rollback is approved. If migration integrity fails, stop the release and restore from the verified pre-migration snapshot. Never run improvised destructive SQL.

## Release tag

Create the Admin BOS version tag only after production deployment, smoke testing and operational acceptance. No tag is created during ADMIN-16 implementation.
