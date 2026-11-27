# Apresentação da crónica: sem duplicação, repor original e destacar trechos

## O que está mal hoje
- Há duas propostas de IA que fazem o mesmo: «Propor apresentação» (Apresentação Revista) e «Montar com IA» (Peças móveis) propõem ambas lede, frase de destaque e momento editorial, cada uma com os seus botões Aplicar/Reverter.
- Não existe uma forma clara de apagar tudo o que foi acrescentado e ficar só com a crónica original.
- A frase de destaque e o número só vêm da IA; não dá para escolher um trecho do texto.

## O que muda
1. **Uma só origem para cada peça**
   - «Propor apresentação» fica só com: título, segunda linha, excerto e imagem.
   - Lede, frase de destaque e momento editorial ficam só nas «Peças móveis» (onde também se escolhe a posição entre parágrafos), com «Montar com IA».
   - O botão «Reverter» de cada sugestão mantém-se nos campos que ficam.

2. **«Repor crónica original»** (substitui «Limpar peças»)
   - Um botão que retira lede, frase de destaque, momento editorial e o excerto personalizado (que volta ao início automático da crónica).
   - O texto da crónica, o título, a segunda linha e a imagem não mudam.
   - Pede confirmação, e depois mostra um aviso com «Desfazer», que repõe tudo como estava.

3. **Destacar um trecho**
   - Nas Peças móveis, ao abrir um parágrafo, pode selecionar uma frase ou um número com o rato.
   - Aparece um pequeno menu junto à seleção: «Usar como frase de destaque» ou «Usar como número da semana».
   - A peça é colocada logo a seguir a esse parágrafo, com «Desfazer» no aviso.
   - Para o número, a seleção vai para o valor (ex.: «19%») e o resto do parágrafo é proposto como descrição, editável. Não usa IA.

4. **Mais clareza no ecrã**
   - Cada peça mostra de onde veio: «IA», «Do texto» ou «Escrita à mão».
   - Textos de ajuda mais curtos; botões principais alinhados numa única linha.

## Detalhes técnicos
- Editar apenas as fontes inertes em `migration-reference/code/newsletter/src/features/newsletter/revista/` (`PropostaApresentacao.tsx.txt`, `PropostaPecasCronica.tsx.txt`, `EditorRevista.tsx.txt`) e regenerar com `python3 scripts/port-newsletter.py`; correr `scripts/verificar-grafo-edge.py`.
- A proposta de IA do servidor não muda; o cliente ignora lede/frase/momento em «Propor apresentação» (sem custo extra).
- «Repor crónica original»: snapshot de `snapshotPecas(cfg)` + `cronica_excerto`, aplica `PECAS_VAZIAS` + `cronica_excerto: ""`; «Desfazer» reaplica o snapshot.
- Seleção: `window.getSelection()` restrita ao parágrafo aberto; posição = índice do parágrafo; a etiqueta de origem é só visual (estado local, sem coluna nova).
- Funções puras (repor/desfazer, trecho → peça) com testes em `src/test/`.
- Validar em 1280 px e 375 px. Sem mudanças de backend nem de dados; ramo local, sem publicar.

## Ideias opcionais
- Guardar a origem de cada peça na base de dados, para aparecer também noutras sessões.
