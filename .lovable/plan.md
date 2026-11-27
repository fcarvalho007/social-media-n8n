# Retirar «Peças móveis» e ficar só com «Destaques da crónica»

## O que está mal hoje
- «Peças móveis da crónica» repete o que a secção «Apresentação Revista», mais acima, já faz: excerto, lede e uma proposta de IA própria.
- Não há maneira de apagar a lede, a frase de destaque ou o número: só se pode mover ou desligar.
- Listar todos os parágrafos, com setas, torna a secção comprida e confusa.

## O que muda
1. **A secção «Peças móveis» desaparece**
   - Deixa de haver a lista de parágrafos com setas, o «Montar com IA» próprio e o «Montar excerto».
   - O excerto continua a ser editado só no campo «Excerto da crónica», na Apresentação Revista.

2. **Nova secção curta: «Destaques da crónica»**, com dois cartões:
   - **Frase em grande:** um campo de texto, um botão «Escolher do texto» e «Onde aparece: depois do parágrafo N».
   - **Número da semana:** etiqueta, número e descrição, também com «Escolher do texto» e «Onde aparece».
   - «Escolher do texto» mostra os parágrafos do excerto. Ao selecionar uma frase ou um número, esse trecho é usado no cartão, como no comportamento atual.
   - Cada cartão tem «Apagar», que retira o destaque por completo, com «Desfazer» no aviso.
   - O cartão mostra de onde veio o texto: «IA», «Do texto» ou «Escrita à mão».

3. **Uma única proposta de IA**
   - «Propor apresentação» volta a ser o único sítio com IA. Sugere o título, a segunda linha, a lede, o excerto, a frase em grande, o número e a imagem, e cada sugestão tem «Aplicar» e «Reverter».
   - A lede passa a ser um campo simples na Apresentação Revista, ao lado do título.
   - O botão «Repor crónica original» passa para a Apresentação Revista. Retira a lede, os dois destaques e o excerto personalizado, deixa o texto da crónica igual e tem «Desfazer».

## Detalhes técnicos
- Editar apenas as fontes inertes em `migration-reference/code/newsletter/src/features/newsletter/revista/`:
  - `EditorRevista.tsx.txt`: retirar `OrdemPecasCronica` e o Subgrupo «pecas»;
  - criar `DestaquesCronica.tsx.txt`;
  - `PropostaApresentacao.tsx.txt`: repor as linhas lede, frase e momento, com Reverter;
  - `PropostaPecasCronica.tsx.txt`: fica sem uso e é apagado.
- Depois, regenerar com `port-newsletter.py` e correr `verificar-grafo-edge.py`.
- Sem mudanças nos dados: os campos e as posições (`pull_quote_posicao`, `momento_posicao`, `cronica_lede_posicao`) mantêm-se, e o email e a web mostram tudo como hoje.
- A lede mantém a posição que já tem guardada.
- «Apagar» limpa o texto e desliga o momento (`momento_activo=false`).
- A função de IA `propor-pecas` deixa de ser chamada pelo ecrã. O código fica no servidor, sem deploy.
- Reutilizar `pecaDeTrecho` / `snapshotRepor`, atualizar os testes e validar em 1280 px e 375 px. Ramo local, sem publicar.
