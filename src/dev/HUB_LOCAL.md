# Pré-visualização local da plataforma

`npm run dev:hub` abre a aplicação em `http://127.0.0.1:5183/`.
É a árvore real de rotas de `App.tsx`, com a navegação e os componentes de produção. A faixa «Demonstração local» identifica os dados fictícios em todas as páginas.

Percurso representativo: Painel → Curadoria → Rascunhos → Calendário → Artigos → Projetos. Custos apresenta um registo explicitamente fictício. Artigos, rascunhos sociais e a escolha de projeto podem ser alterados na demonstração; esses dados ficam na chave `hub:demo:plataforma:v1` do armazenamento deste navegador. Remover essa chave repõe os exemplos iniciais.

O modo só funciona no servidor de desenvolvimento. `vite build --mode hub` é recusado. A compilação normal de produção não inclui os aliases nem esta entrada. Não é preciso configurar credenciais ou copiar dados do Cloud para fazer a revisão.

O transporte local não importa o cliente Supabase real. Só disponibiliza leituras com fixtures conhecidas e as alterações locais referidas. Tabelas sem fixture, RPCs não contempladas, recolha/processamento de notícias, IA, armazenamento remoto, envios e publicação devolvem um erro explícito `LOCAL_ONLY`. Uma política `connect-src` aplicada pelo servidor apenas neste modo também bloqueia ligações externas de código que faça `fetch` diretamente. A autenticação é uma conta sintética; não é uma sessão de produção.

Limites desta pré-visualização: não comprova o comportamento de RLS, filas/cron, E-goi, WordPress, Instagram, quotas ou custos reais. A newsletter pode abrir a sua estrutura, mas as operações de servidor que não tenham uma fixture exibem o erro local. Os editores gráficos isolados continuam a ter os seus modos anteriores (`offline` e `divulgacao`).

Verificação: `npm run test -- src/test/hub-local.test.ts` cobre leitura sem rede, persistência separada, recusa de operações externas e isolamento do modo face à compilação de produção.

## Pesquisa SEO e produção editorial · 18/10/2026

As rotas locais `/artigos/pesquisa`, `/artigos/plano`, `/artigos/automacao` e `/artigos/custos` usam o adaptador Node em `scripts/seo/`, sem ligação ao Supabase ou ao WordPress. A interface começa com serviços pagos e ciclos pausados. Exemplos sintéticos funcionam sem credenciais; Sandbox e dados reais são identificados separadamente. O modo real exige orçamento e autorização, ou uma política automática previamente autorizada dentro de limites. O transporte do navegador continua limitado à mesma origem.

O formulário de credenciais guarda apenas no servidor em `.seo-local/credenciais.json` (0600), nunca devolve os valores à página e não escreve no Git. A alternativa é `.env.seo.local`, com nomes sem prefixo VITE_. O endpoint User Data verifica a ligação DataForSEO sem custo. Nenhuma geração DeepSeek, pesquisa paga ou publicação é ativada por abrir uma página.

O worker verifica as políticas a cada minuto enquanto o servidor local estiver ligado, mesmo com o navegador fechado. Novos pedidos são reservados em disco antes do envio. Interrupções não provocam repetição paga automática. A publicação externa permanece desligada, incluindo quando uma política futura de publicação automática está configurada. Estes testes locais não substituem a migração para backend autenticado, RLS, cron, WordPress e revisão editorial do piloto.

A sequência de artigos passa por Brief, Fontes, Estrutura e Texto e revisão. Existe conhecimento e inventário por marca em Automação → Conhecimento. A estrutura pode ser preparada manualmente sem custo ou por uma chamada DeepSeek própria; a redação exige uma estrutura confirmada e atual. A nova sequência automática completa precisa de autorização explícita na política e não amplia políticas anteriores. Ver limites e estado de validação em `docs/sequencia-byword-local-2026-10-18.md`: os testes funcionais passaram; a revisão visual desta extensão ainda está pendente.
