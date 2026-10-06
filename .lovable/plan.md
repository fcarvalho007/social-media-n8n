# Texto rico, stickers GIPHY e slides animados em MP4

## Resultado no compositor

### 1. Formatação de partes do texto

- Ao editar uma caixa de texto, passa a ser possível selecionar palavras ou frases e aplicar:
  - **negrito**;
  - **sublinhado com cor**;
  - **realce de fundo com cor**.
- A pequena barra de formatação aparece junto da seleção, sem ocupar permanentemente o espaço do slide.
- Sem texto selecionado, os controlos continuam a alterar a caixa inteira, como hoje.
- A formatação fica associada aos intervalos do texto e acompanha alterações normais; intervalos vazios ou inválidos são limpos sem apagar texto.
- O cálculo das linhas, o aviso de texto que não cabe, a seleção visível, a pré-visualização e todas as exportações usam exatamente os mesmos trechos formatados. A fonte nunca é reduzida automaticamente.

### 2. Imagens mais claras na barra lateral

A área **Imagens** passa a ter uma hierarquia mais direta:

```text
Imagens
[Imagem] [Fundo]                         modo de inserção

[Biblioteca] [Fotos] [Stickers] [Carregar] [IA]

pesquisa / resultados da origem escolhida
```

- **Imagem** fica como opção principal e insere um elemento redimensionável sobre o slide.
- **Fundo** continua disponível para preencher o slide.
- Retira-se **Logótipo** deste seletor; os logótipos já inseridos continuam intactos e continuam a ser imagens normais editáveis.
- Biblioteca, pesquisa Pexels/Unsplash, stickers, carregamento e IA ficam na mesma área, com pesquisa e resultados mais legíveis.
- Ao existir uma imagem selecionada, escolher outra origem mantém posição, tamanho, enquadramento, ordem e efeitos.
- O painel será validado no ecrã atual e num telemóvel de 375 px, sem scroll horizontal nem textos cortados.

### 3. Stickers GIPHY

- Acrescentar um separador **Stickers**, com pesquisa e sugestões populares da GIPHY.
- Cada resultado mostra animação, nome e atribuição **Powered by GIPHY**.
- Um clique insere o sticker como elemento livre; arrastar permite escolher a posição.
- O pedido passa pelo servidor autenticado e usa o segredo `GIPHY_KEY`, já confirmado como configurado; a chave nunca chega ao navegador.
- Ao inserir, guardar no projeto:
  - a versão MP4 animada apropriada;
  - uma imagem de capa para PNG/PDF e miniaturas;
  - duração, dimensões, origem e identificação do resultado.
- Se a GIPHY falhar, mostrar a mensagem real e terminar o pedido; não repetir automaticamente.

## Slides animados e exportação

### 4. Documento temporal sem partir carrosséis existentes

- Manter todos os documentos atuais compatíveis e estáticos por omissão.
- Acrescentar, de forma opcional:
  - recursos animados em MP4;
  - duração do slide;
  - imagem de capa do recurso para saídas estáticas.
- Um slide passa a ser considerado animado apenas quando contém um sticker/vídeo animado.
- A duração é **automática e editável**:
  - começa pela duração natural do sticker, com limites seguros;
  - aparece na barra direita quando o slide é animado;
  - pode ser ajustada sem modificar os restantes slides.
- O canvas mostra o movimento durante a edição; pausa enquanto o elemento é manipulado e volta a reproduzir depois, evitando saltos.

### 5. MP4 por slide

- Em **Preparar publicação**, cada slide animado oferece **Descarregar MP4**; os slides estáticos mantêm PNG/PDF.
- O MP4 é vertical 1080 × 1350, H.264, sem áudio, e contém todo o slide — fundo, texto, efeitos, imagens e stickers — não apenas o sticker.
- A composição de cada frame usa o mesmo desenho do compositor. PNG/PDF usam a imagem de capa do sticker; MP4 usa a animação.
- A criação mostra progresso real e pode ser cancelada. Uma falha nunca produz um ficheiro parcial.
- Para gerar MP4 no navegador de forma previsível será adicionada uma biblioteca pequena de empacotamento MP4; a codificação dos frames usa a capacidade nativa do navegador, sem enviar o conteúdo para um novo fornecedor pago.
- Se o navegador não suportar codificação H.264, explicar a limitação antes de iniciar, sem criar um formato diferente escondido.

### 6. Passagem para a criação social

- Ao aprovar:
  - slides estáticos seguem como PNG;
  - slides animados seguem como MP4;
  - o PDF do LinkedIn continua estático, usando a capa dos stickers.
- Os MP4 concluídos são guardados antes de abrir o rascunho social e entram como média do tipo vídeo; não são regenerados durante a publicação.
- O rascunho indica claramente quais páginas são imagem e quais são vídeo, para permitir escolher apenas destinos compatíveis.
- O fluxo nunca publica automaticamente. Google Business continua a rejeitar vídeo; as restantes redes usam as validações já existentes de formato, duração e tamanho.
- A versão aprovada, os ficheiros e a origem GIPHY ficam ligados de forma aditiva; nada existente é apagado ou substituído.

## Detalhes técnicos

- Evoluir o documento gráfico de forma retrocompatível: trechos de texto por intervalo e recursos animados opcionais, mantendo o texto editorial como texto simples e a formatação visual por variante.
- Centralizar a geometria dos trechos — largura, quebra de linha, sublinhado e realce — no núcleo partilhado; canvas e SVG/PNG apenas desenham o resultado calculado.
- Trocar a edição sobre o slide por uma edição rica controlada, preservando seleção, copiar/colar, Enter/Escape, desfazer/refazer e gravação versionada.
- Criar um módulo GIPHY no servidor com pesquisa restrita a stickers, validação dos domínios devolvidos, limites de tamanho e cópia imutável para os recursos do projeto.
- Alargar a leitura de recursos para imagem de capa + MP4, sem permitir URLs arbitrários no documento.
- Criar um render temporal no navegador que desenha frames no instante correto e os codifica em MP4; carregar o resultado para o armazenamento social através do fluxo autenticado existente.
- Atualizar o manifesto e o rascunho social para aceitar ficheiros por página (`png` ou `mp4`) sem alterar os ficheiros históricos.
- Registar em custos apenas operações que tenham custo conhecido; a pesquisa GIPHY não será apresentada como custo de IA.

## Validação

- Texto: seleção parcial, negrito, sublinhado colorido, realce, edição posterior, copiar/colar, desfazer/refazer e texto que não cabe.
- Paridade: comparar compositor, PNG do navegador e PNG do servidor com trechos formatados.
- GIPHY: pesquisa, sugestões, inserção, arrasto, substituição, atribuição, falha da API e ausência de repetição automática.
- Vídeo: sticker em várias posições/camadas, duração automática e manual, MP4 1080 × 1350 reproduzível, capa correta em PNG/PDF e mistura de páginas PNG/MP4 no rascunho.
- Segurança: chave apenas no servidor, acesso por projeto, tipos e dimensões reais verificados e limites de ficheiro aplicados.
- Regressão: carrosséis antigos continuam a editar, exportar PNG/PDF e preparar rascunhos exatamente como antes.
