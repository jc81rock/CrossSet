create table if not exists public.convites_projeto (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references public.projetos(id) on delete cascade,
  codigo text not null unique,
  status text not null default 'pendente',
  papel text not null default 'integrante',
  criado_por uuid,
  criado_por_nome text,
  projeto_nome text,
  aceito_por uuid,
  criado_em timestamptz default now(),
  usado_em timestamptz
);

alter table public.convites_projeto enable row level security;

create policy if not exists "convites_pendentes_podem_ser_lidos_por_link"
on public.convites_projeto
for select
to anon, authenticated
using (status = 'pendente' or auth.uid() = criado_por or auth.uid() = aceito_por);

create policy if not exists "usuarios_autenticados_criam_convites"
on public.convites_projeto
for insert
to authenticated
with check (true);

create policy if not exists "usuarios_autenticados_atualizam_convites"
on public.convites_projeto
for update
to authenticated
using (true)
with check (true);

create policy if not exists "usuarios_autenticados_excluem_convites"
on public.convites_projeto
for delete
to authenticated
using (true);

notify pgrst, 'reload schema';
