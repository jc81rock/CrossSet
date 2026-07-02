-- CrossSet: regras de administrador por projeto
-- Execute no Supabase SQL Editor somente se a exclusão ainda for bloqueada por RLS.
-- Não altera layout nem dados. Apenas libera administradores do projeto para excluir dentro do próprio projeto.

CREATE OR REPLACE FUNCTION public.crossset_usuario_admin_projeto(p_projeto_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.projetos p
    WHERE p.id = p_projeto_id
      AND p.usuario_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.integrantes i
    WHERE i.projeto_id = p_projeto_id
      AND i.usuario_id = auth.uid()
      AND COALESCE(i.administrador, false) = true
  );
$$;

DROP POLICY IF EXISTS "crossset_admin_delete_integrantes" ON public.integrantes;
CREATE POLICY "crossset_admin_delete_integrantes"
ON public.integrantes
FOR DELETE
USING (public.crossset_usuario_admin_projeto(projeto_id));

DROP POLICY IF EXISTS "crossset_admin_delete_progresso_musicas" ON public.progresso_musicas;
CREATE POLICY "crossset_admin_delete_progresso_musicas"
ON public.progresso_musicas
FOR DELETE
USING (public.crossset_usuario_admin_projeto(projeto_id));
