# Concluir o design das peças (etapas restantes)

A etapa 1a já está feita: tipografia independente, Montserrat + Inter por defeito e cinco famílias de paleta. Este plano termina o resto, por esta ordem, com testes em cada passo. Não toca em newsletter, curadoria, roteiros nem publicação. Não faz pedidos de IA e não publica.

## 1. Cores por função e preferência por marca
- Cada elemento criado pelo motor guarda a função da sua cor (fundo, título, corpo, destaque, secundário). Ao trocar a paleta, só mudam os elementos que têm função; as cores postas à mão ficam intocadas.
- Os documentos antigos ganham as funções por inferência, sem mudar o aspeto.
- A direção, a tipografia e a paleta preferidas ficam guardadas por marca no backend, junto das preferências do Estúdio, e aplicam-se só a conteúdos novos.

## 2. Cinco direções principais
- **Editorial:** coluna clássica e assimétrico.
- **Impacto:** painéis geométricos e tipografia expressiva. É uma direção nova, que tem como base o antigo Contraste.
- **Revista:** fotografia dominante e manchete dominante, sem círculo decorativo repetido.
- **Fotográfico:** imagem integral com proteção de leitura e painel separado ou translúcido. Quando não há imagem, isso é indicado.
- **Didático:** passos e cartões reais, apenas quando o conteúdo tem unidades separáveis.
- A segunda composição de cada direção deixa de ser «título maior + barra lateral» e passa a ter grelha própria.
- Minimalista e Contraste ficam em «Estilos anteriores». Os documentos existentes não são convertidos.
- A escala dos títulos fica estável entre páginas equivalentes; a capa e o fecho têm exceções deliberadas.
- As stories (1080×1920) usam zonas de leitura próprias.

## 3. Fotografia e ritmo
- O ponto focal escolhe-se com um clique na imagem, com as opções «Preencher» e «Mostrar inteira».
- O gradiente aplica-se só na zona do texto.
- As quebras fixas nos slides 3, 5 e último são substituídas por sugestões baseadas no papel de cada página. Qualquer página pode ser marcada como destaque ou transição.
- Uma vista da sequência assinala repetições, densidade e excesso de páginas fortes.

## 4. Painel «Direção visual»
- Secções: Composição, Tipografia, Cores, Ritmo e Opções avançadas.
- Na comparação aparecem a capa, uma página interior e o fecho, com o conteúdo real.
- Antes de aplicar, é indicado que páginas serão recompostas e quais têm ajustes manuais. Desfazer e Cancelar mantêm-se.

## Validação
- Testes automáticos das regras: trocar a paleta preserva cores manuais, posições e letra; trocar a direção preserva letra e paleta; os documentos antigos ficam iguais; nada é cortado.
- Capturas reais da mesma peça nas cinco direções e nos cinco pares, em carrossel, post e story, em desktop e a 375 px.
- Confirmação de que o canvas, as miniaturas e o PNG coincidem, com a sessão iniciada através do acesso de pré-visualização.

## Decisões pendentes
- DM Serif Display: por defeito, os títulos ficam em peso normal, sem negrito sintético.

## Detalhes técnicos
- `nucleo.ts`: `papelCor?` opcional em texto e forma. `recolorir` usa primeiro `papelCor` e só recorre ao hexadecimal em camadas do motor sem papel.
- Migração aditiva: colunas opcionais `direcao`, `tipografia` e `paleta` (jsonb/text) em `estudio_preferencias`, com os grants preservados e acesso através do serviço existente.
- `estilos.ts`: novo `impacto` e campo `anterior` para minimalista e contraste. Novos casos em `modelos.ts`; `composicaoB` substituída por composições por direção.
- `imagem.ts`: foco e modo (preencher/conter). `sistema.ts`: `quebrasSugeridas(papeis)`.
- UI: `PainelDirecaoVisual.tsx`, `EditorGrafico.tsx`; nova `VistaSequencia.tsx`.
- Deploy de `mc-motor` após `check:edge`.
