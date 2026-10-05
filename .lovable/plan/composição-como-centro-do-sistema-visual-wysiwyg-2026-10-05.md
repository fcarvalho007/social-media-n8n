# Composição como centro do sistema visual (WYSIWYG)

## Auditoria (o que o código faz hoje)

**A. O que alimenta a pré-visualização do Design?**
O documento em memória (`pacote`), mais três coisas separadas: a escolha local do ecrã (estilo, paleta, quebras), o sistema guardado na tabela `mc_sistemas_visuais` e as composições de imagem da tabela `mc_composicao_paginas`. O `PassoDesign` volta a calcular tudo com `aplicarSistema(...)`, sempre com `variante: "A"`. As miniaturas são calculadas outra vez só para as páginas 0–1.

**B. O que alimenta o documento do Compositor?**
O mesmo `pacote` (variantes A e B como dois documentos completos), mas o editor também recebe o `sistema` e as `composicoes` das tabelas. Ao mudar o estilo ou a imagem de uma página, o editor volta a chamar `aplicarSistema`. Os botões A/B do topo trocam entre os dois documentos.

**C. «Aplicar estilo» cria um documento novo ou altera o existente?**
Cria um pacote novo a partir de `aplicarSistema`: as camadas geradas são reconstruídas nas duas variantes e só as notas manuais são preservadas. Esse pacote substitui o estado e é gravado como nova versão. O sistema é gravado à parte, sem esperar e numa operação separada (`guardarSistema`). Desfazer não reverte o sistema.

**D. Pode haver divergência?** Sim, em quatro casos:
1. O Design pré-visualiza a variante A; a Composição pode abrir na B.
2. O sistema guardado e o documento podem ficar dessincronizados: falha ou conflito em `definirSistemaVisual`, «Reverter» ou desfazer.
3. As composições de imagem vivem numa tabela e são reaplicadas ao renderizar. O documento gravado, e portanto a exportação, pode não as conter, ou contê-las de outra forma.
4. As miniaturas do Design usam um cálculo separado (`[0,1]`).

**E. Onde guardar para haver uma só fonte de verdade?**
Dentro do próprio documento versionado, `mc_documentos_versoes`, que já tem CAS, histórico e exportação.
- **Hoje não é possível:** o `validarDocumento` descarta qualquer campo que não conheça.
- **Proposta:** estender o esquema `DocumentoGrafico` v1 com campos opcionais, para que documentos antigos continuem válidos:
  - `documento.sistema = { estilo, variante, paleta, ritmo }`
  - `pagina.papel`
  - `pagina.composicao = { modo, origem, assetId, regiao, foco, overlay, direcao, intensidade, consulta }`
  - `camada.gerado: boolean`
  - `camada.manual: boolean`
- **Tabelas antigas:** `mc_sistemas_visuais` e `mc_composicao_paginas` deixam de ser lidas e escritas. Ficam marcadas como DEPRECATED, sem apagar dados. Na primeira abertura de um trabalho antigo, os dados delas são copiados para o documento, uma única vez e só nesse sentido. Depois o documento é a única fonte.

## O que muda para o utilizador

- Os passos passam a ser: **Fonte → Narrativa → Composição → Preparar publicação**. O passo Design desaparece; os links e a recuperação de sessão que apontavam para «design» passam a abrir a Composição.
- O painel «Estilos» passa a chamar-se **Direção visual**:
  - Abre automaticamente na primeira entrada.
  - Tem catálogo de 6 estilos (miniaturas apenas ilustrativas), variante com nome, 5 paletas Navy, ritmo (Automático / Personalizado) e imagens (Automático / Sem sugestão automática).
  - Cada clique muda logo a página aberta e as miniaturas de baixo. Trabalha sobre uma cópia temporária do mesmo documento.
  - **Aplicar** grava exatamente o que se vê. **Cancelar** repõe o estado anterior.
- No topo, os botões A/B são substituídos por «Editorial · Clássico · Navy Editorial [Alterar]».
- **Painel da página:**
  - «Papel visual», com aviso antes de substituir ajustes manuais.
  - «Imagem», com fonte (Biblioteca, Pexels, Envio, IA), modo, enquadramento, overlay, intensidade e posição do texto. Atua no canvas real.
- **Trocar estilo ou variante com ajustes manuais:** aparece o aviso «Esta alteração pode substituir ajustes manuais em X páginas», com as opções Manter ajustes quando possível / Recriar composição / Cancelar.
- **Trocar só a paleta:** não aparece aviso. Muda só as cores.

## Variantes com nomes e diferenças reais

