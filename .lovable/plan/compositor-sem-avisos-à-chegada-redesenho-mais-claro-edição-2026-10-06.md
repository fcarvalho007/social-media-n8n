# Compositor: sem avisos à chegada, redesenho mais claro, edição de texto direta e custos visíveis

## 1. Carrossel chega à Composição já sem avisos
- Ao criar do zero (e ao entrar na Composição pela primeira vez), o motor faz um passo automático de enquadramento antes de mostrar o carrossel: para cada texto que não cabe, aumenta primeiro a caixa dentro da margem livre da página, depois troca para um enquadramento do mesmo modelo onde caiba (mais espaço de texto, imagem menor). **Nunca reduz o tamanho da letra nem corta texto** (regra mantida).
- As orientações de leitura (capa com 2 frases, slide com 48 palavras) passam a ser respeitadas já na Narrativa: o gerador recebe os limites e a Narrativa mostra-os ao lado do slide, antes de chegar à Composição.
- O botão «Avisos» só aparece quando existe mesmo algo que o sistema não conseguiu resolver sozinho (por exemplo, texto editado à mão que deixou de caber). Sem avisos, fica escondido.

## 2. Abrir sempre com uma direção visual
- Acaba o estado «Sem direção visual · Escolher». Carrosséis antigos ou sem direção recebem automaticamente uma direção coerente (estilo inferido do modelo atual, paleta por omissão do projeto), gravada como alteração normal que se pode desfazer.
- O indicador mostra sempre «Estilo · Variante · Paleta [Alterar]».

## 3. Janela «Redesenhar» maior e mais legível
- Passa a ocupar quase todo o ecrã (lista de propostas por baixo/ao lado de uma pré-visualização grande, com miniaturas maiores e alinhadas, sem barra de deslocamento horizontal).
- Cada proposta mostra uma ficha curta: modo de imagem (fundo total, hero, contida, dividida, sem imagem), onde fica o texto, origem da imagem (atual, Pexels, IA), efeitos aplicados.
- **Imagem IA em qualquer proposta com imagem**: em cada versão com espaço de imagem (ex.: Versão 1 hero, Versão 4 contida) aparece o botão «Usar imagem IA nesta versão · custo». A imagem é pedida já para esse enquadramento (sujeito longe do texto). A versão «Imagem IA integrada» mantém-se como sugestão, mas deixa de ser a única.
- **Fim da confusão «com / sem imagem IA»**: o redesenho passa a ser sempre gratuito (5 propostas sem gastar nada). A IA só é pedida quando se clica explicitamente no botão de uma versão. Retiram-se os dois botões iniciais confusos.
- Erros da geração aparecem dentro da própria proposta, em linguagem clara.

## 4. Erro atual «A Kie recusou o pedido (Unauthorized)»
- A chave do serviço de imagens no servidor está a ser recusada. Primeiro passo: confirmar se a chave existe e é válida (sem gastar crédito). Se estiver em falta ou expirada, peço-lhe uma chave nova. Enquanto isso, a mensagem passa a dizer «Serviço de imagens IA indisponível: chave do servidor inválida» e o botão IA fica desativado em vez de falhar.

## 5. Editar texto clicando no canvas
- Duplo clique (ou toque duplo no telemóvel) num texto abre a edição diretamente sobre o slide, no mesmo sítio e com a mesma letra; Enter/clique fora grava, Esc cancela.
- Um clique simples seleciona e abre logo o campo de texto no painel lateral, já com o cursor.
- Funciona tanto para textos da narrativa (título/texto, gravado no slide) como para textos acrescentados à mão.
- Durante a edição o aviso «não cabe» atualiza em tempo real.

## 6. Custos sempre visíveis
- Todos os botões que gastam IA mostram o custo antes do clique: «Gerar imagem IA · 1 pedido (~0,0X €)», «Interpretar com IA · 1 pedido».
- Novo «Mapa de custos» no compositor (ícone ao lado de Avisos): lista cada ação paga (imagem IA, texto IA), fornecedor, custo estimado por pedido, quantos pedidos foram usados hoje e o limite diário do projeto. O que é gratuito (redesenhar, Pexels, biblioteca, upload, efeitos) aparece marcado como «Sem custo».
- Ao aplicar uma versão com imagem IA, aparece uma confirmação «Imagem gerada por IA aplicada» e o slide fica com o selo «IA» na miniatura.

## Pendente da sua parte
- Os custos estimados por pedido (em euros) da Kie e da DeepSeek: indico os valores públicos como estimativa e marco-os como estimativa até me confirmar os reais.

## Detalhes técnicos
- `motor/sistema.ts` / `modelos.ts`: nova `enquadrarAutomatico(pacote)` após `aplicarSistema` na criação e na migração; usa as escadas de tamanhos existentes só para escolher enquadramento, nunca descer abaixo do tamanho base; `leitura.ts` limites passados ao prompt da narrativa.
- `EditorGrafico.tsx`: remover ramo «Sem direção visual», `garantirSistema` no carregamento; Avisos oculto quando vazio; botão «Mapa de custos».
- `PainelRedesenhar.tsx`: `DialogContent` ~95vw; `redesenharPagina` com `incluirIA:false` sempre; nova ação por candidato `pedirIA(c)` que converte uma versão com imagem via `substituirImagemIA` usando `construirPromptComposicao` com o `imageMode/textRegion` dessa versão; ficha por candidato.
- `kie.server.ts`: mapear 401 para erro `chave_invalida` e expor estado de saúde (sem criar tarefa); UI desativa IA.
- `PaginaCanvas.tsx`: `onDblClick/onDblTap` em texto → overlay `textarea` posicionado pelos `limitesConteudo` × escala, com a fonte/estilo da camada; grava via `onAlterar` / alteração de slide.
- Novo `custosIa.ts` (tabela única de custos estimados) usado pelos botões e pelo Mapa de custos; contagens lidas dos limites existentes.
- Testes: carrossel novo sem avisos e sem redução de letra; abrir doc sem sistema → tem sistema; redesenho não gera pedido pago; IA aplicável a hero/contida mantém geometria; edição dupla grava texto. tsgo + vitest + verificar-grafo-edge + deploy mc-motor.
