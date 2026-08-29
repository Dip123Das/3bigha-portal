# REL-01 — Admin BOS Migration Rehearsal

Status: **isolated and production-like snapshot rehearsals passed; disposable clone retention closure pending**.

The migrations were exercised through the Supabase SQL Editor in a separate
Free-plan project. No production project, credentials or data were used.

## Reviewed migration order

1. `20260822000100_trusted_listing_media_foundation.sql`
2. `20260827000100_admin_listing_media_moderation.sql`
3. `20260827000200_user_security_event_authority.sql`

All three files are additive and have explicit `begin;` / `commit;` boundaries.
They applied successfully to both the isolated project and a disposable clone
restored from the latest production backup. They also reapplied idempotently in
both environments. Production deployment remains a separate approval gate.

## Isolated rehearsal evidence — 2026-08-29

| Evidence | Result |
| --- | --- |
| Application baseline | `c1c38094` |
| Privilege remediation | `087161e` |
| Supabase organization | `3Bigha Admin BOS Rehearsal` — Free plan |
| Supabase project | `3bigha-admin-bos-rel01-rehearsal` (`rtrmjoltwbnuhytwoscg`) |
| Region | South Asia (Mumbai), `ap-south-1` |
| Completion time | 2026-08-29 16:50 UTC |
| Migration order | All three timestamped files applied successfully |
| Reapply | All migrations remained idempotent |
| Structural checks | Five tables present; RLS enabled; private evidence bucket confirmed |
| Privilege checks | `anon` and `authenticated` denied privileged functions; `service_role` allowed |
| Functional checks | Owner access, cross-owner denial, unrelated-user denial and anonymous denial passed |
| Command checks | Atomic moderation decision and security-event retry throttling passed |
| Cleanup | Synthetic users, profile authority and all synthetic rows rolled back; zero remained |
| Production impact | None |

The rehearsal exposed one portability defect: Trusted Listing Media policies
did not have explicit table grants when automatic table exposure was disabled.
Commit `087161e` adds narrowly scoped authenticated grants and static assertions;
no client `UPDATE` or `DELETE` privilege was introduced.

This was intentionally a blank isolated Supabase environment, not a restored
production-like snapshot. Its result is complemented by the snapshot rehearsal
below.

## Production-like snapshot rehearsal evidence — 2026-08-29

| Evidence | Result |
| --- | --- |
| Application baseline | `94327e5f` |
| Source project | `3bigha-portal` (`lynnvmqzdxqhhpkxuzvt`); read-only backup source |
| Source backup | Physical backup completed 2026-08-29 02:14:39 UTC |
| Disposable clone | `3bigha-rel01-production-like-rehearsal` (`hzrbbwsqbeyjlctualfn`) |
| Organization / region | `Swarnabhumi` — Pro; South Asia (Mumbai), `ap-south-1` |
| Clone restore start | 2026-08-29 17:00:08 UTC |
| Restore state | Healthy before migration execution |
| Baseline identities | 30 Auth users; identity values were not copied into rehearsal evidence |
| Prerequisites | Profiles and existing property, material, service and rental authorities present |
| Migration baseline | All five additive Admin BOS tables absent; affected policy count zero |
| Migration order | All three timestamped files applied successfully |
| Reapply | All migrations reapplied successfully without errors |
| Structural checks | Five tables present with RLS; private 8 MB image evidence bucket confirmed |
| Privilege checks | Owner grants bounded; client updates denied; privileged functions service-only |
| Functional checks | Owner evidence access, admin moderation access and unrelated-user isolation passed |
| Command checks | Atomic moderation decision and five-second security-event retry throttle passed |
| Anonymous access | All five affected tables denied |
| Cleanup | Transaction rolled back; all fixed synthetic row counts and metadata counts were zero |
| Identity preservation | Auth user count remained 30 after migration and functional testing |
| Storage limitation | Database metadata restored; Supabase restore excluded Storage object bytes by design |
| Production impact | None; no query or migration was executed against the source project |
| Temporary cost | Supabase displayed $0 compute plus $0.50/month additional disk for the clone |
| Retention | Clone deletion requires explicit destructive-action approval and remains pending |

The production-like rehearsal validates compatibility with the restored schema,
policies, functions, representative row volume and copied Auth identities. Test
data used fixed synthetic identifiers inside one transaction and was rolled
back. No personal identity value, credential, API key or copied row content is
recorded in this repository.

## Before rehearsal

- Record the exact application commit.
- Obtain an encrypted, access-controlled production-like database snapshot.
- Use a separate Supabase project or isolated PostgreSQL database.
- Confirm the rehearsal environment contains the `auth` and `storage` schemas.
- Confirm prerequisite `profiles` and existing marketplace tables are present.
- Never paste database passwords or service-role keys into Git, chat, screenshots or shell history.

## Rehearsal procedure

1. Restore the snapshot into the disposable environment.
2. Record baseline row counts and existing policies for affected authorities.
3. Apply the three files in timestamp order using the approved database migration mechanism.
4. Stop immediately on the first error; do not skip statements or edit SQL during execution.
5. Run the verification queries below using an appropriately privileged database session.
6. Test authenticated owner access, unrelated-user denial, anonymous denial and service-role server flows.
7. Test trusted capture creation, location attachment, completion, private evidence upload, publication gate, moderation decision and security-event recording.
8. Record execution time, errors, query output and the responsible reviewer.
9. Destroy the disposable environment and its copied personal data after explicit approval, according to the approved retention process.

## Structural verification queries

```sql
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in (
    'trusted_capture_sessions',
    'listing_media_assets',
    'listing_media_verifications',
    'listing_moderation_events',
    'user_security_events'
  )
order by tablename;

select schemaname, tablename, policyname, roles, cmd
from pg_policies
where (schemaname = 'public' and tablename in (
  'trusted_capture_sessions',
  'listing_media_assets',
  'listing_media_verifications',
  'listing_moderation_events',
  'user_security_events'
)) or (schemaname = 'storage' and policyname like 'listing_evidence_private_%')
order by schemaname, tablename, policyname;

select routine_schema, routine_name, security_type
from information_schema.routines
where routine_schema = 'public'
  and routine_name in (
    'set_trusted_media_updated_at',
    'admin_resolve_listing_media_verification',
    'record_authenticated_security_event'
  )
order by routine_name;

select id, name, public, file_size_limit, allowed_mime_types
from storage.buckets
where id = 'listing-evidence-private';
```

Expected: all five public tables exist with RLS enabled; the private bucket has `public = false`; authenticated policies are ownership-bounded; privileged functions are not executable by `anon` or `authenticated`; and server-authorised flows succeed.

## Failure and rollback boundary

If rehearsal fails, discard the disposable database and fix the migration in source before repeating from a fresh snapshot. For production, a verified pre-migration backup is mandatory. Because these migrations are additive, application rollback should normally retain the added schema; destructive database rollback requires separate review and explicit approval.

## Evidence required to close REL-01

- Snapshot identifier and date
- Disposable environment identifier
- Exact commit SHA
- Migration start/end times and output
- RLS and privilege query output
- Functional test results
- Restore/destroy confirmation
- Database reviewer and security reviewer approval
