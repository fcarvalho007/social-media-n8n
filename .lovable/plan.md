# Design das peças: direção, tipografia e cores independentes

Trabalho em quatro etapas verificáveis, cada uma recuperável e sem publicar. Não toca em newsletter, curadoria, roteiros, publicação, MP4, ZIP nem fornecedores de IA. Nenhuma experimentação de layout, fonte ou cor faz pedidos de IA.

## Etapa 1 — Independência (base de tudo)

Hoje cada estilo traz paleta e par tipográfico embutidos (ex.: Editorial força Playfair), e o documento guarda apenas `estilo/variante/paleta`. Passa a haver três escolhas separadas no documento:

- Direção + composição (A/B).
- Tipografia: família do título e do corpo (predefinição Montserrat + Inter para conteúdos novos).
- Paleta com funções semânticas: fundo claro, fundo forte, título, corpo, destaque, secundário.

Regras:
- Mudar direção nunca repõe fonte nem paleta; mudar paleta nunca move texto, imagens ou recortes; mudar fonte mantém paleta e direção.
- Cores manuais preservadas: cada elemento passa a guardar a função de cor que usa (ex.: "destaque"), em vez de recolorir por coincidência de hexadecimal. Elementos com cor manual ficam intocados, salvo escolha explícita.
- Mudança de fonte recalcula quebras e alturas e mostra o resultado em pré-visualização; se o texto não couber, aparece o aviso existente — nunca corta nem reduz a letra.
- Negritos, sublinhados e realces mantêm-se ao trocar fonte; conflitos são explicados antes de aplicar.
- Documentos antigos abrem iguais: a tipografia e paleta que já tinham são inferidas e guardadas na primeira gravação, sem recompor.

Preferência por marca/projeto (direção, tipografia, paleta) guardada no backend junto das preferências do Estúdio; aplica-se só a conteúdos novos.

## Etapa 2 — Cinco direções e composições por significado

Seleção principal: Editorial (coluna clássica / assimétrico), Impacto (painéis geométricos / tipografia expressiva), Revista (fotografia dominante / manchete dominante), Fotográfico (imagem integral com proteção / painel separado ou translúcido), Didático (passos / cartões).

- Cada uma das dez composições tem lógica própria de grelha e hierarquia, sem a transformação genérica "título maior + número + filete".
- Minimalista e Contraste continuam disponíveis em "Estilos anteriores"; documentos existentes não são convertidos.
- Composição por papel da página (capa, desenvolvimento, dado, comparação, processo, conceito, caso prático, fecho). Sem dados estruturados suficientes, usa a alternativa simples; nunca inventa números, citações ou gráficos, nem reescreve texto.
- "Dado" só pela intenção editorial já existente ou escolha manual, não por haver uma percentagem.
- Escala tipográfica estável entre páginas equivalentes, com exceções deliberadas para capa, dado-chave e transição.
- Adaptação real a 1080×1350 e a story 1080×1920 (zonas de leitura próprias).
- Efeitos discretos por defeito, nenhum obrigatório por família; "Repor efeitos recomendados".

Cinco famílias de paleta com identidades distintas (Azul/Navy, Vermelho/Terracota, Verde/Sálvia, Neutra/Grafite, Violeta), mantendo as paletas atuais.

## Etapa 3 — Fotografia e ritmo

- Ponto focal escolhido diretamente na imagem; "Preencher" vs "Mostrar inteira"; foco e recorte preservados ao trocar paleta.
- Gradiente só na zona do texto; alternativa com texto fora da imagem quando a leitura é fraca.
- Contraste e saturação só aparecem se forem iguais no ecrã e na exportação.
- As quebras fixas nos slides 3, 5 e último são substituídas por sugestões baseadas na narrativa; qualquer página pode ser marcada como destaque ou transição.
- Vista geral da sequência com sinais de repetição, alternância texto/imagem, densidade, margens/numeração e excesso de páginas fortes. Sem número "ideal" de slides.

## Etapa 4 — Painel "Direção visual"

Secções Composição · Tipografia · Cores · Ritmo · Opções avançadas (títulos e corpo separados).
- Alcance explícito: todo o conteúdo / esta página / este elemento.
- Comparação com conteúdo real: capa + página interior + fecho; antes/depois; composição A vs B.
- Experimentar / Aplicar / Cancelar; antes de aplicar lista páginas recompostas e com ajustes manuais; desfazer preservado.
- Amostra real de título e corpo em cada par tipográfico.

## Validação (antes de dar por concluído)

Testes automáticos de invariantes (trocar paleta não altera posições/fontes/imagens; trocar direção não altera fonte/paleta; documentos antigos idênticos) e capturas reais: mesma peça nas 5 direções; mesma composição nos 5 pares; azul → vermelho; fonte nova com texto integral; aplicar/cancelar/desfazer/guardar/reabrir; títulos longos, acentos, listas, várias imagens; carrossel, post e story; canvas = miniatura = PNG = PDF. Desktop e 375px. Sem publicar até validação.

## Pontos a confirmar

- DM Serif Display só existe em peso normal (sem negrito); os títulos ficam em 400 nesse par. Aceitável, ou prefere que seja incluído o negrito de outra fonte?
- Work Sans deixa de constar nos cinco pares principais, mas continua a funcionar em documentos antigos.
- Contraste antigo aproxima-se de Impacto, mas não é convertido automaticamente.

## Detalhes técnicos

- `nucleo.ts`: `SistemaDocumento` ganha `tipografia: { titulo: Familia; corpo: Familia }` e `paleta` com papéis; `CamadaTexto/Forma` ganham `papelCor?` (fallback por inferência na migração em memória). `PARES_FONTES` reduzido aos cinco, mantendo `worksans` como legado.
- `motor/estilos.ts`: `Estilo` deixa de ter `par`/`paleta` obrigatórios; `aplicarEstilo` divide-se em `aplicarDirecao`, `aplicarTipografia`, `aplicarPaleta`, cada uma com testes de invariantes.
- `motor/modelos.ts`, `sistema.ts`, `redesenhar.ts`, `efeitos.ts`, `imagem.ts`: novas composições por direção×variante×papel×formato; ritmo sugerido a partir dos papéis da narrativa.
- `render.server.ts` e `editor-grafico/desenho.ts` mantêm um único renderer; paridade de contraste/saturação antes de os expor.
- Preferência por projeto em `estudio_preferencias` (migração aditiva com colunas opcionais) via serviço existente.
- UI: `PainelDirecaoVisual.tsx`, `EditorGrafico.tsx`, `PassoDesign.tsx` (seletor de criação) e nova vista de sequência.
- Deploy das funções Edge que consomem `_shared/motor` e `_shared/documento-grafico` após `check:edge`.
