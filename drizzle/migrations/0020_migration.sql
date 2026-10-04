ALTER TABLE public.mc_trabalhos ADD COLUMN IF NOT EXISTS prova boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN public.mc_trabalhos.prova IS 'Technical proof/test job; hidden from the default library view. Never inferred from title.';
UPDATE public.mc_trabalhos SET prova = true
WHERE id IN ('09dc4f6e-5b23-428a-a6e9-f0ce9b661482','822ad84d-338b-44e1-bf17-ebceb1ce422f','fb03a076-19e1-4f79-bee5-09889d5be1b9','3093934d-5a0e-42cf-a116-9736bac157a9','0bfd33c1-a4b3-4c0a-8c42-0c3a2b0b9750','ef3d3564-97dd-42a7-9a70-94f2efd50851','f83335b3-a29a-4464-be2a-d045464bbcf7');