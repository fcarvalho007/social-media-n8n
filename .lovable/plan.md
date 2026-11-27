# Envio da #320 e regresso da página de Briefs

## O que aconteceu (verificado agora, só leitura)
- A ordem de envio da #320 foi aceite às 18:09: as duas listas reais estão em «aceite» no E-goi.
- «Newsletter & Lead Magnet» aparece no E-goi como **em pausa**; «Formandos» como **em fila**. Nenhuma está ainda como «enviada», por isso a edição continua em rascunho, com fecho pendente.
- O quadro «Vai enviar com pontos por resolver» não era um erro: era o aviso de que estes Destaques seguem sem Brief e ligam à notícia original.
- «Gerar Brief» recarrega a página inteira para a página de Briefs, que não tem forma de voltar à edição; daí só o botão de retroceder do browser funcionar.

## Alterações
1. **Estado do envio claro na janela e no editor**
   - Mostrar por lista o estado real do E-goi em linguagem simples: «Na fila», «Em pausa no E-goi», «A enviar», «Enviada», «Falhou».
   - «Em pausa» aparece em âmbar, com explicação («O E-goi pausou esta campanha; retome-a no E-goi ou volte a verificar») e botão «Voltar a verificar».
   - No editor, uma faixa persistente «Envio em curso: 0 de 2 listas enviadas» até a reconciliação fechar a edição, para não ficar dúvida depois de fechar a janela.
2. **Aviso de pontos por resolver menos alarmante**
   - Depois da ordem registada, o título passa a «Enviada com avisos: estes Destaques ligam à notícia original» (neutro, não vermelho), recolhido por defeito.
   - Antes do envio, mantém-se a explicação e o «Enviar mesmo assim…».
3. **Ir aos Briefs sem perder o caminho**
   - Navegação interna (sem recarregar) em vez de recarregar a página.
   - Na página de Briefs, ligação «← Voltar à edição #320» no topo, que regressa ao editor e reabre a janela de envio, se veio de lá.
   - Breadcrumb do topo passa a incluir «Newsletter › Briefs» com ligações funcionais.
4. **Investigar a pausa** (só leitura): ver nos registos do servidor porque a lista «Newsletter & Lead Magnet» ficou em pausa (por exemplo, envio faseado ou limite do E-goi) e reportar. Não retomo nem reenvio nada sem a sua ordem.

## Detalhes técnicos
- Fontes vendorizadas em `migration-reference/code/newsletter/...` (`partilhado/EnvioNewsletter.tsx.txt`, `routes/_authenticated/briefs.tsx.txt`, editor da edição), regenerar com `python3 scripts/port-newsletter.py` e correr `scripts/verificar-grafo-edge.py`.
- `window.location.assign` passa a `navigate()` do router, com `?voltar=edicao&abrirEnvio=1`.
- Mapeamento `estado_egoi` → rótulo numa função pura com teste (`paused`, `queued`, `sending`, `sent`, `failed`).
- Sem alterações à base de dados, sem deploy nem publicação; tudo fica no ramo local.
