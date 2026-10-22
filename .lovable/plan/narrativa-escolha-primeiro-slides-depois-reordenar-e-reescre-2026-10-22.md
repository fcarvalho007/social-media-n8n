# Narrativa: escolha primeiro, slides depois, reordenar e reescrever com IA

## 1. Revelação progressiva (escolha → slide a slide)
- **Fase 1 — Escolher a abordagem:** enquanto não houver uma versão escolhida, a Narrativa mostra só o painel de abordagens (Editorial / PAS…), em destaque, sem a lista de slides nem os campos por baixo.
- Depois de escolher, o painel de abordagens fecha-se numa linha compacta no topo («Abordagem: Editorial · Mudar»), e aparece a **Fase 2 — Slide a slide**.
- **Fase 2:** lista de slides à esquerda + editor do slide escolhido. Legenda, Texto alternativo e Fontes citadas deixam de estar empilhados no fundo da página: passam a separadores compactos acima do editor («Slide · Legenda · Texto alternativo · Fontes»), abertos só quando se clica.
- «Mudar» reabre a Fase 1 sem perder o texto já editado (o comportamento atual de restaurar a proposta mantém-se).

## 2. Arrastar e largar os slides
- Cada slide da lista ganha uma pega de arrastar; arrastar muda a ordem do carrossel (narrativa e variantes A e B ficam sempre na mesma ordem).
- Funciona igual para slides acrescentados por ti («Novo»).
- Alternativa por teclado: botões «Subir / Descer» no editor do slide (acessibilidade e telemóvel).
- Gratuito, guarda automaticamente, com «Desfazer» no aviso.
- Nota: interpreto «mover os textos» como mudar a ordem dos slides na Narrativa. Mover as caixas de texto dentro da imagem continua a fazer-se na Composição.

## 3. «Reescrever com IA» em cada título e texto
- Botão pequeno ao lado de «Título» e de «Texto».
- Ao clicar, aparece a confirmação com o custo estimado (pedido pago, conta para o limite diário). Só depois é feito o pedido.
- Devolve **2 propostas diferentes**, mostradas por baixo da caixa; o texto atual **nunca é apagado**.
- Em cada proposta: «Usar esta» (substitui, com Desfazer) ou «Descartar». Ao lado, «Outras 2» (novo pedido pago, com confirmação).
- O pedido respeita Tom, Público, Intenção editorial e o papel do slide, e mantém números e factos da fonte (se uma proposta alterar um número, é descartada e avisa-se).

## 4. Remover slide — verificar e corrigir
- Verificar primeiro, com o carrossel real, se o slide removido desaparece de facto: da lista, das variantes A e B, e se continua removido depois de recarregar a página.
- Risco já identificado no código: quando o slide existe em mais do que uma página, ou é o último de uma variante, só é retirada uma página e o slide fica na narrativa. Corrigir para remover sempre de forma consistente nas três partes.
- Depois de remover, a seleção passa para o slide vizinho correto.

## Detalhes técnicos
- `CarrosselTrabalho.tsx`: estado `fase` derivado da existência de escolha persistida (`PainelEstruturas` / escolha inicial); separadores para Legenda/Alt/Fontes.
- Reordenação com `@dnd-kit/sortable` (já instalado) chamando `reordenarSlide` de `editor-grafico/estado.ts`, aplicada a A e B e à narrativa; teste unitário de ordem consistente.
- `apagarSlide`: remover o slide lógico de narrativa + A + B sempre que é pedido a partir da Narrativa; testes para slide com várias páginas, slide novo e persistência via `calcularGravacao`.
- Nova ação `reescrever_texto` em `mc-motor`: valida acesso (`mc_pode_escrever`), limite diário, `confirmar: true`; chama DeepSeek direto (`_shared/deepseek-direto.ts`, regra do projeto — nunca o gateway da Lovable); resposta curta com 2 alternativas, verificação de números contra o texto original; regista custo em `custos_registos()` com `custo_origem`. Sem alterar o texto guardado.
- Correr testes do motor, typecheck e `scripts/verificar-grafo-edge.py`; validar em 1280px e 375px.
- Tudo fica no branch local; a instalação da nova função no backend só com o teu pedido explícito (regra de 19/10). Testar a reescrita real implica 1 pedido pago — pedirei autorização antes.
