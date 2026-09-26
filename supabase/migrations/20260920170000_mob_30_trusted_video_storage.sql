begin;

-- MOB-30 expands the existing private trusted-evidence bucket for short,
-- silent, live-camera property videos. Precise GPS remains in canonical
-- database columns and is never embedded in a public media object.
update storage.buckets
set
  file_size_limit = 83886080,
  allowed_mime_types = array[
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'video/mp4',
    'video/quicktime'
  ]
where id = 'listing-evidence-private';

do $$
begin
  if not exists (
    select 1
    from storage.buckets
    where id = 'listing-evidence-private'
  ) then
    raise exception
      'MOB-30 requires the listing-evidence-private storage bucket';
  end if;
end
$$;

commit;
