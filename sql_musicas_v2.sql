-- Repertório Fácil - Módulo Músicas v2
-- Acrescenta campos opcionais para conteúdo da música.

ALTER TABLE public.musicas
ADD COLUMN IF NOT EXISTS material_musical text,
ADD COLUMN IF NOT EXISTS letra text;

ALTER TABLE public.musicas
ADD COLUMN IF NOT EXISTS link_url text,
ADD COLUMN IF NOT EXISTS observacoes text,
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
