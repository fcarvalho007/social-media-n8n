---
name: Hub de conteúdo
description: Sistema visual existente para trabalho editorial, revisão e publicação.
colors:
  primary: "hsl(211 96% 43%)"
  primary-foreground: "hsl(0 0% 100%)"
  background: "hsl(212 43% 97%)"
  foreground: "hsl(216 35% 16%)"
  card: "hsl(0 0% 100%)"
  muted: "hsl(214 35% 95%)"
  muted-foreground: "hsl(215 18% 40%)"
  border: "hsl(214 32% 90%)"
  success: "hsl(158 70% 30%)"
  destructive: "hsl(0 72% 45%)"
  warning: "hsl(38 92% 50%)"
typography:
  body:
    fontFamily: "Inter, Montserrat, system-ui, sans-serif"
  display:
    fontFamily: "Inter, sans-serif"
rounded:
  lg: "0.75rem"
  md: "calc(0.75rem - 2px)"
  sm: "calc(0.75rem - 4px)"
spacing:
  field-label: "8px"
  field-group: "16px"
  card-inner: "20px"
  card: "24px"
  desktop-gap: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.md}"
    height: "44px"
    padding: "8px 16px"
  card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    padding: "24px"
---

# Design System: Hub de conteúdo

## Overview

Este documento descreve o sistema existente em `src/index.css`, `tailwind.config.ts` e nos componentes partilhados. A atualização local de 19/10/2026 aplica a direção azul e clara pedida pelo proprietário, inspirada nas referências do Iconosquare. A aplicação é uma área de trabalho editorial: navegação estável, texto legível, ações claras e indicação explícita do que foi guardado, falhou ou ainda está a carregar.

A interface do Hub e as peças gráficas produzidas pelo Hub têm sistemas distintos. O azul da aplicação não substitui as cores editoriais dos carrosséis, Stories ou newsletters. As preferências visuais guardadas em cada documento continuam a determinar a sua apresentação.

## Colors

O azul identifica ações e foco. Os fundos claros, cartões brancos e texto escuro sustentam a leitura de listas, filtros e formulários. Texto secundário usa o token próprio; estados de erro, aviso e sucesso têm cores semânticas acompanhadas por texto.

Usar os tokens de `src/index.css` através das classes semânticas. Os valores do frontmatter representam o tema claro; não devem ser copiados como cores literais para os componentes. Os tokens de sidebar de grafite e verde continuam disponíveis para superfícies legadas. Na proposta local de navegação, o menu lateral partilha a superfície clara e a cor de ação da aplicação. O tema escuro fica fora do âmbito desta ronda, por decisão do proprietário.

## Typography

Inter é a família principal da interface, com as alternativas já definidas no Tailwind. Os títulos de página usam normalmente 24–30px e peso semibold ou bold; os controlos e descrições usam 14–16px. Texto auxiliar deve apoiar a decisão sem competir com o título ou com a ação principal.

Preservar a escala existente dos editores. A tipografia de uma peça gráfica pertence ao documento gráfico e pode ser diferente da interface, incluindo o par Space Grotesk/Inter já usado na divulgação da newsletter.

## Layout

O cabeçalho partilhado tem altura mínima de 64px. O conteúdo normal fica numa área central com largura máxima de 90rem e espaçamento progressivo nos breakpoints existentes. Compositores isolados conservam a sua área integral de edição.

A navegação, os títulos e as migalhas usam o catálogo único em `src/lib/navegacao.ts`. O painel inicial é `/`; a divulgação da newsletter tem a sua entrada própria. No telemóvel, o cabeçalho reduz as migalhas sem esconder a página atual. Grelhas de texto usam colunas com mínimo zero para permitir quebra de conteúdo e impedir que o formulário empurre a página para fora do ecrã.

A proposta da branch local `codex/hub-navegacao-simples-local` apresenta o menu lateral aberto inicialmente a partir de 1024px. Pode ser recolhido; abaixo de 768px abre num painel com fecho explícito. As tarefas estão agrupadas em Recolher conteúdo, Criar conteúdo, Rever e publicar nas redes, Organizar e Resultados e custos. Documentos e relatórios é filho visível de Curadoria; Divulgação da newsletter é filha visível de Newsletter, sem novos acordeões. Criar publicação social tem acesso direto; Definições e conta fica num menu separado no rodapé. A pesquisa mostra texto no computador e conserva o atalho de teclado. Esta proposta está em revisão local e ainda não foi publicada.

O ritmo habitual é de 8, 16, 24 e 32px. Os controlos de navegação, pesquisa, fecho e notificação revistos nesta ronda têm área de interação de pelo menos 44px. Os primitivos legados incluem ainda tamanhos de 36 e 40px; esta documentação não declara que toda a aplicação já foi adaptada a 44px.

## Elevation & Depth

Cartões usam contorno e sombra discreta. Menus, diálogos e painéis sobrepostos dão contexto à tarefa sem substituir a página inteira. Preservar as sombras e transições já definidas; a cor, o contorno e o foco devem comunicar o estado antes de qualquer efeito decorativo.

