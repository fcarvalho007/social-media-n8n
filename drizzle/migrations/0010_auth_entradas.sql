CREATE TABLE public.auth_entradas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  ip text,
  navegador text,
  sucesso boolean NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX auth_entradas_ip_idx ON public.auth_entradas (ip, criado_em DESC);
CREATE INDEX auth_entradas_email_idx ON public.auth_entradas (email, criado_em DESC);
GRANT SELECT ON public.auth_entradas TO authenticated;
GRANT ALL ON public.auth_entradas TO service_role;
ALTER TABLE public.auth_entradas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins leem entradas" ON public.auth_entradas FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));