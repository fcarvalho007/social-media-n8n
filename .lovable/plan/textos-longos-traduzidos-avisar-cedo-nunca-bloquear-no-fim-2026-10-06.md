# Textos longos traduzidos: avisar cedo, nunca bloquear no fim

## Problema
O passo «Fonte» verifica o texto original (≤ 20 000 caracteres). A tradução para PT-PT pode ficar mais longa, e o servidor recusava-a só no momento de «Criar». A margem de 30 % para traduções já está ativa e resolve este caso. Faltam estes refinamentos para o problema não voltar a aparecer de forma inesperada.

## Melhorias

1. **Contador visível em «Fonte»**
   - Por baixo do texto: «18 240 / 20 000 caracteres».
   - Aviso suave a partir dos 90 %: «Perto do limite; a versão PT-PT pode ficar mais longa.»

2. **Verificação logo após a tradução**
   - Quando a versão PT-PT fica pronta, mostra-se o seu tamanho («Versão PT-PT: 20 499 caracteres»).
   - Se passar do limite das traduções (26 000), o aviso aparece aí, antes de se avançar, com duas saídas: «Usar original como fonte» ou «Voltar à Fonte para encurtar».
   - O botão «Criar» fica desativado nesse caso, com a razão escrita ao lado.

3. **Mesma regra no ecrã e no servidor**
   - O ecrã passa a usar exatamente a mesma verificação que o servidor (com a margem das traduções), para que nenhum texto aceite no ecrã seja depois recusado.

4. **Erro do servidor tratado com calma**
   - Se, ainda assim, o servidor recusar, a mensagem aparece junto ao botão «Criar» com a ação sugerida. O ecrã nunca fica em branco e o texto não se perde.

5. **(Opcional, à sua escolha) Dividir em partes**
   - Quando o texto excede o limite, um botão «Dividir em 2 carrosséis» separa-o por parágrafos em duas fontes iguais. Fica para depois, se quiser.

## Detalhes técnicos
- `PainelIdioma.tsx`: expor o tamanho da tradução em `EstadoIdioma` (ex.: `caracteresTraducao`).
- `CarrosselNovo.tsx`: `avaliarFonte(normalizarFonte(textoTraduzido), { traducao: true })` quando há `traducaoId`; contador e aviso; `criar` bloqueado se a avaliação falhar; erro do servidor mostrado em linha, além da notificação.
- Teste novo: uma fonte de 19 900 caracteres cuja tradução tem 20 500 é aceite; uma de 27 000 é bloqueada antes do pedido.
- Sem alterações à base de dados nem custos novos.
