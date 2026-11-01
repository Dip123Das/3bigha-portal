begin;

/* MOB-48 — Owner-configured portrait print layout before schedule confirmation. */

alter table public.property_unit_booking_agreement_readiness
  add column if not exists stamp_treatment text not null default 'not_selected'
    check (stamp_treatment in (
      'not_selected',
      'physical_stamp_paper',
      'e_stamp'
    )),
  add column if not exists first_page_top_offset_mm numeric(8,2) not null default 0
    check (first_page_top_offset_mm between 0 and 150),
  add column if not exists continuation_page_top_offset_mm numeric(8,2) not null default 0
    check (continuation_page_top_offset_mm between 0 and 100),
  add column if not exists page_numbering_enabled boolean not null default true,
  add column if not exists schedule_starts_on_new_page boolean not null default true,
  add column if not exists annexures_start_on_new_page boolean not null default true,
  add column if not exists signature_witness_on_separate_page boolean not null default true;

alter table public.property_unit_booking_agreement_events
  drop constraint if exists property_unit_booking_agreement_events_event_kind_check;

alter table public.property_unit_booking_agreement_events
  add constraint property_unit_booking_agreement_events_event_kind_check
  check (event_kind in (
    'readiness_created',
    'buyer_details_submitted',
    'owner_details_submitted',
    'buyer_details_confirmed',
    'owner_details_confirmed',
    'property_schedule_confirmed',
    'print_layout_updated',
    'ready_for_draft',
    'draft_generated',
    'draft_viewed',
    'changes_requested',
    'approved_for_execution',
    'readiness_cancelled',
    'readiness_expired'
  ));

create or replace function
  public.update_property_unit_booking_agreement_print_layout(
    target_owner_user_id uuid,
    target_readiness_id uuid,
    target_print_page_size text,
    target_margin_top_mm numeric,
    target_margin_right_mm numeric,
    target_margin_bottom_mm numeric,
    target_margin_left_mm numeric,
    target_custom_page_width_mm numeric,
    target_custom_page_height_mm numeric,
    target_stamp_treatment text,
    target_first_page_top_offset_mm numeric,
    target_continuation_page_top_offset_mm numeric,
    target_page_numbering_enabled boolean,
    target_schedule_starts_on_new_page boolean,
    target_annexures_start_on_new_page boolean,
    target_signature_witness_on_separate_page boolean
  )
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  readiness_record
    public.property_unit_booking_agreement_readiness%rowtype;
  page_width_mm numeric;
  page_height_mm numeric;
  action_time timestamptz := clock_timestamp();
