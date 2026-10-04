# Ronda 2 — Plano proposto do motor de conteúdos (revisão, sem implementação)

Isto é um **plano proposto**, não aprovado para implementação. Nesta ronda não houve alterações a código, dados, configuração, bibliotecas, migrações, deploys nem chamadas de IA.

## Etiquetas de evidência

| Etiqueta | Significado |
|---|---|
| C | Confirmado no código, só por leitura. |
| T | Coberto por testes locais com simulação. |
| E | Observado em execução real nesta conversa. |
| H | Hipótese, não verificada. |

## 1. Motor novo — proposta
- **Texto:** criar uma interface `FornecedorTexto` sobre o AI Gateway, com Responses em streaming e o modelo predefinido do gateway.
  - Já existe uma chamada ao gateway em `ai-core/index.ts` (C), que usa modelos com aliases "fast"/"smart". É para adaptar, não para copiar.
- **Imagens:** criar uma interface `FornecedorImagem` sobre `ai-generate-image` (C, modelo predefinido no código) e `fal-generate-image` (C).
- **Crónica:** o fluxo atual fica intacto no início. É ele que usa DeepSeek: `deepseek.server.ts`, `jobs.server.ts`, `gerarProposta` e `processarJobs` (C/T).
- **Reutilizar diretamente:**
  - `gerarComReparacao` e `medidasProposta` (C/T);
  - `hashFonte` (C);
  - o padrão de reserva de `nl_reservar_jobs_conteudos` (C/T);
  - o registo de custos `nl_ia_uso` (C/T).
- **Adaptar:**
  - `validarCarrossel`: `LIMITES` impõe 6 a 8 slides (C). O número de slides tem de passar a ser variável, com mínimo 3 e máximo 10 (proposta).
  - `PROMPT_CARROSSEL`: está escrito só para DIGITALSPRINT e crónica (C).
  - `lerArtigo`: segue redirecionamentos sem verificar o destino e corta o texto a 8000 caracteres (C).
  - `desenharSlide` e `gerarFicheiros` em `exportar.ts`: só funcionam no navegador (C).
- **Não verificado:**
  - O comportamento real de `ai-core` em execução.
  - Os custos reais dos fornecedores de imagem.
  - Se `nl-worker-conteudos` correu com sucesso depois do reinício (o trabalho 318 continua por correr) (H).
  - Em execução vi apenas 401 sem sessão em nl-conteudos e nl-api, e 403/400 na entrada (E).

## 2. Dados — contratos ilustrativos (sem migração)
```json
// FonteNormalizada v1
{"v":1,"tipo":"texto|url|pdf_texto|pdf_ocr|cronica","project_id":"…",
 "origem":{"url_final":null,"ficheiro_asset":null,"edicao_id":null,"captado_em":"2026-10-04T17:00:00Z"},
 "atribuicao":{"autor":"…","publicacao":"…","confirmada_por":"user_id"},
 "titulo":"…","paragrafos":[{"id":"p1","texto":"…"}],"referencias":[{"id":"r1","url":"…"}],
 "hash":"sha256…","avisos":["truncado"]}
// PropostaEditorial v1 (custa IA uma vez; partilhada por A e B)
{"v":1,"fonte_hash":"…","slides":[{"id":"s1","titulo":"…","texto":"…","fontes":["p1"]}],
 "legenda":"…","alt":{"s1":"…"},"assets":["a1"]}
// DocumentoGrafico v1 (apresentação; uma linha por variante)
{"v":1,"variante":"instagram|linkedin","proposta_versao":3,"largura":1080,"altura":1350,
 "paginas":[{"id":"pg1","slide":"s1","camadas":[
   {"id":"c1","tipo":"texto","ref":"s1.titulo","x":80,"y":120,"w":920,"h":300,"z":2,"estilo":{"fonte":"marca.titulo","tam":64}},
   {"id":"c2","tipo":"imagem","asset_id":"a1","x":0,"y":700,"w":1080,"h":650,"z":1},
   {"id":"c3","tipo":"forma","forma":"ret","x":0,"y":0,"w":1080,"h":12,"z":3,"estilo":{"cor":"marca.primaria"}}]}]}
```
- **Separação de conteúdo e apresentação:** as camadas de texto guardam uma referência (`ref`) ao texto da proposta, sem cópia. Uma alteração ao texto aparece nas duas variantes.
- **Texto próprio de uma variante:** só existe com uma substituição explícita (`override`).
- **Recursos:** os recursos usados (`asset_id`) ficam numa tabela, com hash único por projeto.
- **Gravação:** grava-se a proposta e cada documento com controlo de versão CAS (`versao_esperada`), como em `nl_conteudos_guardar_versao` (C). Se houver conflito, o servidor recusa e mostra o diff/recarga, sem sobrescrever. A cópia local fica guardada por utilizador e projeto, como em `recuperacaoLocal.ts` (C).
- **Reabertura:** carrega a última versão de cada um.
- **Exportação:** os ficheiros ficam ligados a `(documento_id, versao)`. O original em JSON nunca é substituído.

