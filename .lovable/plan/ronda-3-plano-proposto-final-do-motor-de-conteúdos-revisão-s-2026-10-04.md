# Ronda 3 — Plano proposto final do motor de conteúdos (revisão, sem implementação)

Este é um **plano proposto**, não aprovado para implementação. Nesta ronda não houve alterações a código, dados, configuração, bibliotecas, migrações nem deploys, e não chamei a IA. A edição 318 e os dados reais ficam intactos, e o diagnóstico paralelo da entrada não foi tocado.

## Legenda de evidência
- **C:** lido no código.
- **T:** coberto por testes locais com simulação.
- **E:** visto em execução real.
- **H:** hipótese por provar.

## A. Decisões propostas

1. **Variantes A e B**
   - São duas alternativas visuais do mesmo conteúdo editorial.
   - Ambas têm 1080×1350 e servem Instagram e LinkedIn.
   - Os destinos ficam separados: `destino = instagram | linkedin`.
   - Adaptar ficheiros a um canal (PNG para o Instagram, PDF para o LinkedIn) não cria uma variante editorial.
2. **Gateway de IA, estado real (C)**
   - `ai-core/index.ts` e `ai-generate-image/index.ts` chamam `POST https://ai.gateway.lovable.dev/v1/chat/completions`, sem streaming.
   - Usam um tempo limite de 60 s com `AbortController` e repetem 3 vezes sem olhar ao código do erro.
   - Enviam `max_tokens` e `temperature`, e o modelo vem de `MODEL_MAP` ("fast"/"smart").
   - O motor novo **não** reaproveita este padrão de repetições. Só repete 429/5xx, com espera crescente.
   - A classificação de 402/403 depende do corpo real do erro (crédito, política, região ou fornecedor), não só do código HTTP.
   - Proposta: `FornecedorTexto` com o contrato **confirmado** no código, `chat/completions` sem streaming.
     - Responses/streaming fica opcional, só depois de documentação e de uma prova real. Não é um padrão confirmado.
     - Fica por provar numa chamada real autorizada: tokens devolvidos e como o custo é medido.
   - Pedidos com resultado incerto (tempo esgotado ou ligação cortada depois do envio) podem ter sido cobrados.
     - Ficam registados como `desconhecido`, com orçamento reservado, e não são repetidos às cegas.
   - A DeepSeek da crónica fica igual.
3. **Orçamento de IA (configurável por projeto)**
   - Valores iniciais: máximo de 3 chamadas pagas por etapa de proposta, incluindo 1 reparação, e um teto em euros por trabalho.
   - Cada chamada regista os tokens de entrada e de saída e um custo estimado.
   - O preço por token fica por confirmar. Até lá, o teto conta chamadas, e os euros são só uma estimativa mostrada.
   - Chamadas de reparação contam para o orçamento.
4. **Fila desde a primeira geração**
   - Guardar a fonte é síncrono: snapshot, normalização e confirmação humana.
   - A geração é sempre um trabalho em fila, mesmo o primeiro.
5. **Editor:** a escolha entre Canvix e um editor Konva próprio é feita por prova com evidência. Não há limite arbitrário de tamanho e não se clona a aplicação Canvix inteira. A licença e o backend do Canvix ficam por verificar (H).
6. **Renderização**
   - Não se escolhe o renderer antes de existirem o contrato gráfico comum e o teste de equivalência visual.
   - Não se cria um serviço novo sem orçamento e infraestrutura conhecidos.
7. **Ficheiros finais**
   - São imutáveis por `documento + versão + variante + formato`.
   - São escritos primeiro numa área provisória e só depois confirmados, com checksum.
   - Nunca são sobrescritos com upsert sobre um resultado aprovado.

## B. Lacunas por provar
1. Formato e resposta reais do gateway com streaming no runtime (H).
2. Equivalência visual entre editor e renderer: tipos de letra, métricas, quebras de linha, alinhamento, recortes, imagens/CORS, transparência e ordem das camadas (H).
3. Se o renderer consegue correr numa Edge Function: resvg-wasm e pdf-lib, memória, tempo e tipos de letra embutidos (H).
4. Se o Deno Edge permite resolver o DNS e ligar ao mesmo IP verificado. Sem isso, uma página pode mudar de endereço entre a verificação e o pedido (DNS rebinding) (H).
5. Licença, dependências e formato multipágina do Canvix (H).
6. Qualidade da extração de PDF no runtime, incluindo páginas mistas (H).

