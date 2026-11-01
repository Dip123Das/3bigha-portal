begin;

/* MOB-50 — Bind the confirmed print profile to each advisory draft version. */

create or replace function
  public.read_property_unit_booking_agreement_print_profile_snapshot(
    target_draft_id uuid
  )
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  draft_record public.property_unit_booking_agreement_drafts%rowtype;
  readiness_record
    public.property_unit_booking_agreement_readiness%rowtype;
begin
  if target_draft_id is null then
    raise exception 'AGREEMENT_DRAFT_ID_INVALID'
      using errcode = '22023';
  end if;

  select draft.*
  into draft_record
  from public.property_unit_booking_agreement_drafts draft
  where draft.id = target_draft_id;

  if not found
     or draft_record.status <> 'generation_pending'
     or draft_record.generation_started_at is null then
    raise exception 'AGREEMENT_GENERATION_CLAIM_REQUIRED'
      using errcode = '55000';
  end if;

  select readiness.*
  into readiness_record
  from public.property_unit_booking_agreement_readiness readiness
  where readiness.id = draft_record.readiness_id;

  if not found
     or readiness_record.application_id <> draft_record.application_id
     or readiness_record.unit_id <> draft_record.unit_id
     or readiness_record.project_id <> draft_record.project_id
     or readiness_record.property_schedule_confirmed_at is null then
    raise exception 'AGREEMENT_PRINT_PROFILE_BINDING_INVALID'
      using errcode = '23514';
  end if;

  return jsonb_build_object(
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
  );
end;
$$;

revoke all on function
  public.read_property_unit_booking_agreement_print_profile_snapshot(uuid)
from public, anon, authenticated;
grant execute on function
  public.read_property_unit_booking_agreement_print_profile_snapshot(uuid)
to service_role;

comment on function
  public.read_property_unit_booking_agreement_print_profile_snapshot(uuid)
is
  'Returns the saved print profile for a claimed private advisory draft after the property schedule is confirmed. Read only; it does not render or execute an agreement.';

commit;
