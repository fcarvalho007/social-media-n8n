# Diagnóstico da entrada (só leitura) e reforço mínimo opcional

## Estado real agora (16:16 UTC)
- Autenticação: responde (126 ms). Base de dados: responde (125 ms).
- Base de dados sem reinícios desde 06/05/2026; 22/60 ligações; 0 consultas bloqueadas; nenhuma consulta longa; memória 56 %, disco 11 %.
- Último arranque estável da autenticação: 16:14:53 UTC. Sem erros a partir daí.
- Função de entrada: nenhum pedido novo depois de 16:12:57.

## Causa concreta dos 500/504
Não é a base de dados, nem falta de recursos, nem configuração da app, nem o fornecedor de email.

O serviço de autenticação recebeu ordens sucessivas para recarregar a configuração e reiniciar:
- recargas às 16:05:32, 16:05:49, 16:11:37, 16:11:56;
- paragens completas às 16:06:41, 16:12:13 e 16:12:41;
- às 16:13:03 o arranque foi interrompido a meio por outra paragem ("lookup localhost: operation was canceled");
- arranque final completo às 16:14:53 (cada arranque demora cerca de 50 s).

Os erros "failed to connect ... dial tcp :5432: operation was canceled" e os 504 "context deadline exceeded" em /user, /token e /admin/generate_link são consequência disso: o pedido era cancelado porque o próprio serviço estava a parar, não porque a base de dados recusasse ligações (a base de dados nunca reiniciou).

A origem dessas ordens de recarga é exterior ao código do projeto e não se consegue identificar pelos registos disponíveis (não houve alterações de configuração nem implementações minhas neste período). Coincidem com publicações/atualizações da plataforma.

## Os teus três sintomas
1. **Entrada às 16:12 no endereço publicado** — caiu exatamente na janela 16:12:13–16:14:53, com a autenticação parada. A função arrancou às 16:12:57 e ficou à espera da emissão da sessão. Não tem limite de tempo próprio, por isso o botão ficou desativado até o navegador desistir.
2. **"Sessão inválida" no preview** — a mensagem vem de "Processar fila agora": a função confirma primeiro a sessão junto da autenticação, que estava em baixo (504/500 em /user às 16:10–16:11). Agravante: às 16:05 uma renovação de sessão foi gravada no servidor, mas a resposta não chegou ao navegador (504). O preview pode ter ficado com uma sessão já substituída, que continuará recusada.
3. **Arranques da função às 17:12:57 (hora local)** — "booted"/"shutdown" em pares são normais no runtime das funções (arranque a pedido e paragem por inatividade) e não indicam falha. Os reinícios relevantes são os da autenticação, acima.

## Ação mínima que resolve agora (sem alterar nada)
- Endereço publicado: entrar de novo, normalmente.
- Preview: carregar em "Sair" (ou abrir em janela privada) e entrar de novo; depois "Processar fila agora". O trabalho 318 está intacto e conclui sem chamar a IA.
- Se voltarem a aparecer reinícios em ciclo com o backend parado, o passo seguinte é pedir reinício do backend (exige a tua aprovação) — hoje não é necessário.

## Reforço opcional (só se aprovares este plano)
Não corrige a origem, mas evita minutos de espera e sessões presas:
1. Função de entrada: limite de 15 s em cada chamada à autenticação; ao expirar responde "Serviço indisponível. Tenta daqui a um minuto." (503, sem registar como falha do utilizador).
2. Página de entrada: limite de 20 s no pedido, botão volta a ficar ativo e mostra a mesma mensagem.
3. Quando uma função responde "Sessão inválida" e a renovação local também falha, terminar a sessão local e levar à página de entrada, em vez de repetir o erro.
4. Testes: limite expirado → 503 sem sessão emitida; página reativa o botão; sessão recusada → página de entrada.

Sem alterações a contas, papéis, credenciais, RLS, dados, domínio ou ao método de entrada (só email).

## Detalhes técnicos
- Ficheiros a tocar no reforço: supabase/functions/entrar-email/index.ts (AbortSignal.timeout nas chamadas generateLink/verifyOtp/rpc), supabase/functions/entrar-email/logica.ts (+ teste), src/contexts/AuthContext.tsx (timeout do invoke + tratamento de 401 → signOut local), src/pages/Auth.tsx.
- Deploy: apenas entrar-email.
