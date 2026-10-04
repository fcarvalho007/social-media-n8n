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
   - O motor novo **não** reaproveita este padrão de repetições: só repete erros 429/5xx com espera crescente, e trata 400/401/402/403 como definitivos.
   - Proposta: criar um `FornecedorTexto` próprio, com o formato pedido explícito.
     - Deve começar com Responses em streaming, que é o padrão atual do gateway para modelos `openai/*`.
     - Fica por provar numa chamada real autorizada: formato da resposta, tokens devolvidos e como o custo é medido.
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
- **Cache e deduplicação:** antes de chamar a IA, procura-se uma resposta já validada para o mesmo `pedido_hash` ou para a mesma etapa. Se existir, é reutilizada e não há nova cobrança.
- **Janela de cobrança:** se o processo cair depois de o fornecedor responder, mas antes de `resposta_bruta` ficar gravada, a retoma volta a chamar e volta a pagar. O ponto de controlo reduz o risco, mas não o elimina.
- **Histórico:** cada gravação cria uma versão nova com controlo CAS (`versao_esperada`). O rascunho fica ligado a uma versão exata do documento.

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
  - Se o runtime não permitir fixar o IP verificado na ligação (proteção contra DNS rebinding), há duas alternativas:
    - um proxy de saída com lista de bloqueio própria (infraestrutura a decidir);
    - aceitar apenas o texto colado e o URL como referência.
  - A escolha depende da prova B4.
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

## F. Rondas propostas (prompts prontos a copiar; não executar)
Cada ronda para ao fim. Se uma prova falhar, a ronda para e reporta, sem instalar alternativas automaticamente. Nenhuma ronda muda autenticação, papéis ou permissões alargadas, nem toca na edição 318 ou em dados reais.

**R1 — Contratos e esquema.**
- Prompt:
  > Implementa R1: tipos TS v1 e migração aditiva das tabelas da secção C, com GRANT, RLS por papel/projeto e RPCs CAS. Não tocar em nl_*, UI ou IA.
- Aceitação: contagens nl_* iguais antes/depois; testes RLS para anon, sem papel e outro projeto.
- Evidência: queries de leitura.
- Paragem: no fim da migração.

**R2 — Texto colado, fila e checkpoint.**
- Prompt:
  > Implementa R2: página Novo carrossel (projeto obrigatório), guarda síncrona da fonte com confirmação, etapa de proposta em fila com FornecedorTexto, cache por pedido_hash, checkpoint resposta_bruta, orçamento configurável, retries só 429/5xx. Testes simulados; 1 chamada real só quando eu autorizar.
- Aceitação:
  - proposta guardada e reaberta;
  - repetir reutiliza a cache;
  - uma falha simulada depois do checkpoint não volta a chamar a IA;
  - a janela de cobrança fica documentada.
- Evidência: registos e linhas da etapa.
- Paragem: antes da chamada real.

**R3 — Worker e navegador fechado.**
- Prompt:
  > Implementa R3: worker cron para conteudo_etapas com lease token CAS e retoma. Prova com trabalho NOVO de teste e navegador fechado; não usar a edição 318.
- Aceitação: conclusão sem navegador; uma falha forçada retoma só a etapa falhada.
- Evidência: registos e estado.
- Paragem: no fim da prova.

**R4 — Prova do editor e do renderer.**
- Prompt:
  > Implementa R4 numa página experimental: (a) adaptador DocumentoGrafico↔Konva e, em paralelo, avaliação Canvix só dos módulos de editor (licença, dependências, React 18, páginas, JSON externo, sem backend próprio); (b) adaptador DocumentoGrafico→SVG + resvg-wasm numa função de teste; (c) teste de equivalência com 5 documentos. Para e reporta se falhar.
- Aceitação:
  - telemóvel utilizável: seleção, teclado, zoom, toque, desfazer;
  - várias páginas;
  - equivalência abaixo do limiar.
- Evidência: imagens de comparação.
- Paragem: recomendação da base, sem a adotar.

**R5 — Composições A/B e editor integrado.**
- Prompt:
  > Implementa R5 com a base escolhida em R4: composições A e B sem IA, refs de texto/asset, gravação CAS, reabertura, conflito com recarga.
- Aceitação: alterar a proposta reflete-se em A e B; não há novas chamadas de IA; um conflito é detetado.
- Paragem: no fim da ronda.

**R6 — Exportação no servidor e rascunho.**
- Prompt:
  > Implementa R6: exportação por documento+versão+variante+formato com staging/checksum/confirmação imutável; rascunho ligado à versão e destino; recusa versões desatualizadas; nunca publica.
- Aceitação: exportação concorrente não sobrescreve; repetir não duplica; rascunho com a versão certa.
- Paragem: rascunho criado num projeto de teste.

**R7 — URL de notícia.**
- Prompt:
  > Implementa R7 conforme a prova B4: leitor com redirects manuais e bloqueio interno, ou alternativa documentada; snapshot e confirmação.
- Aceitação: testes de redirecionamento interno, de rebinding (se exequível), de tamanho e de tempo limite.
- Paragem: no fim dos testes.

**R8 — PDF e validação final.**
- Prompt:
  > Implementa R8: extração PDF por página com aviso/preview, sem OCR; depois validação final com trabalho NOVO: navegador fechado, falha retomada, rascunho preparado sem publicar.
- Aceitação: os critérios finais acima.
- Paragem: relatório final.

## Riscos
- A instabilidade recente do backend afeta o worker.
- O renderer na Edge Function pode não ser possível.
- A proteção contra DNS rebinding pode não ser possível no runtime.
- O custo real da IA está por medir.
- O Canvix pode falhar a avaliação.
- Direitos de texto de terceiros.

Esta ronda entregou apenas o plano proposto. Não houve nenhuma implementação.