## 3. Editor — Canvix versus Konva próprio

| Critério | Canvix (só prova isolada) | React/Konva próprio |
|---|---|---|
| Licença e manutenção | Por verificar no GitHub (H) | Konva MIT (H, confirmar) |
| Pacote | Não é biblioteca instalável; é uma app a copiar (dado pelo utilizador) | Duas dependências (konva, react-konva), a aprovar |
| Integração | Pode trazer outro router, estado ou backend (H) | Nativo no React 18/Vite atual (C) |
| Múltiplas páginas e formato | Desconhecido (H) | Ajustado ao contrato v1 |
| Backend e permissões | Tem de ser desligado, usando só as funções atuais | Usa as funções e o RLS existentes |
| Âmbito | Editor geral, maior do que o necessário | Limitado a carrosséis: mover, redimensionar, texto, ordem |

- **Recomendação:** fazer uma prova isolada do Canvix com limite de 1 ronda. Se falhar, seguir para o editor Konva.
- **Critérios de desistência do Canvix:** desiste-se se se verificar qualquer um destes:
  - licença incompatível;
  - exige outro backend ou outra autenticação;
  - não guarda nem lê JSON externo;
  - não tem várias páginas;
  - pesa mais de 500 KB gzip;
  - não funciona a 375 px.
- **Estado de verificação:** não analisei o repositório do Canvix.

## 4. Produção
- **Etapas guardadas:** `captura → extração → confirmação humana da fonte → proposta (IA) → composição A/B → render → rascunho`.
  - Cada etapa é uma linha com estado, `lease_token`, tentativas, `resultado_ref` e custo.
  - A retoma recomeça na etapa que falhou e nunca repete as etapas concluídas.
- **Orçamento:** máximo de 3 chamadas pagas por proposta, incluindo 1 reparação, e um teto em euros por trabalho. Erros 402/403 são terminais.
- **Janela de cobrança:** o fornecedor cobra quando responde. Se o processo morrer antes de o ponto de controlo ser gravado, a retoma volta a chamar e volta a pagar.
  - Gravar a resposta bruta logo que chega reduz esta janela, mas não a elimina. Não se promete cobrança única.
  - A proteção que existe é contra dados duplicados, com chaves únicas.
- **Ficheiros:** usam caminhos determinísticos com upsert, por isso não ficam duplicados.
- **Rascunhos:**
  - A reserva por conteúdo+versão já existe (C/T).
  - O servidor recusa enviar uma versão diferente da última aprovada.
- **Navegador e servidor:** a edição e a pré-visualização ficam no navegador. A renderização final passa para o servidor.
- **Runtime para renderizar no servidor:** as opções a provar, por ordem:
  1. resvg-wasm + pdf-lib dentro de uma Edge Function. Não exige Chromium, mas os limites de memória, tempo e tipos de letra estão por verificar (H).
  2. Um serviço próprio de render, com Node e Skia ou Chromium, num contentor. Tem custo e infraestrutura por decidir.
- **Publicação:** nunca há publicação automática; o resultado fica sempre em rascunho.

## 5. Entradas — limites iniciais propostos
- **Texto colado:**
  - entre 300 e 30.000 caracteres;
  - autor e publicação de origem obrigatórios se o texto for de terceiros.
- **URL:**
  - só http/https e portas 80/443;
  - redirecionamentos geridos à mão, no máximo 5, com o DNS de cada um resolvido e verificado;
  - bloqueia endereços privados, de loopback, link-local, CGNAT e de metadados, e IPv6 equivalente;
  - tempo limite de 10 s, no máximo 2 MB e só `text/html`;
  - página com pouco texto: propõe colar o texto.
- **PDF textual:**
  - no máximo 20 MB e 40 páginas;
  - a extração exige uma dependência compatível com Deno, a aprovar.
- **PDF digitalizado:** é detetado com menos de 100 caracteres por página. Leva para OCR numa ronda própria, com custo mostrado antes.
- **Confirmação da fonte:** em todas as entradas, o utilizador confirma o título, o autor e o excerto antes de a IA ser chamada. A atribuição fica no documento.

## Diagrama
```text
[Entrada] -> captura/snapshot -> FonteNormalizada -> confirmação humana
  -> PropostaEditorial (IA, 1x, CAS) -> DocumentoGrafico A + B (sem IA)
  -> editor (navegador, CAS) -> render servidor (PNG/PDF por versão)
  -> rascunho social (versão fixada) -> revisão humana -> circuito existente
Worker (cron) avança etapas; reservas por token; orçamento por trabalho.
```

