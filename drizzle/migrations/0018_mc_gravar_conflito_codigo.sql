-- Version-conflict refusals used SQLSTATE 40001, which PostgREST maps to 503 + Retry-After, so clients retried forever.
-- Switch the CAS refusals of the save RPCs to the engine's own MC409 code (same as mc_preparar_social).
DO $$
DECLARE _f text; _def text;
BEGIN
  FOREACH _f IN ARRAY ARRAY['mc_gravar_edicao','mc_gravar_documento','mc_gravar_proposta'] LOOP
    SELECT pg_get_functiondef(p.oid) INTO _def FROM pg_proc p WHERE p.proname = _f AND p.pronamespace = 'public'::regnamespace;
    IF _def IS NOT NULL AND position('''40001''' IN _def) > 0 THEN
      EXECUTE replace(_def, 'ERRCODE = ''40001''', 'ERRCODE = ''MC409''');
    END IF;
  END LOOP;
END $$;