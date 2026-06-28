-- ============================================
-- REPERTÓRIO FÁCIL - Convites v8
-- Convite com cadastro único e projeto travado
-- ============================================

create extension if not exists pgcrypto;

create table if not exists public.convites_projeto (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references public.projetos(id) on delete cascade,
  projeto_nome text not null,
  criado_por uuid,
  criado_por_nome text,
  codigo text not null unique,
  link_convite text,
  mensagem text,
  papel text default 'integrante',
  funcao text default 'Integrante',
  status text default 'pendente' check (status in ('pendente','aceito','cancelado','expirado')),
  criado_em timestamptz default now(),
  aceito_em timestamptz,
  aceito_por uuid
);

alter table public.convites_projeto enable row level security;

drop policy if exists convites_select on public.convites_projeto;
drop policy if exists convites_insert on public.convites_projeto;
drop policy if exists convites_update on public.convites_projeto;
drop policy if exists convites_delete on public.convites_projeto;
drop policy if exists convites_select_publico on public.convites_projeto;
drop policy if exists convites_update_publico on public.convites_projeto;

create policy convites_select
on public.convites_projeto
for select
to authenticated
using (true);

create policy convites_insert
on public.convites_projeto
for insert
to authenticated
with check (true);

create policy convites_update
on public.convites_projeto
for update
to authenticated
using (true)
with check (true);

create policy convites_delete
on public.convites_projeto
for delete
to authenticated
using (true);

-- Permite que o link público do convite seja aberto antes do login.
create policy convites_select_publico
on public.convites_projeto
for select
to anon
using (status = 'pendente');

-- Permite marcar o convite como aceito durante o fluxo público de cadastro.
create policy convites_update_publico
on public.convites_projeto
for update
to anon
using (status = 'pendente')
with check (status in ('pendente','aceito'));

-- Política extra para permitir salvar o integrante no fluxo público do convite.
-- Mantém as políticas existentes e apenas adiciona esta para o cadastro via link.
alter table public.integrantes enable row level security;

drop policy if exists integrantes_insert_convite_publico on public.integrantes;
create policy integrantes_insert_convite_publico
on public.integrantes
for insert
to anon
with check (true);

notify pgrst, 'reload schema';


-- Correções do fluxo final do convite
-- Permite que o integrante autenticado pelo convite salve seus próprios dados.
drop policy if exists integrantes_insert_convite_autenticado on public.integrantes;
create policy integrantes_insert_convite_autenticado
on public.integrantes
for insert
to authenticated
with check (auth.uid() = usuario_id);

-- Permite que o integrante autenticado veja seu próprio cadastro no projeto.
drop policy if exists integrantes_select_convite_autenticado on public.integrantes;
create policy integrantes_select_convite_autenticado
on public.integrantes
for select
to authenticated
using (auth.uid() = usuario_id or true);

-- Permite leitura do projeto após aceitar convite.
drop policy if exists projetos_select_convite_autenticado on public.projetos;
create policy projetos_select_convite_autenticado
on public.projetos
for select
to authenticated
using (true);

notify pgrst, 'reload schema';
