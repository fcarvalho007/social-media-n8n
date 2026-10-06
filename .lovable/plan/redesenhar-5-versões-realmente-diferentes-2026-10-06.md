# Redesenhar: 5 versões realmente diferentes

## O que está errado (confirmado no código)

É um erro do gerador de propostas, não da IA (o redesenho não usa IA).

- O slide 1 não tem imagem. Sem imagem, o gerador só aceita receitas «só tipografia», e todas elas deixam o texto no mesmo sítio, com o mesmo tamanho e o mesmo fundo. Só mudam pequenos efeitos (cantos, filete).
- Quando faltam versões, o gerador completa a lista com receitas de reserva e **desliga a verificação de «versão repetida»**. Por isso aparecem 5 cartões iguais com nomes diferentes.
- Trocar o estilo («Contraste», «Revista») com a mesma paleta quase não altera o slide.

## O que vai mudar

1. **Variações tipográficas a sério**, sem imagem: cada versão muda pelo menos duas destas coisas:
   - onde fica o texto (em cima, centro, em baixo, coluna à esquerda);
   - alinhamento (esquerda, centro);
   - escala do título (normal, grande, cartaz), sempre sem reduzir letra abaixo do mínimo legível;
   - fundo (cor sólida, bloco de cor da paleta atrás do texto, faixa lateral, fundo invertido claro/escuro);
   - elemento gráfico de apoio (número grande em destaque, filete, moldura).
2. **Versões preparadas para imagem**, mesmo quando o slide ainda não tem: por exemplo «Imagem em cima, texto em baixo» ou «Dividido». Mostram um espaço marcado «Imagem por escolher». Depois de aplicar, escolhe a imagem no painel Imagem (Biblioteca, Fotos, Carregar, IA). Até lá, a exportação final continua bloqueada, como hoje.
3. **Nunca duas versões iguais**: a verificação de repetição deixa de poder ser desligada e passa a comparar posição do texto, tamanho do título, fundo e espaço de imagem. Se não houver 5 diferentes, mostra menos e diz porquê, em vez de repetir.
4. **2 disruptivas de verdade**: só ganham o selo «Disruptiva» se mudarem o fundo e a posição do texto em relação ao slide atual.
5. **Descrição honesta** em cada cartão: a linha «Só tipografia · texto em baixo» passa a refletir o que muda de facto (ex.: «Texto ao centro · título cartaz · fundo invertido»).

## Como vou confirmar

- Teste automático: num slide sem imagem, as 5 versões têm todas desenho diferente entre si e do original; nenhuma corta texto nem reduz letra.
- Teste no ecrã com o slide 1 deste carrossel: abrir «Redesenhar», ver as 5 versões, sem aplicar nem guardar nada.

## Detalhes técnicos

- `supabase/functions/_shared/motor/redesenhar.ts`: novas receitas tipográficas com parâmetros de composição (região, alinhamento, escala, tratamento de fundo); remover `ignorarAssinatura` dos fallbacks; `assinatura()` passa a incluir tratamento de fundo e presença de espaço de imagem; receitas com imagem usam o marcador «Imagem por escolher» quando não há asset.
- `supabase/functions/_shared/motor/modelos.ts` / `sistema.ts`: aceitar os novos parâmetros (escala e tratamento de fundo) como decorações "mod-" já existentes, sem renderer novo; preview = editor = exportação.
- `PainelRedesenhar.tsx`: resumo do cartão gerado a partir da composição real.
- Testes em `src/test/efeitos-redesenhar.test.ts`. Sem chamadas pagas, sem alterar documentos guardados.
