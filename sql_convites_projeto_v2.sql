drop table if exists public.convites_projeto cascade;

create table public.convites_projeto (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references public.projetos(id) on delete cascade,
  projeto_nome text,
  criado_por uuid,
  criado_por_nome text,
  codigo text not null unique,
  link_convite text,
  mensagem text,
  papel text default 'integrante',
  funcao text default 'Integrante',
  status text default 'pendente',
  criado_em timestamptz default now(),
  aceito_em timestamptz,
  aceito_por uuid
);

alter table public.convites_projeto enable row level security;

create policy "convites_select"
on public.convites_projeto
for select
to authenticated
using (true);

create policy "convites_insert"
on public.convites_projeto
for insert
to authenticated
with check (true);

create policy "convites_update"
on public.convites_projeto
for update
to authenticated
using (true)
with check (true);

create policy "convites_delete"
on public.convites_projeto
for delete
to authenticated
using (true);

notify pgrst, 'reload schema';