## C. Modelo de dados (ilustrativo, sem migração)
```text
conteudo_fontes        id, project_id, tipo, versao_contrato, titulo, atribuicao jsonb,
                       paragrafos jsonb, referencias jsonb, hash, confirmada_por, confirmada_em
conteudo_snapshots     id, fonte_id, tipo(html|pdf|texto), storage_path, checksum, captado_em,
                       url_final, cadeia_redirects jsonb, avisos jsonb
conteudo_trabalhos     id, project_id, fonte_id, criado_por, estado, orcamento jsonb
conteudo_etapas        id, trabalho_id, etapa, estado, lease_token, lease_ate, tentativas,
                       resultado_ref, erro_codigo, proxima_tentativa
conteudo_ia_chamadas   id, etapa_id, fornecedor, modelo, pedido_hash, resposta_bruta (checkpoint),
                       tokens_in, tokens_out, custo_estimado, estado(recebida|validada|invalida|erro)
conteudo_propostas     id, trabalho_id, versao, corpo jsonb, origem(ia|humano), chamada_id?, criado_por
conteudo_documentos    id, proposta_id, variante(A|B), versao_atual
conteudo_doc_versoes   documento_id, versao, corpo jsonb, proposta_versao, criado_por, criado_em
conteudo_assets        id, project_id, checksum UNIQUE(project_id,checksum), storage_path, mime, origem
conteudo_exportacoes   documento_id, versao, variante, formato, destino, storage_path, checksum,
                       estado(staging|confirmado), UNIQUE(documento_id,versao,variante,formato,destino)
conteudo_rascunhos     documento_id, versao, destino, post_draft_id, UNIQUE(documento_id,versao,destino)
```
- **Chave de cache (`pedido_hash`):** inclui `project_id`, fonte, snapshot e versão, prompt e versão, modelo, parâmetros e brief editorial.
  - Nunca é partilhada entre projetos.
  - Pedir explicitamente uma "nova proposta" muda a chave.
  - Editar o layout nunca chama a IA.
- **Janela de cobrança:** há dois casos em que a retoma pode voltar a pagar:
  - o processo cai depois de o fornecedor responder, mas antes de `resposta_bruta` ficar gravada;
  - um pedido termina com resultado incerto.
  - O ponto de controlo reduz o risco, mas não o elimina. Os pedidos incertos ficam `desconhecido` e não são repetidos às cegas.
- **Histórico imutável:**
  - Propostas e versões de documento nunca são alteradas, só acrescentadas, com controlo CAS (`versao_esperada`).
  - Cada versão de documento fica presa a uma `proposta_versao`.
  - As exportações resolvem o texto contra essa versão congelada, nunca contra o texto atual.
- **Coerência entre aprovação, exportação e rascunho:**
  - A aprovação fica gravada sobre `(documento, versao)`.
  - Uma nova proposta (texto mudado) invalida as aprovações e as exportações anteriores.
  - A exportação só é confirmada para a versão aprovada.
- **Ligação a posts_drafts:** `conteudo_rascunhos` liga documento + versão + destino a um `post_draft_id`, sem alterar o fluxo existente.
  - O rascunho é criado pelo mesmo caminho atual, com envio único.
  - Antes de criar, o servidor recusa se a versão já não for a aprovada.

