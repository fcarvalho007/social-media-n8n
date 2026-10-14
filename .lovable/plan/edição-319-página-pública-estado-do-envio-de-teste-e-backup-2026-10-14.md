# Edição 319: página pública, estado do envio de teste e backup DigitalSprint.pt

## Diagnóstico (só leitura, já feito)

1. **Página /edicoes/319 indisponível**
   - A edição 319 continua em «rascunho» (o envio foi só para TESTE Interno, por isso não fecha a edição — correcto).
   - O destino «Site Digital Sprint» está marcado como «publica», que é o que o editor mostra.
   - O endereço público só aceita edições **enviadas** (regra actual). Uma edição com página publicada mas ainda não enviada recebe sempre «Esta edição não está disponível». Os dois lados usam critérios diferentes.

2. **«Email E-goi · Ainda não enviado»**
   - Existe uma campanha da edição 319 registada para a lista de teste, no estado «aceite» (o E-goi recebeu-a às 18:27).
   - Pela regra existente, só conta como entregue quando o E-goi confirma «sent». O painel não distingue envio de teste de envio real e só tem o estado «ainda não enviado».

3. **Backup DigitalSprint.pt falha**
   - O backup usa os mesmos três dados guardados que a crónica (endereço, utilizador, palavra-passe). Desde a correcção desses dados, apontam para **fredericocarvalho.pt**.
   - fredericocarvalho.pt não tem LearnDash; daí «nenhuma rota corresponde». Confirmei que digitalsprint.pt tem as rotas de lições LearnDash.
   - Na app antiga, o backup e a crónica tinham dados separados. A migração juntou-os. Não existem hoje dados guardados para digitalsprint.pt.

## O que vou fazer

1. **Página pública da edição**
   - Uma edição cujo destino web está «publica» abre por ligação directa, mesmo sem envio real, com `noindex`.
   - Continua fora do arquivo e dos «anterior/seguinte»: o arquivo mantém só edições enviadas.
   - Rascunhos sem página publicada continuam a dar «não disponível».

2. **Estado do envio de teste**
   - Consultar no E-goi (só leitura, sem custo, sem reenvio) o estado real da campanha da edição 319.
   - Painel passa a mostrar «Teste enviado · TESTE Interno · data/hora» (ou «Teste aceite pelo E-goi»), separado de «Envio real · ainda não enviado».
   - Nada muda na regra de fecho: só um envio real confirmado fecha a edição.

3. **Backup DigitalSprint.pt**
   - O backup passa a usar dados próprios (novos segredos para digitalsprint.pt: endereço, utilizador, palavra-passe de aplicação) e nunca os da crónica.
   - Sem esses dados, o backup aparece como «não configurado» em vez de erro, e nunca é tentado contra fredericocarvalho.pt.
   - Abro o formulário seguro para guardares os três dados; depois disso o botão «Tentar de novo» volta a funcionar. A edição 319 não tem lição criada, por isso não há risco de duplicado.

## Limitações
- O backup só ficará funcional depois de guardares os dados do digitalsprint.pt.
- Não envio emails, não publico, não apago nada; o artigo #99178 e os destinos ficam intactos.

## Detalhes técnicos
- `nl-publico`: aceitar `destinos.web.estado === "publica"` além de `enviada`; resposta com `noindex: true`; `listarEdicoesPublicas` inalterado. `EdicaoPublica.tsx` aplica `<meta name="robots" content="noindex">` quando `noindex`.
- Estado do email: derivar de `nl_egoi_campanhas` (lista de teste vs real) + consulta de estado E-goi existente; novo estado `teste_enviado`/`teste_aceite` no painel.
- Backup: env `DIGITALSPRINT_WP_URL`, `DIGITALSPRINT_WP_USER`, `DIGITALSPRINT_WP_APP_PASSWORD` via regras do gerador (`destinos.server`, `envio.server`, `nl-hooks`); sem fallback para `WORDPRESS_*`.
- Testes por regra; regenerar, `verificar-grafo-edge.py`, publicar `nl-api`, `nl-publico`, `nl-hooks`.
