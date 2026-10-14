# Carrossel Instagram proposto após envio real da newsletter

## O que já existe (inspecionado)
- A ligação da newsletter ao carrossel já existe no backend, mas não aparece em lado nenhum da aplicação. Depois de um envio real confirmado pela E-goi («sent»), o fecho da edição e a reconciliação criam um trabalho de carrossel da crónica. A fonte é a fotografia bloqueada que foi efetivamente enviada.
- Não há duplicados: a base de dados só aceita um trabalho por edição + tipo + versão do conteúdo, e as gravações não se sobrepõem. Envios de teste nunca criam trabalho.
- Hoje o trabalho gera apenas a partir da crónica: diapositivos + legenda (DeepSeek), com revisão em «Estúdio → Redes sociais» (`/estudio/redes-sociais/:id`). «Enviar para rascunho» cria só um rascunho Instagram, nunca publica nem agenda.
- Faltas:
  1. nenhuma proposta na edição/ecrã de envio («Criar carrossel / Abrir rascunho / Mais tarde»);
  2. o conteúdo ignora os 3 destaques/Briefs, a leitura aprovada, as fontes e o CTA dos cursos;
  3. não existe forma de experimentar com a 319 antes do envio.

## Decisão de motor
Reutilizo este motor da newsletter (`nl_conteudos_*`) e o seu editor, que já usa os templates e a identidade dos carrosséis do Estúdio. Não ligo ao motor genérico de documentos gráficos (`mc_*`), para não duplicar motores. Se preferires que o rascunho abra no editor de Carrosséis do Estúdio, diz-me antes de aprovar.

## O que vou construir
1. **Proposta persistente na edição**
   - Na etapa Publicar e no Arquivo de cada edição: um cartão «Carrossel para Instagram» com estados claros.
     - «A aguardar confirmação da E-goi»: só aparece se houver envio real em curso.
     - «Pronto para criar»: botão **Criar carrossel**.
     - «Rascunho pronto»: botão **Abrir rascunho**.
     - Em erro: mensagem e «Tentar de novo».
   - Também há a opção **Mais tarde**, guardada no backend por edição. A proposta volta discretamente a aparecer no Arquivo, sem insistir.
   - O cartão aparece quando a confirmação chega durante a sessão (atualização periódica enquanto há envio real por confirmar) e ao voltar à edição.
   - Só envio real confirmado ativa a proposta: testes, aceites, agendamentos, falhas e rejeições não contam.
2. **Conteúdo fiel ao que foi enviado**
   - O gerador passa a receber da fotografia enviada:
     - a crónica;
     - os 3 destaques (títulos, síntese, leitura aprovada literal, fonte e publisher, ligação ao Brief);
     - o número da edição;
     - o CTA do curso (`fredericocarvalho.pt/curso-de-inteligencia-artificial/`).
   - A leitura aprovada não é reescrita. A legenda atribui as fontes e aponta para a edição/curso.
   - **Criar carrossel** gera um custo IA (DeepSeek) e pede confirmação antes. Nada gera sozinho sem esse clique.
3. **Rascunho de teste da 319 (pré-envio)**
   - Botão explícito «Criar rascunho de teste (pré-envio)» na etapa Publicar, visível só a staff, com confirmação de custo.
   - Usa a composição atual (com os 3 Briefs) e fica marcado «Teste · pré-envio».
   - Fica num tipo próprio, separado do carrossel real, por isso nunca bloqueia nem colide com a futura versão enviada. Não chama o percurso real nem altera estado ou data de envio.
   - Vou deixar o botão disponível; não o executo sem a tua autorização, por causa do custo.
4. **Revisão humana**: o rascunho abre no editor existente. O envio para rascunho Instagram continua manual; nada é publicado nem agendado.

## Testes
- Unitários com dados de exemplo isolados:
  - só «sent» em lista real ativa a proposta; teste/aceite/falha/rejeição/agendado não;
  - reconciliação repetida, atualizações e cliques duplos criam um só trabalho;
  - a fonte vem da fotografia enviada, não da composição atual;
  - os 3 destaques e a leitura são passados literalmente;
  - o teste 319 tem tipo distinto e não ativa o percurso real;
  - «Mais tarde» persiste.
- Verificação na aplicação: cartão da 319 em modo «só teste interno» (sem proposta real) e botão de teste visível. Desktop e 375px.
- Compilação, verificação das funções, testes existentes e verificação de segurança.

## Detalhes técnicos
- Migração:
  - coluna `adiado_em`/`adiado_por` em `nl_conteudos_derivados` (escrita só via função do backend);
  - novo tipo `carrossel_edicao_teste` permitido no CHECK, se existir.
- Origem `teste_explicito` em `jobs.server`: lê `composeRevistaEdition(ignorarSnapshot)` e usa um hash com o prefixo `teste:`. O tipo é distinto, e as regras de AGENTS mantêm-se: o real só avança com «sent».
- Ações novas em `nl-conteudos`: `estado_edicao`, `adiar`, `preparar_teste`, todas staff-only.
- Edições só nas fontes inertes da newsletter + gerador; executar `verificar-grafo-edge.py`; publicar `nl-conteudos`, `nl-worker-conteudos`, `nl-api`, `nl-newsletter`.

## Limites
- A verificação real ponta a ponta do gatilho só acontece no próximo envio real; até lá fica provada com dados de exemplo.
- Sem emails, campanhas, publicação/agendamento Instagram, nem alteração de listas, credenciais ou permissões.
