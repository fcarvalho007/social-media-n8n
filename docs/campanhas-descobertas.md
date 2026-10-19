# Campanhas a partir de descobertas

Implementação local de 18 de outubro de 2026, na branch `codex/hub-campanhas-descobertas`.

Uma notícia aprovada na Curadoria, páginas selecionadas de um documento ou conteúdo colado dão origem a uma campanha para um site. A campanha reúne cinco propostas com papéis diferentes, fonte conservada, objetivo, oferta, momentos sugeridos e revisão de versão. A criação da proposta não executa pesquisa paga, redação por IA, publicação, envio ou agendamento.

## Utilização

1. Em **Nova campanha → Fonte**, escolher notícia, estudo/PDF ou conteúdo colado. A notícia é escolhida dentro do percurso, sem salto para a Curadoria; o PDF permite escolher o documento e as páginas no mesmo ecrã. As entradas «Criar campanha» nas áreas de origem continuam a abrir diretamente a fonte escolhida.
2. Em **Direção**, escolher explicitamente o site, indicar o nome, o ângulo próprio, o objetivo, a oferta e a data de referência. O público e os valores iniciais vêm da configuração do site.
3. Em **Plano**, conferir o papel e o momento das cinco peças antes de criar. Repetir a mesma versão da fonte para o mesmo site avisa e abre a campanha existente. A criação desemboca na **vista geral das Peças**, com estados e próxima ação.
4. Rever cada proposta, ajustar o papel, o texto, a chamada à ação e o intervalo de dias. As datas são sugestões; não reservam um lugar no calendário.
5. Preparar o artigo no editor existente; preparar Story, carrossel e continuidade no compositor existente. O destaque da newsletter pode ser editado e copiado antes de escolher a edição.
6. Verificar a fonte e confirmar a revisão de cada peça. A aprovação final do artigo continua a acontecer no editor, sobre o artigo e as suas fontes.

Entrada geral: `/campanhas`. O menu, os breadcrumbs, a pesquisa transversal e o artigo ligado incluem ligações à campanha.

## Sequência inicial

| Peça | Papel | Momento sugerido |
| --- | --- | --- |
| Artigo | Aprofundar, acrescentar contributo próprio e captar tráfego orgânico | Dia de início |
| Destaque na newsletter | Contextualizar a descoberta e convidar à leitura | Primeira sexta-feira a partir do início, inclusive |
| Story | Criar curiosidade e chamar à leitura | Dia de início |
| Carrossel | Explicar a ideia em sequência e incentivar a subscrição | Dia seguinte |
| Continuidade | Retomar o tema através de aplicação prática e perguntas | Três dias depois |

São pontos de partida editáveis. As propostas contêm notas de trabalho; não representam cinco textos finais produzidos e aprovados automaticamente. As chamadas sociais dirigem-se ao leitor e o fecho do carrossel privilegia a subscrição. Os modelos não incluem retrato. Notícias e fontes continuam identificadas como tal; o sistema não inventa uma opinião atribuída ao autor.

## Artigo e compositor

A ação de preparar o artigo cria uma única pauta e devolve a ligação ao editor. Repetir a ação conserva a pauta e as edições já feitas. Alterar posteriormente a proposta da campanha não sobrescreve o artigo ligado. A pauta conserva a evidência da descoberta em excertos delimitados, sem cortar texto silenciosamente. Quando não existe referência HTTPS, permite preparar o brief, mas deixa as fontes por completar e explica o bloqueio à produção.

Story, carrossel e continuidade usam `DocumentoGrafico` e o `EditorGrafico` existentes. As composições são rascunhos editáveis guardados no backend do motor editorial; não são escritas diretamente nas tabelas `mc_*`. Alterações de texto na campanha conservam a composição anterior, avisam da divergência e exigem recriação explícita antes de nova revisão. A recriação e a saída com alterações usam diálogos da aplicação. A gravação durante uma atualização de dados não desmonta o editor nem apaga alterações feitas enquanto o pedido decorre.

