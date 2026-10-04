REVOKE ALL ON public.mc_fontes, public.mc_orcamentos, public.mc_trabalhos, public.mc_etapas, public.mc_chamadas_ia,
  public.mc_propostas, public.mc_propostas_versoes, public.mc_documentos, public.mc_documentos_versoes,
  public.mc_exportacoes, public.mc_ligacoes_sociais FROM anon, PUBLIC;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.mc_fontes, public.mc_orcamentos, public.mc_trabalhos, public.mc_etapas, public.mc_chamadas_ia,
  public.mc_propostas, public.mc_propostas_versoes, public.mc_documentos, public.mc_documentos_versoes,
  public.mc_exportacoes, public.mc_ligacoes_sociais FROM authenticated;
REVOKE ALL ON FUNCTION public.mc_hash(jsonb), public.mc_validar_documento(jsonb) FROM anon;