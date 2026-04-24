## Avaliação UX/UI de `/manual-create`

A secção está parcialmente consistente: a estrutura geral está alinhada com os prompts anteriores, há um fluxo progressivo claro, cartões reutilizam `manual-card-shell`, os textos estão maioritariamente em pt-PT e a versão mobile já tem stepper sticky, FAB de pré-visualização e barra inferior. No entanto, ainda há inconsistências suficientes para não considerar a experiência “polida” ou pronta como referência de qualidade.

O principal problema não é falta de funcionalidade; é excesso de micro-variações e alguns estados mobile incompletos.

## Pontos fortes encontrados

- Fluxo principal está bem dividido: plataformas, média, legenda/opções/agendamento e publicação.
- Desktop mantém a lógica 2/3 + 1/3 com preview lateral em `lg+`.
- Mobile tem intenção correta: stepper compacto no topo, FAB para preview e ações no fundo.
- `NetworkCaptionEditor` está bastante mais coerente: toolbar compacta, textarea com `scroll-margin`, ações de IA acima do campo.
- A maioria dos inputs críticos usa altura confortável (`min-h-11` / `h-11`).
- O viewport permite zoom (`maximum-scale=5.0`, `user-scalable=yes`), o que é positivo para acessibilidade.

## Inconsistências e riscos de qualidade

### 1. Layout tablet inconsistente
`manual-create-grid` passa para duas colunas em `md`, mas o `PreviewPanel` desktop só aparece em `lg`. Entre 768px e 1023px, há risco de uma grelha de duas colunas com a coluna de preview escondida, desperdiçando espaço e comprimindo o formulário.

Correção recomendada: a grelha deve continuar single-column até `lg`; só em `lg+` deve aplicar 2 colunas.

### 2. Barra inferior mobile demasiado carregada
A `MobileStickyActionBar` duplica informação do stepper e pode incluir:
- mini progresso;
- aviso de agendamento;
- badge de validação;
- botões.

Isto torna a barra mais alta do que o objetivo de 72px e reduz demasiado a área útil em telemóveis pequenos.

Correção recomendada: deixar a barra apenas com `[Anterior] [Ação principal] [Mais ações]`. O estado de erro deve estar no botão principal e abrir o sheet de validação.

### 3. Painel de validação mobile não está ligado no fluxo
Existe estado `validationSheetOpen` e a barra chama `setValidationSheetOpen(true)`, mas não há renderização visível do `ValidationSidebar` em modo mobile no final de `ManualCreate.tsx`.

Risco: tocar em “Corrige antes de publicar” pode não abrir feedback útil.

Correção recomendada: renderizar `ValidationSidebar` com `mobileOpen`, `onMobileOpenChange` e `mediaFiles`.

### 4. Preview drawer mobile tem estado “peek” pouco intencional
O estado parcial usa o `PreviewPanel` completo cortado por altura. Isto não cria uma pré-visualização “peek” clara; parece um painel truncado.

Correção recomendada: criar conteúdo específico para o peek:
- rede/formato atual com label em pt-PT;
- mini resumo de legenda/média/agendamento;
- CTA “Toca para expandir”.

Renderizar o `PreviewPanel` completo apenas no estado expanded.

### 5. Indicador do FAB pode aparecer sem edição real
`previewHasUpdates` é ativado por efeito assim que dependências mudam, sem distinguir estado inicial de edição do utilizador.

Correção recomendada: guardar uma assinatura inicial do conteúdo e só ativar o dot quando houver alteração real depois do primeiro render.

### 6. Upload mobile ainda não representa três ações reais
Os botões “Câmara”, “Galeria” e “Ficheiros” são `span` dentro do mesmo `label`; todos acionam o mesmo input. Além disso, o input principal tem `capture="environment"`, o que pode forçar câmara quando o utilizador queria galeria.