Os modelos respeitam os formatos Story 1080 × 1920 e publicação/carrossel 1080 × 1350. Texto que exceda os limites suportados devolve erro e continua guardado na proposta; não é truncado para caber. Os artefactos anteriores permanecem tecnicamente conservados, mas esta ronda não acrescenta uma interface para restaurar o histórico visual.

## Política e revisão

- A campanha herda o site existente, incluindo público, voz, oferta, objetivo e política de aprovação.
- A revisão de newsletter e peças sociais é humana. A campanha não concede autorização de envio, gasto ou publicação.
- O artigo conserva o fluxo de aprovação e automação do motor editorial; a criação da pauta não autoriza produção automática.
- Notícias e documentos exigem referência HTTPS e pelo menos 200 caracteres para confirmar a fonte. No conteúdo colado, os 40 caracteres mínimos aceites na entrada podem ser confirmados pela pessoa que o forneceu, assumindo a verificação da origem e dos factos. Isto não inventa referências, não equivale a aprovação do artigo e não autoriza automação. Sem referências, o brief pode ser preparado mas a produção continua bloqueada. Fontes parciais ficam identificadas.
- A assinatura de revisão inclui a fonte, o conteúdo, a composição, as datas e a política atual. Alterar esses dados invalida a revisão correspondente.
- Destinos ainda planeados permitem preparação, mas não aprovação.

## Persistência e permissões

O campo opcional `campanhas` é validado separadamente no estado editorial, mantendo compatibilidade de leitura com estados antigos. Cada campanha tem versão e cada escrita verifica a versão esperada. Conflitos conservam o formulário local e pedem reabertura da versão guardada. Recuperação de formulários e composições distingue conta, projeto e peça.

Na nuvem, a criação relê a notícia aprovada através de `nl_curadoria_snapshot`, ou lê as páginas do documento autenticado e filtrado pelo projeto. O servidor recalcula a assinatura da descoberta e rejeita uma fonte entretanto alterada. O conteúdo enviado pelo navegador não substitui a fonte canónica. Leitores não podem escrever. A composição só pode ser lida pela referência presente no estado daquele projeto; não se aceita uma chave arbitrária fornecida pelo cliente.

As gravações aproveitam a exclusão mútua e a persistência já existentes no serviço editorial. Composições são artefactos imutáveis separados do estado; o estado guarda a referência ativa. Esta versão suporta até 100 campanhas por projeto e composições até 1,5 MB. A demonstração local usa o motor partilhado e identifica essa limitação na interface; não constitui prova de isolamento de produção.

## Operações

| Operação | Efeito |
| --- | --- |
| `campanha-fonte` | Relê fonte autorizada na nuvem |
| `campanha-criar` | Cria ou recupera proposta existente |
| `campanha-peca` | Guarda texto, papel, CTA e momento da peça |
| `campanha-fonte-confirmar` | Regista verificação humana da fonte |
| `campanha-rever` | Confirma revisão da versão da peça, exceto artigo |
| `campanha-artigo` | Cria ou abre a única pauta ligada |
| `campanha-compor` | Prepara um primeiro rascunho visual |
| `campanha-recompor` | Recria explicitamente a composição ativa |
| `campanha-composicao` | Lê a composição autorizada |
| `campanha-composicao-guardar` | Guarda uma nova versão visual e invalida a revisão |

Controlador partilhado em `scripts/seo/campanhas.ts`, contratos em `src/features/campanhas/modelo.ts`, modelos visuais em `src/features/campanhas/composicao.ts` e adaptação autenticada em `scripts/backend/campanhas.ts`. Os dois runtimes Edge foram regenerados pelo comando do projeto; não houve edição manual dos bundles.

## Validação desta ronda

