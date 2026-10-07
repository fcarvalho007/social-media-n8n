-- Local integration harness only; never apply to Cloud. Runs the unmodified production migration afterwards.
CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
CREATE TABLE public.projects(id uuid PRIMARY KEY,owner_id uuid NOT NULL,name text NOT NULL);
CREATE FUNCTION public.mc_pode_ler(_project_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$ SELECT EXISTS(SELECT 1 FROM public.projects WHERE id=_project_id AND owner_id=auth.uid()) $$;
CREATE FUNCTION public.mc_pode_escrever(_project_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$ SELECT public.mc_pode_ler(_project_id) AND coalesce(current_setting('local.editor',true),'true')='true' $$;
CREATE TABLE public.mc_orcamentos(project_id uuid PRIMARY KEY,max_chamadas_dia integer NOT NULL DEFAULT 0);
CREATE TABLE public.custos_ia(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),fornecedor text,modelo text,acao text,estado text,origem_id text UNIQUE,unidades jsonb,custo_origem text,project_id uuid);
CREATE TABLE public.rv_noticias_local(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),titulo text NOT NULL,texto text NOT NULL,estado text NOT NULL DEFAULT 'aprovada',criado_em timestamptz NOT NULL DEFAULT now());
CREATE FUNCTION public.nl_curadoria_snapshot(_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE n public.rv_noticias_local;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sem sessão' USING ERRCODE='42501'; END IF;
 SELECT * INTO n FROM public.rv_noticias_local WHERE id=_id AND estado='aprovada';
 IF NOT FOUND THEN RAISE EXCEPTION 'Aprova a notícia primeiro' USING ERRCODE='MC409'; END IF;
 RETURN jsonb_build_object('noticia_id',n.id,'hash',md5(n.texto),'titulo',n.titulo,'texto',n.texto,'url',null,'nivel','artigo','parcial',false,'origem','manual','categoria','media');
END $$;
INSERT INTO public.projects VALUES ('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000009','Projeto local de validação');
INSERT INTO public.mc_orcamentos VALUES ('00000000-0000-4000-8000-000000000001',0);
GRANT USAGE ON SCHEMA auth,public TO authenticated,anon,service_role;
GRANT EXECUTE ON FUNCTION auth.uid(),public.mc_pode_ler(uuid),public.mc_pode_escrever(uuid) TO authenticated,service_role;
