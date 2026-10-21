# Pesquisa SEO e motor editorial — implementação local

Ronda de 18 de outubro de 2026. Branch `codex/hub-pesquisa-editorial-local-2026-10-18`.

Esta implementação concretiza a [estratégia editorial](estrategia-motor-editorial-2026-10-18.md) dentro de **Artigos**. Permite investigar procura, escolher destinos, preparar pautas com fontes, rever propostas e controlar custos. É uma extensão local para demonstração e desenvolvimento: não foi instalada no Lovable, não publica no WordPress e ainda não foi validada com artigos produzidos pelos serviços reais.

## Experimentar

Na pasta do projeto, executar `npm run dev:hub` e abrir [Pesquisa SEO](http://127.0.0.1:5183/artigos/pesquisa). O servidor usa a porta fixa 5183 e o endereço 127.0.0.1. Esta funcionalidade só fica montada no modo de desenvolvimento `hub`.

1. Escolher destino, operação, termos e mercado. Começar em **Exemplo sintético**: não faz pedidos externos e os números não representam procura real.
2. Clicar **Rever pedido**. A confirmação mostra fornecedor, modo, unidades, estimativa, conversão indicativa, limites e motivos de bloqueio.
3. Executar o exemplo, filtrar resultados e selecionar até 20 keywords. **Adicionar ao plano** apenas cria pautas locais; não escreve artigos nem cobra pesquisa adicional.
4. No [Plano editorial](http://127.0.0.1:5183/artigos/plano), definir pergunta, intenção, contributo próprio, público e chamada para ação. Acrescentar fontes, trechos e datas e confirmar que cada fonte pode sustentar o trabalho.
5. A redação real só fica disponível com credenciais DeepSeek, fontes/contributo preenchidos, serviços permitidos e orçamento autorizado. A proposta é guardada à parte. É preciso escolher **Aplicar proposta** para a trazer para o texto editável.
6. Rever texto, mapa de afirmações/fontes e alertas. Uma aprovação refere-se à versão atual; alterações relevantes invalidam-na.

[Automação](http://127.0.0.1:5183/artigos/automacao) e [Custos](http://127.0.0.1:5183/artigos/custos) pertencem ao mesmo percurso. A página geral de custos também dá acesso ao registo deste motor. Os textos do plano continuam acessíveis em Artigos.

## Pesquisa disponível

O adaptador usa endpoints fixos da API DataForSEO V3. Não é um proxy para URLs arbitrários. As oito operações estão implementadas com validação de entrada, normalização de resposta e testes com respostas controladas; falta o ensaio autenticado contra o fornecedor real.

| Operação no Hub | Endpoint | Estimativa máxima antes de executar |
| --- | --- | --- |
| Sugestões de keywords | `dataforseo_labs/google/keyword_suggestions/live` | US$0,012 + US$0,00012 × limite de itens |
| Keywords relacionadas | `dataforseo_labs/google/related_keywords/live` | US$0,012 + US$0,00012 × limite de itens |
| Ideias por tema | `dataforseo_labs/google/keyword_ideas/live` | US$0,012 + US$0,00012 × limite de itens |
| Analisar keywords | `dataforseo_labs/google/keyword_overview/live` | US$0,012 + US$0,00012 × termos enviados |
| Keywords de um domínio | `dataforseo_labs/google/ranked_keywords/live` | US$0,012 + US$0,00012 × limite de itens |
| Lacunas face a um concorrente | `dataforseo_labs/google/domain_intersection/live` | US$0,012 + US$0,00012 × limite de itens |
| Volume Google Ads | `keywords_data/google_ads/search_volume/live` | US$0,09 por tarefa, até 1 000 termos |
| Resultados do Google | `serp/google/organic/live/advanced` | US$0,002 × blocos de 10 resultados pedidos |

Preços consultados em 18/10/2026: [Labs](https://dataforseo.com/pricing/dataforseo-labs/dataforseo-google-api), [Keywords Data](https://dataforseo.com/pricing/keywords-data/google-ads), [SERP](https://dataforseo.com/pricing/google-serp/google-organic-serp-api). O catálogo é uma fotografia datada, não uma atualização automática dos preços. A própria resposta do fornecedor é a fonte do custo DataForSEO registado.

Exemplos: 50 itens Labs têm uma estimativa de US$0,018; 100 itens, US$0,024; 20 resultados SERP, US$0,004. Podem existir pedidos cobrados mesmo quando a tarefa não produz resultados úteis. O Hub conserva o custo devolvido antes de interpretar ou guardar os resultados.

Os extras clickstream e as opções SERP com multiplicadores não estão disponíveis. A entrada SERP restringe operadores que poderiam alterar a tarifa. A profundidade SERP fica limitada a 100; Keywords Data respeita 12 tarefas/minuto; o motor limita a três operações simultâneas. Related Keywords usa profundidade 1 nesta fase e pode devolver menos ideias do que o limite pedido.

Mercado e idioma são explícitos. O Hub distingue Portugal/português, Brasil/português e Reino Unido/inglês, sem os somar. Um valor ausente aparece como «—», não como zero. Dificuldade orgânica, concorrência de anúncios, CPC e intenção são campos diferentes. O volume é uma estimativa mensal, não uma promessa de tráfego.

Há pesquisa por domínio e lacunas orgânicas em relação a um concorrente, perguntas relacionadas nas SERPs, tendências mensais quando devolvidas, ordenação, filtros e exportação CSV. Exportações mantêm o modo/mercado e protegem células que poderiam ser interpretadas como fórmulas.

### Três modos

- **Exemplo sintético:** dados locais inventados para experimentar a interface, identificados como tal. Nunca entra nos totais de gasto real ou na redação real.
- **Sandbox:** respostas fixas do fornecedor; permitem validar integração, sem representar o mercado. Não são apresentadas como medições reais.
- **Real:** requer credenciais, permissões, limites e autorização. Não foi executada pesquisa paga nesta ronda.

Resultados equivalentes são reutilizados por operação, termos normalizados, país, idioma, modo e parâmetros. A validade inicial é sete dias; SERP, no máximo um dia. Mudar apenas o site de destino não refaz a pesquisa. A reutilização fica ligada ao pedido original e custa zero adicional. Forçar atualização pede novo orçamento.

## Contabilidade de custos

O valor canónico é guardado em **microunidades de USD**, evitando acumular erros de ponto flutuante. A conversão para euros é indicativa. O valor inicial configurável é 0,86 EUR/USD, datado de 18/10/2026, definido manualmente e não confirmado como taxa bancária. Cada pedido conserva a taxa e a data que usou; alterar a configuração não reescreve o passado. IVA, comissões e diferenças do meio de pagamento não estão incluídos.

O histórico discrimina:

- site, serviço, operação, modo, parâmetros resumidos e momento;
- estimativa e linhas de cálculo, unidades e preço unitário;
- autorização e versão do orçamento;
- reserva de orçamento, custo conhecido e respetiva origem;
- estado da tarefa, identificadores do fornecedor e reutilização de cache;
- modelo, tokens de entrada/saída/cache e cálculo aplicável à redação;
- notas de reconciliação quando o custo ficou desconhecido.

Uma estimativa não é uma cobrança. Uma reserva também não é um custo confirmado. Custos desconhecidos ficam fora da soma de gastos conhecidos, mas continuam a consumir o orçamento reservado. A interface permite filtrar reais/testes, serviço, site, estado e datas, consultar o detalhe e exportar CSV e JSON de auditoria.

Há limites globais e por site, por mês, dia e pedido. A instalação começa com serviços pagos e automação **pausados**, limite global mensal de US$5, diário de US$1 e de US$0,15 por pedido. Cada site começa com US$2/mês, US$0,50/dia e US$0,15/pedido. São travões iniciais para um piloto, não uma previsão de despesa nem uma autorização de os gastar.

O orçamento expira em cinco minutos e é consumido uma única vez. A reserva é persistida antes do pedido externo. Cliques repetidos sobre a mesma autorização não repetem a chamada. Uma consulta equivalente pendente ou de resultado incerto não é reenviada automaticamente. Se o processo reiniciar durante uma chamada, mantém a incerteza/reserva para reconciliação. Uma resposta cujo custo exceda a estimativa pausa novos pedidos pagos.

A reconciliação manual exige uma nota e não permite reescrever um custo já conhecido. O painel cobre os pedidos deste motor local; não importa a faturação histórica da conta DataForSEO, do Playground, do Lovable ou de outros produtos.

### Redação DeepSeek

Reutiliza a integração direta, o modelo e a tabela de custos partilhados do Hub, sem gateway de IA do Lovable. A reserva considera entrada conservadora e até 4 000 tokens de saída. O custo final é **calculado pelos tokens reportados** e pela tabela/faixa horária, identificado como cálculo, não como valor confirmado numa fatura. Se faltar uso ou o modelo for desconhecido, o custo fica desconhecido com reserva preservada.

Não há nova subscrição nem pacote instalado nesta ronda. Não foram consumidos créditos Lovable, pedidos de pesquisa DataForSEO pagos ou geração DeepSeek.

## Políticas editoriais e automação

Preparação e publicação têm permissões diferentes. É possível configurar preparação só a pedido ou por cadência, e definir uma política futura de rascunho/revisão/publicação automática. **Nenhuma opção publica externamente nesta implementação.**

| Site prioritário | Identidade inicial | Condição especial |
| --- | --- | --- |
| smsonline.pt | SMS marketing para empresas; exemplos práticos e ofertas confirmadas | Rever preços, funcionalidades e temas legais |
| teletrabalhoweb.com | Informação e competências para trabalho remoto, conduzindo às formações | Rever salários, apoios, legislação e oportunidades concretas |
| digitalfc.pt | Decisão de gestores sobre auditoria, transformação e automação | Contributo empresarial específico e alegações sustentadas |
| fredericocarvalho.pt | Formação, IA, marketing e análise pessoal | **Aprovação humana sempre obrigatória no servidor** |

Público, voz, objetivo e oferta são editáveis por destino. Primeira pessoa no site pessoal exige opinião/experiência fornecida por Frederico; o prompt proíbe inventar clientes, resultados e vivências. `ensinoemcasa.com` e `leigdpr.pt`, bem como os restantes destinos ainda não preparados, mantêm o estado **Planeado / A desenvolver mais tarde** e não entram nos ciclos automáticos.

Cada pauta tem fontes com URL, trecho, data e confirmação humana; pergunta, estrutura e contributo; conteúdo; mapa de afirmações e referências; alertas; proposta separada; versão e aprovação. Alterar texto, fontes ou identidade relevante invalida a aprovação. A gravação usa controlo de versão para evitar substituir silenciosamente uma edição concorrente. O formulário tem recuperação local de alterações por guardar. Ainda não há um histórico integral e imutável de todas as versões humanas neste módulo local.

O worker consulta a cadência uma vez por minuto enquanto o servidor estiver ligado. O navegador pode fechar. Usa Europe/Lisbon, considera a mudança de hora, evita executar duas vezes a mesma janela e não recupera semanas passadas em massa. A cadência inicial é terça/sexta às 09:00, no máximo duas peças por semana e reserva desejada de duas semanas; todas as políticas começam inativas.

Só entra uma pauta marcada para preparação automática, num site ativo, dentro dos temas permitidos, com contributo/fontes confirmados, permissões e orçamento. Opcionalmente atualiza a keyword por Labs antes de redigir, com cache e limites iguais aos pedidos manuais. Cada proposta continua separada do texto humano. O estado «pronto automático» significa que passou a triagem local para a política configurada; **não significa publicado**.

Sem pautas elegíveis, fontes ou orçamento, regista o bloqueio e para. Não inventa conteúdo para cumprir a cadência. A reserva mostra o défice, mas ainda não descobre e aprova novas fontes nem abastece o plano sozinha.

## Credenciais, ficheiros e proteção local

Há formulário em [Automação → Limites e ligação](http://127.0.0.1:5183/artigos/automacao?secao=limites), ou alternativa de copiar `.env.seo.example` para `.env.seo.local`. Usar apenas credenciais API existentes, sem prefixo `VITE_`, e nunca as enviar no chat ou guardar no Git.

O formulário guarda os valores em `.seo-local/credenciais.json`, com permissões 0600. O diretório privado usa 0700. A resposta à interface só indica presença das chaves; não devolve segredos. A alternativa por ambiente é lida no servidor. O controlo local não substitui um cofre gerido e autenticação de produção.

O estado e o histórico vivem em `.seo-local/`, com escrita atómica, sincronização, fila de transações e bloqueio por processo. Respostas brutas e resultados ficam separados para evidência. Estado corrompido não é apagado nem substituído por uma instalação vazia. Fazer backup privado desta pasta com o servidor parado; contém dados e pode conter credenciais. Não a anexar a PRs, prompts ou exportações públicas. `.seo-local/`, `.env.seo.local` e a biblioteca documental privada ficam fora do Git.

O middleware aceita apenas POST JSON com origem igual à do Hub, Host 127.0.0.1 e ligação loopback. Acesso ao estado privado pela raiz estática ou por `@fs` é bloqueado pelo Vite. Credenciais não entram na aplicação pública. O build de produção não inclui o middleware nem as páginas locais deste motor.

O portal DataForSEO estava autenticado, mas o valor ocultado que apresenta não autenticou a API. O ensaio gratuito User Data devolveu HTTP 401, código 40100, custo 0. A configuração temporária criada para esse ensaio foi retirada. **A ligação real continua por configurar/verificar**, assim como a chave DeepSeek. Não foi reposta/alterada qualquer senha.

O botão **Verificar ligação · gratuito** usa apenas [User Data](https://docs.dataforseo.com/v3/appendix-user-data/) e pode mostrar o saldo da conta. Credenciais configuradas não equivalem a autenticação verificada. Uma verificação gratuita bem-sucedida também não valida os oito endpoints pagos nem a qualidade editorial.

## Verificações desta ronda

- Bateria completa: **873 testes aprovados e um teste preexistente ignorado**; 144 ficheiros de testes aprovados e um ignorado.
- 44 testes novos: adaptador DataForSEO (17), motor/persistência/políticas (13), redação/qualidade (10), cofre local (4). Usam respostas controladas, sem consumir APIs pagas.
- Cobertura dirigida a preços, reserva, concorrência, idempotência, cache, null/zero, custos incertos, modelos/tokens, proposta separada, revisão pessoal, cadência/mudança de hora, destinos planeados, estado corrompido e proteção de credenciais.
- TypeScript da aplicação e do servidor, lint dos ficheiros envolvidos e build de produção verificados. Permanecem os avisos preexistentes de tamanho de alguns bundles.
- Servidor real: ficheiro privado estático 403; mesmo ficheiro via `@fs` 403; GET à API local 403; POST de origem externa 403; POST de estado com origem local 200. Só foram registados os códigos HTTP.
- Percurso no navegador: pesquisa sintética, confirmação, seleção de keywords, duas pautas de exemplo, bloqueio de geração real a partir de exemplo, revisão pessoal e destino planeado, custos zero e resultados persistentes após recarregar.
- Revisão visual em 1440×1000 e 390×844: pesquisa, resultados, plano, automação e custos. A tabela móvel usa scroll horizontal; seleção e ações foram verificadas. Revisão final independente: sem correções materiais pendentes para esta extensão local.
- Sem publicação, push, PR ou prompt de instalação no Lovable; sem alterações ao acervo de 40 documentos da ronda anterior.

Estas verificações não são uma certificação de ausência de bugs ou de aptidão para produção. Falta exercer a integração real e avaliar o resultado editorial.

## Pendências e próxima ronda proposta

1. **Credenciais e piloto real controlado.** Verificar User Data gratuitamente, depois testar cada endpoint e a redação com um orçamento escolhido no Hub. Comparar custos estimados/devolvidos e respostas vazias/erros reais.
2. **Qualidade de 20 artigos.** Rever cinco por site prioritário: utilidade, PT-PT, contributo, fontes, exatidão e conversão apropriada. Só depois autorizar cadência de produção relevante.
3. **Publicação WordPress.** Implementar e testar ligações por site, autor/categorias, imagens/alt, campos dos plugins SEO, rascunho remoto, idempotência, reconciliação e leitura de confirmação. Manter aprovação pessoal obrigatória.
4. **Execução contínua e instalação posterior.** Migrar contratos e serviços para backend autenticado, base de dados com permissões, cofre e scheduler persistente. A migração precisa de transportar/reconciliar os dados locais; não basta copiar páginas React para o Lovable.
5. **Reserva que se reabastece.** Ligar Curadoria e Documentos como origens explícitas, descobrir oportunidades e propor fontes/trechos para aprovação. Hoje a automação trabalha apenas pautas que já foram preparadas e autorizadas.
6. **Arquivo e resultados.** Importar artigos existentes para decidir criar/atualizar/consolidar, detetar sobreposição, aprofundar agrupamentos e ligar Search Console. Ainda não há desempenho orgânico real nem promessa de posicionamento.
7. **Conhecimento editorial e histórico.** Acrescentar exemplos aprovados por marca, catálogo factual de ofertas, revisão por seleção, histórico completo de versões e melhor comparação entre correções humanas/propostas.
8. **Operação financeira.** Atualizar preços/câmbio de forma controlada, conciliar faturação externa e custos históricos, alertas de orçamento e eventual resumo mensal. O histórico atual é local e limitado a este motor.

A prioridade recomendada é validar credenciais e um pequeno lote real com revisão humana, ajustar o motor com esse resultado e só depois montar a publicação WordPress e a execução contínua. O desenvolvimento mantém-se local até Frederico pedir a integração.