## Shapes

O raio base é de 0,75rem, com variantes menores derivadas do mesmo token. Botões, campos e cartões mantêm os cantos arredondados existentes. Ícones de ação precisam de nome acessível; o ícone não substitui a mensagem de erro ou o estado do conteúdo.

## Components

### Navegação e pesquisa

O menu, as migalhas e a pesquisa partilham os mesmos nomes e destinos. Ligações são elementos de navegação; ações como eliminar ou guardar são botões. O item ativo usa também `aria-current`. A pesquisa abre com Ctrl/Cmd+K, permite setas e Enter, e carrega projetos e tarefas apenas quando está aberta.

### Formulários e gravação

Campos têm rótulo associado, foco visível e estado desativado quando a operação o exige. Uma falha ao carregar preferências não deve apresentar os valores iniciais como uma leitura confirmada, nem permitir que estes substituam os dados existentes. Uma falha ao guardar mantém o texto editado e apresenta uma ação de recuperação.

### Listas, cartões e estados

Carregamento, lista vazia e erro são estados diferentes. Usar skeleton ou mensagem de carregamento; mostrar o erro com possibilidade de repetir; apresentar uma lista vazia apenas depois de uma leitura bem-sucedida. Estatísticas indisponíveis não devem aparecer como zero. Em cartões com várias ações, a área de abertura e os botões de eliminação têm alvos separados.

### Diálogos e notificações

Usar os componentes Radix/shadcn existentes, com título, descrição quando necessária e fecho identificado em português. Preservar gestão de foco e teclado. Notificações mantêm separadas a ação de abrir o destino e a ação de eliminar; o estado de leitura só muda pela operação respetiva.

### Divulgação da newsletter

O padrão aprovado continua sem retrato. Notícias e opinião são identificadas separadamente; a opinião usa «A minha leitura», com a assinatura pequena. O fecho dirige à subscrição e evita uma enumeração de fontes no slide final. As peças permanecem editáveis no compositor; uma indicação de envio ou publicação exige confirmação real do serviço responsável.

## Do's and Don'ts

- **Do** reutilizar tokens, componentes e o catálogo de navegação antes de introduzir variantes locais.
- **Do** manter a página atual e uma saída utilizável quando uma área falha ao carregar.
- **Do** distinguir dados fictícios, estimativas e estados confirmados.
- **Do** preservar o trabalho humano ao repetir uma operação ou recuperar de uma falha.
- **Don't** apresentar uma falha de leitura como lista vazia ou sucesso de gravação.
- **Don't** confundir a identidade da interface com a direção visual das peças editoriais.
- **Don't** reintroduzir o retrato nas peças de newsletter sem nova decisão do proprietário.
- **Don't** afirmar conformidade integral de acessibilidade ou de tema escuro sem uma auditoria específica.

## Contraste dos controlos partilhados · 18/10/2026

A revisão de Documentos mediu 4,41:1 no botão principal. A luminosidade do indigo partilhado passou de 67% para 66%, mantendo a mesma família de cor e garantindo pelo menos 4,5:1 com texto branco. O hover do botão principal usa o token existente `--primary-hover`, mais escuro, em vez de reduzir a opacidade e clarear o fundo. O ajuste aplica-se ao componente comum, para não criar uma paleta própria em Documentos.


## Direção azul e superfícies claras · 19/10/2026

Inspiração autorizada: cores, clareza e organização modular das referências Iconosquare fornecidas pelo proprietário. A identidade é do Hub; não se copiam logótipos, ilustrações ou métricas da referência.

- Fundo uniforme azul muito claro, sem gradiente; cartões brancos, bordas discretas e sombra azulada leve.
- Azul principal `211 96% 43%`: contraste de 5,18:1 com branco. Hover `211 100% 36%`; azul claro reservado a seleção, contexto e informação. Cor não substitui texto, ícone ou `aria-current`.
- `--input: 214 20% 57%`: contorno de campo com 3,33:1 sobre branco. Texto secundário `215 18% 40%`: 6,12:1 sobre branco.
- `CabecalhoPagina` define título, descrição, ícone opcional e ações; tipografia fluida de 24–30px e espaço para títulos longos. Navegação de área usa sublinhado azul e `aria-current`, sem competir com os botões de ação.
- Primitivos existentes: campos e botões padrão de 44px; `sm` permanece disponível para ferramentas densas. Cartões, tabelas, separadores e diálogos partilham os tokens. Não se declara conformidade integral de todos os componentes legados.
- Resultados usa atalhos horizontais para secções, em vez de uma segunda barra lateral escura. Observador de secções e preferência por movimento reduzido preservam a navegação.
- O cabeçalho da Newsletter usa a banda de ação azul e uma faixa de validação clara. O código é alterado na origem inerte e regenerado. Só os controlos autenticados partilham o tema; email, edição pública, carrossel e Story conservam a sua direção editorial.

A atualização é local e reversível. As verificações e limites desta ronda constam de `docs/auditoria-visual-iconosquare-2026-10-19.md`.
