# Materiais para gravação de Reels

Extensão de «Preparar gravação» no layout Lovable existente. Mantém a comparação inicial de dois frameworks e a montagem por blocos. Cada passagem reúne a locução preservada, uma instrução de edição e a escolha de uma imagem ou «Só apresentador». «Rever sequência» mostra o conjunto antes de «Guardar e aprovar sequência» e da exportação.

## Dados e integração

- `MateriaisGravacao.tsx` apresenta as passagens, revisão, aprovação e exportação; `SeletorMateriais.tsx` oferece Biblioteca, Carregar e Gerar com IA.
- `src/services/roteiros-materiais.ts` reutiliza a biblioteca e os assets do projeto através do motor existente. O carregamento passa pela validação/conversão já usada pelo editor gráfico. `GeradorKie` continua a tratar as propostas de IA; abrir o seletor não gera imagens e receber uma proposta não a aplica. «Usar esta imagem gerada» é uma ação separada.
- `CenaRoteiro.apoio` guarda `tipo: imagem` com `asset_id` e nome opcional, ou `tipo: apresentador`. Os bytes continuam em `mc_assets`; não há segundo fornecedor, base de dados ou login.
- `supabase/functions/_shared/roteiros/materiais.ts` calcula uma assinatura SHA-256 canónica do título, notas, ritmo em palavras/minuto e cenas completas, incluindo ordem, fala, instrução, termos de pesquisa e apoio. `materiais_revistos` guarda essa assinatura. Uma alteração invalida a aprovação até nova revisão e gravação; a ordenação de chaves do JSONB não a invalida.
- `drizzle/migrations/0049_roteiros_materiais.sql` valida a forma do apoio e exige imagens PNG/JPEG de `mc_assets` do mesmo projeto. Atualiza `rv_guardar` conservando autorização, controlo de revisão concorrente e histórico em `rv_versoes`; as políticas RLS existentes permanecem.

Fala, instrução e escolha visual devem estar completas. Uma imagem inacessível, falha de leitura ou conflito de gravação bloqueia a exportação e permite corrigir a sequência.

## Pacote entregue

`src/features/roteiros/materiais-exportar.ts` volta a verificar a aprovação e resolve todas as imagens antes de criar `roteiro-plano-e-materiais.zip`. O conjunto contém:

- `locucao-bigvu.txt`: fala limpa para copiar para o BIGVU.
- `plano-gravacao.txt` e `plano-gravacao.pdf`: sequência e instruções; o PDF inclui as imagens escolhidas.
- `materiais/passagem-NN.png` ou `.jpg`: bytes das imagens armazenadas, por passagem, separados do PDF.
- `manifesto.json`: ordem, identificadores, fala, instruções, apoio, ficheiro e crédito por passagem.
- `creditos.txt`: créditos disponíveis nos assets, ou indicação de que não há créditos associados.

O limite do conjunto de imagens é 60 MB. Os tempos são estimativas por palavras/minuto e exigem confirmação após gravar; não há medição de áudio nem renderização de vídeo. As imagens geradas são identificadas como ilustrações, não como prova da notícia.

## Validação e instalação

A pré-visualização `npm run dev:roteiros` injeta `apiMateriaisLocal` no editor. PGlite conserva imagens com bytes reais na base local e aplica a validação 0049; não injeta exemplos no código de produção. A geração de imagens paga fica indisponível neste modo. Carregamento real, reabertura/recarregamento, ZIP e PDF ilustrado foram verificados localmente. Os testes focados cobrem revisão e invalidação, falha de gravação, escolha explícita da proposta de IA, estabilidade do hash em JSONB e recusa de exportações incompletas. Esta validação não certifica o backend remoto nem uma chamada paga de IA.

Bateria final: 457 testes passaram e um teste opcional de fotografias foi ignorado, com dois workers. Typecheck da aplicação e do código Node, build, ESLint dos novos componentes e verificação do grafo Edge passaram.

**Instalação Cloud concluída em 7 de outubro de 2026.** O PR #6 foi integrado; a 0049 ficou registada no ledger (id 57), seguida do marcador 0050 (id 58, apenas comentário). A função `rv-roteiros` foi reinstalada. As verificações de permissões confirmaram a 0048 e o isolamento de `mc_assets` por projeto; um pedido Edge sem sessão foi recusado com 401.

O roteiro técnico `d867c62c-ff14-4c91-b992-2db07149bd08`, marcado «não publicar», recebeu uma imagem real da biblioteca com crédito e duas passagens do apresentador. A sequência foi aprovada na versão 3, recarregada e exportada. O ZIP real contém a imagem JPEG, a locução, o plano TXT/PDF ilustrado, o manifesto e os créditos. O PDF foi renderizado e revisto. O gerador apresentou a configuração FLUX/fal.ai e a confirmação de custo foi cancelada: nenhuma geração paga foi ensaiada. O carregamento de ficheiros foi verificado localmente, não repetido no Cloud nesta ronda.

Um único prompt de instalação foi usado nesta extensão (2,20 créditos observados nos detalhes Lovable). O código foi desenvolvido localmente.

Para reproduzir a instalação noutro backend:

1. Integrar o frontend preservando as alterações atuais do projeto e confirmar que as migrações anteriores dos roteiros, incluindo 0048, e o motor `mc_assets` estão instalados.
2. Aplicar `drizzle/migrations/0049_roteiros_materiais.sql` no backend do Hub, conferindo a numeração face às migrações remotas. Não aplicar `scripts/roteiros/base-local.sql` nem os dados PGlite no Cloud.
3. Reinstalar `rv-roteiros` com o código partilhado atualizado e a configuração existente; reutilizar os serviços e Secrets já configurados.
4. Com uma conta autorizada, testar biblioteca/carregamento → escolher apoio em cada passagem → rever → guardar/aprovar → reabrir → exportar. Confirmar que mudar fala, ordem, imagem, instrução ou ritmo bloqueia a exportação até nova aprovação; verificar também conflito entre separadores e recusa de um asset de outro projeto.

Este documento atualiza o alcance dos materiais descrito em `docs/roteiros-reels.md`: o plano passa a poder incluir imagens e um pacote ZIP. A gravação continua fora do Hub.
