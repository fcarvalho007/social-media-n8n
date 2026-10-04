# Auditoria técnica: motor de carrosséis (texto, link, PDF)

Ronda só de leitura: nada foi alterado. Este documento é a auditoria e a sequência proposta. Aprovar não implica implementar; serve de base para a próxima decisão.

## 1. Mapa de capacidades

| Capacidade | Estado | Onde está |
|---|---|---|
| Extração de conteúdo: crónica da newsletter | Implementada | `_shared/conteudos/fonte.server.ts` (`carregarFonteCronica`, `hashFonte`): parágrafos numerados, hash, fonte congelada |
| Extração: link de notícia | Parcial | `_shared/nl-app/lib/ler-artigo.server.ts` (`lerArtigo`, `extrairCorpoArtigo`, `MAX_CORPO = 8000`); `html-scraper.ts` (`extrairArtigosHtml`); `newsletter-engine/revista/brief/fontes.server.ts` (`recolherFonte`, `validarCandidato`, nunca lança). Usado só pela newsletter; não produz `FonteCronica` |
| Extração: texto colado | Ausente (é trivial) | Não há entrada; basta partir em parágrafos e calcular o hash |
| Extração: PDF carregado | Ausente | Não há `pdfjs`/parser no projeto. `jspdf` só escreve PDF |
| Chamadas de IA (texto) | Implementada, mas dispersa | Carrossel: DeepSeek via `_shared/nl-app/lib/deepseek.server.ts` e `newsletter-engine/deepseek.server.ts`; `gerarComReparacao` e `medidasProposta` em `_shared/conteudos/carrossel.ts` (máx. 2 chamadas); custos em `nl_ia_uso`. Social: `ai-core`, `ai-editorial-assistant`, `ai-caption-rewriter` (Lovable AI Gateway) |
| Geração de imagens | Implementada (isolada) | `fal-generate-image`, `ai-generate-image`, `ai-core` (fal + gateway); histórico de imagens IA no fluxo social. Não ligado ao carrossel (slides são só tipografia) |
| Tarefas em segundo plano | Implementada para a crónica | `nl_conteudos_jobs` (fila, `lease_token`, tentativas, backoff), `nl_reservar_jobs_conteudos`, `processarJobs`, `reconciliarEdicoesSemJob` em `jobs.server.ts`; `nl-worker-conteudos` (pg_cron horário). Chave e tipo fixos: `TIPO = "carrossel_cronica"`, ligado a `edicao_id` |
| Progresso | Parcial | Estados do job (`ESTADOS_JOB` em `src/services/conteudos.ts`) e "Processar fila agora". Sem percentagem nem etapas (extrair / gerar / validar) |
| Recuperação de falhas | Implementada para a crónica | Leases expirados recuperados, 5 interrupções → "Erro", "Retomar"; erros de credencial/saldo não repetidos; cópia local por utilizador/projeto (`src/lib/recuperacaoLocal.ts`) |
| Documento editável | Implementada (texto estruturado) | `nl_conteudos_derivados.carrossel` (JSON `{slides[{titulo,texto,fontes}], legenda}`), `versao` + `nl_conteudos_guardar_versao` (CAS, histórico de versões); editor em `src/pages/CarrosselCronica.tsx` |
| Exportação | Implementada | `src/features/conteudos/exportar.ts` (`desenharSlide` em canvas 1080×1350, `gerarFicheiros` → PNG + PDF, ZIP com `jszip`); social: `src/lib/pdfGenerator.ts`, função `generate-carousel-pdf` |
| Aprovação / publicação | Implementada (via social) | `enviarParaEstudioSocial` → bucket `pdfs` → ação `enviar_social` cria `posts_drafts` (envio único por conteúdo+versão); publicação real segue o fluxo social/Getlate existente |

### Imagens vs documentos editáveis
- **Editáveis:** o carrossel guardado em `nl_conteudos_derivados` (JSON com slides, legenda, referências a parágrafos, versões). Pode ser reaberto, corrigido e reexportado.
- **Só imagens:** os PNG e o PDF enviados para o bucket `pdfs` e associados ao rascunho social (`posts_drafts`, `media_library`). Uma vez no rascunho social, não voltam a ser texto; alterar exige voltar ao editor do carrossel e reenviar nova versão.
- **Imagens IA** (fal/gateway): ficheiros finais, sem camadas.

