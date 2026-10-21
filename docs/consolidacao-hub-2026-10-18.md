# Consolidação do Hub — 18 de outubro de 2026

Branch local: `codex/hub-consolidacao-local`. Base desta ronda: `047950d4`.

**Não foi publicado no Lovable, nem feito push.** A versão local melhorou e passou a validação descrita abaixo. O conjunto ainda depende de serviços que só existem no computador; publicar apenas o frontend não disponibiliza o motor editorial/PDF em produção.

## Correções e integração

- **Arranque:** shell privado, contexto de projeto e fronteira da newsletter ficam separados das páginas públicas; a verificação de autenticação precede o carregamento do shell.
- **Sessão:** uma resposta tardia de `getSession` não substitui um login/logout mais recente. Espera inicial limitada a 20 segundos; desmontar limpa o temporizador e a subscrição.
- **Para aprovar:** menu e página partilham cache e um canal realtime por conta/QueryClient. As três contagens correm em paralelo. Aprovar/remover também reduz o contador; posts antigos sem `content_type` deixam de desaparecer. Eventos são agrupados; falha de leitura tem aviso e recuperação, em vez de zero presumido. A contagem continua a abranger a equipa, como a lista e as regras de acesso existentes.
- **Créditos de IA:** cache por utilizador; resposta de uma conta antiga não contamina a seguinte. Falha mostra indisponível, distinta de saldo zero.
- **SEO:** o cliente passa a aguardar até 120 segundos pela execução (o fornecedor de redação pode demorar até 90), evitando reportar falha aos 25 segundos enquanto o servidor continua. Não há retry automático de pedidos pagos. Consulta do estado a cada 30 segundos quando ocioso e 5 segundos com trabalho em curso.
- **PDF/Excel:** PDF.js é importado quando se lê/gera uma capa real; XLSX só após escolher ficheiro. Helpers de referências de artigos não puxam o parser inteiro.
- **Diagnóstico de publicação:** o aviso de cópia só confirma depois de a área de transferência aceitar o texto; recusa/permissão falhada tem tratamento. Nenhuma publicação foi executada.
- **Resultados:** Analytics e Comparar contas aguardam publicações e perfis. Falha de uma leitura mostra recuperação explícita; não se apresenta como zero resultados. Estatísticas de base são memorizadas. Semanas usam ano/semana ISO, incluindo dezembro/janeiro.
- **Estrutura:** Modelos de projeto usa o layout global e o breadcrumb Projetos → Modelos de projeto. Modelos tem erro/retry. Notificações e cinco ecrãs de newsletter deixam de criar uma segunda área main. A newsletter ganha título acessível. Os cinco ficheiros gerados foram alterados através das fontes inertes e do gerador.

Não foram mudadas as regras editoriais, o design sem retrato, o fecho de subscrição, a aprovação humana do site pessoal, nem as permissões/credenciais. Essas regras não foram reenviadas ou reconfiguradas nesta ronda.

## Desempenho medido

Build de produção antes/depois, mesmo projeto e dependências. Cada linha soma o módulo e dependências estáticas; não soma imports dinâmicos ainda não usados. Gzip por ficheiro. Valores em bytes.

| Percurso | JS antes | JS depois | Gzip antes | Gzip depois | Redução gzip |
| --- | ---: | ---: | ---: | ---: | ---: |
| Arranque | 748 305 | 512 104 | 219 935 | 154 353 | 29,8% |
| Artigos | 1 154 346 | 582 928 | 343 871 | 182 079 | 47,0% |
| Resultados | 2 364 388 | 1 907 393 | 725 683 | 589 923 | 18,7% |

Reproduzir: `npm run build:medir -- /tmp/hub-build.json`. O script gera o build e um inventário de chunks/imports. Relatórios privados desta medição: `.impeccable/review/consolidacao-18/build-before.json` e `build-after.json`.

Isto mede transferência de código, não tempos reais de rede, Core Web Vitals ou um benchmark de telemóvel. Continuam chunks grandes nos editores/gráficos; foram adiados os dois parsers pesados sem alterar a sua função. Não foram instalados pacotes novos.

## Verificação

