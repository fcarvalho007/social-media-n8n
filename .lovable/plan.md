# Redesenhar: uma proposta obrigatória com imagem IA

## Objetivo
Cada "Redesenhar" devolve Original + 5 propostas, e uma delas é sempre **Imagem IA integrada** (estratégia `AI_IMAGE_COMPOSITION`), exceto quando a página é claramente imprópria para imagem (tabela/dados técnicos, comparação densa). Gera-se no máximo **uma** imagem por pedido; as outras 4 usam tipografia, formas, Pexels/assets existentes ou layouts sem imagem.

## Experiência
- Antes do clique, o botão diz: "Redesenhar 5 versões · inclui 1 imagem IA (baixo custo)". Clicar = autorização explícita (opção A). Se a página não admite imagem, o texto do botão omite a IA e a 5.ª proposta é outra composição.
- A proposta IA aparece de imediato com um preview estrutural e o estado "A gerar composição com IA…"; a imagem entra quando a tarefa termina. Se falhar ou o resultado for desconhecido, mostra o erro e **não repete** automaticamente.
- Selo "Imagem IA" na miniatura. Nada substitui o documento até "Aplicar".
- Depois de aplicada: "Regenerar imagem IA" troca só o asset (mantém modo, região do texto, gradiente, efeitos, layout, paleta, papel).

## Como a variante é composta
1. **Layout decidido antes da imagem**: escolhe `imageMode` (full_bleed/hero/split/contained/background) segundo o papel da página (capa/história → fundo total; case study → hero; standard → dividida/contida; conceito → fundo conceptual; conclusão → fundo total minimalista), variando para não repetir o modo das outras propostas. Daí saem `textRegion` e `preferredSubjectRegion` (texto à esquerda → sujeito à direita, terço esquerdo limpo; texto em baixo → sujeito em cima).
2. **Prompt semântico em inglês**: primeiro interpreta "o que o slide diz" (título, descrição, papel, intenção visual) numa metáfora visual, via o fornecedor de texto já autorizado (DeepSeek direto); se indisponível, cai no construtor determinístico existente. Inclui sujeito/metáfora, ação, ambiente, enquadramento, luz, profundidade, posição do sujeito, espaço negativo, compatibilidade com a paleta, qualidade editorial, retrato 4:5; proíbe texto, letras, números, marcas, logos, interfaces e gráficos legíveis.
3. **Integração**: gradiente calculado pela região do texto com tokens da paleta (nunca preto fixo), vinheta/glass/fade conforme Estilo, ligeira dessaturação/véu; a paleta do documento nunca muda. Efeitos por estilo mantêm-se (Editorial com filetes e pouco brilho, nunca neon; Revista com corte forte; Fotográfico com vinheta cinematográfica; Contraste com recorte; Minimalista mínimo; Didático só se ajudar).
4. **Fonte única de verdade**: o asset fica em motor-assets como asset normal; a composição guarda `imageSource: "ai"`, `assetId`, `imageModel`, `imagePrompt`, `imageMode`, `textRegion`, `focalPoint`, `overlay`. O renderer é o mesmo de Pexels/Upload/Biblioteca, logo canvas = reabertura = PNG.

## Modelo configurável (servidor)
- Novo resolvedor server-side com `AI_IMAGE_FAST_MODEL` (por omissão `seedream/5-flash-text-to-image`), `AI_IMAGE_QUALITY_MODEL` e `AI_IMAGE_FALLBACK_MODEL`, lidos de variáveis de ambiente com valores por omissão no código. O compositor nunca conhece o modelo; a chave Kie fica no servidor.
- Fallback só é usado quando o modelo principal é recusado **antes** de criar tarefa (indisponível); nunca após resultado desconhecido.
- Mantém-se a reserva por clique em mc_kie_tarefas e o limite diário existente.

## Detalhes técnicos
- `_shared/motor/redesenhar.ts`: nova `EstrategiaRedesign` `AI_IMAGE_COMPOSITION`; `redesenharPagina` reserva sempre 1 das 5 vagas para ela (salvo `imagemInadequada(pageRole, conteudo)`), com `precisaImagem: "ia"`, modo/região/overlay pré-decididos e `promptIA`; restantes 4 com as receitas atuais.
- `_shared/motor/imagemModelo.server.ts` (novo): `resolverModeloImagem("fast"|"quality")` + fallback; `kie.server.ts` passa a receber o modelo do resolvedor em vez de `KIE_MODELO` fixo (a contagem diária soma todos os modelos de imagem). Proporção ajustada para o pedido 4:5 se o modelo o suportar, senão 3:4 com corte focal.
- `promptVisual.ts`: `construirPromptComposicao(...)` com regras de posição/espaço negativo; nova ação mc-motor `interpretar_visual` (DeepSeek, thinking off, uma chamada por redesenho, sem repetição) com fallback determinístico.
- `PainelRedesenhar.tsx`: texto do botão com custo, selo "Imagem IA", estado de geração por sondagem de `kie_estado`, erro sem repetição, botão "Regenerar imagem IA" que só substitui `assetId`/`imagePrompt` na composição.
- `imagem.ts`/`efeitos.ts`: gradiente direcional por `textRegion` usando tokens da paleta; tratamento de imagem por estilo.
- Testes: 5 propostas com exatamente 1 IA em páginas normais e 0 em tabela; prompt contém posição do sujeito oposta ao texto e proibições; regenerar mantém composição exceto asset; resolvedor respeita variáveis e fallback; idempotência PNG = canvas. Executar tsgo + vitest + `verificar-grafo-edge` e deploy de mc-motor.

## Riscos
- O teste de aceitação no ecrã (gerar realmente uma imagem) consome 1 crédito Kie e precisa da sua sessão; só o faço com a sua autorização.
- A chamada de interpretação semântica é uma chamada de texto DeepSeek por redesenho (custo marginal).