## 2. Proposta: um único motor

```text
Entrada (texto | link | PDF | crónica)
   -> Adaptador de fonte  -> Fonte normalizada {tipo, titulo, url?, paragrafos[], hash}
   -> Fila existente (jobs com lease, tentativas, custos)
   -> Gerador (prompt por tipo + gerarComReparacao + validarCarrossel)
   -> Documento editável (versões CAS)
   -> Editor + exportação canvas (PNG/PDF/ZIP)
   -> Rascunho social (aprovação/publicação já existentes)
```

Reutilizar tal como está: validação, reparação, registo de custos, fila/leases, versões CAS, editor, exportação e envio social. O único elemento novo é o adaptador de fonte por tipo; a crónica passa a ser só mais um adaptador.

## 3. Lacunas e limitações
1. **Modelo de dados preso à newsletter:** `nl_conteudos_derivados` e `nl_conteudos_jobs` exigem `edicao_id`; o tipo está fixo em `carrossel_cronica`. É preciso uma origem genérica (`tipo_fonte`, `edicao_id` opcional, `project_id`).
2. **Fonte do texto:** `FonteCronica` assume crónica (`numero`, `OrigemFonte = snapshot | historico_actual`). É preciso generalizar o formato sem partir o fluxo atual.
3. **PDF:** não há leitura no servidor. Opções: extrair texto no navegador (precisa de uma biblioteca nova, que tem de ser aprovada) ou enviar o PDF à IA como ficheiro. PDFs digitalizados (só imagem) precisam de OCR.
4. **Links:** `lerArtigo` corta o texto a 8000 caracteres e falha em páginas que exigem pagamento ou JavaScript. Também precisa de proteção contra pedidos a endereços internos e de um limite de tempo.
5. **Prompt:** está escrito para a DIGITALSPRINT e para a crónica. É preciso um prompt por tipo de fonte e por marca/projeto.
6. **Dois fornecedores de IA:** o carrossel usa DeepSeek (a chave ainda falta) e o social usa Lovable AI. É preciso decidir qual usa o motor.
7. **Direitos e atribuição:** texto de terceiros (links/PDF) obriga a mostrar a fonte; a regra "só factos da fonte" mantém-se.
8. **Progresso:** só há estados; faltam etapas visíveis.
9. **Desenho dos slides:** é um só modelo tipográfico fixo, sem imagens nem modelos por marca.
10. **Ficheiros:** o armazenamento guarda ficheiros 7 dias; um PDF de origem tem de ficar guardado como texto extraído, não só como ficheiro.

## 4. Sequência de implementação (rondas futuras)
1. Generalizar o formato da fonte e o modelo de dados (origem genérica, `edicao_id` opcional, `project_id`), sem mexer nos dados existentes; manter a crónica a funcionar exatamente como hoje.
2. Adaptador de texto colado (síncrono, sem rede) + prompt genérico; reutiliza o editor e a exportação. Primeira entrega útil.
3. Adaptador de link: reutiliza `recolherFonte`/`lerArtigo` com limites de segurança e confirmação da fonte antes de gerar.
4. Adaptador de PDF: decidir onde extrair (no navegador ou na IA), limite de páginas e tamanho, aviso para PDFs digitalizados.
5. Fila: alargar os jobs aos novos tipos (chave = projeto + tipo + hash), com etapas de progresso visíveis.
6. Página no Estúdio "Novo carrossel" com as três entradas e a lista de trabalhos; ligação ao rascunho social existente.
7. Melhorias opcionais: modelos visuais por marca, imagem de capa gerada por IA.

## Decisões pendentes antes da ronda 1
- Fornecedor de IA para o motor (DeepSeek atual ou Lovable AI).
- PDF extraído no navegador (precisa de uma biblioteca nova) ou enviado à IA.
- Os carrosséis de fontes externas pertencem a um projeto ("Para quem?") ou só à DIGITALSPRINT.