- **941 testes aprovados e 1 previamente ignorado**, em 156 ficheiros aprovados e 1 ignorado. Mais 35 casos que a base desta ronda. Cobrem corrida de sessão, contas/contagens partilhadas, erros, lazy loading, timeout/polling, cópia, semanas ISO, modelos e recuperação de resultados, além da suite existente.
- `npm run typecheck`: aprovado.
- `npm run check:edge`: aprovado; 250 ficheiros alcançáveis e verificações Deno da newsletter/roteiros. Fontes inertes regeneradas por `python3 scripts/port-newsletter.py`.
- Build de produção: aprovado. Mantém o aviso de chunks acima de 500 kB; não o silenciámos.
- `git diff --check`: aprovado.
- Lint focado nos helpers novos, sessão, contagens, créditos, API SEO e testes: zero erros; um aviso Fast Refresh já existente.
- Lint global **ainda falha**: 333 erros e 144 avisos, comparado com 344 erros e 145 avisos no início. É dívida estática legada (tipos `any`, imports/variáveis, etc.), não uma contagem de bugs de execução. Não foi executado autofix global nem convertida a aplicação inteira nesta ronda.
- Navegador: percorridas as 18 áreas do menu, mais Modelos e Notificações. Verificados os estados já carregados; não se confundiu o skeleton transitório com o resultado. Ecrãs revistos a 1440×1000, 390×844 e 1280×720, sem overflow horizontal nas superfícies capturadas.
- PDF sintético de duas páginas carregado no projeto de demonstração: capa real, texto pesquisável, seleção só da página 2 e transferência explícita para Artigos com página/hash/referência; página 1 não entrou no excerto. Texto de teste não guardado/publicado. O PDF de teste ficou **arquivado, recuperável**, no navegador local. Acervo original não alterado.
- No adaptador de demonstração, alguns dados/funções de nuvem não estão disponíveis: resultados/perfis, modelos, carrosséis e roteiros. Foram exercitados os estados de falha explícitos e os controlos locais; isso não comprova nem reprova o funcionamento atual dessas APIs públicas.
- Não houve pedidos pagos DataForSEO/DeepSeek, prompts Lovable, envio de newsletter/listas, publicação social ou WordPress. **Consumo Lovable nesta ronda: 0 créditos / 0,00 €**; isto não contabiliza uso do Codex nem custos anteriores.

## Prontidão e o que falta

| Área | Evidência desta ronda | Para produção |
| --- | --- | --- |
| Navegação/layout/sessão | Validada localmente, testes e build aprovados | Repetir smoke com conta real e políticas atuais no ambiente de ensaio |
| Documentos/PDF | Upload, capa, leitura e excertos locais comprovados; acervo antigo já recuperado em rondas anteriores | Migrar binários/estado para armazenamento privado e BD do Hub, RLS por projeto, backup/restauro e processamento durável |
| Pesquisa/custos/redação SEO | Contratos, limites, cache, propostas e ledger local testados | Backend autenticado persistente, secrets no servidor, worker sempre ligado, piloto real com limite de custo e reconciliação |
| Automação editorial | Preparação/cadência local; site pessoal continua a exigir aprovação | Scheduler/fila duráveis sem depender de `npm run dev:hub`, retry/idempotência e pausa comprovados |
| WordPress em vários sites | Políticas/destinos preparados em trabalho anterior | Instalar/validar publicação por destino, deduplicação e atualização, imagens/taxonomia, falha parcial, registo remoto e aprovação obrigatória no site pessoal |
| Newsletter e compositor | Regressões cobertas na suite; sem segundo main; regras editoriais preservadas | Ensaio controlado de envio real → Story/carrossel em rascunhos editáveis, sem envio geral nesta ronda |
| Redes/resultados/importações | Estados de erro/espera e cópia corrigidos | Validar importação real, RLS, permissões e publicações controladas com backend ligado |

Prioridade da próxima ronda: **backend persistente de Documentos e SEO**, depois um piloto completo fonte → artigo → aprovação → WordPress e envio → rascunhos sociais. Só depois sincronizar a branch escolhida e publicar o conjunto no Lovable. Os endpoints `/__hub-documentos/*` e `/__hub-seo/*` pertencem ao middleware de desenvolvimento e não são incluídos no site estático público.

Há ainda refinamentos posteriores: reduzir a dívida de lint por módulo, separar mais funcionalidades dos gráficos/editores, testar volumes grandes e dispositivos reais, e ampliar a cobertura de fontes de PDF bloqueadas/dinâmicas. Não se promete extração universal: respeitam-se robots, autenticação e limites. OCR e documentos grandes exigem processamento apropriado.

O relatório inicial `pdftracker-integracao-hub-2026-10-18.md` descreve a primeira fase. A importação já foi realizada depois, conforme `importacao-pdftracker-acervo-2026-10-18.md`; não é uma pendência voltar a recuperar todos esses binários. A pendência atual é migrá-los para o backend privado de produção.

## Revisão final

Detector executado uma vez em 15 alvos de UI: 178 achados, cujas linhas já existiam integralmente na base. São 176 avisos de cores da newsletter e duas fontes SFMono em painéis técnicos de HTML/código. As alterações desses ecrãs são semânticas; não foram acrescentadas cores/fontes nem alterado o sistema global para esconder os avisos. A uniformização restante da newsletter fica como dívida de design explícita.

Revisão independente: um ajuste de contraste nos novos alertas de Resultados/Modelos. Aplicados os tokens existentes `aviso-texto` e `foreground`, sem mudar o destructive global. Os 10 testes dos dois percursos voltaram a passar; build repetido e capturas atualizadas. Veredito independente: **ship**, limitado ao finding de contraste corrigido (6,14:1 no texto de erro e 17,09:1 no botão; sem regressões materiais dessa correção). A revisão inicial não identificou outro defeito material nas alterações examinadas. Documentação confirma extensão do sistema existente, com PRODUCT.md/DESIGN.md e tokens globais preservados. Isto não constitui aprovação de produção da aplicação inteira. As provas locais e medições ficam fora do Git; não incluem credenciais ou PDFs privados no commit.
