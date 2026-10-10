# Podcast: resumo de duas linhas e bloco dentro do episódio

## O que muda para o utilizador

1. **Resumo automático do episódio** — ao escolher um episódio em «Episódio do podcast», a IA lê a descrição do RSS e escreve um resumo de duas linhas (pt-PT). O resumo aparece por baixo do título no bloco amarelo do podcast (email e versão web) e fica editável no campo «Breve descrição».
2. **Bloco do podcast passa a sub-cartão** — o cartão «Bloco do podcast» deixa de aparecer solto na lista geral. Fica dentro de «Episódio do podcast», visível apenas quando essa secção é aberta, com os mesmos campos de edição (etiqueta, programa, tema, convidado, resumo, URL, botão, mostrar/ocultar).

## Regras
- O resumo é gerado uma única vez por episódio e guardado; trocar para um episódio já resumido não volta a gastar IA.
- Se o utilizador já editou o resumo à mão, escolher o mesmo episódio não o reescreve; o botão «Repor a partir do episódio escolhido» repõe o resumo guardado.
- Botão «Gerar resumo de novo» explícito (gasta IA; custo registado na página Custos).
- Se a IA falhar ou o RSS não tiver descrição, o campo fica vazio com aviso; nada bloqueia a edição.
- Máximo ~200 caracteres, sem emojis nem links; limite aplicado no código.

## Custos
Usa a IA de texto já configurada (DeepSeek), custo de cêntimos por episódio, registado em Custos. Não há geração em massa do histórico (416 episódios) — só ao escolher.

## Detalhes técnicos
- Base de dados: hoje `nl_episodios_podcast` não guarda a descrição do RSS. Migração aditiva: colunas `descricao text` e `resumo_ia text` (nulas). A sincronização do RSS (`rss.server.ts` já extrai `description`) passa a gravar `descricao`; episódios antigos ganham descrição na próxima sincronização (actualização só desse campo).
- Nova operação `podcast-resumir` em `nl-api` (mapa `nl-ops.ts`, staff), via `_shared/deepseek-direto.ts`, com `custos_registos()`; devolve e grava `resumo_ia`.
- `patchBlocoPodcast` passa a preencher `podcast_pergunta` com `resumo_ia` (gera se faltar).
- Render email/web: o texto de `podcast_pergunta` já é desenhado no bloco; confirmar posição logo abaixo do tema e limitar a 2 linhas.
- UI: mover o `BlocoEdicao id="bloco_podcast"` para dentro do componente `Podcast` (sub-cartão recolhido), editando apenas a fonte em `migration-reference/...txt` e regenerando com `scripts/port-newsletter.py` (+ `verificar-grafo-edge.py`).
- Testes: limite de comprimento/limpeza do resumo; não regenerar quando já existe.
- Validação visual em computador e 375px.
