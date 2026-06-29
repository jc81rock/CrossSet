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
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Arquivos de musicas leitura publica" ON storage.objects;
CREATE POLICY "Arquivos de musicas leitura publica"
ON storage.objects
FOR SELECT
USING (bucket_id = 'musicas-arquivos');

DROP POLICY IF EXISTS "Usuarios autenticados enviam arquivos de musicas" ON storage.objects;
CREATE POLICY "Usuarios autenticados enviam arquivos de musicas"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'musicas-arquivos');

DROP POLICY IF EXISTS "Usuarios autenticados atualizam arquivos de musicas" ON storage.objects;
CREATE POLICY "Usuarios autenticados atualizam arquivos de musicas"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'musicas-arquivos')
WITH CHECK (bucket_id = 'musicas-arquivos');

DROP POLICY IF EXISTS "Usuarios autenticados excluem arquivos de musicas" ON storage.objects;
CREATE POLICY "Usuarios autenticados excluem arquivos de musicas"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'musicas-arquivos');
