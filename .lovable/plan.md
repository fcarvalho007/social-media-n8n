# Várias imagens por slide + copiar/colar entre slides

## 1. Mais do que uma imagem no mesmo slide
Hoje o compositor já aceita várias imagens num slide. Só que não está claro quando se acrescenta uma imagem e quando se substitui a que já lá está: com uma imagem selecionada, a imagem nova substitui-a sempre.

- No painel Imagem e no botão «Inserir», o botão «Adicionar imagem» abre a escolha «Como usar?»:
  - **Fundo**: ocupa o slide inteiro e fica por trás do texto;
  - **Imagem**: metade da largura, centrada e por cima, como até agora ao largar;
  - **Logótipo / pequena**: cerca de 160 px, no canto inferior direito com margem, mantendo a proporção original e sem recorte.
- A fonte continua a ser a mesma de sempre: Biblioteca, Fotos, Carregar ou IA (a IA só depois de confirmar o custo).
- Na escolha de fonte aparece também o separador «Marca», com o logótipo da marca do carrossel, quando existir. Só entra no slide quando o escolhe; nunca é colocado sozinho.
- «Substituir imagem» continua só na barra da imagem selecionada. Assim, acrescentar nunca troca uma imagem já colocada.
- O painel do slide passa a mostrar a lista das imagens (Fundo, Imagem 2, Logótipo…). Cada uma pode ser selecionada, substituída ou apagada.
- Cada imagem nova pode ser desfeita e entra na exportação exatamente como se vê no ecrã.

## 2. Copiar e colar elementos e estilo (teclado e menu)
- **Ctrl/Cmd+C** com um elemento selecionado (texto, imagem ou forma) copia esse elemento.
- **Ctrl/Cmd+V** noutro slide cola-o na mesma posição e com o mesmo estilo. Se colar no mesmo slide, fica ligeiramente desviado. O elemento colado fica selecionado.
  - **Texto:** cola-se como texto próprio, editável, que não fica ligado ao texto do slide de origem. Assim, alterar a cópia não muda o original.
  - **Imagem:** cola-se com o mesmo enquadramento e os mesmos efeitos.
- **Ctrl/Cmd+Alt+V** («Colar só o estilo») aplica o estilo copiado ao elemento selecionado, sem mudar o conteúdo. Para texto, o estilo é a letra, o tamanho, a cor, o alinhamento e o espaçamento; para imagem, o modo, o recorte, a máscara e o overlay. Os tipos têm de ser iguais (texto com texto, imagem com imagem).
- Os mesmos comandos («Copiar», «Colar», «Colar só o estilo») aparecem na barra do elemento selecionado, para quem usa telemóvel.
- Os atalhos não funcionam enquanto escreve num campo, para não interferirem com o copiar/colar normal de texto. A cópia fica só nesta sessão do compositor.
- Cada colagem pode ser desfeita.

## Verificação
- Testes automáticos: acrescentar Fundo, Imagem e Logótipo sem perder as imagens que já existem; colar noutro slide, nas duas versões A e B; colar só o estilo sem mudar o texto; desfazer cada uma destas ações.
- No ecrã: colocar duas imagens e um logótipo, e copiar um texto do slide 2 para o slide 5 com o teclado; confirmar também a 375 px usando os botões. Verificação de código no fim.
- Sem tocar nos seus carrosséis reais (os testes no ecrã são revertidos ou feitos numa cópia).

## Detalhes técnicos
- `estado.ts`: `adicionarImagem` ganha `modo: "fundo" | "imagem" | "logo"`. Novas ações: `colarCamada {camada, assets}`, com novo id, z no topo, um desvio de 24 px se o id de origem já estiver na página e o texto convertido para `texto` literal com o valor resolvido; e `colarEstilo {id, estilo}`, que funde só as chaves de estilo do mesmo tipo.
- `EditorGrafico.tsx`: área de cópia em `useRef`; atalhos no handler existente, depois de `emCampo`; separador «Marca» lido de `projects.logo_url` pelo serviço já existente.