begin
  if target_owner_user_id is null
     or target_readiness_id is null then
    raise exception 'AGREEMENT_PRINT_LAYOUT_INPUT_INVALID'
      using errcode = '22023';
  end if;

  if target_print_page_size is null
     or target_print_page_size not in ('A4', 'LEGAL', 'CUSTOM_STAMP_PAPER')
     or target_margin_top_mm is null
     or target_margin_right_mm is null
     or target_margin_bottom_mm is null
     or target_margin_left_mm is null
     or target_stamp_treatment is null
     or target_first_page_top_offset_mm is null
     or target_continuation_page_top_offset_mm is null
     or target_page_numbering_enabled is null
     or target_schedule_starts_on_new_page is null
     or target_annexures_start_on_new_page is null
     or target_signature_witness_on_separate_page is null
     or target_margin_top_mm not between 0 and 100
     or target_margin_right_mm not between 0 and 100
     or target_margin_bottom_mm not between 0 and 100
     or target_margin_left_mm not between 0 and 100
     or target_stamp_treatment not in (
       'not_selected', 'physical_stamp_paper', 'e_stamp'
     )
     or target_first_page_top_offset_mm not between 0 and 150
     or target_continuation_page_top_offset_mm not between 0 and 100 then
    raise exception 'AGREEMENT_PRINT_LAYOUT_INPUT_INVALID'
      using errcode = '22023';
  end if;

  if target_print_page_size = 'CUSTOM_STAMP_PAPER' then
    if target_custom_page_width_mm is null
       or target_custom_page_height_mm is null
       or target_custom_page_width_mm not between 100 and 500
       or target_custom_page_height_mm not between 100 and 700 then
      raise exception 'AGREEMENT_PRINT_LAYOUT_DIMENSIONS_INVALID'
        using errcode = '22023';
    end if;
    page_width_mm := target_custom_page_width_mm;
    page_height_mm := target_custom_page_height_mm;
  elsif target_custom_page_width_mm is not null
     or target_custom_page_height_mm is not null then
    raise exception 'AGREEMENT_PRINT_LAYOUT_DIMENSIONS_INVALID'
      using errcode = '22023';
  elsif target_print_page_size = 'LEGAL' then
    page_width_mm := 215.9;
    page_height_mm := 355.6;
  else
    page_width_mm := 210;
    page_height_mm := 297;
  end if;

  if target_margin_left_mm + target_margin_right_mm >= page_width_mm
     or target_margin_top_mm + target_first_page_top_offset_mm
       + target_margin_bottom_mm >= page_height_mm
     or target_margin_top_mm + target_continuation_page_top_offset_mm
       + target_margin_bottom_mm >= page_height_mm then
    raise exception 'AGREEMENT_PRINT_LAYOUT_MARGINS_INVALID'
      using errcode = '22023';
  end if;

  select readiness.*
  into readiness_record
  from public.property_unit_booking_agreement_readiness readiness
  where readiness.id = target_readiness_id
  for update;

  if not found then
    raise exception 'AGREEMENT_READINESS_NOT_FOUND'
      using errcode = 'P0002';
  end if;

  if readiness_record.owner_user_id <> target_owner_user_id then
    raise exception 'AGREEMENT_OWNER_ACCESS_FORBIDDEN'
      using errcode = '42501';
  end if;

  if readiness_record.status <> 'collecting_details'
     or readiness_record.cancelled_at is not null
     or readiness_record.expires_at is null
     or readiness_record.expires_at <= action_time
     or readiness_record.property_schedule_confirmed_at is not null then
    raise exception 'AGREEMENT_PRINT_LAYOUT_LOCKED'
      using errcode = '55000';
  end if;

  if readiness_record.print_page_size = target_print_page_size
     and readiness_record.print_margin_top_mm = target_margin_top_mm
     and readiness_record.print_margin_right_mm = target_margin_right_mm
     and readiness_record.print_margin_bottom_mm = target_margin_bottom_mm
     and readiness_record.print_margin_left_mm = target_margin_left_mm
     and readiness_record.custom_page_width_mm
       is not distinct from target_custom_page_width_mm
     and readiness_record.custom_page_height_mm
       is not distinct from target_custom_page_height_mm
     and readiness_record.stamp_treatment = target_stamp_treatment
     and readiness_record.first_page_top_offset_mm =
       target_first_page_top_offset_mm
     and readiness_record.continuation_page_top_offset_mm =
       target_continuation_page_top_offset_mm
     and readiness_record.page_numbering_enabled =
       target_page_numbering_enabled
     and readiness_record.schedule_starts_on_new_page =
       target_schedule_starts_on_new_page
     and readiness_record.annexures_start_on_new_page =
       target_annexures_start_on_new_page
     and readiness_record.signature_witness_on_separate_page =
       target_signature_witness_on_separate_page then
    return jsonb_build_object(
      'readinessId', readiness_record.id,
      'unitId', readiness_record.unit_id,
      'printPageSize', readiness_record.print_page_size,
      'orientation', readiness_record.print_orientation,
      'marginTopMm', readiness_record.print_margin_top_mm,
      'marginRightMm', readiness_record.print_margin_right_mm,
      'marginBottomMm', readiness_record.print_margin_bottom_mm,
      'marginLeftMm', readiness_record.print_margin_left_mm,
      'customPageWidthMm', readiness_record.custom_page_width_mm,
      'customPageHeightMm', readiness_record.custom_page_height_mm,
      'stampTreatment', readiness_record.stamp_treatment,
      'firstPageTopOffsetMm', readiness_record.first_page_top_offset_mm,
      'continuationPageTopOffsetMm',
        readiness_record.continuation_page_top_offset_mm,
      'pageNumberingEnabled', readiness_record.page_numbering_enabled,
      'scheduleStartsOnNewPage', readiness_record.schedule_starts_on_new_page,
      'annexuresStartOnNewPage', readiness_record.annexures_start_on_new_page,
      'signatureWitnessOnSeparatePage',
        readiness_record.signature_witness_on_separate_page,
      'updated', false
    );
  end if;

  update public.property_unit_booking_agreement_readiness
  set
    print_page_size = target_print_page_size,
    print_margin_top_mm = target_margin_top_mm,
    print_margin_right_mm = target_margin_right_mm,
    print_margin_bottom_mm = target_margin_bottom_mm,
    print_margin_left_mm = target_margin_left_mm,
    custom_page_width_mm = target_custom_page_width_mm,
    custom_page_height_mm = target_custom_page_height_mm,
    stamp_treatment = target_stamp_treatment,
    first_page_top_offset_mm = target_first_page_top_offset_mm,
    continuation_page_top_offset_mm =
      target_continuation_page_top_offset_mm,
    page_numbering_enabled = target_page_numbering_enabled,
    schedule_starts_on_new_page = target_schedule_starts_on_new_page,
    annexures_start_on_new_page = target_annexures_start_on_new_page,
    signature_witness_on_separate_page =
      target_signature_witness_on_separate_page,
    updated_at = action_time
  where id = readiness_record.id
  returning * into readiness_record;

  insert into public.property_unit_booking_agreement_events (
    readiness_id,
    application_id,
    event_kind,
    actor_role,
    event_payload_json,
    occurred_at
  ) values (
    readiness_record.id,
    readiness_record.application_id,
    'print_layout_updated',
    'owner',
    jsonb_build_object(
      'pageSize', readiness_record.print_page_size,
      'orientation', readiness_record.print_orientation,
      'marginTopMm', readiness_record.print_margin_top_mm,
      'marginRightMm', readiness_record.print_margin_right_mm,
      'marginBottomMm', readiness_record.print_margin_bottom_mm,
      'marginLeftMm', readiness_record.print_margin_left_mm,
      'customPageWidthMm', readiness_record.custom_page_width_mm,
      'customPageHeightMm', readiness_record.custom_page_height_mm,
      'stampTreatment', readiness_record.stamp_treatment,
      'firstPageTopOffsetMm', readiness_record.first_page_top_offset_mm,
      'continuationPageTopOffsetMm',
        readiness_record.continuation_page_top_offset_mm,
      'pageNumberingEnabled', readiness_record.page_numbering_enabled,
      'scheduleStartsOnNewPage', readiness_record.schedule_starts_on_new_page,
      'annexuresStartOnNewPage', readiness_record.annexures_start_on_new_page,
      'signatureWitnessOnSeparatePage',
        readiness_record.signature_witness_on_separate_page
    ),
    action_time
  );

  return jsonb_build_object(
    'readinessId', readiness_record.id,
    'unitId', readiness_record.unit_id,
    'printPageSize', readiness_record.print_page_size,
    'orientation', readiness_record.print_orientation,
    'marginTopMm', readiness_record.print_margin_top_mm,
    'marginRightMm', readiness_record.print_margin_right_mm,
    'marginBottomMm', readiness_record.print_margin_bottom_mm,
    'marginLeftMm', readiness_record.print_margin_left_mm,
    'customPageWidthMm', readiness_record.custom_page_width_mm,
    'customPageHeightMm', readiness_record.custom_page_height_mm,
    'stampTreatment', readiness_record.stamp_treatment,
    'firstPageTopOffsetMm', readiness_record.first_page_top_offset_mm,
    'continuationPageTopOffsetMm',
      readiness_record.continuation_page_top_offset_mm,
    'pageNumberingEnabled', readiness_record.page_numbering_enabled,
    'scheduleStartsOnNewPage', readiness_record.schedule_starts_on_new_page,
    'annexuresStartOnNewPage', readiness_record.annexures_start_on_new_page,
    'signatureWitnessOnSeparatePage',
      readiness_record.signature_witness_on_separate_page,
    'updated', true
  );
end;
$$;

revoke all on function
  public.update_property_unit_booking_agreement_print_layout(
    uuid, uuid, text, numeric, numeric, numeric, numeric, numeric, numeric,
    text, numeric, numeric, boolean, boolean, boolean, boolean
  )
from public, anon, authenticated;
grant execute on function
  public.update_property_unit_booking_agreement_print_layout(
    uuid, uuid, text, numeric, numeric, numeric, numeric, numeric, numeric,
    text, numeric, numeric, boolean, boolean, boolean, boolean
  )
to service_role;

commit;
