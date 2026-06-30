-- CrossSet: permitir leitura pública de convites pelo código do link
-- Execute no Supabase SQL Editor se o convite aparecer como "não encontrado" mesmo existindo na tabela.

alter table public.convites_projeto enable row level security;

drop policy if exists "crossset_convites_select_publico_por_link" on public.convites_projeto;

create policy "crossset_convites_select_publico_por_link"
on public.convites_projeto
for select
to anon, authenticated
using (true);