- Bateria completa final: **1 112 testes aprovados e um ignorado**, incluindo a correção dos diálogos. Foi necessário indicar `HUB_POPPLER_DIR` para a pasta `native/poppler/poppler/bin` do runtime instalado; a execução sem essa configuração falhou no teste nativo de PDF por ausência de `pdftotext` no PATH.
- Após a correção do diálogo, também passaram **58 testes dirigidos**, abrangendo motor, formulário, compositor e navegação.
- Verificações de tipos da interface e backend, lint dos novos ficheiros e build aprovados. O grafo Edge verificou **255 ficheiros**; os dois endpoints passaram na verificação Deno. O build conserva avisos existentes de dimensão de alguns chunks.
- Ensaio local no navegador: criar campanha com cinco propostas; criar e abrir a pauta; criar Story e carrossel; editar, guardar e reabrir uma composição mantendo o título e a chamada à ação.
- Capturas desktop e telemóvel em `.impeccable/review/campanhas/`. O conteúdo de demonstração é sintético e identificado.

No primeiro ensaio, uma confirmação nativa ficou presa no navegador integrado. O código foi substituído por diálogo do Hub e ganhou um teste específico que proíbe a confirmação nativa. Na ronda de instalação, o navegador voltou a responder e o percurso foi repetido: cancelar conserva a composição; confirmar recria; reabrir apresenta o novo fecho de subscrição. A saída com alterações foi cancelada nos dois tamanhos de ecrã, conservando o texto. Sair com cópia local e restaurar ao reabrir também repôs o título exato editado. O ensaio usou apenas a campanha sintética local.

A primeira revisão independente pediu **recapture**. As dez capturas em falta foram obtidas e verificadas em desktop e telemóvel, incluindo o fecho completo no preview móvel. Uma nova revisão integral devolveu **ship**, sem correções materiais, no âmbito da implementação e ensaio locais. Os relatórios em `.impeccable/review/campanhas/` conservam a sequência histórica. Esta aprovação não certifica a instalação Cloud.

## Limites e instalação posterior

1. O destaque é uma proposta editável, com cópia e ligação à newsletter. A seleção da edição e a inclusão efetiva continuam manuais.
2. Não há orquestrador novo de publicação entre canais, reagendamento em cadeia ou recolha de resultados agregados por campanha. As datas sugeridas não criam tarefas.
3. A descoberta é um retrato da fonte no momento da criação; alterações posteriores não são importadas automaticamente.
4. Não se afirma volume de pesquisa, posição SEO ou retorno comercial a partir da notícia. A pesquisa e produção do artigo continuam nos fluxos existentes, com os seus próprios controlos de custo.
5. A ronda de desenvolvimento local não instalou código no Lovable, não enviou newsletters e não publicou em sites ou redes. Consumo de créditos Lovable e chamadas pagas nessa ronda: **zero**. A instalação posterior foi autorizada separadamente e tem contabilidade própria.
6. Para instalação futura, publicar o serviço editorial que aceita o novo estado antes de disponibilizar a interface que cria campanhas; instalar os bundles e a interface da mesma revisão. Não são necessárias novas dependências ou migrações SQL para este campo.
7. As verificações de projeto usam testes locais do controlador autenticado. O isolamento e as operações precisam também de ensaio com contas e dados autorizados no backend real antes de se declarar validação em produção.


## Refinamento do percurso — 19/10/2026, exclusivamente local

Branch: `codex/hub-campanhas-percurso-local-2026-10-19`, criada a partir de `1e997f57`. Nenhum push para a branch sincronizada, instalação no backend, publicação ou prompt de desenvolvimento no Lovable nesta ronda. Dependências npm e migrações SQL inalteradas.

### Problema resolvido

A entrada anterior de Nova campanha encaminhava para Curadoria ou Documentos sem manter uma sequência de escolha e continuação. Agora há quatro passos visíveis: **Fonte → Direção → Plano → Peças**. O resultado da criação é uma campanha guardada com cinco propostas e acesso aos editores existentes, com indicação explícita do próximo passo e do que falta preparar/rever.

