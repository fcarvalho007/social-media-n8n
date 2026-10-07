# Curadoria mais rápida para rever notícias

## Direção escolhida

Aplicar a direção **Editorial grid layout**, adaptada ao sistema visual claro já existente.

Usar **2 cartões lado a lado em ecrãs largos** e 1 coluna em larguras menores. Três cartões comprimiriam demasiado títulos, resumos e ações dentro da largura atual da página; duas colunas equilibram rapidez de leitura e densidade.

## Alterações

1. **Cabeçalho mais simples**
   - Retirar «Abrir newsletter».
   - Dar destaque ao título, ao número de notícias por rever e aos separadores Por rever / Aprovadas / Rejeitadas.
   - Manter a gestão de fontes e RSS acessível, mas visualmente secundária.

2. **Filtros compactos**
   - Reorganizar pesquisa, período e tema numa faixa única e responsiva.
   - Substituir «Todo o arquivo» pelas escolhas **Últimos 3 dias**, **Últimos 7 dias** e **Últimos 30 dias**.
   - Usar 7 dias como período inicial para uma fila de revisão mais relevante.

3. **Cartões mais legíveis e rápidos de percorrer**
   - Mostrar em primeiro plano tema/origem, data, título, fonte e resumo.
   - Passar para uma grelha de duas colunas no computador e uma coluna no telemóvel.
   - Manter Aprovar, Rejeitar e Ler fonte claramente acessíveis, sem esconder ações importantes.

4. **Escolha múltipla em Por rever**
   - Adicionar uma caixa de seleção por notícia e uma opção para selecionar as notícias visíveis.
   - Mostrar uma barra de ação quando houver seleção, com contagem, cancelar seleção e **Rejeitar selecionadas**.
   - «Rejeitar» não apaga dados: muda as notícias para Rejeitadas e retira-as imediatamente de Por rever.
   - Se alguma rejeição falhar, manter essa notícia visível e selecionada, indicando quantas não foram processadas.

5. **Eliminar o salto para o topo**
   - Não substituir a lista inteira por um bloco de carregamento após Aprovar ou Rejeitar.
   - Remover localmente apenas a notícia tratada e manter a posição de leitura.
   - Atualizar o total e preencher novamente a página em segundo plano quando necessário, sem colapsar a altura do conteúdo.

## Validação

- Testar aprovação, rejeição individual e rejeição múltipla, incluindo falha parcial.
- Confirmar que o scroll se mantém após cada ação.
- Confirmar filtros de 3, 7 e 30 dias e a mudança entre estados.
- Validar a grelha em computador e a coluna única a 375 px.
- Não publicar o frontend nesta ronda.

## Ficheiros previstos

- `src/pages/Curadoria.tsx`
- `src/features/curadoria/CuradoriaNoticias.tsx`
- `src/test/curadoria-ui.test.tsx`
