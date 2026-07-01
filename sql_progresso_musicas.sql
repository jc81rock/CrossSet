-- CrossSet - progresso individual por música
-- Execute no Supabase somente se a tabela progresso_musicas ainda não existir.

create table if not exists public.progresso_musicas (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null,
  musica_id uuid not null,
  integrante_id uuid not null,
  usuario_id uuid,
  status text not null default 'nao_iniciada' check (status in ('nao_iniciada', 'em_estudo', 'pronta')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (musica_id, integrante_id)
);

alter table public.progresso_musicas enable row level security;

-- Políticas liberais para desenvolvimento/teste autenticado.
-- Se já existirem políticas, ignore os avisos de duplicidade.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'progresso_musicas'
      and policyname = 'progresso_musicas_select_auth'
  ) then
    create policy progresso_musicas_select_auth
    on public.progresso_musicas
    for select
    to authenticated
    using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'progresso_musicas'
      and policyname = 'progresso_musicas_insert_auth'
  ) then
    create policy progresso_musicas_insert_auth
    on public.progresso_musicas
    for insert
    to authenticated
    with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'progresso_musicas'
      and policyname = 'progresso_musicas_update_auth'
  ) then
    create policy progresso_musicas_update_auth
    on public.progresso_musicas
    for update
    to authenticated
    using (true)
    with check (true);
  end if;
end $$;
