# Corrigir imagens IA invisíveis e «Redesenhar» sem resposta

## Diagnóstico

- **Confirmado:** as duas imagens foram geradas e guardadas às 15:02 (Direção A e Direção B, ambas «concluída», cada uma com imagem própria). O problema não está na geração: está no ecrã.
- **Confirmado no código:** para montar as propostas IA, a janela precisa de um esqueleto de composição com imagem. Este slide está classificado como «dado», e para esse tipo o sistema recusa composições com imagem. Sem esqueleto, as imagens chegam mas não há onde as colocar, e nada aparece.
- **Confirmado no código:** quando as tarefas terminam, saem da lista de «pendentes» e a janela volta a mostrar «Rever custo e gerar», como se nada tivesse sido feito (é o que se vê na captura). Ao reabrir, só se recuperam tarefas pendentes, por isso as imagens já pagas ficam perdidas para o utilizador.
- **Por confirmar:** «Redesenhar não fez nada» à segunda abertura. A causa ainda não foi reproduzida; primeiro passo é reproduzi-la no ecrã antes de corrigir.

## O que muda

1. **Esqueleto próprio para as propostas IA**, independente da regra «sem imagem em slides de dados» das cinco gratuitas. Direção A: imagem lateral com texto dominante. Direção B: imagem de fundo com zona de leitura protegida. Texto original intacto, sem cortes nem redução de letra; se não couber, o cartão diz porquê em vez de ficar vazio.
2. **Imagens concluídas nunca desaparecem:** guardar e recuperar também as tarefas concluídas deste slide (as duas mais recentes), ao abrir, fechar e reabrir. As imagens das 15:02 passam a aparecer sem novo pagamento.
3. **Estados claros por direção:** «A gerar», «Disponível», «Falhou», «Resultado desconhecido», ou «Imagem pronta, mas não cabe nesta composição». «Rever custo e gerar» só aparece quando não existe nenhuma proposta para este slide; com propostas existentes, surge «Gerar novas (pago)» separado.
4. **«Redesenhar» sempre abre:** reproduzir o erro, corrigir a causa real e garantir que um erro nas propostas IA mostra um aviso dentro da janela em vez de a bloquear.

## Validação

- Testes: slide de dados recebe esqueleto IA válido com texto palavra por palavra; tarefas concluídas são recuperadas ao reabrir; uma direção concluída e outra pendente mostram-se em separado.
- Abrir, fechar e reabrir «Redesenhar» várias vezes no slide real, desktop e 375 px, confirmando que as duas imagens existentes aparecem.
- Nenhuma geração paga durante a correção ou os testes.

## Detalhes técnicos

- `PainelRedesenhar.tsx`: `layoutIA` depende de `redesenharPagina(..., incluirIA: true)`, que exclui IA quando `imagemInadequada(papel)`; passar a usar um construtor dedicado em `redesenhar.ts` (ex.: `esqueletosPropostaIA`) que ignora esse bloqueio só para a rota paga.
- `consultar()` substitui `tarefas` por pendentes; manter lista completa com estado e derivar `resultados` dela; `recuperarPropostasImagemIA` / ação `mc-motor` devem devolver também concluídas (já usa `limit(2)` por `contexto_chave`).
- Reprodução do segundo clique via Playwright com sessão; verificar consola/erros em `EditorGrafico` (estado `aberto` do painel).
- Atualizar `mc-motor` e correr testes do motor, tipos e grafo Edge.
