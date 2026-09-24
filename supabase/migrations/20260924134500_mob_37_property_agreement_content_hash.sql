/*
 * MOB-37: Database-canonical advisory-draft content hash.
 *
 * PostgreSQL jsonb canonicalization may differ from JavaScript
 * JSON.stringify output. The trusted worker therefore requests this
 * database-calculated SHA-256 before invoking the canonical completion
 * transition, which independently recalculates and compares it.
 *
 * This function is service-role-only and performs no persistence.
 */

create or replace function
  public.hash_property_unit_booking_agreement_advisory_content (
    target_draft_content jsonb,
    target_printable_text text
  )
returns text
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $function$
declare
  normalized_printable_text text :=
    nullif(btrim(target_printable_text), '');
begin
  if target_draft_content is null
     or jsonb_typeof(target_draft_content) <> 'object' then
    raise exception 'AGREEMENT_DRAFT_CONTENT_INVALID'
      using errcode = '22023';
  end if;

  if octet_length(target_draft_content::text) > 1048576 then
    raise exception 'AGREEMENT_DRAFT_CONTENT_TOO_LARGE'
      using errcode = '22023';
  end if;

  if normalized_printable_text is null
     or char_length(normalized_printable_text) > 250000 then
    raise exception 'AGREEMENT_PRINTABLE_TEXT_INVALID'
      using errcode = '22023';
  end if;

  if nullif(
       btrim(target_draft_content->>'documentTitle'),
       ''
     ) is null
     or nullif(
       btrim(target_draft_content->>'advisoryNotice'),
       ''
     ) is null
     or jsonb_typeof(target_draft_content->'parties')
       <> 'object'
     or jsonb_typeof(
       target_draft_content->'propertySchedule'
     ) <> 'object'
     or jsonb_typeof(
       target_draft_content->'financialTerms'
     ) <> 'object'
     or jsonb_typeof(target_draft_content->'clauses')
       <> 'array'
     or jsonb_array_length(
       target_draft_content->'clauses'
     ) < 1
     or jsonb_typeof(
       target_draft_content->'lawyerReview'
     ) <> 'object' then
    raise exception 'AGREEMENT_DRAFT_STRUCTURE_INVALID'
      using errcode = '22023';
  end if;

  if coalesce(
       (target_draft_content->>'advisoryOnly')::boolean,
       false
     ) is distinct from true
     or coalesce(
       (
         target_draft_content
           ->>'lawyerReviewRequired'
       )::boolean,
       false
     ) is distinct from true then
    raise exception 'AGREEMENT_DRAFT_ADVISORY_POLICY_INVALID'
      using errcode = '23514';
  end if;

  return encode(
    extensions.digest(
      convert_to(
        target_draft_content::text
          || E'\n'
          || normalized_printable_text,
        'UTF8'
      ),
      'sha256'
    ),
    'hex'
  );
end;
$function$;

revoke all on function
  public.hash_property_unit_booking_agreement_advisory_content(
    jsonb,
    text
  )
from public, anon, authenticated;

grant execute on function
  public.hash_property_unit_booking_agreement_advisory_content(
    jsonb,
    text
  )
to service_role;

comment on function
  public.hash_property_unit_booking_agreement_advisory_content(
    jsonb,
    text
  ) is
  'Calculates the database-canonical SHA-256 for a structured advisory agreement draft and printable text. It persists nothing and creates no legal, payment, inventory, title or ownership effect.';
