-- 1) Delivery evidence can only be written by the server (service role) or privileged SQL.
CREATE OR REPLACE FUNCTION public.nl_proteger_evidencia_envio()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE v_role text := coalesce(auth.jwt()->>'role', '');
BEGIN
  IF v_role NOT IN ('authenticated', 'anon') THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.estado = 'enviada' OR NEW.enviada_em IS NOT NULL OR NEW.snapshot_envio IS NOT NULL THEN
      RAISE EXCEPTION 'Só o servidor pode registar o envio de uma edição';
    END IF;
  ELSE
    IF (NEW.estado IS DISTINCT FROM OLD.estado AND (NEW.estado = 'enviada' OR OLD.estado = 'enviada'))
       OR NEW.enviada_em IS DISTINCT FROM OLD.enviada_em
       OR (NEW.snapshot_envio IS DISTINCT FROM OLD.snapshot_envio AND (NEW.snapshot_envio IS NOT NULL OR OLD.estado = 'enviada'))
       OR NEW.fecho_pendente_em IS DISTINCT FROM OLD.fecho_pendente_em THEN
      RAISE EXCEPTION 'Só o servidor pode alterar o estado de envio de uma edição';
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS nl_edicoes_proteger_evidencia ON public.nl_edicoes;
CREATE TRIGGER nl_edicoes_proteger_evidencia BEFORE INSERT OR UPDATE ON public.nl_edicoes
  FOR EACH ROW EXECUTE FUNCTION public.nl_proteger_evidencia_envio();

-- E-goi campaign rows: admins read; only the server writes.
DROP POLICY IF EXISTS nl_admin_total ON public.nl_egoi_campanhas;
CREATE POLICY nl_admin_ler ON public.nl_egoi_campanhas FOR SELECT TO authenticated USING (public.nl_is_admin());
REVOKE INSERT, UPDATE, DELETE ON public.nl_egoi_campanhas FROM authenticated, anon;

-- 2) Brand/project association is admin-only.
DROP POLICY IF EXISTS ident_editar ON public.estudio_identidades;
CREATE POLICY ident_editar ON public.estudio_identidades FOR UPDATE TO authenticated
  USING (public.nl_is_admin()) WITH CHECK (public.nl_is_admin());

-- 3) Worker: single-flight leases and its own scheduler key (never exposed to clients).
CREATE TABLE IF NOT EXISTS public.nl_worker_estado (
  nome text PRIMARY KEY,
  lease_ate timestamptz,
  chave text NOT NULL DEFAULT encode(extensions.gen_random_bytes(32), 'hex'),
  ultima_execucao timestamptz,
  ultimo_resultado jsonb,
  pausa_motivo text,
  actualizado_em timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.nl_worker_estado TO service_role;
REVOKE ALL ON public.nl_worker_estado FROM anon, authenticated;
ALTER TABLE public.nl_worker_estado ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.nl_worker_adquirir(_nome text, _segundos integer)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_ok boolean;
BEGIN
  IF NOT public.nl_is_service() THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  INSERT INTO public.nl_worker_estado (nome) VALUES (_nome) ON CONFLICT (nome) DO NOTHING;
  UPDATE public.nl_worker_estado SET lease_ate = now() + make_interval(secs => greatest(30, least(_segundos, 900))), actualizado_em = now()
   WHERE nome = _nome AND (lease_ate IS NULL OR lease_ate < now())
  RETURNING true INTO v_ok;
  RETURN coalesce(v_ok, false);
END $$;
REVOKE ALL ON FUNCTION public.nl_worker_adquirir(text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.nl_worker_adquirir(text, integer) TO service_role;

INSERT INTO public.nl_worker_estado (nome) VALUES ('conteudos') ON CONFLICT (nome) DO NOTHING;