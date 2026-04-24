## Diagnóstico

Na secção **Legenda** de `/manual-create`, a base já tem algumas correções recentes: as legendas separadas são copiadas sem corte e a validação de formato já evita duplicar alguns erros de legenda. Ainda assim, há pontos frágeis:

- o editor não tem um aviso inline suficientemente claro quando uma rede excede o limite, sobretudo TikTok/X;
- o botão de correção automática “Cortar para X caracteres” é destrutivo e pode contrariar a regra de não apagar texto sem intenção explícita;
- ao alternar entre legenda unificada e separada, a lógica de inicialização está no `ManualCreate.tsx`, não no editor, e pode ficar inconsistente em casos de seleção/troca de redes;
- o foco da validação de legenda usa uma `textareaRef` que não está ligada ao `NetworkCaptionEditor`, por isso “Editar legenda” pode não levar o utilizador ao campo certo;
- as notificações de erro de publicação/submissão são genéricas e não indicam qual problema está a bloquear a ação;
- no mobile, o botão “Publicar” não respeita `smartValidation.canPublish` no estado disabled, dependendo do clique para abrir o painel de validação.

## Plano de melhorias

### 1. Reforçar a secção “Legenda”

Atualizar `NetworkCaptionEditor` para:

- manter sempre o texto completo ao alternar entre unificada/separadas;
- preservar edições específicas por rede mesmo quando se desliga e volta a ligar o modo separado;
- aumentar/estabilizar a altura mínima da caixa e permitir scroll interno quando o texto é muito longo, em vez de parecer que o texto foi cortado;
- mostrar, junto da caixa ativa, um aviso claro quando a rede excede o limite:

```text
TikTok: 428/300 · excede 128 caracteres
Edita manualmente ou usa “Duplicar da legenda geral”.
```

- adicionar ações não destrutivas úteis:
  - “Duplicar da legenda geral” para repor uma rede a partir da legenda unificada;
  - “Copiar texto” para guardar a versão longa antes de qualquer ajuste;
  - manter o corte automático apenas como ação explícita de validação, nunca ao trocar o switch.

### 2. Melhorar o switch de legendas separadas

Centralizar a inicialização das legendas separadas para garantir que:

- ao ligar o switch, cada rede recebe a legenda global completa se ainda não tiver texto próprio;
- redes já editadas mantêm a sua versão;
- novas redes selecionadas depois também recebem uma legenda completa inicial;
- ao desligar o switch, o texto das redes não é apagado, apenas deixa de ser usado até voltar a ligar.

### 3. Corrigir o foco e a navegação dos erros de legenda

Ligar o `focusCaption` real ao editor, para que os botões de erro consigam:

- abrir/focar a caixa de legenda unificada;
- no modo separado, focar a rede afetada pelo erro, por exemplo TikTok;
- opcionalmente ativar a aba dessa rede antes de focar.

Isto torna mensagens como “Legenda obrigatória para LinkedIn” ou “Legenda excede limite (TikTok)” acionáveis.

### 4. Melhorar notificações de erro

Atualizar o gating de publicação/submissão para mostrar mensagens mais úteis:

- se houver 1 erro: mostrar o título do erro principal;
- se houver vários: mostrar “Há X problemas a corrigir” e abrir o painel;
- usar descrição curta com a primeira ação recomendada;
- evitar toasts genéricos repetidos quando o painel já está aberto.

Exemplo:

```text
Não é possível publicar ainda
Legenda excede limite (TikTok): tens 428 caracteres — máximo 300.
```

### 5. Corrigir o estado do botão mobile

Atualizar `MobileStickyActionBar` para:

- desativar “Publicar” quando `smartValidation.canPublish` é falso;
- manter o badge “toca para ver” como caminho principal para ver os detalhes;
- garantir que o clique no botão, se permitido, não passa por validações inconsistentes entre desktop e mobile.

### 6. Ajustar copy pt-PT e ortografia

Corrigir textos existentes na área de validação:

- “mídia” → “média”;
- “detectados” → “detetados”;
- manter tom impessoal/pt-PT.

### 7. Testes

Adicionar/atualizar testes para:

- ligar legendas separadas não corta texto longo;
- alternar separadas/unificada/separadas preserva edições por rede;
- erro de TikTok usa a legenda específica e foca a aba correta;
- o botão mobile fica bloqueado quando há erros de validação;
- notificações de validação mostram o erro principal, não apenas uma mensagem genérica.

## Ficheiros previstos

- `src/components/manual-post/NetworkCaptionEditor.tsx`
- `src/components/manual-post/NetworkCaptionEditor.test.tsx`
- `src/components/manual-post/steps/Step3CaptionCard.tsx`
- `src/pages/ManualCreate.tsx`
- `src/hooks/manual-create/usePublishOrchestrator.ts`
- `src/components/manual-post/ValidationSidebar.tsx`
- `src/components/manual-post/ValidationIssueCard.tsx`
- `src/components/manual-post/steps/MobileStickyActionBar.tsx`
- testes associados aos componentes/hook afetados

## Checkpoint

- ☐ O switch de legendas separadas nunca corta nem apaga texto.
- ☐ A caixa de legenda mantém tamanho/scroll adequado com texto longo.
- ☐ Cada rede mostra limite, excesso e aviso inline claro.
- ☐ Erros de legenda focam a rede/campo correto.
- ☐ Toasts de erro mostram a causa principal em vez de mensagem genérica.
- ☐ Desktop e mobile bloqueiam publicação com a mesma regra.
- ☐ Copy da área de validação fica em pt-PT consistente.
- ☐ Testes relevantes e TypeScript ficam verdes.