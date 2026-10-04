# Ronda 1 — Plano técnico revisto do motor de conteúdos

Esta ronda entrega só o plano. Não implementa, não instala nada, não migra nem publica, e não chama a IA.

## Correção à auditoria anterior
Não basta um adaptador. Há quatro limitações confirmadas no código:
- `nl_conteudos_derivados` e `nl_conteudos_jobs` (drizzle/migrations/0004) exigem `edicao_id`. A chave única é `edicao_id,tipo,fonte_hash`.
- `jobs.server.ts` fixa `TIPO = "carrossel_cronica"`.
- O editor `CarrosselCronica.tsx` só altera texto. Não tem camadas nem posições.
- O PNG/PDF (`exportar.ts`, canvas) e o envio para o rascunho social correm no navegador.
- Se a gravação falhar depois de a IA responder (`carrossel.ts`, gerarComReparacao), a resposta paga perde-se.

O trabalho 318 só prova que um resultado existente é reaproveitado. Não fica executado nesta ronda.

## Diagrama
```text
Entrada (texto | URL | PDF textual | PDF digitalizado | crónica)
  -> [E1 captura]   snapshot imutável da fonte + recursos (storage, hash)
  -> [E2 extração]  FonteNormalizada v1 (parágrafos, atribuição, referências)
  -> [E3 plano]     estrutura editorial: n.º de slides conforme a informação
  -> [E4 escrita]   texto + legenda + alt text -> validarCarrossel -> 1 reparação
  -> [E5 imagens]   opcional, por fornecedor, separadas
  -> [E6 composição] Documento gráfico A (Instagram) e B (LinkedIn), 1080x1350
  -> revisão humana (editor) -> nova versão CAS
  -> [E7 render]    PNG/PDF derivados (serviço de render)
  -> [E8 rascunho]  posts_drafts com a versão fixada -> circuito social existente
Cada etapa: job_etapa com reserva, resultado guardado, orçamento e tentativas.
```

## Bloco 1 — Motor e fonte genérica
- **Contrato `FonteNormalizada v1`:** `versao`, `tipo_fonte`, `origem {url_final?, ficheiro_id?, edicao_id?, autor?, publicado_em?, captado_em}`, `atribuicao`, `titulo`, `paragrafos[]`, `referencias[]`, `hash`, `snapshot_id`, `avisos[]` (por exemplo, "digitalizado" ou "truncado").
- **Projeto obrigatório:** todo o trabalho novo exige `project_id`. O servidor valida o papel e o projeto (estudio_identidades/projetos).
- **Crónica:** um adaptador lê `carregarFonteCronica` e cria a mesma FonteNormalizada. As linhas `nl_*` existentes ficam como estão; os dados antigos podem ser lidos por uma vista de compatibilidade.
- **Fornecedor de IA:** usa uma interface `FornecedorTexto` e `FornecedorImagem`. A recomendação é o AI Gateway da Lovable (Responses, `openai/gpt-6-astra`, em streaming) para o motor novo. A DeepSeek fica só para a crónica até haver decisão em contrário. As imagens usam `ai-generate-image` e `fal-generate-image` através da mesma interface. Não se cria um segundo motor: `validarCarrossel`, `gerarComReparacao` e `nl_ia_uso` passam a ser genéricos.
- **Notícia por URL:** `lerArtigo` vai além de `MAX_CORPO=8000` e passa a:
  - aceitar só http(s);
  - resolver o DNS e bloquear IPs privados, de loopback, link-local e de metadados, em cada redirecionamento (redirecionamento manual, máximo 5);
  - aplicar tempo limite, tamanho máximo e tipos de conteúdo html permitidos;
  - extrair o texto legível;
  - pedir ao utilizador que confirme a fonte antes de gerar;
  - em paywall ou página feita em JS, propor colar o texto.
- **PDF textual:** extração no servidor, num pacote compatível com Deno a avaliar (pede aprovação de dependência). Limites de páginas e MB.
- **PDF digitalizado:** é detetado quando há pouco texto por página. Segue para OCR pelo gateway multimodal numa ronda separada e com custo indicado. Nunca é tratado como se fosse textual.
- **Snapshots:** a fonte e os recursos são copiados para o storage próprio com hash. Ficam guardados para além da regra dos 7 dias, ou pelo menos o texto extraído.

## Bloco 2 — Documento e editor
- **Separação em dois níveis:**
  - `ConteudoEditorial`: slides lógicos, legenda, alt text, referências.
  - `DocumentoGrafico v1`: `{largura:1080, altura:1350, paginas[{camadas[{id, tipo:texto|imagem|forma, x,y,w,h, rotacao, z, estilo, ref_conteudo?, ref_recurso?}]}], modelo, marca}`.
- **Partilha:** as composições A e B apontam para o mesmo conteúdo e para os mesmos recursos.
- **Original editável:** o JSON tem versões CAS. PNG e PDF são sempre derivados, ligados a `(documento_id, versao)`.
- **Canvix:** é só uma prova isolada, numa página experimental atrás de uma opção, sem trocar framework nem backend. Serve para verificar:
  - a licença;
  - React 18 e Vite;
  - a serialização em JSON compatível com o contrato;
  - texto em pt-PT e tipos de letra;
  - o uso em telemóvel.
- **Alternativa a Canvix:** se falhar, um editor próprio sobre Konva ou Fabric (Tela) que lê e escreve o mesmo contrato.

## Bloco 3 — Execução e publicação
- **Tabelas novas (genéricas):**
  - `conteudo_trabalhos` (project_id, tipo_fonte, fonte_hash, criado_por, estado);
  - `conteudo_etapas` (trabalho_id, etapa, estado, lease_token, tentativas, resultado_ref, erro_codigo, custo_acumulado);
  - `conteudo_documentos` e `conteudo_versoes`;
  - `conteudo_recursos` (hash único por projeto).
