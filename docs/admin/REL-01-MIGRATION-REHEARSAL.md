# REL-01 — Admin BOS Migration Rehearsal

Status: **static migration review passed; disposable-database rehearsal pending**.

This workspace did not contain Supabase CLI, Docker or `psql`, so no database was contacted and no rehearsal result is claimed.

## Reviewed migration order

1. `20260822000100_trusted_listing_media_foundation.sql`
2. `20260827000100_admin_listing_media_moderation.sql`
3. `20260827000200_user_security_event_authority.sql`

All three files are additive and now have explicit `begin;` / `commit;` boundaries. They must still be executed against a disposable database restored from a recent production-like snapshot.

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
9. Destroy the disposable environment and its copied personal data according to the approved retention process.

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
