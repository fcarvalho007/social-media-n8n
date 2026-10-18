# Campanhas a partir de descobertas

Implementação local de 18 de outubro de 2026, na branch `codex/hub-campanhas-descobertas`.

Uma notícia aprovada na Curadoria ou páginas selecionadas de um documento dão origem a uma campanha para um site. A campanha reúne cinco propostas com papéis diferentes, fonte conservada, objetivo, oferta, momentos sugeridos e revisão de versão. A criação da proposta não executa pesquisa paga, redação por IA, publicação, envio ou agendamento.

## Utilização

1. Na Curadoria, escolher **Criar campanha** numa notícia aprovada; ou selecionar páginas no leitor de documentos e escolher a mesma ação.
2. Indicar o site, o nome da campanha, o ângulo próprio, o objetivo, a oferta e a data de início. O público e a política vêm da configuração existente do site.
3. Confirmar a criação. O Hub guarda a descoberta e cinco propostas editáveis. Repetir a criação da mesma versão da fonte para o mesmo site abre a campanha existente.
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
- Uma fonte exige referência HTTPS e pelo menos 200 caracteres para ser confirmada. Fontes parciais ficam identificadas.
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

No ensaio, a versão inicial usava uma confirmação nativa que ficou presa no navegador integrado. O código foi substituído por diálogo do Hub e tem teste específico que proíbe a confirmação nativa. A repetição final da recriação e a captura do novo fecho ficam por confirmar enquanto a janela antiga bloquear a interação; não se declara esse passo concluído apenas com base nos testes automatizados.

A revisão visual independente devolveu **recapture**: pede o novo fecho do carrossel em desktop e telemóvel, o cancelamento/confirmação da recriação e o cancelamento/saída com recuperação de alterações. Considerou válidas as nove capturas primárias já entregues. O contrato e o relatório de revisão local conservam esta pendência; não se declara aprovação visual final.

## Limites e instalação posterior

1. O destaque é uma proposta editável, com cópia e ligação à newsletter. A seleção da edição e a inclusão efetiva continuam manuais.
2. Não há orquestrador novo de publicação entre canais, reagendamento em cadeia ou recolha de resultados agregados por campanha. As datas sugeridas não criam tarefas.
3. A descoberta é um retrato da fonte no momento da criação; alterações posteriores não são importadas automaticamente.
4. Não se afirma volume de pesquisa, posição SEO ou retorno comercial a partir da notícia. A pesquisa e produção do artigo continuam nos fluxos existentes, com os seus próprios controlos de custo.
5. A ronda não instalou código no Lovable, não enviou newsletters e não publicou em sites ou redes. Consumo de créditos Lovable e chamadas pagas: **zero**.
6. Para instalação futura, publicar o serviço editorial que aceita o novo estado antes de disponibilizar a interface que cria campanhas; instalar os bundles e a interface da mesma revisão. Não são necessárias novas dependências ou migrações SQL para este campo.
7. As verificações de projeto usam testes locais do controlador autenticado. O isolamento e as operações precisam também de ensaio com contas e dados autorizados no backend real antes de se declarar validação em produção.
