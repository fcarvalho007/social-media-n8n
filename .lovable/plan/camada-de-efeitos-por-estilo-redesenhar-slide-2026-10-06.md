# Camada de efeitos por estilo + Redesenhar slide

Princípio: preservar a FUNÇÃO de cada efeito, não a estética exacta. Um único renderer; efeitos são tokens do documento (estilo + variante + paleta), nunca dependem da origem da imagem.

## Parte 1 — Efeitos como tokens (fazer primeiro)

Mapa função → token:

| Recurso antigo | Novo token | Onde por omissão |
|---|---|---|
| Glow cyan intenso | `glow { colorToken, intensity, blur }` da paleta | Contraste médio, Didático subtil (números/progresso), Navy Digital subtil; Editorial/Fotográfico/Minimalista desligado |
| Vignette | `vignette` | Fotográfico, Revista |
| Glass blur | `glass` (só atrás de texto sobre foto) | Fotográfico, quando adequado |
| Gradient overlay | `gradient` direccional (baixo, lateral, hero fade) com stops na cor escura da paleta | todos, intensidade por estilo |
| Grid tecnológico | `grid` | Didático (subtil), Contraste |
| Scanlines | `texture: scanlines` | só Contraste/Digital |
| Corner HUD | `corners` | Didático/Contraste |
| Glow line | `accentLine` (filete, divider, accent) | Editorial = filete fino; outros conforme estilo |
| Shadow cinematic | `shadow` | Fotográfico/Revista; Editorial quase nulo |
| Partículas | `texture: particles` | desligado por omissão; só manual |

- Tratamento de imagem por estilo: brightness/contrast/saturation/opacity (ex.: Fotográfico 0.90/1.05/0.95).
- Gradiente da capa: topo intacto, transição a meio, proteção forte na zona do título; horizontal se o texto for lateral.
- Hero fade contínuo (imagem → overlay → fundo da paleta).
- Trocar paleta muda só cores dos efeitos; intensidade e geometria ficam.
- UI: Personalizar > Efeitos (recolhido) com Gradient, Vignette, Glow, Glass, Shadow, Linhas, Grelha, Textura; override por página guardado no documento.

## Parte 2 — Redesenhar slide

- Botão «Redesenhar» visível na miniatura seleccionada e no painel Página.
- Painel: «Mantém o conteúdo e cria 5 composições gráficas alternativas.» [Gerar 5 propostas]; avançado: Direção (Manter / Explorar livremente), Imagens (Automático / Sem novas imagens / Permitir imagem IA).
- Geração local e determinística (sem IA paga, sem custo): estratégias internas (tipografia dominante, editorial assimétrico, imagem hero, conceito visual, dado dominante, blocos, comparação, mínimo, sobreposição, destaque); escolhe as 5 que servem o conteúdo e o papel.
- Cada proposta é uma página real do documento renderizada pelo mesmo renderer; etiqueta + frase curta.
- Conteúdo imutável (teste de hash do texto), papel preservado, direção visual preservada (em «Explorar livremente» a página fica como override, estilo global intacto).
- Diversidade obrigatória: rejeita propostas com geometria quase igual (região de texto, modo de imagem, área de imagem, posição do título, nº de blocos, alinhamento, escala, estrutura).
- Imagem: sem imagem / asset existente / Pexels (só pré-visualização; cópia para o armazém só ao aplicar) / IA apenas como «recomendada» com botão que pede confirmação de custo.
- Ícones antes de emojis; Editorial/Revista/Minimalista sem emojis.
- Escolher → pré-visualização grande → [Aplicar esta versão] (nova versão, só esta página, marcada como ajuste manual) ou [Voltar às propostas]. Cancelar = documento idêntico, sem versões. [Gerar mais 5] substitui as anteriores.

## Testes
- Paleta: glow muda de cor, não de intensidade/geometria; Editorial sem glow/scanlines/HUD; Fotográfico mantém gradient/vignette/full bleed; capa Pexels = capa IA; canvas = PNG (gradiente e hero fade).
- Redesenhar: hash do conteúdo igual nas 5; papel igual; 5 distintas; cancelar não altera hash nem cria versão; aplicar altera só a página escolhida.

## Detalhes técnicos
- Novo `supabase/functions/_shared/motor/efeitos.ts` (tipos + defaults por estilo/variante, resolução com paleta); `sistema.ts`/`nucleo.ts` aceitam `efeitos` opcional (documentos antigos válidos); renderização SVG partilhada aplica tokens.
- Novo `motor/redesenhar.ts`: `redesenharPagina({pagina, sistema, papel, assets, permitirPexels, permitirIAPaga, modo}) → CandidatoRedesign[]` com `pagina` em formato DocumentoGrafico.
- UI em `editor-grafico` (PainelRedesenhar, entrada na miniatura); usa o rascunho in-memory existente previsualizar/confirmar.
- Sem IA paga, sem publicação, sem alterar documentos reais; tsgo, testes e deploy mc-motor antes de fechar.
