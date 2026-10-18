# Revisão de UX/UI da biblioteca de documentos — 18/10/2026

Branch local: `codex/hub-biblioteca-pdfs-local-2026-10-18`. Sem push, deploy, publicação no Lovable, novas dependências ou chamadas a fornecedores pagos. Pré-visualização em `http://127.0.0.1:5183/documentos`.

Esta ronda melhora a utilização do PDF Tracker já integrado no Hub. Conserva o acervo real de **40 documentos**, os ficheiros, capas, resumos importados, títulos editados e estados de leitura. A importação e os testes de recolha anteriores estão documentados em [Importação do PDF Tracker](importacao-pdftracker-acervo-2026-10-18.md) e [Revisão das fontes](revisao-fontes-pdfs-capas-2026-10-18.md).

## Percurso final

1. **Acervo:** grelha com capas inteiras ou lista, pesquisa no conteúdo, categoria, estado de leitura e ordenação. A paginação apresenta até 18 documentos de cada vez. Pesquisa, filtros, vista, ordem, página e documento aberto ficam no endereço para permitir regressar aos resultados.
2. **Leitor:** abre numa área própria, com original PDF, estado de leitura e separadores Páginas, Resumo e Detalhes. O regresso repõe o foco no cartão ou na pesquisa quando o cartão saiu dos resultados. Arquivar conserva o leitor aberto e permite voltar aos ativos.
3. **Seleção editorial:** nenhuma página é selecionada automaticamente. É possível indicar intervalos (`1–3, 7`), selecionar o início dentro do limite, selecionar todas ou limpar. Páginas sem texto ficam identificadas; os controlos para Artigos e compositor só ficam disponíveis com texto suficiente dentro dos 20 000 caracteres. A transferência conserva origem, hash e referências às páginas.
4. **Fontes e rastreio:** seleção explícita, pesquisa, categorias, diagnóstico e 12 fontes por página. Selecionar resultados de outra pesquisa acrescenta fontes sem apagar a escolha anterior. Os resultados e a conferência de tarefas continuam disponíveis, sem apresentar candidatos como PDFs já guardados.
5. **Adicionar por URL e Histórico:** formulários com rótulos, estados de consulta e erros legíveis. Histórico pesquisável, filtrável e paginado a 20 entradas; abertura do documento correspondente quando está neste navegador.

## Design system e acessibilidade

- Reutilizados os componentes partilhados do Hub: Button, Label, Select, Tabs, Alert, Collapsible e restantes tokens. Mantido o tema claro, tipografia, espaçamento e identidade indigo existentes.
- Controlos principais e alvos de interação de 44 px; ícones decorativos ocultos da leitura assistida, nomes acessíveis para controlos de ícone e foco visível. Os separadores e os painéis usam o mesmo contexto e identificadores ARIA correspondentes.
- No telemóvel, a pesquisa permanece acessível e os filtros secundários recolhem num painel com indicação dos ajustes ativos. Os cartões, formulários e leitor adaptam-se à largura disponível.
- As capas reservam dimensões, usam o documento completo e têm alternativa explícita quando indisponíveis. Os URL de objetos são libertados ao mudar de documento/desmontar o componente.
- O botão principal partilhado tinha texto branco sobre `rgb(100, 103, 242)`, cerca de **4,41:1**. A luminosidade do token claro passou de 67% para 66%: o navegador confirmou `rgb(95, 98, 241)`, **4,66:1**. O hover usa o token semântico existente em vez de clarear o fundo com opacidade. A decisão está registada no `DESIGN.md`; não é uma declaração de conformidade WCAG integral da aplicação.

A revisão seguiu as [Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md) e o fluxo Impeccable, com inspeção inicial e uma confirmação das correções em desktop e viewport de 390 px. Não foi uma auditoria de todos os módulos do Hub.

## Bugs e dificuldades corrigidos

