# Envio da 319 aos Formandos, passagem à 320 e novo modal de envio

## 1. Terminar a 319 e abrir a 320
- Antes de enviar: leitura só de consulta para confirmar o estado atual — Newsletter & Lead Magnet confirmada pela E-goi; Formandos com a campanha em rascunho.
- Envio aos Formandos (3508) feito uma única vez, pelo mecanismo existente «Repetir lista» (usa a campanha já criada; não cria uma segunda nem reenvia à lista já entregue).
- Aguardar o «sent» da E-goi; só então a edição 319 fecha pelo processo normal (sem forjar datas nem estados).
- Regra permanente: quando todas as listas reais de uma edição estão confirmadas, a edição fecha e o editor abre automaticamente a seguinte (cria a 320 vazia com as secções padrão, se ainda não existir). Nunca abre a seguinte com listas por confirmar.
- A 319 fica no Arquivo; o carrossel pós-envio continua a ser proposto como já acontece.

## 2. Novo modal de envio
Problemas atuais (captura): cabeçalho e lista ocupam o ecrã todo, botão principal fica sem destaque, checklist em cartões grandes obriga a deslizar, cores lilás fora da identidade.

Nova organização, tudo visível sem deslizar num ecrã de portátil:
- Cabeçalho compacto: «Enviar a edição #319» + modo (Teste / Real) como interruptor claro; o modo Real fica em tom de alerta.
- Resumo de prontidão numa linha («4 de 5 pontos prontos») com a lista em linhas compactas (ícone, título, estado); detalhes só ao abrir cada linha.
- Listas de destino como chips selecionáveis com nº de contactos e estado por lista (por enviar, aceite, confirmada, falhou) e «Repetir lista» junto à que falhou.
- Rodapé fixo: ação principal («Enviar teste» / «Enviar a 2 listas · 6435 contactos»), «Agendar» como opção secundária recolhida.
- Depois da ordem: progresso por lista e a nota «Podes fechar esta página».
- Cores e tipos pelos tokens do projeto (fundo claro, acento verde do Estúdio, vermelho só para real/erro), contraste acessível; validado em portátil e telemóvel 375px.

## Detalhes técnicos
- Editar só fontes inertes (`EnvioNewsletter.tsx.txt`, `envio.server.ts.txt`, `envio.functions.ts.txt`) e regenerar com `port-newsletter.py`; grafo das funções verificado; redeploy das 5 funções nl-*.
- Abertura da edição seguinte: em `finalizarEnvio`, após reconciliação com todas as listas reais «sent», criar a próxima via `nl_criar_seccoes_padrao` de forma idempotente (número = último + 1).
- Testes: não abre a seguinte com lista por confirmar; segunda chamada não cria duplicado; lista já enviada não é repetida.

## Confirmação necessária
Este plano inclui um envio real de email (Formandos, 3508 contactos). Aprovar o plano autoriza esse único envio.
