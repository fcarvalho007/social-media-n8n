# Criar: publicar agora, taxa de sucesso, histórico do compositor e painel atualizado

## O que verifiquei

- O carrossel publicado hoje (17:20, Instagram + LinkedIn, estado «publicado») está guardado com a ligação ao trabalho do compositor (trabalho, documento, versão 584, redes). O rascunho que lhe deu origem foi consumido, como previsto. A informação não se perdeu e nada nesta proposta a apaga.
- Os três rascunhos «TESTE DE INTEGRAÇÃO» (07/10) **continuam guardados como rascunho**. A eliminação não ficou registada, por isso o painel continua a mostrá-los. A causa ainda não está confirmada.
- Há um rascunho «A IA pode influenciar uma jornada…» (17:16) que pode ser um duplicado do carrossel publicado às 17:20. Por confirmar.
- O painel «Conteúdo a tratar» lê os dados uma só vez, ao abrir. Não volta a ler depois de publicar ou eliminar e não segue o projeto escolhido em «Para quem?».
- Criar começa em «Publicar agora», mas três caminhos voltam a pôr «agendar»: «Criar novo», o fim de uma submissão e a recuperação de rascunhos guardados localmente.

## O que muda

1. **«Publicar agora» pré-selecionado sempre.** Aplica-se ao chegar do compositor, a «Criar novo», ao fim de uma submissão e a rascunhos sem data. Só fica agendado quando o rascunho já tem uma data futura ou quando escolher uma data.
2. **Taxa de sucesso.** No painel e no ecrã final da publicação aparece «Publicações com sucesso: X de Y (Z%)» dos últimos 30 dias, por rede. Conta como sucesso apenas a publicação confirmada pela rede, ou seja, com referência externa. Agendado, a publicar ou em erro não contam.
3. **O histórico do compositor nunca se perde.** A ligação publicação ↔ trabalho do compositor fica protegida: consumir ou apagar o rascunho não a remove. A biblioteca de carrosséis mostra «Publicado» com as redes e a data. Junto um teste a confirmar que o carrossel de hoje aparece como publicado.
4. **Painel atualizado.**
   - Volta a ler ao regressar à página, ao publicar e ao eliminar.
   - Mostra só o conteúdo do projeto escolhido; em «Todos» mostra tudo.
   - Antes de corrigir, investigo porque é que os «TESTE DE INTEGRAÇÃO» não foram eliminados. Se a eliminação falhou em silêncio, passa a mostrar o erro. Não apago nada sem lhe perguntar.
5. **Destaque do cartão.** A miniatura fica maior e mostra o primeiro slide real. O título vem da primeira linha da legenda, a negrito e com até 2 linhas. Por baixo ficam o tipo, as redes e a data no formato DD/MM/AAAA.

## Detalhes técnicos

- `ManualCreate.tsx` (handleCreateNew), `usePublishOrchestrator.ts` e `useAutoSave.ts`: o valor por defeito passa a `true`. `useDraftRecovery` só usa `false` quando há `scheduled_date` futura.
- `usePendingContent`: passa para react-query, com chave por utilizador e projeto, invalidação em publicar/eliminar e refetch ao focar. Filtra por `project_id` como as listas de rascunhos.
- A taxa de sucesso vem de `posts`, com `external_post_ids` por rede e janela de 30 dias, numa função pura com teste (valores concretos: 1 de 2 dá 50%).
- `PendingThumbnail` / `PainelBento`: só mudanças de apresentação, com tokens existentes.
- A investigação da eliminação fica só em leitura: o caminho de eliminação em /drafts e as permissões de escrita.

## Riscos

- A filtragem por projeto pode esconder rascunhos antigos sem projeto, que só aparecem em «Todos». É o comportamento já acordado.