| Problema | Resultado |
| --- | --- |
| O leitor aparecia depois de uma biblioteca extensa. | Abertura dedicada, regresso aos resultados e foco recuperável. |
| A barra fixa do leitor tapava conteúdo em ecrã pequeno. | Painel estático junto à seleção e acesso no fim da lista, sem sobreposição. |
| A seleção de outra categoria de fontes substituía escolhas anteriores. | União das seleções, conservando a escolha até limpeza explícita. |
| Arquivar podia retirar o documento do filtro e fechar o percurso. | O documento aberto é independente dos filtros da grelha. |
| Mudança de projeto podia conservar o documento e os filtros anteriores. | O âmbito de dados e o estado de navegação são limpos na mudança. |
| Uma falha de leitura podia parecer um acervo vazio. | Erro distinguido do estado vazio, com recuperação explícita. |
| Erros HTML do servidor chegavam como falhas técnicas de JSON. | Mensagem legível; tratamento de rede e limite de espera no pedido local. |
| Listas extensas de documentos, fontes e páginas dificultavam a navegação. | Paginação própria e pesquisa normalizada; índice de texto e atualização diferida na pesquisa do acervo. |
| Importações em lote abriam o leitor e repetiam notificações por ficheiro. | Importação permanece no percurso de recolha; o upload manual continua a abrir o documento. |
| Formulário de título podia perder o valor após falha. | Só termina após gravação com sucesso; cancelamento explícito e aviso ao sair pelo botão do leitor ou fechar/recarregar a página. Não há bloqueio universal de toda a navegação SPA. |
| Migração concluída ocupava o início da biblioteca. | Conferência compacta no fim do acervo, expansível e com erros preservados. |

O acervo e a área de fontes permanecem montados na mudança de separador, evitando interromper o processamento dentro do módulo. O servidor local tem de continuar ligado para recolher; PDF.js e capas ainda exigem o navegador aberto. Não há alegação de processamento contínuo em segundo plano de produção.

## Verificação

- **829 testes aprovados**, um teste preexistente ignorado; 140 ficheiros de testes aprovados e um ignorado. Inclui **17 novos testes** de navegação, seleção, limites, falhas recuperáveis, âmbito do projeto e semântica dos separadores. A verificação dirigida de interface e persistência aprovou 27 testes.
- TypeScript da aplicação e do tooling aprovado; build aprovado. Lint dos ficheiros alterados sem erros, com o aviso existente de Fast Refresh na exportação de variantes de `button.tsx`. O build conserva avisos de chunks grandes; não foram escondidos.
- Navegador: 40 documentos presentes, capas reais e regresso com foco/pesquisa preservados. Escolha World Bank + FFMS em pesquisas diferentes confirmou duas fontes selecionadas; a seleção de teste foi depois limpa, sem executar uma recolha.
- PDF Dell: 6 páginas, 5 com texto; intervalo `1–3` confirmou 3 páginas e 3 171 caracteres, habilitando os dois destinos.
- PDF **Raising Revenue Right**: 412 páginas, 394 com texto; apenas 10 páginas listadas por vez, zero selecionadas à abertura. Intervalo `5–8` confirmou 4 páginas e 5 786 caracteres, habilitando Artigos e compositor. Nenhum artigo foi criado ou publicado neste teste.
- Revisão a 390 px sem transbordamento horizontal (`scrollWidth = innerWidth = 390`). O leitor móvel foi confirmado após corrigir a sobreposição da barra de ações. A viewport foi reposta e a biblioteca ficou aberta sem pesquisa ou filtros de teste.

Provas locais, fora do Git: `.impeccable/review/18-out/documentos-ux-desktop.png`, `documentos-ux-mobile.png`, `documentos-leitor-desktop.png`, `documentos-leitor-mobile.png` e `documentos-fontes-mobile.png`. Os relatórios e código ficam no Git; acervo, manifestos e imagens de prova permanecem locais.

## O que não fica concluído nesta ronda

- Instalação na base de dados e Storage privados do Hub Cloud, RLS, backup externo e workers contínuos. A biblioteca continua local, dependente deste computador/navegador.
- OCR para PDFs de imagem. O estado «sem texto pesquisável» é verdadeiro; a interface não transforma imagem em texto fictício.
- Superar limitações externas das fontes. Mantém-se o diagnóstico anterior: 61 consultadas sem erro, 19 com limitações, 10 não acessíveis e 9 a requerer atenção. Nenhuma nova consulta às 99 fontes foi feita nesta ronda de UX.
- Recuperar o binário antigo do ID 78, cujo URL temporário do LinkedIn devolveu 403. Os metadados/capa permanecem preservados.
- Teste em dispositivos físicos, Safari e leitores de ecrã reais. Foi verificada a estrutura semântica e a largura móvel no navegador disponível, não toda a matriz de acessibilidade/dispositivos.

Nada foi enviado para listas, redes sociais ou WordPress. A publicação no Lovable fica para uma decisão posterior do proprietário.
