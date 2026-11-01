begin;

/* MOB-52 — Read-only freshness check for the canonical agreement sources. */

create or replace function
  public.inspect_property_unit_booking_agreement_draft_sources(
    target_actor_user_id uuid,
    target_readiness_id uuid,
    target_draft_id uuid
  )
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  readiness_preview
    public.property_unit_booking_agreement_readiness%rowtype;
  unit_record public.builder_inventory_units%rowtype;
  application_record
    public.property_unit_booking_applications%rowtype;
  readiness_record
    public.property_unit_booking_agreement_readiness%rowtype;
  draft_record
    public.property_unit_booking_agreement_drafts%rowtype;
  prepared_result jsonb;
  prepared_draft_id uuid;
  prepared_snapshot_sha256 text;
  source_status text := 'unavailable';
begin
  if target_actor_user_id is null
     or target_readiness_id is null
     or target_draft_id is null then
    raise exception 'AGREEMENT_DRAFT_SOURCE_INSPECTION_INPUT_INVALID'
      using errcode = '22023';
  end if;

  select readiness.*
  into readiness_preview
  from public.property_unit_booking_agreement_readiness readiness
  where readiness.id = target_readiness_id;

  if not found then
    raise exception 'AGREEMENT_READINESS_NOT_FOUND'
      using errcode = 'P0002';
  end if;

  if target_actor_user_id not in (
    readiness_preview.buyer_user_id,
    readiness_preview.owner_user_id
  ) then
    raise exception 'AGREEMENT_DRAFT_SOURCE_INSPECTION_FORBIDDEN'
      using errcode = '42501';
  end if;

  /* Keep the canonical inventory → application → readiness → draft order. */
  select unit.*
  into unit_record
  from public.builder_inventory_units unit
  where unit.id = readiness_preview.unit_id
  for update;

  select application.*
  into application_record
  from public.property_unit_booking_applications application
  where application.id = readiness_preview.application_id
  for update;

  select readiness.*
  into readiness_record
  from public.property_unit_booking_agreement_readiness readiness
  where readiness.id = target_readiness_id
  for update;

  select draft.*
  into draft_record
  from public.property_unit_booking_agreement_drafts draft
  where draft.id = target_draft_id
    and draft.readiness_id = target_readiness_id
  for update;

  if not found then
    raise exception 'AGREEMENT_DRAFT_NOT_FOUND'
      using errcode = 'P0002';
  end if;

  if draft_record.application_id <> readiness_record.application_id
     or draft_record.unit_id <> readiness_record.unit_id
     or draft_record.project_id <> readiness_record.project_id
     or draft_record.application_id <> application_record.id
     or draft_record.unit_id <> unit_record.id
     or draft_record.project_id <> unit_record.project_id then
    raise exception 'AGREEMENT_DRAFT_BINDING_INVALID'
      using errcode = '23514';
  end if;

  if draft_record.status not in (
       'generation_pending',
       'generated',
       'lawyer_review_pending',
       'lawyer_changes_requested'
     ) then
    return jsonb_build_object(
      'draftId', draft_record.id,
      'sourceStatus', 'unavailable'
    );
  end if;

  /*
   * The preparation authority performs the canonical source hash. With the
   * live draft and its parent rows locked above, it either returns that same
   * draft without writes or raises SOURCE_CHANGED before any write occurs.
   */
  begin
    prepared_result := public.prepare_property_unit_booking_agreement_advisory_draft(
      target_actor_user_id,
      target_readiness_id
    );

    prepared_draft_id := nullif(prepared_result->>'draftId', '')::uuid;
    prepared_snapshot_sha256 :=
      nullif(prepared_result->>'sourceSnapshotSha256', '');

    if prepared_draft_id = draft_record.id
       and prepared_snapshot_sha256
         = draft_record.source_snapshot_sha256 then
      source_status := 'current';
    else
      source_status := 'changed';
    end if;
  exception
    when others then
      if sqlerrm in (
        'AGREEMENT_DRAFT_SOURCE_CHANGED',
        'AGREEMENT_NOT_READY_FOR_DRAFT',
        'APPLICATION_NOT_ACCEPTED',
        'UNIT_NOT_RESERVED',
        'AGREEMENT_READINESS_CANCELLED',
        'AGREEMENT_READINESS_EXPIRED',
        'AGREEMENT_BUYER_DETAILS_NOT_CONFIRMED',
        'AGREEMENT_OWNER_DETAILS_NOT_CONFIRMED',
        'AGREEMENT_PROPERTY_SCHEDULE_NOT_CONFIRMED'
      ) then
        source_status := 'changed';
      else
        raise;
      end if;
  end;

  return jsonb_build_object(
    'draftId', draft_record.id,
    'sourceStatus', source_status
  );
end;
$$;

revoke all on function
  public.inspect_property_unit_booking_agreement_draft_sources(
    uuid, uuid, uuid
  )
from public, anon, authenticated;
grant execute on function
  public.inspect_property_unit_booking_agreement_draft_sources(
    uuid, uuid, uuid
  )
to service_role;

comment on function
  public.inspect_property_unit_booking_agreement_draft_sources(
    uuid, uuid, uuid
  )
is
  'Read-only freshness check for the bound advisory draft source snapshot. Returns only current, changed, or unavailable and exposes no source hashes or document locators.';

commit;
