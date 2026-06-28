-- Repertório Fácil - Módulo Músicas 1.0
-- Execute no Supabase antes de testar o cadastro de músicas.

CREATE TABLE IF NOT EXISTS public.musicas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  projeto_id uuid REFERENCES public.projetos(id) ON DELETE CASCADE,
  nome text NOT NULL,
  artista text,
  tom text,
  tom_banda text,
  bpm integer,
  link_url text,
  youtube_url text,
  spotify_url text,
  observacoes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.musicas
ADD COLUMN IF NOT EXISTS projeto_id uuid REFERENCES public.projetos(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS nome text,
ADD COLUMN IF NOT EXISTS artista text,
ADD COLUMN IF NOT EXISTS tom text,
ADD COLUMN IF NOT EXISTS tom_banda text,
ADD COLUMN IF NOT EXISTS bpm integer,
ADD COLUMN IF NOT EXISTS link_url text,
ADD COLUMN IF NOT EXISTS youtube_url text,
ADD COLUMN IF NOT EXISTS spotify_url text,
ADD COLUMN IF NOT EXISTS observacoes text,
ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE public.musicas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "musicas_select_por_projeto" ON public.musicas;
CREATE POLICY "musicas_select_por_projeto"
ON public.musicas
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.projetos
    WHERE projetos.id = musicas.projeto_id
    AND projetos.usuario_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.integrantes
    WHERE integrantes.projeto_id = musicas.projeto_id
    AND (
      integrantes.usuario_id = auth.uid()
      OR integrantes.user_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "musicas_insert_por_admin_projeto" ON public.musicas;
CREATE POLICY "musicas_insert_por_admin_projeto"
ON public.musicas
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.projetos
    WHERE projetos.id = musicas.projeto_id
    AND projetos.usuario_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.integrantes
    WHERE integrantes.projeto_id = musicas.projeto_id
    AND (
      integrantes.usuario_id = auth.uid()
      OR integrantes.user_id = auth.uid()
    )
    AND integrantes.administrador = true
  )
);

DROP POLICY IF EXISTS "musicas_update_por_admin_projeto" ON public.musicas;
CREATE POLICY "musicas_update_por_admin_projeto"
ON public.musicas
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.projetos
    WHERE projetos.id = musicas.projeto_id
    AND projetos.usuario_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.integrantes
    WHERE integrantes.projeto_id = musicas.projeto_id
    AND (
      integrantes.usuario_id = auth.uid()
      OR integrantes.user_id = auth.uid()
    )
    AND integrantes.administrador = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.projetos
    WHERE projetos.id = musicas.projeto_id
    AND projetos.usuario_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.integrantes
    WHERE integrantes.projeto_id = musicas.projeto_id
    AND (
      integrantes.usuario_id = auth.uid()
      OR integrantes.user_id = auth.uid()
    )
    AND integrantes.administrador = true
  )
);

DROP POLICY IF EXISTS "musicas_delete_por_admin_projeto" ON public.musicas;
CREATE POLICY "musicas_delete_por_admin_projeto"
ON public.musicas
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.projetos
    WHERE projetos.id = musicas.projeto_id
    AND projetos.usuario_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.integrantes
    WHERE integrantes.projeto_id = musicas.projeto_id
    AND (
      integrantes.usuario_id = auth.uid()
      OR integrantes.user_id = auth.uid()
    )
    AND integrantes.administrador = true
  )
);
