insert into storage.buckets (id, name, public, file_size_limit)
values ('musicas-arquivos', 'musicas-arquivos', true, 52428800)
on conflict (id) do update
set public = true,
    file_size_limit = 52428800;

drop policy if exists "musicas_arquivos_select" on storage.objects;
drop policy if exists "musicas_arquivos_insert" on storage.objects;
drop policy if exists "musicas_arquivos_update" on storage.objects;
drop policy if exists "musicas_arquivos_delete" on storage.objects;

create policy "musicas_arquivos_select"
on storage.objects
for select
to public
using (bucket_id = 'musicas-arquivos');

create policy "musicas_arquivos_insert"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'musicas-arquivos');

create policy "musicas_arquivos_update"
on storage.objects
for update
to authenticated
using (bucket_id = 'musicas-arquivos')
with check (bucket_id = 'musicas-arquivos');

create policy "musicas_arquivos_delete"
on storage.objects
for delete
to authenticated
using (bucket_id = 'musicas-arquivos');
