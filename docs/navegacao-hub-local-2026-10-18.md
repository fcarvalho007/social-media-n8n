# Navegação do Hub: revisão local de 18 de outubro de 2026

Os documentos são matéria-prima editorial. Por isso, o PDF Tracker passou para **Curadoria → Documentos e relatórios**, ao lado das notícias e dos emails. A biblioteca de imagens continua separada, com o nome **Imagens e ficheiros**.

## Organização aplicada

| Grupo | Acessos |
|---|---|
| Início | Retomar o trabalho e escolher o projeto |
| Recolher conteúdo | Curadoria, com Documentos e relatórios como filho visível |
| Criar conteúdo | Newsletter, com Divulgação da newsletter como filho; Artigos; Conteúdos visuais; Roteiros de Reels |
| Rever e publicar nas redes | Rascunhos, Para aprovar, Calendário, Histórico de publicações |
| Organizar | Projetos, Imagens e ficheiros |
| Resultados e custos | Resultados, Sugestões, Comparar contas, Custos |
| Definições e conta | Ligações, preferências de IA, quotas, notificações, segurança e utilizadores |

Os filhos ficam visíveis, sem um novo acordeão. Os grupos inferiores continuam acessíveis pelo scroll do menu; a conta mantém-se no rodapé. O botão de criação explicita «Criar publicação social», para não sugerir que inicia também uma newsletter ou um artigo.

«Analytics», «Insights», «Benchmark», «Biblioteca» e «PDF Tracker» continuam a servir como termos de pesquisa. O menu apresenta nomes correntes em português.

## Caminhos e contexto

- Um único destino fica selecionado no menu, mesmo em páginas filhas.
- O breadcrumb de Documentos é Início → Curadoria → Documentos e relatórios; acrescenta o leitor ou a secção quando necessário.
- No telemóvel, ficam visíveis a página atual e o pai, com ligação de regresso. No computador, aparece a hierarquia completa.
- O regresso do leitor conserva projeto, pesquisa, categoria, página e vista, sem reabrir o documento.
- O endereço antigo `/documentos` redireciona para `/curadoria/documentos`, conservando query string, fragmento e estado da navegação. O armazenamento dos PDFs e as suas chaves não foram alterados.
- Notícias, Emails e Fontes de notícias são ligações com endereço próprio. A abertura direta e o botão de voltar do navegador passam a refletir a secção escolhida.
- A divulgação da newsletter tem Newsletter como pai também no breadcrumb.
- Preparar/rever um artigo e Conhecimento da marca mostram contexto próprio no cabeçalho.

## Espaçamento e hierarquia

O MainLayout controla margens externas de 16 px em ecrãs pequenos, 24 px em ecrãs médios e 32 px em ecrãs largos. A classe partilhada `hub-page` usa 24 px entre grupos. Foram retiradas margens internas duplicadas nas áreas revistas: Início, Curadoria, Documentos, Artigos e páginas do motor SEO, Conteúdos visuais, Projetos, Resultados, Sugestões, Comparar contas e Custos.

Artigos passou a ter título e contexto antes da navegação local, como Curadoria e Documentos. Menu, breadcrumb, navegação da curadoria e controlos de conta revistos têm alvos de pelo menos 44 px. Os nomes longos no menu podem quebrar linha.

O tema claro, a tipografia, as cores e os editores existentes foram preservados. Não houve alteração de envios, autorizações, credenciais, aprovação editorial ou pedidos pagos.

## Verificação

- Suite completa: **906 testes aprovados e 1 teste previamente ignorado**, em 147 ficheiros aprovados e 1 ignorado. Foram acrescentados 11 casos para destinos filhos, breadcrumb, conservação de filtros/estado, histórico e pesquisa pelos nomes anteriores.
- Depois do último ajuste do cabeçalho: 25 testes focados aprovados, incluindo navegação e editor SEO.
- TypeScript aprovado. Lint dos ficheiros revistos: zero erros, seis avisos legados de dependências de hooks/Fast Refresh.
- Build de produção aprovado; mantém o aviso de alguns bundles acima de 500 kB.
- Detector visual executado uma vez nos oito alvos principais: nenhuma ocorrência.
- Navegação real verificada no navegador integrado. Capturas finais em 1440×1000, 390×844, 909×858 e 1280×720. Verificados abertura/fecho do menu, seleção do destino, separadores e regresso pelo breadcrumb. Margens medidas: 16/24/32 px; sem overflow horizontal dos ecrãs medidos.
- Capturas: `.impeccable/review/navegacao-18/`. O projeto de demonstração pode mostrar biblioteca vazia; não foram apagados nem importados documentos nesta ronda.

## Limites e seguimento

Esta ronda reorganizou a navegação global e os espaços das áreas indicadas. Não equivale a testar todos os modais, todos os estados de dados e todos os percursos de cada módulo da plataforma. A conclusão de usabilidade deve continuar a ser validada pelo proprietário e, idealmente, por alguém que use o Hub pela primeira vez.

Uma ronda própria poderá uniformizar os pormenores internos das áreas legadas de calendário, aprovação, histórico e biblioteca de imagens, além de tratar os avisos de performance e hooks. O conteúdo visual de newsletters e o canvas dos compositores mantêm os seus sistemas próprios.

As limitações de sincronização dos PDFs e das APIs pagas descritas nos relatórios anteriores mantêm-se. Esta alteração não ativa automação de publicação nem faz pedidos externos pagos.

## Entrega

Branch local: `codex/hub-navegacao-simples-local`. Sem push, PR, instalação, prompts ou publicação no Lovable. Pré-visualização: http://127.0.0.1:5183/curadoria/documentos.

Revisão independente: interface sem achados materiais nas dez capturas verificadas. O revisor pediu apenas a atualização do parágrafo do mapa de navegação em DESIGN.md; o documenter corrigiu-o, preservando os tokens, e o mesmo revisor pontuou a correção como resolvida, com disposição final `ship`. Esta aprovação cobre as superfícies e a correção verificadas, sem declarar toda a plataforma livre de defeitos. A ausência prévia de `.impeccable/design.json` ficou registada, sem reparação de deriva fora do âmbito.