- **Reservas:** reaproveitam o padrão de reservas com lease token CAS de `nl_reservar_jobs_conteudos` e o cron do worker.
- **Não duplicar dados:** chaves únicas (projeto + tipo + hash; documento + versão; recurso por hash) e envio social já garantido por conteúdo+versão.
- **Não repetir custos:** antes de chamar a IA, a etapa verifica se já tem resultado guardado. A resposta bruta fica guardada como ponto de controlo logo que chega, antes de ser validada ou gravada. Há um orçamento por trabalho (máximo de chamadas e de euros) e os erros 402/403 não são repetidos.
- **Limitação declarada:** entre a resposta do fornecedor e a gravação do ponto de controlo há uma janela em que uma falha pode levar a uma segunda cobrança. O ponto de controlo reduz esse risco mas não garante que só se paga uma vez.
- **Render no servidor:** não se assume Chromium nas funções do backend. Há duas opções a provar:
  - render em SVG ou canvas compatível com Deno (por exemplo resvg-wasm e pdf-lib) dentro de uma função;
  - se não chegar, um serviço de render próprio, que é uma dependência de infraestrutura a decidir.
- **Navegador fechado:** as etapas E7 e E8 passam para o worker.
- **Versões desatualizadas:** o rascunho e o envio fixam `(documento_id, versao)` e o servidor recusa se a versão aprovada não for a atual.
- **Ficheiros:** caminho determinístico `projeto/documento/versao/pagina.png` com upsert. Não acumulam duplicados.
- **Aprovação:** a revisão e a aprovação humana mantêm-se. Não há publicação automática.
- **Progresso:** a lista mostra as etapas reais concluídas, em curso ou com erro, sem percentagem inventada.

## Reaproveitar, adaptar ou criar
| Peça | Evidência | Decisão |
|---|---|---|
| validarCarrossel, gerarComReparacao, medidasProposta | _shared/conteudos/carrossel.ts | Adaptar (prompt por tipo/marca) |
| carregarFonteCronica, hashFonte | _shared/conteudos/fonte.server.ts | Reaproveitar via adaptador |
| Fila, leases, processarJobs, worker | jobs.server.ts, 0007, nl-worker-conteudos | Adaptar o padrão para tabelas genéricas |
| nl_conteudos_derivados/jobs | 0004 (edicao_id NOT NULL) | Manter intactas; não reutilizar para fontes novas |
| Versões CAS | nl_conteudos_guardar_versao | Replicar em conteudo_versoes |
| lerArtigo | nl-app/lib/ler-artigo.server.ts (redirect follow, 8000) | Adaptar com proteção de rede |
| Uso/custo IA | nl_ia_uso | Adaptar (project_id, trabalho_id, etapa) |
| AI Gateway | ai-core, ai-editorial-assistant | Reaproveitar via FornecedorTexto |
| Imagens | ai-generate-image, fal-generate-image | Reaproveitar via FornecedorImagem |
| Exportação canvas | src/features/conteudos/exportar.ts | Modelo para o render no servidor |
| Envio social único | enviarParaEstudioSocial, posts_drafts | Mover a preparação para o servidor |
| Editor gráfico, PDF, OCR, render no servidor | não existem | Novo |

## Princípios do n8n
O JSON do fluxo não foi carregado neste projeto, por isso esta lista não vem de uma auditoria minha. Dos factos que indicaste, aproveito só os princípios:
- normalização da fonte;
- estrutura editorial;
- seleção de layout;
- imagens separadas;
- legenda e alt text;
- aprovação.

Regras de escrita: só factos da fonte, sem estatísticas inventadas e com o número de slides adequado à informação. Não se recriam nós nem se importam prompts.

## Rondas e critérios de aceitação
1. **Contratos e esquema:** migração aditiva das tabelas genéricas com GRANTs e RLS por papel e projeto. Aceitação: os dados `nl_*` ficam iguais (contagens antes e depois) e os testes de RLS passam.
2. **Do texto ao documento:** texto colado gera o conteúdo editorial e as duas composições, guardados. Aceitação: o trabalho é criado no servidor, conclui com o navegador fechado e a repetição não volta a chamar a IA. Uma falha simulada na gravação recupera a partir do ponto de controlo.
3. **Prova isolada do editor (Canvix ou alternativa):** aceitação: abre e grava o contrato v1, com versões CAS, em desktop e a 375 px.
4. **Render no servidor:** aceitação: PNG/PDF gerados por `(documento, versao)` sem navegador, repetir não cria ficheiros novos e o rascunho social fica com a versão fixada.
5. **URL de notícia:** aceitação: testes de redirecionamento para IP privado e para metadados, de tamanho e de tempo limite. O utilizador confirma a fonte.
6. **PDF textual**, depois **PDF digitalizado (OCR)**, cada um numa ronda própria.
7. **Crónica no motor novo**, por adaptador, sem tocar no histórico.

## Riscos e decisões pendentes
- Pedem aprovação: as dependências novas (extrator de PDF, render wasm, editor) e um eventual serviço de render externo, que tem custo e infraestrutura própria.
- Canvix pode não servir por licença, maturidade ou formato.
- Por decidir: o fornecedor de IA do motor (a recomendação é o AI Gateway) e o destino da DeepSeek.
- Direitos de texto de terceiros: a atribuição fica obrigatória no documento.
- A instabilidade recente do backend afeta o worker. Há um limite do plano atual a vigiar.

**Esta ronda entregou apenas o plano.** Não houve implementação, migração, deploy nem chamadas de IA.