## Rondas (prompts para copiar; não executar agora)

**R1 — Contratos e esquema.**
- Âmbito: tipos TS v1 e migração aditiva com as tabelas `conteudo_trabalhos`, `conteudo_etapas`, `conteudo_propostas`, `conteudo_documentos` e `conteudo_assets`. Inclui GRANTs, RLS por papel e projeto e funções de gravação CAS.
- Dependências: nenhuma.
- Aceitação: contagens dos dados `nl_*` iguais antes e depois; testes de RLS para anon, sem papel e editor de outro projeto.
- Verificação real: queries de leitura.
- Prompt:
  > Implementa R1 do plano proposto do motor: só tipos v1 e migração aditiva com GRANT/RLS/CAS, sem tocar em nl_*, sem UI, sem IA. Mostra contagens nl_* antes/depois e testes RLS.

**R2 — Texto colado até à proposta guardada e reaberta (primeira entrega útil).**
- Âmbito: página "Novo carrossel", com projeto obrigatório; confirmação da fonte; função de servidor com FornecedorTexto/gateway; validação com número de slides variável; gravação CAS; reabertura.
- Dependências: R1.
- Aceitação:
  - o trabalho é criado no servidor;
  - a proposta fica guardada e reabre;
  - repetir não faz nova chamada;
  - uma falha simulada na gravação mostra que a resposta foi guardada como ponto de controlo.
- Verificação real: uma geração autorizada por ti.
- Prompt:
  > Implementa R2: texto colado por projeto → proposta guardada e reaberta, via AI Gateway com interface FornecedorTexto, checkpoint da resposta bruta, orçamento 3 chamadas. Não tocar no fluxo da crónica. Testes simulados + 1 geração real só após eu confirmar.

**R3 — Worker genérico e navegador fechado.**
- Âmbito: as etapas avançam por cron, com reservas e retoma.
- Dependências: R2.
- Aceitação: um trabalho novo conclui com o navegador fechado; uma falha forçada numa etapa retoma sem repetir etapas concluídas.
- Prompt:
  > Implementa R3: worker genérico das etapas com lease token CAS e retoma; prova com trabalho NOVO e navegador fechado; não usar a edição 318.

**R4 — Prova isolada do editor.**
- Âmbito: Canvix numa página experimental, com os critérios de desistência; se falhar, Konva.
- Dependências: R1, e aprovação das dependências.
- Aceitação: abre e grava o DocumentoGrafico v1 com CAS, em desktop e a 375 px.
- Prompt:
  > Implementa R4: prova isolada Canvix contra critérios de desistência; se falhar, editor Konva mínimo. Sem trocar backend/auth.

**R5 — Composições A/B e editor integrado.**
- Âmbito: geração das duas variantes sem IA, a partir da proposta.
- Aceitação: alterar o texto atualiza as duas variantes; não há chamadas novas de IA.
- Prompt:
  > Implementa R5: variantes Instagram/LinkedIn a partir da mesma proposta, refs de texto/asset, editor integrado.

**R6 — Render no servidor e rascunho.**
- Âmbito: prova com resvg-wasm/pdf-lib; se falhar, parar e propor um serviço próprio.
- Aceitação: PNG/PDF por versão, repetir não duplica, rascunho com versão fixada, nunca publica.
- Prompt:
  > Implementa R6: render servidor por (documento, versão) e preparação do rascunho; recusa versões desatualizadas; sem publicar.

**R7 — URL de notícia.**
- Âmbito: leitor seguro, com os limites da secção 5.
- Aceitação: testes de redirecionamento para endereço interno, de tamanho e de tempo limite; confirmação da fonte.
- Prompt:
  > Implementa R7: leitor de URL com bloqueio de endereços internos por redirect e limites; confirmação da fonte.

**R8 — PDF textual, e depois OCR em ronda separada.**
- Aceitação: um PDF textual dá uma fonte com aviso; um PDF digitalizado é detetado e não é tratado como textual.
- Prompt:
  > Implementa R8a: extração de PDF textual com limites; deteção de digitalizado sem OCR.

## Aceitação final
Um trabalho **novo** continua com o navegador fechado, retoma uma falha e prepara um rascunho sem publicar automaticamente. A edição 318 não conta como prova.

## Riscos
- A instabilidade recente do backend afeta o worker.
- As dependências novas pedem aprovação.
- O render no servidor pode exigir infraestrutura própria.
- Direitos de texto de terceiros.
- O fluxo da crónica fica com um fornecedor diferente até à migração (R9, futura).

Esta ronda entregou só o plano proposto. Não houve nenhuma implementação.
