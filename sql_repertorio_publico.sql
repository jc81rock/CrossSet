CREATE OR REPLACE FUNCTION public.obter_repertorio_publico(p_repertorio_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  resultado jsonb;
BEGIN
  SELECT jsonb_build_object(
    'id', r.id,
    'nome', r.nome,
    'observacoes', r.observacoes,
    'projeto', jsonb_build_object(
      'id', pr.id,
      'nome', pr.nome
    ),
    'evento', CASE
      WHEN ev.id IS NULL THEN NULL
      ELSE jsonb_build_object(
        'id', ev.id,
        'nome', ev.nome,
        'data_evento', ev.data_evento,
        'hora_evento', ev.hora_evento,
        'local', ev.local
      )
    END,
    'musicas', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', m.id,
          'nome', m.nome,
          'artista', m.artista,
          'tom', m.tom,
          'bpm', m.bpm,
          'ordem', rm.ordem
        )
        ORDER BY rm.ordem ASC NULLS LAST
      )
      FROM public.repertorio_musicas rm
      JOIN public.musicas m ON m.id = rm.musica_id
      WHERE rm.repertorio_id = r.id
    ), '[]'::jsonb)
  )
  INTO resultado
  FROM public.repertorios r
  LEFT JOIN public.projetos pr ON pr.id = r.projeto_id
  LEFT JOIN LATERAL (
    SELECT e.id, e.nome, e.data_evento, e.hora_evento, e.local
    FROM public.eventos e
    WHERE e.repertorio_id = r.id
    ORDER BY e.data_evento ASC NULLS LAST, e.created_at DESC NULLS LAST
    LIMIT 1
  ) ev ON true
  WHERE r.id = p_repertorio_id;

  RETURN COALESCE(resultado, '{}'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION public.obter_repertorio_publico(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.obter_repertorio_publico(uuid) TO authenticated;