### Exemplos compactos
```json
{"FonteNormalizada":{"v":1,"tipo":"texto","titulo":"…","atribuicao":{"autor":"…","publicacao":"…"},
 "paragrafos":[{"id":"p1","texto":"…"}],"referencias":[],"hash":"sha256…","snapshot_id":"…"}}
{"PropostaEditorial":{"v":1,"fonte_hash":"…","slides":[{"id":"s1","titulo":"…","texto":"…","fontes":["p1"]}],
 "legenda":"…","alt":{"s1":"…"}}}
{"DocumentoGrafico":{"v":1,"variante":"A","proposta_versao":2,"largura":1080,"altura":1350,
 "fontes_tipograficas":["marca-titulo@1"],"paginas":[{"slide":"s1","camadas":[
  {"id":"c1","tipo":"texto","ref":"s1.titulo","x":80,"y":120,"w":920,"h":300,"z":2,
   "estilo":{"fonte":"marca-titulo@1","tam":64,"alinh":"esq","linha":1.1,"maxLinhas":4,"overflow":"reduzir"}},
  {"id":"c2","tipo":"imagem","asset_id":"a1","x":0,"y":700,"w":1080,"h":650,"z":1,"recorte":"cover","opacidade":1},
  {"id":"c3","tipo":"forma","forma":"ret","x":0,"y":0,"w":1080,"h":12,"z":3,"estilo":{"cor":"marca.primaria"}}]}]}}
```
- As camadas de texto apontam para o texto da proposta (`ref`); uma substituição só desta variante tem de ser explícita (`override`).
- As variantes A e B partilham os mesmos recursos (`asset_id`).

## D. Contrato gráfico e equivalência visual
- O formato próprio é o DocumentoGrafico v1. O editor (Konva ou Canvix) tem um **adaptador** que lê e escreve este formato.
  - O JSON do editor nunca é guardado como formato canónico.
  - O JSON do editor também não é um SVG que o resvg consiga ler diretamente.
- O renderer tem um segundo adaptador, de DocumentoGrafico para SVG, com tipos de letra embutidos e quebras de linha calculadas pelo mesmo algoritmo partilhado.
- O que fica fixo à partida:
  - os tipos de letra têm versão;
  - os recursos são servidos pelo storage próprio, para evitar problemas de CORS;
  - o recorte de imagem é `cover`/`contain`, com ponto focal;
  - a ordem das camadas é dada por `z`.
- **Prova mínima** com 5 documentos de teste: texto longo, acentos pt-PT, imagem transparente, recorte e três camadas sobrepostas.
  - Cada documento é exportado pelo navegador e pelo renderer, e as duas imagens são comparadas pixel a pixel.
  - Passa se a diferença ficar abaixo de um limiar definido e não houver mudanças nas quebras de linha.

## E. URL e PDF
- **URL**
  - Aceita só http/https, nas portas padrão.
  - Os redirecionamentos são seguidos à mão, no máximo 5, e cada salto é verificado.
  - São bloqueados endereços privados, de loopback, link-local, CGNAT e de metadados, também em IPv6.
  - Só aceita HTML, com tempo limite e tamanho máximo.
  - A prova de fetch seguro faz parte da ronda R7.
  - Se o runtime não permitir fixar o IP verificado na ligação (proteção contra DNS rebinding), a extração não é dada como concluída. O link fica guardado como referência e oferece-se texto colado.
  - Um proxy de saída só entra com orçamento e infraestrutura decididos.
- **PDF**
  - Muito pouco texto não prova que o PDF seja digitalizado.
  - A extração é feita página a página e marca cada página como "com texto", "pouco texto" ou "vazia".
  - Antes de gerar, mostra a pré-visualização e um aviso de extração incompleta.
  - O OCR fica como opção futura.
- **Texto colado**
  - Não há mínimo fixo, só máximo técnico. Proposta inicial: 30.000 caracteres.
  - Avisa se o texto for curto demais para mais de um slide.
- **Atribuição:** em todas as entradas, o utilizador confirma o título, a autoria e a origem antes de a fonte ficar guardada.

## Diagrama
```text
Entrada -> [síncrono] snapshot + FonteNormalizada + confirmação -> conteudo_fontes
        -> [fila] etapa proposta: cache? -> IA (orçamento) -> checkpoint -> validar/reparar -> proposta v1
        -> [fila] composição A e B (sem IA) -> documentos v1
        -> editor (adaptador) -> nova versão CAS
        -> [fila] exportação por versão: staging -> checksum -> confirmado
        -> [fila] rascunho social ligado a documento+versão+destino -> revisão humana
Worker cron + leases por token; retoma na etapa falhada; nunca publica.
```

