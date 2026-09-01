begin;

-- CRS constitutional registration reconciliation.
--
-- Preserve every business profile and every verification/evidence record.
-- Only completion/readiness flags are withdrawn where the current profile
-- cannot satisfy the mandatory master-data contract.

update public.business_profiles as bp
set
  is_complete = false,
  registration_complete = false,
  completion_score = least(
    coalesce(bp.completion_score, 0),
    85
  ),
  missing_fields = case
    when 'Complete constitutional business identity'
      = any(coalesce(bp.missing_fields, '{}'::text[]))
    then coalesce(bp.missing_fields, '{}'::text[])
    else array_append(
      coalesce(bp.missing_fields, '{}'::text[]),
      'Complete constitutional business identity'
    )
  end,
  updated_at = now()
where
  (
    bp.is_complete is true
    or bp.registration_complete is true
  )
  and
  (
    -- Legal Constitution must exist and remain active.
    not exists (
      select 1
      from public.registration_legal_constitutions as legal
      where legal.key = bp.business_type
        and legal.is_active is true
    )

    -- At least one Business Identity is mandatory.
    or cardinality(
      coalesce(bp.business_identities, '{}'::text[])
    ) = 0

    -- Every selected identity must be active and registered for
    -- the business_identity scope.
    or exists (
      select 1
      from unnest(
        coalesce(bp.business_identities, '{}'::text[])
      ) as selected(identity_key)
      where not exists (
        select 1
        from public.identity_master as identity
        where identity.identity_key = selected.identity_key
          and identity.is_active is true
          and identity.registration_scopes
            @> array['business_identity']::text[]
      )
    )

    -- Every selected identity must have an active sector mapping.
    or exists (
      select 1
      from unnest(
        coalesce(bp.business_identities, '{}'::text[])
      ) as selected(identity_key)
      where not exists (
        select 1
        from public.registration_identity_sector_map as mapping
        where mapping.identity_key = selected.identity_key
          and mapping.is_active is true
      )
    )

    -- Nature of Business must contain every module derived from
    -- the selected identities' active mappings.
    or exists (
      select 1
      from unnest(
        coalesce(bp.business_identities, '{}'::text[])
      ) as selected(identity_key)
      join public.registration_identity_sector_map as mapping
        on mapping.identity_key = selected.identity_key
       and mapping.is_active is true
      cross join lateral unnest(
        coalesce(mapping.nature_modules, '{}'::text[])
      ) as required(module_key)
      where not (
        required.module_key = any(
          coalesce(bp.nature_of_business, '{}'::text[])
        )
      )
    )
  );

comment on column public.business_profiles.business_type is
  'Active registration_legal_constitutions key required for completed Business Registration.';

commit;
