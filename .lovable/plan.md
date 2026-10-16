# Envio da 319 bloqueado pelos Briefs + newsletter mais rápida

## 1. O que bloqueia o envio (diagnóstico confirmado)

A verificação «pronta a enviar» conta Briefs para **todas** as notícias do email, ou seja, Destaques mais Radar:

- Edição 319: 3 Destaques com Brief aprovado ou publicado (3/3).
- 9 notícias de Radar sem Brief (0/9), porque o Radar vai diretamente à fonte, como ficou decidido.
- Resultado: «Faltam Briefs prontos: 3/12», classificado como ponto obrigatório. Por isso aparece a mensagem no modal e o botão de envio fica desligado.

Não falta nada editorial: a regra está desalinhada com a decisão «Radar direto à fonte».

**Correção:**
- Briefs, Leituras, Factualidade e Fontes passam a avaliar só os Destaques.
- O Radar deixa de exigir Quick Brief. Continua a ser verificado no resto: ligações, domínios bloqueados e edição web.
- A mensagem do modal passa a dizer qual é o ponto em falta, em vez do texto genérico.
- Testes:
  - 3 Destaques prontos e Radar sem Briefs: a edição pode ser enviada.
  - Um Destaque sem Brief aprovado: continua bloqueada.

Não envia nada, não toca na 319, na campanha 970 nem no histórico.

## 2. Otimizações de velocidade (sem risco funcional)

Por ordem de ganho e segurança:

1. **Carregar cada ecrã da newsletter só quando é aberto.** Hoje, entrar em /newsletter carrega de uma vez o código de todas as páginas: Arquivo, Briefs, Custos, Definições, Emails, Ferramentas, pré-visualizações e migração. Passam a carregar à vez, com o indicador de carregamento já existente.
2. **Menos pedidos repetidos ao servidor.** A aplicação volta a pedir os dados sempre que a janela recupera o foco e considera-os logo desatualizados. Os registos mostram rajadas de 6 a 8 arranques seguidos da função da newsletter. Proposta:
   - dados da newsletter considerados atuais durante 30 s;
   - sem novo pedido só por mudar de separador;
   - invalidação explícita, que já existe, após guardar.
   - Fica de fora o que tem de ser ao vivo: estado do envio, fila «a interpretar» e confirmação E-goi.
3. **Menos passos por pedido no servidor.** Cada chamada confirma a sessão e depois pergunta à base de dados se a pessoa é da equipa (e, às vezes, se é administradora). A proposta é juntar estas verificações numa só consulta, mantendo as mesmas regras de acesso, e guardar o resultado em memória durante o pedido.
4. **Pré-visualização do email em segundo plano.** O render só é pedido quando o separador Email ou Web é aberto e é reutilizado enquanto a composição não muda.
5. **Medição antes e depois:**
   - tamanho do primeiro carregamento de /newsletter;
   - número de pedidos ao abrir Compor;
   - tempo até o editor ficar utilizável.

   Os números entram no relatório final.

**Fora deste plano, para não comprometer nada:** reescrever o editor, alterar regras de acesso ou estrutura de dados, mexer no motor de envio ou no render do email.

## Detalhes técnicos

- Regra dos Briefs: em `prontidao.server.ts`, `total` deixa de ser `nDestaques + nRadar` e passa a `nDestaques`. A `validarBriefsDaEdicao` também é filtrada por `papel = destaque` nas listas de prontos, incompletos, factualidade e fontes. A alteração é feita na fonte `.txt`, seguida de `port-newsletter.py`, `verificar-grafo-edge.py` e redeploy de nl-api e nl-newsletter. Os testes ficam em `prontidao.test` e `integracao-briefs-3b`.
- Divisão do código: `NewsletterApp.tsx` (gerado) passa a usar `React.lazy` por rota, o que obriga a ajustar a regra do gerador que o produz.
- React Query:
  - `defaultOptions` na `QueryClient` de `App.tsx`: `staleTime 30s`, `refetchOnWindowFocus false`;
  - as consultas que precisam de ser ao vivo mantêm o `refetchInterval` atual.
- nl-api: substituir `getUser` + `nl_is_staff` + `nl_is_admin` por `nl_me_papel()` (função que já existe), mantendo a recusa por omissão e o mapa `NL_OPS`.
- Ficheiros de tipos gerados, por levar à cópia local: os que o gerador atualizou na correção anterior.