## F. Oito prompts finais (propostos, não executados)
Estas regras valem para todas as rondas:
- Cada ronda para no ponto indicado.
- Se uma prova falhar, a ronda para e reporta, sem instalar alternativas nem clonar Canvix ou outra infraestrutura.
- Nenhuma ronda toca na entrada, no backend em diagnóstico, em contas, papéis, permissões alargadas, dados existentes ou na edição 318.
- Nenhuma ronda publica conteúdos.
- Qualquer geração real de IA é separada, identificada e só acontece com a tua autorização.

**R1 — Prova do editor e do renderer, antes das tabelas definitivas.**
- Dependências: nenhuma.
- Âmbito:
  - página experimental isolada;
  - tipos TS do DocumentoGrafico v1;
  - adaptador DocumentoGrafico↔Konva;
  - avaliação dos módulos de editor do Canvix (licença, dependências, React 18, páginas, JSON externo, sem backend próprio);
  - adaptador DocumentoGrafico→SVG com resvg-wasm numa função de teste;
  - 5 documentos de teste e comparação de equivalência.
  - Sem migrações nem dados reais.
- Aceitação:
  - telemóvel utilizável: seleção, teclado, zoom, toque e desfazer;
  - várias páginas;
  - JSON externo lido e escrito;
  - diferença visual abaixo do limiar, sem mudanças nas quebras de linha.
- Paragem: relatório com evidência (imagens de comparação) e recomendação da base, sem adoção.
- Prompt:
  > Implementa R1 do plano proposto: prova isolada de editor (Konva e avaliação Canvix só de módulos) e renderer (SVG+resvg-wasm em função de teste) contra o contrato DocumentoGrafico v1, com 5 documentos de equivalência. Sem migrações, dados reais, alterações a auth/papéis. Para e reporta.

**R2 — Contratos e esquema.**
- Dependências: R1. O formato do documento é ajustado ao resultado da prova.
- Âmbito:
  - migração aditiva das tabelas da secção C, com GRANT e RLS por papel e projeto;
  - RPCs CAS para propostas e versões de documento (as versões ficam imutáveis);
  - nenhuma alteração em nl_* nem em posts_drafts.
- Aceitação:
  - testes de acesso: anon, conta sem papel, papel de outro projeto e editor do próprio projeto;
  - testes de concorrência: duas gravações com a mesma `versao_esperada` deixam uma aceite e outra recusada;
  - versões antigas não podem ser alteradas;
  - contagens nl_* iguais antes e depois.
- Paragem: migração aplicada e relatório dos testes.
- Prompt:
  > Implementa R2: migração aditiva das tabelas da secção C com GRANT/RLS por projeto e RPCs CAS com histórico imutável; testes de acesso e de concorrência. Não tocar em nl_*, posts_drafts, auth ou papéis.

**R3 — Texto colado, fila, checkpoint e retoma (fornecedor simulado).**
- Dependências: R2.
- Âmbito:
  - página "Novo carrossel" com projeto obrigatório;
  - a fonte é guardada de forma síncrona, com confirmação de título, autoria e origem;
  - a etapa de proposta corre em fila no worker cron, com reservas por token;
  - FornecedorTexto em chat/completions, com um fornecedor simulado nos testes;
  - cache pela chave completa, checkpoint da resposta bruta, estado desconhecido e orçamento reservado.
- Aceitação:
  - um trabalho NOVO de teste conclui com o navegador fechado;
  - uma falha forçada depois do checkpoint retoma sem nova chamada;
  - um resultado incerto fica `desconhecido` e não é repetido;
  - a proposta reabre.
- Paragem: no fim dos testes simulados.
- Prompt:
  > Implementa R3: texto colado por projeto → fonte guardada → etapa de proposta em fila com FornecedorTexto (chat/completions), cache por chave completa, checkpoint, estado desconhecido, orçamento; prova de retoma e navegador fechado com fornecedor simulado. Sem chamadas reais.

