begin;

do $$
declare
  other_type_id constant uuid :=
    '12cb3d4c-f308-44cd-ad55-b612d9cdebfa'::uuid;
  bungalow_subtype_id constant uuid :=
    'b4e774f8-a865-421d-9f75-fd1bf2eacfb3'::uuid;
  houses_type_id constant uuid :=
    'bbee8525-0d04-4c4d-80b7-5db568767d0f'::uuid;
begin
  if not exists (
    select 1
    from public.property_types
    where id = other_type_id
      and name = 'Other'
      and slug = 'other'
  ) then
    raise exception
      'Guard failed: Other property type differs from the audited record.';
  end if;

  if exists (
    select 1
    from public.property_types
    where id = other_type_id
      and is_active = true
  ) then
    if exists (
      select 1
      from public.property_listings
      where type_id = other_type_id
    ) then
      raise exception
        'Guard failed: active Other type is now referenced by a listing.';
    end if;

    if exists (
      select 1
      from public.property_subtypes
      where type_id = other_type_id
    ) then
      raise exception
        'Guard failed: active Other type now has subtypes.';
    end if;
  end if;

  update public.property_types
  set is_active = false
  where id = other_type_id
    and name = 'Other'
    and slug = 'other'
    and is_active is distinct from false;

  if not exists (
    select 1
    from public.property_subtypes
    where id = bungalow_subtype_id
      and type_id = houses_type_id
      and slug = 'bunglow'
      and name in ('Bunglow', 'Bungalow')
  ) then
    raise exception
      'Guard failed: Bungalow subtype differs from the accepted states.';
  end if;

  if exists (
    select 1
    from public.property_subtypes
    where type_id = houses_type_id
      and id <> bungalow_subtype_id
      and lower(btrim(name)) = 'bungalow'
  ) then
    raise exception
      'Guard failed: another Bungalow subtype already exists.';
  end if;

  update public.property_subtypes
  set name = 'Bungalow'
  where id = bungalow_subtype_id
    and type_id = houses_type_id
    and slug = 'bunglow'
    and name = 'Bunglow';
end
$$;

commit;
