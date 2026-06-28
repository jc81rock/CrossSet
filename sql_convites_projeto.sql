-- REPERTÓRIO FÁCIL - Convites / Correção v4
-- Rode este SQL no Supabase. Ele não apaga dados.

create extension if not exists pgcrypto;

alter table public.integrantes
add column if not exists convite_id uuid,
add column if not exists status text default 'ativo';

alter table public.integrantes
alter column status set default 'ativo';

alter table public.integrantes
DROP CONSTRAINT IF EXISTS integrantes_status_check;

alter table public.integrantes
ADD CONSTRAINT integrantes_status_check
CHECK (status IN ('ativo', 'pendente', 'inativo'));

alter table public.convites_projeto
add column if not exists aceito_por uuid,
add column if not exists aceito_em timestamptz;

alter table public.convites_projeto
alter column status set default 'pendente';

alter table public.convites_projeto
DROP CONSTRAINT IF EXISTS convites_projeto_status_check;

alter table public.convites_projeto
ADD CONSTRAINT convites_projeto_status_check
CHECK (status IN ('pendente', 'aceito', 'cancelado', 'expirado'));

alter table public.integrantes enable row level security;
alter table public.projetos enable row level security;
alter table public.convites_projeto enable row level security;

-- Permite ao usuário autenticado salvar o próprio cadastro via convite.
drop policy if exists integrantes_insert_convite_autenticado on public.integrantes;
create policy integrantes_insert_convite_autenticado
on public.integrantes
for insert
to authenticated
with check (auth.uid() = usuario_id);

-- Permite leitura dos integrantes do projeto para quem é dono do projeto ou integrante dele.
drop policy if exists integrantes_select_por_projeto on public.integrantes;
create policy integrantes_select_por_projeto
on public.integrantes
for select
to authenticated
using (
  exists (
    select 1
    from public.projetos p
    where p.id = integrantes.projeto_id
      and p.usuario_id = auth.uid()
  )
  or exists (
    select 1
    from public.integrantes i2
    where i2.projeto_id = integrantes.projeto_id
      and i2.usuario_id = auth.uid()
  )
);

-- Permite ao dono do projeto editar/excluir integrantes do próprio projeto.
drop policy if exists integrantes_update_dono_projeto on public.integrantes;
create policy integrantes_update_dono_projeto
on public.integrantes
for update
to authenticated
using (
  usuario_id = auth.uid()
  or exists (
    select 1
    from public.projetos p
    where p.id = integrantes.projeto_id
      and p.usuario_id = auth.uid()
  )
)
with check (
  usuario_id = auth.uid()
  or exists (
    select 1
    from public.projetos p
    where p.id = integrantes.projeto_id
      and p.usuario_id = auth.uid()
  )
);

drop policy if exists integrantes_delete_dono_projeto on public.integrantes;
create policy integrantes_delete_dono_projeto
on public.integrantes
for delete
to authenticated
using (
  exists (
    select 1
    from public.projetos p
    where p.id = integrantes.projeto_id
      and p.usuario_id = auth.uid()
  )
);

-- Convites: leitura pública enquanto pendente e atualização pelo usuário autenticado ao aceitar.
drop policy if exists convites_select_publico on public.convites_projeto;
create policy convites_select_publico
on public.convites_projeto
for select
to anon, authenticated
using (status = 'pendente' or aceito_por = auth.uid() or criado_por = auth.uid());

drop policy if exists convites_update_aceite_autenticado on public.convites_projeto;
create policy convites_update_aceite_autenticado
on public.convites_projeto
for update
to authenticated
using (status = 'pendente')
with check (status in ('pendente', 'aceito', 'cancelado', 'expirado'));

-- Projetos: leitura para dono ou integrante vinculado.
drop policy if exists projetos_select_dono_ou_integrante on public.projetos;
create policy projetos_select_dono_ou_integrante
on public.projetos
for select
to authenticated
using (
  usuario_id = auth.uid()
  or exists (
    select 1
    from public.integrantes i
    where i.projeto_id = projetos.id
      and i.usuario_id = auth.uid()
  )
);

notify pgrst, 'reload schema';