Correção recomendada:
- Câmara: input próprio com `capture="environment"`.
- Galeria: input próprio sem `capture`, `accept="image/*,video/*"`.
- Ficheiros: input próprio sem `capture`, usando `getAcceptTypes()`.
- Ajustar copy mobile para não falar em “arrastar”.

### 7. Tags de fotografia têm conflito modal/drawer
`Dialog` desktop e `Drawer` mobile são ambos controlados por `tagModalOpen`. Mesmo com classes `hidden`, o portal/focus trap do Dialog pode interferir no mobile.

Correção recomendada: renderizar apenas uma variante consoante breakpoint, ou extrair um componente `PhotoTagSheet` que decide internamente.

### 8. Alvos de toque ainda não estão uniformes
Ainda há controlos abaixo dos 44px em mobile:
- tabs de preview (`h-10 w-10`);
- atalhos rápidos de agendamento (`h-8`);
- botão “Reverter última reescrita” (`h-8`);
- botão “Adicionar mais” em média (`h-8/h-9`);
- chips/botões de remoção de tags do YouTube.

Correção recomendada: aplicar `manual-touch-target`/`h-11` em mobile e manter versão compacta apenas em `sm+`.

### 9. `NetworkOptionsCard` tem dívida técnica visível
O componente concentra demasiada lógica e JSX numa só linha para Instagram, LinkedIn, Facebook, YouTube, Google Business e tags. Isto aumenta o risco de regressões em mobile, acessibilidade e copy.

Correção recomendada: extrair subcomponentes pequenos sem alterar funcionalidade.

## Plano de refinamento proposto

### Fase 1 — Coerência estrutural e bugs UX
1. Ajustar `.manual-create-grid` para só usar duas colunas em `lg+`.
2. Simplificar `MobileStickyActionBar` para altura real de barra de ação.
3. Renderizar corretamente o `ValidationSidebar` mobile.
4. Fazer o botão com erro abrir o sheet de validação e, ao tocar num erro, aplicar o respetivo fix/focus.

### Fase 2 — Preview mobile
1. Criar um componente/resumo `MobilePreviewPeek`.
2. Renderizar `PreviewPanel` completo só quando o drawer estiver expanded.
3. Corrigir `activePreviewLabel` para usar labels de formato (`getFormatConfig`) em vez de strings com underscores.
4. Corrigir o dot do FAB para só aparecer após alterações reais.

### Fase 3 — Upload e ergonomia de toque
1. Substituir os três spans mobile por três inputs reais: Câmara, Galeria, Ficheiros.
2. Remover `capture` do input genérico.
3. Ajustar copy mobile/desktop do upload.
4. Uniformizar alvos mobile para mínimo 44×44px nos botões ainda pequenos.

### Fase 4 — Opções por rede e tags
1. Separar `Dialog` desktop e `Drawer` mobile para tags de fotografia.
2. Manter, neste ciclo, tap-to-position simples e robusto sem pinch zoom.
3. Corrigir copy da tag desktop para não prometer “ponto escolhido” se não houver escolha manual.
4. Extrair subcomponentes do `NetworkOptionsCard` para reduzir dívida técnica.

### Fase 5 — Polimento final e documentação
1. Rever microcopy pt-PT e remover vestígios de inglês ou copy genérica.
2. Atualizar `DESIGN_SYSTEM.md` com as regras finais de mobile para `/manual-create`.
3. Validar visualmente em 375px, 390px, 414px, 768px e desktop.

## Decisão recomendada

Para este ciclo, recomendo tap-to-position simples para tags em fotografia, sem pinch zoom. É a opção mais estável e suficiente para uso mobile real. O pinch zoom pode ficar declarado como débito técnico se for necessário depois.

## Checklist de qualidade

☐ `/manual-create` avaliado em estrutura, mobile, preview, upload, validação e opções por rede  
☐ Inconsistências críticas identificadas  
☐ Plano de refinamento proposto sem alterações aplicadas  
☐ Nenhum ficheiro bloqueado precisa de edição direta  
☐ Aguardando aprovação para implementar as correções