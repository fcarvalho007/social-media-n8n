# Sequência editorial do Hub — referência Byword

18 de outubro de 2026. Desenvolvimento local na branch `codex/hub-sequencia-editorial-byword-local`.

## Decisão e comparação

Byword é a referência principal para organizar a criação de artigos. A documentação liga um tema à pesquisa, estrutura, redação e revisão, com definições próprias do site. Recomenda rever dados, contributo, ligações e destino antes de publicar. A documentação de ligações internas também distingue um inventário de páginas elegíveis da decisão editorial de usar uma ligação. São funcionalidades documentadas, não resultados de um ensaio numa conta paga. [Quick Start](https://byword.ai/learn/docs/quick-start/), [Internal Linking](https://byword.ai/learn/docs/settings/linking/).

A escolha para o Hub é integrar este método com DataForSEO, DeepSeek direto e os controlos já existentes. **Não foi adicionada uma dependência da conta ou API Byword.** A integração com serviços externos continua no servidor local e não usa créditos ou gateway de IA Lovable.

| Necessidade | Ponto de partida no Hub | Implementação nesta ronda |
| --- | --- | --- |
| Pesquisa ligada à criação | Keywords e SERP com histórico | Uma pesquisa existente pode ser associada ao brief. Guarda consulta, mercado, data, perguntas e até dez resultados SERP para orientar a estrutura, sem uma nova chamada paga. |
| Estrutura antes do artigo | Um único pedido de redação | Nova etapa editável: pergunta, título, secções, pontos a desenvolver, referências por secção e lacunas. Pode ser manual ou proposta pela IA. |
| Voz e conhecimento da marca | Público, voz, objetivo e oferta | Instruções adicionais, vocabulário a evitar, referências aprovadas e inventário de páginas por site. |
| Ligações úteis | Sem inventário editorial | Sugestões a partir de páginas aprovadas do próprio domínio; o prompt recebe só candidatas desse site. Ligações internas fora do inventário e externas fora das fontes bloqueiam aprovação. |
| Criar versus atualizar | Duplicados exatos entre pautas | Registo da keyword das páginas existentes. Uma correspondência exata bloqueia novo gasto até definir atualização ou rever a intenção. Não é deteção semântica de canibalização. |
| Revisão compreensível | Mapa de fontes e alertas | Checklist local de conteúdo, metadados, repetição, ligações, marca e arquivo, com causas e ações. Sem pontuação fictícia de qualidade ou SEO. |
| Produção recorrente | Cadência, fontes e limites | Sequência completa opcional: reutilizar fontes aprovadas da marca → estrutura → redação → verificações. As duas etapas DeepSeek têm custos e autorizações separados. |
| Saída editável | Editor Markdown simples | Pré-visualização segura com subtítulos, listas, negrito, referências e ligações; exportação local do rascunho em Markdown. |

## Percurso de trabalho

1. Abrir **Artigos → Plano editorial**, escolher um destino e criar/abrir uma pauta.
2. No **Brief**, definir a pergunta/contributo, objetivo, formato, intenção e instruções. Escolher criar ou atualizar; no segundo caso, indicar uma URL do inventário aprovado.
3. Associar uma pesquisa já existente, se ajudar. Uma SERP é investigação de intenção e formato, não prova dos factos que um concorrente publicou. Exemplos e Sandbox mantêm o bloqueio de produção paga, mesmo que a pesquisa de demonstração seja retirada depois da pauta.
4. Em **Fontes**, acrescentar referências ou reutilizar as correspondentes da marca. Referências aprovadas no conhecimento podem ser reutilizadas sem repetir a mesma confirmação. A seleção é lexical e continua a precisar de relevância editorial.
5. Em **Estrutura**, preparar a pergunta, título e pelo menos duas secções. Cada secção indica o que vai explicar e quais fontes a suportam. Confirmar a estrutura é gratuito. Pedir uma proposta de IA abre primeiro o orçamento próprio dessa etapa.
6. Em **Texto e revisão**, só pedir redação quando a estrutura estiver confirmada para o contexto atual. A proposta continua separada do texto guardado até ser aplicada explicitamente.
7. Rever a checklist, texto, mapa factual e fontes. Guardar e aprovar a versão correspondente. Pode exportar o rascunho Markdown. A aprovação e a exportação **não publicam no WordPress**.

Alterar brief, fontes, pesquisa, instruções, formato, política ou conhecimento da marca torna a estrutura desatualizada. O motor verifica a assinatura novamente no momento de executar, não apenas no botão. Uma estrutura humana nunca é substituída automaticamente. As alterações de texto continuam a invalidar a aprovação final.

Os formulários de pauta, estrutura e conhecimento preservam alterações locais por recuperar. A estrutura mantém-se montada ao mudar de separador; o conhecimento também. Conflitos de versão são recusados no servidor. A recuperação de formulário não é um histórico integral de versões nem substitui o backup do diretório privado.

## Conhecimento por site

Em **Artigos → Automação → Conhecimento**, cada destino tem:

- instruções editoriais e expressões a evitar;
- até doze referências, com título, URL HTTPS, excerto, data e aprovação;
- até cem páginas do próprio site, com URL canónica, título, tema, keyword, função e aprovação.

As referências precisam de pelo menos 200 caracteres e de uma data válida para serem aprovadas. Alterar título, URL ou excerto retira a aprovação na interface. O servidor também valida os campos, datas e identificadores. O inventário recusa outro domínio, URLs com credenciais/parâmetros e páginas de acesso como `wp-admin`.

São sugeridas até três referências e três páginas aprovadas com palavras do tema. Só as referências que cabem no limite de oito fontes/40 000 caracteres da pauta são acrescentadas; duplicados por URL não são repetidos. A revisão do conhecimento usa controlo de concorrência e invalida aprovações anteriores desse site.

Ainda é um inventário editorial manual. Guardar e aprovar uma página **não executa** um teste HTTP, crawl, canonical ou noindex. Não se afirma que um destino está tecnicamente válido só porque foi registado. A atualização automática por sitemap é uma próxima integração útil, com controlo de redirects, domínio, indexação e cadência de atualização.

## Automação e custos

A política tem uma nova opção explícita: **Autorizar a sequência completa: fontes → estrutura → texto**. Começa desativada. Políticas antigas não passam a executar duas chamadas por consequência desta atualização.

Além dessa opção, continuam necessárias a autorização geral de ciclos, a permissão de serviços pagos, a política ativa do site e a autorização da pauta. O servidor local tem de continuar ligado. Sites planeados não entram nos ciclos. Em **fredericocarvalho.pt, a aprovação humana permanece obrigatória**.

Quando a pauta autorizada não tem fontes e a sequência completa está ativa, pode reutilizar referências já aprovadas e correspondentes da marca. Não inventa uma fonte nem um contributo para preencher o calendário. Se já existir uma estrutura humana que ficou desatualizada, pede revisão em vez de a substituir.

Cada artigo pode ter:

1. uma pesquisa Labs opcional, conforme a opção de atualização da keyword existente;
2. uma chamada DeepSeek para a estrutura, se ainda não houver uma estrutura atual;
3. uma chamada DeepSeek para redigir;
4. verificações locais sem custo.

Não é um preço fixo por artigo. A estimativa de estrutura reserva entrada conservadora e até **1 800 tokens de saída**; a redação reserva entrada e até **4 000 tokens**. O registo identifica `preparar_estrutura` e `redigir_artigo`, tokens, origem do custo, estimativa, custo calculado e reserva. Reutiliza a mesma tabela DeepSeek do Hub. O orçamento é novamente verificado entre as etapas; a segunda pode ser bloqueada mesmo depois de a primeira terminar.

Lacunas, formato inválido, custo incerto, alteração do contexto, falta de orçamento ou erro interrompem a sequência sem uma repetição paga automática. Uma proposta manual de estrutura fica separada e não autoriza, por si só, redação. Na sequência automática, apenas uma estrutura nova, sem lacunas, para a mesma versão/contexto autorizado pode ser adotada antes de redigir.

As verificações distinguem bloqueios e avisos. Um bloqueio impede aprovação. Um aviso precisa de avaliação editorial e impede o estado pronto automático, mesmo quando a política permitir publicação automática no futuro. Não há uma média que compense falhas críticas. Continuam a faltar o publicador WordPress e a instalação de um worker de produção.

## Qualidade e limites

Foram integrados os aspetos do Byword que melhor ajudam a produzir com contexto e controlo. Não se adotaram geração indiscriminada em massa, extensão obrigatória de artigos, garantias de ranking, backlinks entre todos os sites ou a aparência de um verificador factual sem evidência.

A checklist deteta, entre outros, texto insuficiente, marcação/instruções pendentes, falta de estrutura, descrição a rever, parágrafos repetidos, ligações não aprovadas, vocabulário a evitar e correspondências exatas no arquivo/plano. Os mapas de afirmações e as referências aprovadas continuam a ser necessários. Estes controlos não provam a verdade de uma afirmação nem que a fonte citada a sustenta. Essa avaliação exige o piloto editorial e revisão humana, sobretudo no site pessoal e em temas sensíveis.

Ainda por desenvolver/validar:

- ligação autenticada e ensaio real de DataForSEO e DeepSeek; nesta ronda não houve chamadas pagas;
- avaliação editorial de artigos reais para cada uma das quatro marcas;
- ingestão automática e controlada de sitemap/arquivo, canonical/noindex e saúde das ligações;
- agrupamentos e deteção semântica de sobreposição, para além da igualdade de keyword;
- reabastecimento automático da fila a partir da Curadoria e dos PDFs, com proveniência e revisão;
- extração de páginas completas e investigação factual adicional; a SERP anexada contém resultados/perguntas, não um crawl dos concorrentes;
- revisão linguística por seleção e comparação completa de versões;
- publicação WordPress com imagem, metadados de plugins, prevenção de duplicados e reconciliação;
- Search Console, medição orgânica, testes de captação e worker contínuo em backend autenticado.

Não foi contratado Byword, instalado outro pacote, alterada uma credencial ou publicado conteúdo. O acervo documental e os fluxos da newsletter mantêm-se fora destas alterações.

## Validação desta ronda

Os testes usam respostas controladas, sem despesas externas. Verificam as duas etapas, limites entre etapas, interrupção por lacunas, aprovação de estrutura, invalidação por alteração, isolamento por marca, URLs elegíveis, inventário, bloqueio antes de gastar e preservação das demonstrações.

- **895 testes aprovados, um preexistente ignorado**, em 146 ficheiros aprovados e um ignorado (30,32 s na execução final).
- **22 testes novos** nesta ronda: 18 sobre a sequência e conhecimento; quatro sobre pré-visualização segura, ausência de submissão acidental e preservação de edição concorrente. O conjunto SEO soma 66 testes.
- TypeScript da aplicação e do servidor e lint dos alvos alterados aprovados. O build público passou em 12,67 s, mantendo os avisos preexistentes de tamanho de alguns bundles.
- O detetor de padrões da interface não assinalou ocorrências nos alvos novos/alterados. Isto não substitui a inspeção no navegador.
- Nenhum pedido pago DataForSEO/DeepSeek, crédito Lovable, push ou publicação nesta ronda.

**Revisão visual pendente:** a ligação do navegador deixou de responder durante a preparação da matriz e a ferramenta indicou o Mac bloqueado. Foi solicitado desbloqueio, sem resposta até ao fecho funcional. O revisor independente devolveu **recapture**, exigindo capturas atuais de Estrutura, Conhecimento e Revisão em 1440×1000 e 390×844. Não foi atribuída aprovação visual a esta extensão, e as capturas da ronda anterior não são apresentadas como prova atual. O relatório de documentação conserva este limite; `DESIGN.md` mantém-se inalterado.

O código fica guardado localmente para pré-visualização e continuidade. Antes de considerar a ronda visualmente concluída ou preparar a integração no Lovable, retomar essa matriz, corrigir os problemas observados e obter a revisão final. Depois, validar credenciais e qualidade editorial com um pequeno lote real sujeito a orçamento.
