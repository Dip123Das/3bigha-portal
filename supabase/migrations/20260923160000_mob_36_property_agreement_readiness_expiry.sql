/*
 * MOB-36: Automatic expiry of private agreement-readiness workspaces.
 *
 * Expiry is bounded and follows canonical unit-first lock order for every
 * candidate. It changes only the readiness status and appends a private
 * system audit event.
 *
 * It does not:
 * - change or terminate the booking application or hold;
 * - release or sell inventory;
 * - modify or delete party inputs;
 * - establish, reverse or reconcile payment;
 * - generate, approve, sign, register or execute an agreement;
 * - transfer title or ownership.
 */

create or replace function
  public.expire_property_unit_booking_agreement_readiness (
    target_limit integer default 100
  )
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  action_time timestamptz := clock_timestamp();
  expired_count integer := 0;

  candidate record;

  unit_record record;

  application_record
    public.property_unit_booking_applications%rowtype;

  readiness_record
    public.property_unit_booking_agreement_readiness%rowtype;

  updated_readiness
    public.property_unit_booking_agreement_readiness%rowtype;
begin
  if target_limit is null
     or target_limit < 1
     or target_limit > 500 then
    raise exception 'EXPIRY_LIMIT_INVALID'
      using errcode = '22023';
  end if;

  /*
   * Candidate discovery intentionally takes no row lock. Each iteration then
   * obtains locks in canonical order:
   *   unit -> application -> readiness.
   */
  for candidate in
    select
      readiness.id as readiness_id,
      readiness.application_id,
      readiness.unit_id
    from public.property_unit_booking_agreement_readiness readiness
    where readiness.status in (
      'collecting_details',
      'ready_for_draft',
      'draft_generated',
      'parties_reviewing',
      'changes_requested',
      'approved_for_execution'
    )
      and readiness.expires_at is not null
      and readiness.expires_at <= action_time
    order by readiness.expires_at, readiness.id
    limit target_limit
  loop
    select
      unit.id,
      unit.project_id,
      unit.status,
      builder.owner_user_id
    into unit_record
    from public.builder_inventory_units unit
    join public.builder_projects project
      on project.id = unit.project_id
    join public.builder_profiles builder
      on builder.id = project.builder_profile_id
    where unit.id = candidate.unit_id
    for update of unit;

    if unit_record.id is null then
      continue;
    end if;

    select application.*
    into application_record
    from public.property_unit_booking_applications application
    where application.id = candidate.application_id
    for update;

    if application_record.id is null then
      continue;
    end if;

    select readiness.*
    into readiness_record
    from public.property_unit_booking_agreement_readiness readiness
    where readiness.id = candidate.readiness_id
    for update;

    if readiness_record.id is null then
      continue;
    end if;

    /*
     * Revalidate every binding and eligibility condition after all locks.
     */
    if readiness_record.application_id <> application_record.id
       or readiness_record.unit_id <> unit_record.id
       or readiness_record.project_id <> unit_record.project_id
       or application_record.unit_id <> unit_record.id
       or application_record.project_id <> unit_record.project_id
       or readiness_record.hold_id <> application_record.hold_id
       or readiness_record.buyer_user_id
         <> application_record.buyer_user_id
       or readiness_record.owner_user_id
         <> application_record.owner_user_id
       or unit_record.owner_user_id
         <> application_record.owner_user_id then
      raise exception 'AGREEMENT_READINESS_BINDING_INVALID'
        using errcode = '42501';
    end if;

    if readiness_record.status not in (
      'collecting_details',
      'ready_for_draft',
      'draft_generated',
      'parties_reviewing',
      'changes_requested',
      'approved_for_execution'
    ) then
      continue;
    end if;

    if readiness_record.expires_at is null
       or readiness_record.expires_at > action_time then
      continue;
    end if;

    update public.property_unit_booking_agreement_readiness
    set
      status = 'expired',
      updated_at = action_time
    where id = readiness_record.id
      and status in (
        'collecting_details',
        'ready_for_draft',
        'draft_generated',
        'parties_reviewing',
        'changes_requested',
        'approved_for_execution'
      )
      and expires_at is not null
      and expires_at <= action_time
    returning * into updated_readiness;

    if updated_readiness.id is null then
      continue;
    end if;

    insert into public.property_unit_booking_agreement_events (
      readiness_id,
      application_id,
      event_kind,
      actor_role,
      event_payload_json,
      occurred_at
    )
    values (
      updated_readiness.id,
      updated_readiness.application_id,
      'readiness_expired',
      'system',
      jsonb_build_object(
        'reason', 'automatic_expiry',
        'expiredAt', action_time,
        'readinessOnly', true,
        'applicationUnchanged', true,
        'holdUnchanged', true,
        'inventoryUnchanged', true,
        'partyInputsRetainedPrivately', true,
        'confidentialDocumentsOpened', false,
        'agreementExecuted', false,
        'paymentChanged', false,
        'marksInventorySold', false,
        'transfersTitle', false,
        'transfersOwnership', false
      ),
      action_time
    );

    expired_count := expired_count + 1;
  end loop;

  return expired_count;
end;
$$;

revoke all on function
  public.expire_property_unit_booking_agreement_readiness(integer)
from public, anon, authenticated;

grant execute on function
  public.expire_property_unit_booking_agreement_readiness(integer)
to service_role;

comment on function
  public.expire_property_unit_booking_agreement_readiness(integer) is
  'Expires a bounded set of overdue private agreement-readiness workspaces while preserving applications, holds, inventory, party inputs, payment state, agreement non-execution, title and ownership.';
