insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'vendor-media',
  'vendor-media',
  true,
  20971520,
  array[
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'application/pdf'
  ]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Authenticated members can upload vendor media"
  on storage.objects;

create policy "Authenticated members can upload vendor media"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'vendor-media');
