# Navegação e próximos módulos — revisão local

## Âmbito e decisão de publicação

O proprietário esclareceu que pretende pré-visualizar, experimentar e refinar localmente antes de pedir uma publicação. A autorização dada para a versão anterior não autoriza esta ronda. Esta branch não foi enviada ao GitHub nem instalada/publicada no Lovable. Tema escuro fora do âmbito. Prioridades: navegação, consistência e recuperação de falhas.

Branch: `codex/hub-navegacao-local-2026-10-18`, a partir de `c384bc377c49fdc71a9b8502de7df5985a2a2f75`.

Pré-visualização: `npm run dev:hub`, em `http://127.0.0.1:5183/`. Usa as rotas e os componentes da aplicação com autenticação e dados fictícios, transporte isolado e bloqueio de chamadas externas. As alterações permitidas ficam apenas no navegador. Não comprova integrações reais ou permissões de produção.

## Implementado

- Menu lateral visível no computador, com recolha opcional; no telemóvel, painel com largura legível, fecho e gestão de foco.
- Agrupamento por tarefas: Conteúdo, Publicação, Organização e Análise. Conta e definições no rodapé. Todas as 24 áreas continuam acessíveis.
- «Criar publicação» substitui a abreviatura «Criar SM» no catálogo, na pesquisa e nas migalhas; mantém o mesmo destino e comportamento.
- Pesquisa identificada por texto no computador. Localização e ações permanecem no cabeçalho.
- Contexto de navegação também em criação manual, revisão e destinos alternativos. Menu recolhido inerte para teclado e acessibilidade; Ctrl/Cmd+B preservado dentro de campos e editores.
- Eliminado o segundo cabeçalho e o segundo layout de Utilizadores; a página usa a estrutura partilhada.
- Aprovação aguarda publicações e Stories, ignora respostas e callbacks de filtros antigos e distingue falha de lista vazia. Eliminação exige confirmação por ID, impede pedidos duplicados e não restaura cartões por respostas antigas. Título e região da página identificados.
- Faixa da demonstração mais curta; continua a identificar inequivocamente o ambiente local.

## Sistema de artigos para vários WordPress

### O que existe

`src/pages/Artigos.tsx` e `art_rascunhos` guardam título, resumo, corpo, projeto e estado editorial. Ainda não existe um catálogo genérico de sites, destinos por artigo, versões ou histórico de publicações remotas.

Há uma integração específica da crónica com FredericoCarvalho.pt em `supabase/functions/_shared/newsletter-engine/revista/frederico-wordpress.server.ts`: diagnóstico, categorias, pré-visualização, criação de rascunho, publicação explícita e confirmação por leitura. A construção/sanitização do payload está em `revista/artigo-cronica.ts`.

O backup DIGITALSPRINT LearnDash de `supabase/functions/_shared/newsletter-engine/wordpress.server.ts` tem credenciais e contrato próprios. Não deve ser convertido inadvertidamente no destino genérico de artigos.

### Sequência proposta

1. Validar visualmente esta navegação e os percursos principais.
2. Construir localmente Artigos com editor/pré-visualização, destinos por site, categoria, autor, imagem, resumo e estado. Simular falhas e recuperação com dados identificados como demonstração. Criar rascunho remoto e tornar público são ações distintas.
3. Implementar versões imutáveis, publicações por artigo/site, tentativas, reconciliação e proteção contra duplicados. Cada destino precisa de confirmação independente; uma resposta ambígua não conta como sucesso.
4. Depois da revisão: preparar migrações/RLS e segredos de servidor por site; testar capacidades reais e um rascunho controlado. Instalação e publicação pública exigem pedido posterior do proprietário.

### Riscos encontrados para tratar antes da generalização

- `revista/destinos.server.ts`: atualização do JSON de destinos sem controlo de versão nem verificação completa de erros; escritas concorrentes podem perder estado.
- `frederico-wordpress.server.ts`: recuperação por slug após timeout precisa de comprovar vínculo e conteúdo antes de adotar um artigo; falhas na consulta do ID remoto devem bloquear nova escrita.
- `wordpress.server.ts`: uma resposta externa bem-sucedida pode coexistir com falha ao guardar o ID; repetição precisa de reconciliação para não duplicar.
- `nl-ops.ts`: distinguir claramente os textos das ações de criar rascunho e publicar. O preview deve mostrar a ação efetiva, incluindo o estado `draft` forçado na criação.

Estes riscos foram identificados por leitura do código; não foram ensaiados nos sites reais nem corrigidos nesta ronda de navegação. O motor de newsletter é gerado: futuras alterações devem partir da origem inerte e do gerador, não dos ficheiros gerados.

## Limites da ronda

O módulo multi-WordPress ainda não foi implementado. Não houve alterações à base de dados, credenciais, permissões, funções Cloud ou conteúdo real. A interface pública mantém a versão já publicada anteriormente. A avaliação local não certifica ausência de todos os bugs da plataforma. Continuam por tratar dívida de lint, partes pesadas da compilação e ensaios reais das integrações.

Lovable nesta ronda: **0 prompts, 0 créditos, 0,00 €**. A publicação anterior foi uma ronda distinta, registada no relatório anterior.

## Verificação

- Suite completa: **732 testes aprovados, 1 ignorado existente**, 132 ficheiros aprovados e 1 ignorado. Depois dos ajustes finais de foco: 26 testes relevantes novamente aprovados.
- TypeScript aprovado. Compilação de produção aprovada; continuam avisos de blocos grandes já existentes. Sem alterações a funções Edge nesta ronda.
- ESLint dos componentes de navegação, catálogo e testes novos aprovado. Sidebar mantém o aviso existente de Fast Refresh; Pending e Utilizadores mantêm, respetivamente, 2 e 8 erros de `any` preexistentes. Não se declara lint integral limpo.
- Revisão no navegador a 1920px e 393 × 852: pesquisa com Enter, passagem para aprovação, menu móvel e ligação a Artigos, ausência de overflow horizontal, foco no destino atual e restituição ao botão após Escape. Menu de computador recolhido confirmado como inerte e oculto da acessibilidade. Utilizadores perdeu o segundo cabeçalho por inspeção do componente e da árvore de rotas.
- Arranque limpo após recarga sem novos erros de consola. Durante edição houve erro transitório de contexto por Fast Refresh, resolvido pela recarga completa; não voltou no arranque limpo.
- Detetor estático Impeccable nos componentes alterados: sem resultados. Não substitui revisão humana nem certifica toda a plataforma.
- Revisão independente confirmou os 24 destinos e identificou os problemas de foco/recolha corrigidos. Erros parciais e eliminações na aprovação cobertos por regressões automatizadas; sem forçar falhas nos serviços reais.

Capturas locais de referência, não destinadas ao repositório público: `.impeccable/review/18-out/navegacao-local/artigos-desktop-final.png` e `menu-mobile-final.png`.
