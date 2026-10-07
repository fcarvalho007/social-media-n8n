# Curadoria partilhada e formatos do compositor — plano técnico

Nesta ronda não se implementa nada. A decisão recomendada é um único armazém de notícias com várias vistas: uma aprovação editorial comum, com escolhas e usos independentes por canal. A newsletter mantém o percurso Curar → Compor → Publicar e o compositor atual fica igual.

## Correções à auditoria anterior (confirmadas no código)
- **Gerador de propostas com IA:** aceita só de 2 a 10 slides. Estes limites estão definidos em `_shared/motor/proposta.ts` e são aplicados na validação da resposta da IA.
- **Documento gráfico e editor:** aceitam de 1 a 20 páginas.
- São dois níveis diferentes. O 1–20 do documento não prova que o gerador aceita 1–20.
- **Links antigos na edição 319 (rascunho):** não há nenhum endereço antigo escrito no código. A origem provável é o endereço base das edições importadas ou uma cópia fixa da edição. Vou diagnosticar isto só com leitura, antes da Fase 1, sem alterar envios.

## Fase 1 — Curadoria como fonte do criador (só leitura da newsletter)
- Novo tipo de fonte `curadoria` no passo «1 Fonte».
- O seletor permite pesquisar por período, categoria e texto. Mostra apenas notícias `aprovada` ou `enviada`; pendentes e rejeitadas nunca entram.
- O trabalho guarda o ID da notícia, uma cópia fixa (título, descrição, artigo, link, data) e um hash dessa cópia.
- `nl_noticias.estado` e `nl_noticias.edicao_id` nunca são alterados.
- Usa `corpo_artigo` quando existe. Caso contrário, usa a descrição com o selo «Resumo curto — não é o artigo integral». Não se inventa nada.
- Selecionar uma fonte não chama a IA. A IA só corre no passo seguinte e pelo fluxo atual, com os limites já em vigor.
- Se a mesma notícia tiver o mesmo hash, a retoma reutiliza o trabalho existente em vez de duplicar.

## Fase 2 — Separar a aprovação editorial da escolha para a newsletter
- Coluna aditiva `curacao_estado`, preenchida a partir do estado atual. O `estado` antigo continua a ser usado pela newsletter até haver migração explícita.
- Nova tabela `nl_noticias_usos` que liga notícia, canal e trabalho. O estado de cada uso é: rascunho → em revisão → publicado.
- «Publicado» só é marcado quando há prova de publicação. Criar um rascunho não conta.
- A mesma vista de triagem fica acessível no Hub e na newsletter.
- Usar uma notícia nas redes sociais não a retira da newsletter.
- A fonte aprovada não substitui a revisão de cada peça final: newsletter, carrossel, post e story precisam de revisão própria.
- As edições já enviadas e os derivados existentes ficam congelados. Se a fonte mudar, aparece «Fonte atualizada — atualizar?», sem propagação silenciosa.

## Fase 3 — Formatos independentes no mesmo compositor
- `formato` passa a fazer parte de cada documento: `carrossel` (o valor por omissão quando o campo não existe, para manter compatíveis os carrosséis v1), `post` 1080×1350 ou `story` 1080×1920.
- O tamanho da página depende do formato em todo o lado: compositor, pré-visualização, verificação de leitura e exportação no navegador e no servidor.
- Cada formato tem o seu layout e os seus modelos (zonas seguras próprias para a story). Não se recorta o carrossel para simular uma story.
- Post e story têm uma única página: adicionar ou duplicar páginas fica bloqueado.
- **Exportação:** post e story geram 1 PNG. O PDF só existe para o carrossel em formato documento do LinkedIn.
- A preparação para redes sociais envia ao `/manual-create` o formato social correto: post, story ou carrossel.
- O trabalho em curso com GIPHY e MP4 fica intacto. Primeiro fecham-se os formatos estáticos; o vídeo só depois.

## Detalhes técnicos

**Migrações (todas aditivas)**
1. `mc_fontes`: aceitar o tipo `curadoria`, acrescentar `noticia_id uuid` (sem chave estrangeira obrigatória) e um índice `(project_id, noticia_id, hash)`. Mudar o check de `mc_criar_trabalho_fonte`, ou criar uma RPC nova `mc_criar_trabalho_curadoria` que lê a notícia no servidor e congela a cópia.
2. Fase 2: `nl_noticias.curacao_estado` com preenchimento inicial e `nl_noticias_usos` com GRANT e RLS (leitura pela equipa, escrita por admin/editor, servidor pelo service role).
3. Fase 3: sem tabelas novas. O formato fica no documento versionado. Só se ajusta `mc_preparar_social` para indicar o tipo de publicação.

**Ficheiros previstos**
- Fonte: `src/features/motor/` (passo Fonte e um seletor novo de curadoria), `src/services/` (uma função de leitura), `supabase/functions/mc-motor/index.ts` (operação `curadoria_listar` e criação do trabalho).
- Formatos: `palco.ts`, `leituraPreview.ts`, `VerComoLido.tsx`, `RevisaoExportacao.tsx`, `_shared/motor/nucleo.ts`, `modelos.ts`, `proposta.ts` (limites por formato), exportação no servidor (`pngPdf.ts` e o lease de exportação).
- Newsletter: só leitura na Fase 1. A triagem é alterada pelo gerador na Fase 2, nunca nos ficheiros que ele gera.

**Testes de regressão**
- Selecionar uma fonte não faz chamadas à IA; pendentes e rejeitadas não aparecem; `estado` e `edicao_id` ficam iguais.
- Mesma notícia com o mesmo hash dá o mesmo trabalho; com hash diferente, pede confirmação.
- Notícia sem artigo mostra o selo de resumo curto.
- Um documento v1 sem `formato` renderiza exatamente como hoje (comparação de pixels do PNG).
- Post e story: uma página, 1 PNG, sem PDF, tipo social correto.
- Autor, projeto e RLS mantêm-se; retomas não criam duplicados.

**Critérios de aceitação**
- Não há alterações a envios, crons, segredos, domínio ou dados existentes.
- A recolha continua em modo manual.
- Nenhum processamento pago em massa.

**Integrações externas ainda por configurar (pelo dono, fora do chat)**
- CloudMailin: utilizador e palavra-passe, endereço do webhook e um email de teste.
- WordPress: endereço, utilizador e palavra-passe da aplicação.
- E-goi: aviso de cancelamentos e confirmação dos contactos por lista, sem declarar números que não estejam confirmados.

**Ordem:** diagnóstico dos links da edição 319 → Fase 1 → Fase 3 (formatos estáticos) → Fase 2 → MP4.
