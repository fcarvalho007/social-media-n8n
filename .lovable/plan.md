# Refinar o compositor: texto, seleção, Giphy e imagens por IA

## Objetivo
Tornar a edição mais imediata e previsível, aproximando o compositor de uma ferramenta gráfica profissional, sem alterar o renderer canónico, sem gerar imagens durante a implementação e sem mexer em conteúdos já guardados.

## 1. Texto e caixas de seleção
- Ajustar a caixa visual de títulos e parágrafos à área realmente ocupada pelas linhas, em vez de mostrar toda a altura declarada da camada.
- Recalcular a altura útil depois de editar texto: encolher espaço vertical excedente e crescer apenas quando necessário, sem reduzir automaticamente o tamanho da letra e sem criar sobreposição com a caixa seguinte.
- Alinhar o editor sobreposto com os limites interiores reais do texto, preservando família, tamanho, peso, alinhamento e espaçamento; a fonte não deve parecer mudar ao entrar em edição.
- Atualizar negrito e sublinhado/cor imediatamente enquanto a caixa continua selecionada, mantendo as marcas no documento versionado e a mesma aparência na pré-visualização e exportação.
- Clicar na área vazia do compositor limpa a seleção.

## 2. Seleção por retângulo e ações em grupo
- Permitir iniciar um retângulo de seleção na área cinzenta e atravessar o slide.
- Selecionar todos os elementos tocados pelo retângulo, conforme escolhido.
- Permitir mover, copiar, colar e apagar o conjunto sem alterar a ordem interna das camadas; Shift+clique acrescenta ou retira um elemento.
- Mostrar uma moldura coletiva discreta e manter as propriedades específicas escondidas quando a seleção contém tipos incompatíveis.
- Preservar a seleção individual e a edição por duplo clique.

## 3. Reorganizar a área de imagens
- Tornar **Fotos** a primeira fonte e manter a pesquisa conjunta Pexels + Unsplash.
- Separar **Giphy** como categoria própria, ao lado de Fotos, Biblioteca, Carregar e IA.
- Remover duplicações/confusão entre “Imagem, como usar?” e “Imagem ao fundo”, mantendo uma única escolha clara entre imagem normal e fundo; os controlos de modo, posição, overlay, intensidade e foco continuam a atuar sobre a composição guardada.
- Manter substituição de imagem sem mexer na posição do texto, efeitos, paleta, direção visual ou restantes escolhas do slide.

## 4. Giphy: GIFs, stickers e Clips
- Criar um seletor interno com **GIFs / Stickers / Clips**, pesquisa, estado vazio útil, carregamento, paginação e erros claros.
- Generalizar o contrato atual, hoje exclusivo de stickers, para transportar o tipo de resultado e guardar sempre:
  - uma capa estática para o canvas e exportação estática;
  - o MP4 imutável associado para reprodução e futura exportação animada.
- Reutilizar a tabela de animações e o vínculo capa–MP4 existentes; não alterar o renderer estático.
- Validar no servidor hosts, MIME, dimensões, duração e tamanho antes de guardar. Clips só ficam disponíveis se a API configurada realmente os autorizar e devolver rendições compatíveis; caso contrário, o separador explica a indisponibilidade sem afetar GIFs ou stickers.
- Confirmar que a pesquisa de stickers deixa de devolver silêncio sem diagnóstico.

## 5. Geração de imagens por IA
- Mostrar apenas modelos realmente configurados e suportados no servidor, **pelo nome**, nunca uma lista inventada. O catálogo devolve por opção: fornecedor, modelo, proporções/dimensões aceites, preço e origem do preço.
- Incluir o Seedream 5 Flash já configurado e expor outras opções apenas quando houver configuração e preço verificável; valores estimados aparecem explicitamente como estimativas.
- Acrescentar seletores de modelo, formato adequado ao documento, quantidade de versões e custo total antes da confirmação.
- Cada clique confirmado cria uma reserva independente, respeita o limite diário existente e nunca repete automaticamente um resultado desconhecido.
- Para várias versões, apresentar progresso e resultados individualmente; cada resultado entra como asset de origem IA e pode ser escolhido sem alterar o resto da composição.
- Manter fal.ai como fornecedor principal e Kie como alternativa apenas nas condições de segurança já existentes, mas deixar claro ao utilizador qual opção concreta será cobrada.

## 6. “Modo profissional” opcional para o prompt
- Incorporar a referência enviada como estrutura server-side versionada, ativada por um controlo **Modo profissional** em cada pedido.
- Quando ativo, organizar o pedido pelas secções aplicáveis da referência: sujeito, cena, ambiente, composição, luz, estilo, paleta, preservação e restrições, fechando com um resumo.
- Adaptar a estrutura ao tipo pedido: não impor fotorrealismo, 4K, texto dentro da imagem ou referências cinematográficas quando forem incompatíveis com a intenção, o modelo ou o formato.
- Mostrar ao utilizador o prompt final editável antes da confirmação paga; nunca expor instruções privadas nem guardar a referência apenas no navegador.

## Validação
- Testes unitários para limites reais de texto, autoaltura, interseção do retângulo, seleção múltipla e marcas de texto em atualização imediata.
- Testes de contrato para GIFs/stickers/Clips, rendições inválidas, limites de ficheiro, catálogo de modelos, custos, quantidades e confirmação obrigatória.
- Testes de regressão: origem da imagem nunca altera composição; editor, pré-visualização e exportação estática continuam iguais; nenhuma chamada usa o Lovable AI Gateway em runtime.
- Verificação real no compositor em desktop e 375 px: editar texto, aplicar negrito/sublinhado, clicar fora, selecionar por área, pesquisar cada tipo Giphy e chegar até à confirmação IA sem executar geração paga.
- Executar testes relevantes, verificação TypeScript, grafo Edge e build; corrigir apenas incompatibilidades indispensáveis.

## Alterações técnicas previstas
- Frontend: canvas/estado do editor, editor inline e painéis Imagem, Giphy e IA.
- Backend: contratos de pesquisa/importação Giphy e catálogo/parâmetros de geração de imagem no `mc-motor` e módulos partilhados.
- Dados: sem migração prevista; será usada a estrutura existente de assets, animações, tarefas e custos. Se a implementação provar que falta um campo indispensável, parar e apresentar a migração aditiva antes de a aplicar.
- Sem alterações a login, papéis, credenciais, crons, publicações ou documentos existentes. Não será feita qualquer geração paga nesta ronda de validação.