As variantes A e B continuam a ser os dois documentos internos, para manter a compatibilidade, mas deixam de ser expostas como «A/B».

| Estilo | Variante 1 | Variante 2 |
|---|---|---|
| Editorial | Clássico | Contemporâneo |
| Contraste | Geométrico | Radical |
| Revista | Capa | Tipográfico |
| Fotográfico | Cinematográfico | Glass |
| Minimalista | Suíço | Airy |
| Didático | Steps | Cards |

A variante 2 deixa de ser um espelho da 1. Cada uma tem a sua própria escala de títulos, grelha, recortes e espaço negativo, definidos no motor. Exemplo: Contemporâneo tem títulos maiores, composição assimétrica e fotografia que pode cruzar a grelha.

## Papel visual nasce na Narrativa

- A Narrativa passa a devolver `pageRole` por slide (os dez valores). O prompt pede uma decisão semântica, não por padrões no texto.
- O campo é opcional, para que as propostas já gravadas continuem válidas.
- Trabalhos antigos sem papel usam `inferirPapel` como recurso. Depois de gravado, o papel fica explícito no documento.
- Não é feita nenhuma chamada paga: o caminho real fica preparado e é testado com o simulador.

## Detalhes técnicos

1. **`nucleo.ts`:** campos opcionais em `DocumentoGrafico`, `Pagina` e `Camada`. O validador aceita-os com limites, e o export SVG e o Konva ignoram os metadados. É preciso confirmar se a validação SQL no servidor (`mc_validar_documento`) aceita chaves extra; se não aceitar, uma migração aditiva relaxa só essas chaves.
2. **`sistema.ts` e `imagem.ts`:**
   - `aplicarSistema(pacote, sistema, modo: "manter" | "recriar")` passa a ler `papel` e `composicao` das próprias páginas. Escreve o sistema no documento e marca `gerado` nas camadas que cria.
   - As camadas editadas pelo utilizador passam a `manual`, e o modo «manter» preserva-as.
   - `recolorir(pacote, paleta)` só troca cores (fundo, texto, formas, paragens de gradiente) e mantém a geometria.
3. **`modelos.ts`:** acrescentar composições próprias para a variante 2 de cada estilo, no lugar do espelho, com testes de que A ≠ B, de que é diferente de um espelho e de que nada transborda.
4. **`EditorGrafico.tsx`:**
   - Estado `rascunhoVisual`, uma cópia do pacote; o canvas e as miniaturas renderizam essa cópia. Aplicar passa pelo `onAlterado` e gravação CAS que já existem (uma versão); Cancelar descarta.
   - Remover o ToggleGroup A/B do topo e pôr o indicador no lugar.
   - Painéis «Direção visual», «Papel visual» e «Imagem», este último reutilizando `PainelImagemSlide` e o seletor Biblioteca/Pexels/Envio/IA.
5. **`CarrosselTrabalho.tsx`:**
   - Remover o passo `design`, o `PassoDesign`, `guardarSistema`, `comps` e `guardarComposicao`.
   - Adicionar a migração única das tabelas antigas para o documento, aplicada na primeira gravação.
   - O `PassoDesign.tsx` fica sem uso, como aconteceu com o painel antigo; o catálogo de miniaturas é extraído para um componente partilhado.
6. **Migração:** `COMMENT ... DEPRECATED` nas duas tabelas, sem apagar nada.
7. **Proposta:** `pageRole` opcional em `SlideProposta`, no validador e no prompt DeepSeek, e passado para `pagina.papel` na criação do documento.
8. **Testes:**
   - Paleta mantém a geometria, a posição e tamanho do texto, a imagem, o recorte, o foco, o papel e o modo.
   - Os ajustes manuais sobrevivem à troca de paleta.
   - O aviso conta as páginas com ajustes manuais.
   - Cancelar devolve um documento idêntico, com o mesmo hash.
   - O documento gravado e depois lido renderiza o mesmo SVG.
9. **QA na fixture 72dbadbb, sem documentos reais:**
   - Editorial · Clássico · Navy Editorial: capturar os 8 slides, recarregar e comparar os pixels.
   - Exportar PNG apenas nessa fixture e comparar com o canvas.
   - Editorial → Revista: Cancelar e depois Aplicar, com reabertura.
   - Navy Signal: comparar a geometria.
   - Ajustes manuais com aviso.
   - Verificar em computador e em 393 px.

Restrições: sem IA paga, sem publicação, sem documentos reais, sem mexer em autenticação, segredos ou quotas, sem apagar dados.