- Notícias aprovadas são pesquisadas e escolhidas dentro da criação, reutilizando o seletor de Curadoria; falhas de leitura permitem repetir ou escolher outra fonte.
- O acervo do projeto abre no próprio percurso. A escolha do PDF e das páginas é preservada no URL, incluindo voltar à fonte; as páginas sem texto estão desativadas. O excerto inclui referências de página e respeita 20 000 caracteres.
- Conteúdo colado aceita título, texto e ligação opcional, valida o URL, conserva proveniência própria e usa identidade/hash determinísticos. A recuperação local é separada por conta/projeto; o texto não é colocado no URL.
- O backend recalcula a identidade/assinatura do conteúdo colado. Não o apresenta como notícia aprovada ou documento canónico. Fontes de notícias/PDF continuam a ser relidas no servidor, com as permissões existentes.
- O site exige uma escolha explícita, evitando aplicar por omissão o público de SMS a uma campanha de formação pessoal. A conferência do plano precede a criação; voltar à direção conserva os campos.
- Fontes repetidas são assinaladas antes da criação e abrem a campanha existente, preservando texto e composições.
- A vista geral distingue fonte confirmada, artigo ligado, composições criadas e revisões válidas. O editor permite continuar à peça seguinte e regressar ao plano. Mudanças de etapa recebem foco e posicionamento de leitura.
- A criação e a gravação mantêm os controlos de confirmação, versão, recuperação e permissões. Não acrescentam chamadas pagas nem publicações automáticas.

### Validação

- **97 testes dirigidos aprovados** em sete ficheiros: motor de campanhas, percurso completo com rotas, formulário, compositor, Curadoria, leitor de documentos e persistência SQL. Casos novos incluem os três pontos de partida, mínimo de texto consistente, assinatura adulterada, deduplicação, retorno às páginas selecionadas, recuperação por projeto e aviso de campanha existente.
- TypeScript da aplicação, backend e tooling; lint dos ficheiros alterados; regeneração dos dois runtimes; build Vite aprovados. Mantêm-se os avisos anteriores de dimensão de chunks e metadados Browserslist desatualizados.
- No navegador local: notícia → direção → plano → campanha existente preservada; PDF digitalizado com OCR → página selecionada → direção; conteúdo colado → direção → plano → campanha guardada → reload → reabertura → Story criado e aberto no compositor existente.
- Campanha sintética de QA: `e2847976-f445-4ad7-ad42-66dd07fd7094`, «TESTE LOCAL · Uma fonte, uma campanha coordenada». Uma composição Story criada, sem envio, publicação, IA paga ou aprovação de conteúdo real.
- Revisão a 390 px: largura do documento igual à largura do ecrã e sem elementos de conteúdo a exceder o limite horizontal. Testado início do percurso e vista geral. Viewport restaurado no final.
- Evidências fora do Git em `../evidencias-hub-2026-10-19/`: `campanha-percurso-inicio-local.png`, `campanha-percurso-plano-local.png`, `campanha-percurso-inicio-mobile-local.png` e `campanha-percurso-mobile-local.png`.

### Integração futura e limites

1. Instalar interface e ambos os runtimes da mesma revisão após novo pedido. O backend antigo não conhece `fonte.tipo = texto`; não instalar apenas a interface.
2. Repetir os três percursos e a reabertura no backend Cloud. O ensaio desta ronda é local; não comprova permissões ou persistência Cloud desta nova entrada.
3. A vista geral acompanha preparação/revisão. A inclusão efetiva do destaque numa edição, o envio da newsletter e as publicações sociais continuam nos canais existentes; esta ronda não cria confirmação automática desses estados na campanha.
4. As propostas incluem notas de trabalho; preparar a campanha não produz cinco textos finais. Artigo, aprovação, composição e publicação continuam ações explícitas nos editores.

Créditos de desenvolvimento Lovable nesta ronda: **0 (0,00 €)**. Pedidos a fornecedores pagos: **0**.
