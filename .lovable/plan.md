# Botão «Reverter» em cada sugestão aplicada

Na proposta de apresentação da crónica (Título, Segunda linha, Lede, Excerto, Frase de destaque, Momento editorial e Imagem), cada campo já aplicado passa a mostrar, ao lado de «Aplicado», um botão «Reverter».

## Comportamento
- «Reverter» repõe o texto que o campo tinha imediatamente antes de aplicar a sugestão.
- Se o campo estava vazio antes, «Reverter» deixa-o vazio (apaga o texto aplicado).
- Depois de reverter, o botão volta a «Aplicar», para poder aplicar de novo.
- «Aplicar tudo» também guarda os valores anteriores, por isso cada campo pode ser revertido individualmente.
- Momento editorial: repõe etiqueta, valor, descrição e se estava ativo.
- Imagem: repõe a imagem, texto alternativo e crédito anteriores (a imagem importada fica guardada, não é apagada do armazenamento).
- «Actualizar proposta» limpa os valores guardados para reverter (nova proposta, novo ponto de partida).
- A gravação segue o fluxo normal da edição; edições bloqueadas não mostram o painel, como hoje.

## Detalhes técnicos
- Editar só a fonte inerte `migration-reference/code/newsletter/src/features/newsletter/revista/PropostaApresentacao.tsx.txt` e regenerar com `python3 scripts/port-newsletter.py`.
- Novo estado `anteriores: Record<string, Partial<ConfigRevista>>`; ao aplicar, guarda o snapshot dos campos de `cfg` que o patch vai mudar; `reverter(k)` chama `editar(anteriores[k])` e desmarca `aplicados[k]`.
- `Linha` ganha prop opcional `reverter`; botão com ícone `Undo2` (lucide, já instalado).
- Função pura `snapshotAnterior(cfg, patch)` num ficheiro pequeno, com teste em `src/test/` (repõe valor anterior; campo vazio fica vazio).
- Sem mudanças de backend nem de dados; ramo local, sem publicar.
