-- v0.9.19 - Compact UX / Músicas
-- Rode apenas se ainda não tiver executado os SQLs anteriores de Músicas.

ALTER TABLE public.musicas
ADD COLUMN IF NOT EXISTS estilo text,
ADD COLUMN IF NOT EXISTS idioma text,
ADD COLUMN IF NOT EXISTS link_referencia text,
ADD COLUMN IF NOT EXISTS link_url text,
ADD COLUMN IF NOT EXISTS youtube_url text,
ADD COLUMN IF NOT EXISTS letra text,
ADD COLUMN IF NOT EXISTS letra_arquivo_url text,
ADD COLUMN IF NOT EXISTS observacoes text,
ADD COLUMN IF NOT EXISTS material_arquivo_url text;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'musicas-arquivos',
  'musicas-arquivos',
  true,
  10485760,
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/octet-stream'
  ]
)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "musicas arquivos leitura publica" ON storage.objects;
CREATE POLICY "musicas arquivos leitura publica"
ON storage.objects
FOR SELECT
USING (bucket_id = 'musicas-arquivos');

DROP POLICY IF EXISTS "musicas arquivos upload autenticado" ON storage.objects;
CREATE POLICY "musicas arquivos upload autenticado"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'musicas-arquivos');

DROP POLICY IF EXISTS "musicas arquivos atualizar autenticado" ON storage.objects;
CREATE POLICY "musicas arquivos atualizar autenticado"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'musicas-arquivos')
WITH CHECK (bucket_id = 'musicas-arquivos');

DROP POLICY IF EXISTS "musicas arquivos excluir autenticado" ON storage.objects;
CREATE POLICY "musicas arquivos excluir autenticado"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'musicas-arquivos');
