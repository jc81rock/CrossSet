-- Repertório Fácil - Convites de integrantes v4
-- Convite travado ao projeto + cadastro obrigatório

create table if not exists public.convites_projeto (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid references public.projetos(id) on delete cascade,
  codigo text unique not null
);

alter table public.convites_projeto add column if not exists projeto_nome text;
alter table public.convites_projeto add column if not exists criado_por uuid;
alter table public.convites_projeto add column if not exists criado_por_nome text;
alter table public.convites_projeto add column if not exists link_convite text;
alter table public.convites_projeto add column if not exists mensagem text;
alter table public.convites_projeto add column if not exists papel text default 'integrante';
alter table public.convites_projeto add column if not exists funcao text default 'Integrante';
alter table public.convites_projeto add column if not exists status text default 'pendente';
alter table public.convites_projeto add column if not exists criado_em timestamptz default now();
alter table public.convites_projeto add column if not exists aceito_em timestamptz;
alter table public.convites_projeto add column if not exists aceito_por uuid;

alter table public.convites_projeto enable row level security;

drop policy if exists "convites_select" on public.convites_projeto;
drop policy if exists "convites_insert" on public.convites_projeto;
drop policy if exists "convites_update" on public.convites_projeto;
drop policy if exists "convites_delete" on public.convites_projeto;

create policy "convites_select"
on public.convites_projeto
for select
to authenticated, anon
using (true);

create policy "convites_insert"
on public.convites_projeto
for insert
to authenticated
with check (true);

create policy "convites_update"
on public.convites_projeto
for update
to authenticated, anon
using (true)
with check (true);

create policy "convites_delete"
on public.convites_projeto
for delete
to authenticated
using (true);

notify pgrst, 'reload schema';
