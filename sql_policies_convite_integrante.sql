-- CrossSet - políticas para usuário convidado enxergar o projeto recebido por convite
-- Rode este SQL somente se, após aceitar o convite, o usuário continuar vendo "Você ainda não possui projetos".
-- Ele permite que um usuário autenticado veja projetos onde ele está cadastrado como integrante.

alter table public.projetos enable row level security;
alter table public.integrantes enable row level security;

-- Permite visualizar projetos próprios ou projetos onde o usuário é integrante.
drop policy if exists "projetos_select_proprietario_ou_integrante" on public.projetos;
create policy "projetos_select_proprietario_ou_integrante"
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

-- Permite o usuário autenticado visualizar o próprio cadastro de integrante.
drop policy if exists "integrantes_select_proprio_usuario" on public.integrantes;
create policy "integrantes_select_proprio_usuario"
on public.integrantes
for select
to authenticated
using (
  usuario_id = auth.uid()
);

-- Permite o usuário convidado atualizar o próprio vínculo, caso o convite encontre e-mail já cadastrado.
drop policy if exists "integrantes_update_proprio_usuario" on public.integrantes;
create policy "integrantes_update_proprio_usuario"
on public.integrantes
for update
to authenticated
using (
  usuario_id = auth.uid()
)
with check (
  usuario_id = auth.uid()
);
