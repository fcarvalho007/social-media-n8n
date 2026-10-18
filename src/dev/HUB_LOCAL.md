# Pré-visualização local da plataforma

`npm run dev:hub` abre a aplicação em `http://127.0.0.1:5183/`.
É a árvore real de rotas de `App.tsx`, com a navegação e os componentes de produção. A faixa «Demonstração local» identifica os dados fictícios em todas as páginas.

Percurso representativo: Painel → Curadoria → Rascunhos → Calendário → Artigos → Projetos. Custos apresenta um registo explicitamente fictício. Artigos, rascunhos sociais e a escolha de projeto podem ser alterados na demonstração; esses dados ficam na chave `hub:demo:plataforma:v1` do armazenamento deste navegador. Remover essa chave repõe os exemplos iniciais.

O modo só funciona no servidor de desenvolvimento. `vite build --mode hub` é recusado. A compilação normal de produção não inclui os aliases nem esta entrada. Não é preciso configurar credenciais ou copiar dados do Cloud para fazer a revisão.

O transporte local não importa o cliente Supabase real. Só disponibiliza leituras com fixtures conhecidas e as alterações locais referidas. Tabelas sem fixture, RPCs não contempladas, recolha/processamento de notícias, IA, armazenamento remoto, envios e publicação devolvem um erro explícito `LOCAL_ONLY`. Uma política `connect-src` aplicada pelo servidor apenas neste modo também bloqueia ligações externas de código que faça `fetch` diretamente. A autenticação é uma conta sintética; não é uma sessão de produção.

Limites desta pré-visualização: não comprova o comportamento de RLS, filas/cron, E-goi, WordPress, Instagram, quotas ou custos reais. A newsletter pode abrir a sua estrutura, mas as operações de servidor que não tenham uma fixture exibem o erro local. Os editores gráficos isolados continuam a ter os seus modos anteriores (`offline` e `divulgacao`).

Verificação: `npm run test -- src/test/hub-local.test.ts` cobre leitura sem rede, persistência separada, recusa de operações externas e isolamento do modo face à compilação de produção.
