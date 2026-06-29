-- Uploads de arquivos das músicas
-- Execute no SQL Editor do Supabase antes de testar os uploads.

ALTER TABLE public.musicas
ADD COLUMN IF NOT EXISTS material_arquivo_url text,
ADD COLUMN IF NOT EXISTS letra_arquivo_url text;

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
SET public = true,
    file_size_limit = 10485760,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS musicas_arquivos_select_public ON storage.objects;
CREATE POLICY musicas_arquivos_select_public
ON storage.objects
FOR SELECT
USING (bucket_id = 'musicas-arquivos');

DROP POLICY IF EXISTS musicas_arquivos_insert_authenticated ON storage.objects;
CREATE POLICY musicas_arquivos_insert_authenticated
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'musicas-arquivos');

DROP POLICY IF EXISTS musicas_arquivos_update_authenticated ON storage.objects;
CREATE POLICY musicas_arquivos_update_authenticated
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'musicas-arquivos')
WITH CHECK (bucket_id = 'musicas-arquivos');

DROP POLICY IF EXISTS musicas_arquivos_delete_authenticated ON storage.objects;
CREATE POLICY musicas_arquivos_delete_authenticated
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'musicas-arquivos');
