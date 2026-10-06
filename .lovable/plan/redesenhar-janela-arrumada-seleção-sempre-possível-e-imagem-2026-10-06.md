# Redesenhar: janela arrumada, seleção sempre possível e imagem IA a funcionar

## Problemas observados
1. Os botões «Usar imagem IA · 1 pedido · ~0,02 €» são mais largos que os cartões e sobrepõem-se (1.ª captura).
2. A Versão 3 fica presa em «À espera da imagem IA»: se a imagem falha, não há forma de aplicar essa versão nem de voltar atrás dentro dela.
3. A imagem IA falha sempre porque a chave Kie guardada é recusada. Existe uma chave fal.ai válida no servidor (já usada para ler imagens), mas a geração de imagens não a usa.

## O que muda

### 1. Cartões e botões
- Botão do cartão com texto curto: «Imagem IA» + custo numa linha pequena por baixo («~0,02 € · 1 pedido»); largura total do cartão, sem sair dele.
- Grelha: 3 colunas em ecrãs médios, 6 só a partir de ecrãs muito largos; cartões com altura igual e botão sempre em baixo.
- Mensagem de erro dentro do cartão encurtada, com o pormenor num «?».

### 2. Seleção nunca bloqueada
- Qualquer versão pode ser selecionada e aplicada.
- Versão à espera de imagem IA que falhou: botões «Tentar novamente · ~0,02 €» (só por clique) e «Aplicar sem imagem IA» (usa a imagem atual ou nenhuma, com o mesmo enquadramento do texto).
- Enquanto a imagem está a ser gerada, o botão principal mostra «A gerar…» com o tempo decorrido; as outras versões continuam selecionáveis.

### 3. Geração de imagem IA pela fal.ai
- A fal.ai passa a ser o serviço principal de geração de imagens no compositor; a Kie fica como alternativa, usada apenas se a fal recusar antes de cobrar (mesma regra da leitura de imagens).
- Modelo barato na fal (Seedream ou FLUX schnell, 1080×1350 / 4:5 nativo); custo real devolvido pela fal ou estimativa, registado na página Custos.
- Mantém-se: 1 pedido por clique, nunca repetido automaticamente se o resultado for desconhecido, limite diário somando os dois serviços, imagem guardada na biblioteca do projeto.
- Mapa de custos atualizado com o novo fornecedor e preço (marcado como estimativa).

## Testes
- Escolha do serviço (fal principal, Kie só após recusa antes de cobrar).
- Versão com IA falhada pode ser aplicada sem imagem IA.
- Uma geração real com a fal (1 pedido, ~0,02 €) só com a sua autorização explícita no fim — se não autorizar, fica por confirmar no ecrã.

## Detalhes técnicos
- `PainelRedesenhar.tsx`: novo layout do cartão, `aplicarSemIA(c)` que reverte `converterParaIA` (candidato original guardado), estado `ia.fase` por candidato.
- `imagemModelo.server.ts`: `resolverModeloImagem` com fornecedor fal/kie (env `AI_IMAGE_PROVIDER`), chamada fal via `queue.fal.run` com `FAL_KEY`; `recusaAntesDeCobrar` partilhada.
- `mc-motor`: registo em `custos_ia`; `custosIa.ts`/`MapaCustos.tsx` atualizados; AGENTS.md atualizado (regra Kie → fal/Kie); redeploy de mc-motor.
