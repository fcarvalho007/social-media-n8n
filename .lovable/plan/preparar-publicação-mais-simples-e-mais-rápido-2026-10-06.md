# Preparar publicação: mais simples e mais rápido

## Resposta à pergunta
Não é só PNG. O rascunho social leva os **PNG** (carrossel do Instagram, uma imagem por slide) e o **PDF** (documento do LinkedIn). O ZIP serve só para descarregar e não é preciso para as redes.

## O que está hoje (confirmado)
- O passo tem 3 blocos: escolher a variante, «Gerar ficheiros» e «Preparar rascunho». Gerar ficheiros parece obrigatório, mas só serve para o envio.
- Os ficheiros são feitos no servidor, 4 páginas de cada vez. A exportação que está a decorrer agora vai em 2 de 8 páginas e já recomeçou uma vez. As anteriores demoraram cerca de 50 s. Enquanto a primeira volta não termina, a página mostra só «Na fila», sem progresso.

## Como fica
O passo passa a ter duas ações independentes, sem numeração confusa:

```text
[ Pré-visualização da variante escolhida ]

Para ti (opcional)            Para as redes sociais
[Descarregar PNG]             [Aprovar e enviar para redes sociais]
[Descarregar PDF]             estado: A preparar 3 de 8 slides…
```

1. **Para ti (opcional)**: «Descarregar PNG» (ZIP com um PNG por slide) e «Descarregar PDF» ficam prontos em poucos segundos, feitos no navegador com o mesmo desenho do compositor. Não esperam pelo servidor e não criam nada.
2. **Para as redes sociais**: um único botão «Aprovar e enviar para redes sociais». Aprova esta versão, manda o servidor fazer os PNG e o PDF e fica na página com o progresso real («A preparar slide 3 de 8 · cerca de 40 s»). No fim, abre o rascunho em Criar, como hoje.
3. O bloco «Gerar ficheiros» desaparece como passo separado. Também desaparece a frase «Na fila. Podes sair desta página…».
4. Se a exportação falhar ou ficar parada mais de 2 minutos sem avançar, aparece uma mensagem clara com «Tentar novamente». Nada é enviado a meio.
5. Mantêm-se os bloqueios atuais: «Imagem por escolher», texto que não cabe e a confirmação de revisão.

## Mais rapidez no servidor
- O servidor deixa de fazer o ZIP, que só servia para descarregar.
- O progresso passa a ser guardado página a página, não só no fim de cada volta de 4.
- Primeiro vou medir a exportação parada para perceber porque recomeçou (falta de memória, tempo esgotado ou falha a guardar), e corrijo essa causa. A causa ainda não está confirmada.

## Detalhes técnicos
- `src/features/motor/RevisaoExportacao.tsx`: novo layout com 2 colunas, «Para ti» e «Para as redes sociais». Os ficheiros para descarregar usam o renderer partilhado do browser (o mesmo usado em «rascunho de teste», mas sem marca d'água e só com versões sem marcador), com jsPDF/JSZip já instalados. O envio usa o fluxo atual `pedirExportacao`, `enviarAoTerminar` e `prepararRascunho`, com progresso por página e deteção de paragem.
- `supabase/functions/_shared/motor/exportacao.server.ts`: retirar o ZIP do manifesto exigido (os ZIP já feitos ficam, nada é apagado); progresso gravado após cada PNG. Diagnóstico read-only dos logs de `mc-export` do trabalho parado.
- O processo do servidor continua a ser a única origem dos ficheiros do rascunho social: a regra de exportação no servidor por versão fica igual. Atualizar `AGENTS.md`: downloads pessoais no browser e ficheiros sociais só no servidor.
- Testes para o manifesto sem ZIP e para a regra de bloqueio. Verificação no ecrã sem enviar nada para as redes.
