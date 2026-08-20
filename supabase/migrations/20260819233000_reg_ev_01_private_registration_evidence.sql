begin;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'registration-evidence',
  'registration-evidence',
  false,
  8388608,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf'
  ]
)
on conflict (id) do update
set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Members can upload own registration evidence"
  on storage.objects;

create policy "Members can upload own registration evidence"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'registration-evidence'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Members can read own registration evidence"
  on storage.objects;

create policy "Members can read own registration evidence"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'registration-evidence'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- No authenticated UPDATE or DELETE policy is intentionally provided.
-- Retakes create new immutable objects. Protected review services use
-- service-role authority through the existing server-side workflow.

commit;