**R4 — Uma geração real identificada.**
- Dependências: R3 e a tua autorização explícita.
- Âmbito: uma chamada real num projeto de teste, identificada como tal, para medir tokens, custo, formato e erros.
- Aceitação: proposta válida guardada, registo de custo e nenhuma repetição.
- Paragem: relatório da chamada.
- Prompt:
  > Executa R4: uma única geração real autorizada num projeto de teste através do motor de R3; reporta tokens/custo/formato. Sem repetições nem envios.

**R5 — Composições A/B e editor integrado.**
- Dependências: R1 (base escolhida), R2 e R3.
- Âmbito:
  - composições A e B criadas a partir da proposta, sem IA;
  - referências ligadas a uma `proposta_versao` congelada;
  - gravação CAS, reabertura e conflito resolvido com recarga;
  - alterar o texto cria uma nova proposta e invalida a aprovação.
- Aceitação:
  - alterar o layout não chama a IA;
  - um conflito é detetado;
  - uma versão antiga continua a mostrar o texto antigo.
- Paragem: no fim da ronda.
- Prompt:
  > Implementa R5 com a base de R1: variantes A/B sem IA ligadas a proposta_versao congelada, CAS, conflito, invalidação de aprovação ao mudar texto.

**R6 — Exportação no servidor e rascunho.**
- Dependências: R1 (renderer provado) e R5.
- Âmbito:
  - exportação por documento + versão + variante + formato, com área provisória, checksum e confirmação imutável;
  - ficheiros PNG/PDF por destino;
  - rascunho em posts_drafts ligado através de conteudo_rascunhos, sem alterar o fluxo atual;
  - versões desatualizadas são recusadas;
  - nunca publica.
- Aceitação:
  - duas exportações concorrentes não sobrescrevem um ficheiro confirmado;
  - repetir não duplica;
  - o rascunho fica com a versão aprovada.
- Paragem: rascunho criado num projeto de teste.
- Prompt:
  > Implementa R6: exportação servidor imutável (staging/checksum/confirmação) por documento+versão+variante+formato e rascunho ligado via conteudo_rascunhos; recusa versões desatualizadas; testes de concorrência; sem publicar.

**R7 — URL de notícia, com prova de fetch seguro.**
- Dependências: R3.
- Âmbito:
  - provar no runtime real se é possível resolver o DNS, fixar o IP na ligação e revalidar cada redirecionamento;
  - se for possível, construir o leitor com bloqueio de endereços internos, limites, snapshot e confirmação;
  - se não for, guardar o link como referência e oferecer texto colado, sem dar a extração por concluída.
- Aceitação: testes de redirecionamento interno, de DNS rebinding (se exequível), de tamanho e de tempo limite.
- Paragem: relatório da prova e do resultado.
- Prompt:
  > Implementa R7: prova de fetch seguro no runtime; leitor só se a prova passar, senão link como referência + texto colado; testes de redirect/rebinding/limites.

**R8 — 8a PDF e 8b verificação global.**
- Dependências: 8a depende de R3; 8b depende de R1 a R7.
- 8a, âmbito: extração do PDF página a página ("com texto", "pouco texto", "vazia"), aviso e pré-visualização, sem OCR.
- 8a, aceitação: um PDF misto mostra o aviso e não é tratado como completo.
- 8b, âmbito: um trabalho NOVO de ponta a ponta que continua com o navegador fechado, recupera uma falha e prepara o rascunho sem publicar.
  - A edição 318 não conta como prova.
  - Qualquer geração real é identificada.
- Paragem: relatório final.
- Prompt:
  > Implementa R8a: extração PDF por página com aviso/preview, sem OCR. Depois R8b: verificação global com trabalho NOVO (navegador fechado, falha retomada, rascunho sem publicar), sem usar a edição 318.

## Riscos
- A instabilidade recente do backend afeta o worker.
- O renderer na Edge Function pode não ser possível.
- A proteção contra DNS rebinding pode não ser possível no runtime.
- O custo real da IA está por medir.
- O Canvix pode falhar a avaliação.
- Direitos de texto de terceiros.

Esta ronda entregou apenas o plano proposto. Não houve nenhuma implementação.
