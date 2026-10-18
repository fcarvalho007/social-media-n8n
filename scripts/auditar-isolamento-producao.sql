-- Run with the migration connection (not a read-only catalog role).
-- No credentials, external calls or persistent fixtures. Every change is rolled back.
BEGIN;
CREATE TEMP TABLE hub_qa_context AS
 SELECT (array_agg(user_id ORDER BY user_id))[1] a,(array_agg(user_id ORDER BY user_id))[2] b,
  (SELECT u.id FROM auth.users u WHERE NOT EXISTS(SELECT 1 FROM public.user_roles r WHERE r.user_id=u.id) LIMIT 1) c,
  gen_random_uuid() pa,gen_random_uuid() pb FROM public.user_roles WHERE role::text='admin';
DO $$ BEGIN IF EXISTS(SELECT 1 FROM hub_qa_context WHERE a IS NULL OR b IS NULL OR c IS NULL) THEN RAISE EXCEPTION 'Faltam as três contas de teste existentes'; END IF; END $$;
GRANT SELECT ON hub_qa_context TO authenticated;
INSERT INTO public.projects(id,owner_id,name,color,icon)
 SELECT pa,a,'QA rollback A','#000000','file' FROM hub_qa_context UNION ALL SELECT pb,b,'QA rollback B','#000000','file' FROM hub_qa_context;
INSERT INTO public.hub_documentos(id,project_id,hash,dados,pdf_path,criado_por)
 SELECT gen_random_uuid(),pa,repeat('a',64),'{}'::jsonb,pa::text||'/'||repeat('a',64)||'/original.pdf',a FROM hub_qa_context
 UNION ALL SELECT gen_random_uuid(),pb,repeat('b',64),'{}'::jsonb,pb::text||'/'||repeat('b',64)||'/original.pdf',b FROM hub_qa_context;
INSERT INTO public.art_rascunhos(project_id,titulo,created_by)
 SELECT pa,'QA rollback A',a FROM hub_qa_context UNION ALL SELECT pb,'QA rollback B',b FROM hub_qa_context;
INSERT INTO public.instagram_analytics(user_id,project_id,shortcode,post_url)
 SELECT a,pa,'hub_qa_a','https://www.instagram.com/p/hub_qa_a/' FROM hub_qa_context
 UNION ALL SELECT b,pb,'hub_qa_b','https://www.instagram.com/p/hub_qa_b/' FROM hub_qa_context;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub',(SELECT a::text FROM hub_qa_context),true);
SELECT set_config('request.jwt.claims',jsonb_build_object('sub',(SELECT a FROM hub_qa_context),'role','authenticated')::text,true);
DO $$ DECLARE n integer; BEGIN
 SELECT count(*) INTO n FROM public.hub_documentos WHERE project_id IN(SELECT pa FROM hub_qa_context UNION ALL SELECT pb FROM hub_qa_context); IF n<>1 THEN RAISE EXCEPTION 'A: documentos %',n; END IF;
 SELECT count(*) INTO n FROM public.art_rascunhos WHERE project_id IN(SELECT pa FROM hub_qa_context UNION ALL SELECT pb FROM hub_qa_context); IF n<>1 THEN RAISE EXCEPTION 'A: artigos %',n; END IF;
 SELECT count(*) INTO n FROM public.instagram_analytics WHERE project_id IN(SELECT pa FROM hub_qa_context UNION ALL SELECT pb FROM hub_qa_context); IF n<>1 THEN RAISE EXCEPTION 'A: analítica %',n; END IF;
 UPDATE public.art_rascunhos SET titulo=titulo WHERE project_id=(SELECT pa FROM hub_qa_context); GET DIAGNOSTICS n=ROW_COUNT; IF n<>1 THEN RAISE EXCEPTION 'Atualização própria recusada'; END IF;
 UPDATE public.art_rascunhos SET titulo=titulo WHERE project_id=(SELECT pb FROM hub_qa_context); GET DIAGNOSTICS n=ROW_COUNT; IF n<>0 THEN RAISE EXCEPTION 'Atualização alheia aceite'; END IF;
 BEGIN INSERT INTO public.art_rascunhos(project_id,titulo) SELECT pb,'forjado' FROM hub_qa_context; RAISE EXCEPTION 'A escrita alheia foi aceite'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN INSERT INTO public.hub_documentos(id,project_id,hash,dados,pdf_path,criado_por) SELECT gen_random_uuid(),pa,repeat('c',64),'{}',pa::text||'/'||repeat('c',64)||'/original.pdf',a FROM hub_qa_context; RAISE EXCEPTION 'A escrita direta em documentos foi aceite'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
SELECT 'A: leitura própria 1/1/1; alheia 0/0/0; escrita alheia e escrita direta de documentos recusadas' AS resultado;
SELECT set_config('request.jwt.claim.sub',(SELECT b::text FROM hub_qa_context),true);
SELECT set_config('request.jwt.claims',jsonb_build_object('sub',(SELECT b FROM hub_qa_context),'role','authenticated')::text,true);
DO $$ DECLARE n integer; BEGIN
 SELECT count(*) INTO n FROM public.hub_documentos WHERE project_id IN(SELECT pa FROM hub_qa_context UNION ALL SELECT pb FROM hub_qa_context); IF n<>1 THEN RAISE EXCEPTION 'B: documentos %',n; END IF;
 SELECT count(*) INTO n FROM public.art_rascunhos WHERE project_id IN(SELECT pa FROM hub_qa_context UNION ALL SELECT pb FROM hub_qa_context); IF n<>1 THEN RAISE EXCEPTION 'B: artigos %',n; END IF;
 SELECT count(*) INTO n FROM public.instagram_analytics WHERE project_id IN(SELECT pa FROM hub_qa_context UNION ALL SELECT pb FROM hub_qa_context); IF n<>1 THEN RAISE EXCEPTION 'B: analítica %',n; END IF;
END $$;
SELECT 'B: leitura própria 1/1/1; alheia 0/0/0' AS resultado;
SELECT set_config('request.jwt.claim.sub',(SELECT c::text FROM hub_qa_context),true);
SELECT set_config('request.jwt.claims',jsonb_build_object('sub',(SELECT c FROM hub_qa_context),'role','authenticated')::text,true);
DO $$ DECLARE n integer; BEGIN
 SELECT count(*) INTO n FROM public.hub_documentos WHERE project_id IN(SELECT pa FROM hub_qa_context UNION ALL SELECT pb FROM hub_qa_context); IF n<>0 THEN RAISE EXCEPTION 'C: documentos %',n; END IF;
 SELECT count(*) INTO n FROM public.art_rascunhos WHERE project_id IN(SELECT pa FROM hub_qa_context UNION ALL SELECT pb FROM hub_qa_context); IF n<>0 THEN RAISE EXCEPTION 'C: artigos %',n; END IF;
 SELECT count(*) INTO n FROM public.instagram_analytics WHERE project_id IN(SELECT pa FROM hub_qa_context UNION ALL SELECT pb FROM hub_qa_context); IF n<>0 THEN RAISE EXCEPTION 'C: analítica %',n; END IF;
END $$;
SELECT 'C sem papel: documentos/artigos/analítica alheios 0/0/0' AS resultado;
RESET ROLE;
ROLLBACK;
