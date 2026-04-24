# Plano — Prompt 2.5: experiência mobile e responsivo em `/manual-create`

## Objetivo
Transformar a experiência mobile de `/manual-create` numa interface pensada para telemóvel: coluna única, stepper sticky compacto, pré-visualização em drawer inferior, barra de ações fixa, alvos de toque confortáveis e melhor comportamento com teclado/upload. O desktop 2/3 + 1/3 será preservado.

## Inconsistências/decisões encontradas antes de implementar

1. **Pré-visualização mobile já existe, mas só tem 1 estado**
   - Atualmente há um drawer simples (`mobilePreviewOpen`) aberto/fechado, com altura `70vh`.
   - Vou evoluir para 3 estados: fechado, peek 140px e expanded 75vh.

2. **Botão de pré-visualização está dentro da barra sticky**
   - O pedido pede FAB separado no canto inferior direito, acima da barra.
   - Vou remover a pré-visualização da barra inferior e criar um FAB dedicado com dot de atualização.

3. **Stepper mobile atual ainda é uma versão compactada do desktop**
   - Vou criar comportamento mobile específico: `2 de 3 · Conteúdo` + barra de progresso de 2px, sticky no topo com blur, 44px de altura.
   - Em desktop mantém a versão atual.

4. **Modal de tags em fotografia usa coordenadas automáticas ao centro**
   - O pedido fala em pinch-to-zoom e tap para marcar posição. Isto não é “cortar funcionalidade”; é melhorar a versão mobile.
   - Vou implementar bottom sheet mobile com imagem grande, tap para posição normalizada (`x/y`) e input `@username`. Em desktop mantém modal central.

5. **Screenshots/vídeo em dispositivos físicos**
   - Posso preparar e validar visualmente em viewports no preview, mas não consigo gravar vídeo em iPhone/Android físicos a partir daqui.
   - Vou deixar no documento final o checklist de QA manual para os testes físicos.

## Implementação proposta

### 1. Estrutura mobile de `/manual-create`
- Ajustar o contentor principal para mobile com `px-0`/`px-3` conforme o padrão aprovado, sem tocar no layout desktop.
- Garantir a ordem mobile:
  1. Stepper sticky
  2. Seleção de redes
  3. Média
  4. Legenda
  5. Hashtags
  6. Opções por rede
  7. Agendamento
  8. Validação via sheet/bottom sheet
  9. Ações sticky no fundo
- Adicionar espaço inferior ao conteúdo para não ficar tapado pela barra sticky.

### 2. Stepper sticky mobile
- Atualizar `StepProgress` para renderizar:
  - Desktop/tablet: stepper atual.
  - Mobile `<768px`: `Passo X de 3 · Nome do passo` + barra fina de progresso.
- Aplicar `sticky top-0 z-40`, blur e fundo `hsl(var(--background) / 0.85)`.
- Altura máxima visual: 44px.

### 3. Drawer de pré-visualização mobile com 3 estados
- Criar/ajustar um componente local para o preview mobile:
  - Fechado: FAB 48x48, `aria-label="Abrir pré-visualização"`, `bottom: 88px`, `right: 16px`.
  - Peek: drawer com 140px, miniatura do preview atual + nome da rede/formato.
  - Expanded: drawer com 75vh, tabs horizontais, mockup legível e metadados.
- Usar o componente `Drawer` existente (Vaul) e manter swipe down/tap fora via comportamento nativo do Vaul.
- Lazy-render: em mobile, o `PreviewPanel` só renderiza quando o drawer estiver em peek/expanded.
- Adicionar dot pulsante no FAB quando legenda, hashtags, redes, média ou agendamento mudarem; o dot desaparece ao abrir o drawer.
- Respeitar `prefers-reduced-motion` via CSS.

### 4. Barra de ações sticky no fundo
- Refatorar `MobileStickyActionBar`:
  - Remover botão de pré-visualização da barra.
  - Estrutura: `[Anterior] [Botão principal adaptativo] [⋯]`.
  - Altura/padding com safe-area: `px-4 py-3 pb-[calc(12px+env(safe-area-inset-bottom))]`.
  - Botão principal muda texto:
    - Sem conteúdo: `Continuar` disabled.
    - Com erros: `Corrige antes de publicar` em tom destructive e abre validação.
    - Válido + imediato: `Publicar agora`.
    - Válido + futuro: `Agendar`.
- Adicionar bottom sheet de overflow com:
  - Guardar rascunho
  - Submeter para aprovação
  - Ver rascunhos
  - Ver calendário
- Passar os handlers necessários desde `ManualCreate.tsx`.

### 5. Painel de validação mobile
- Manter `ValidationSidebar` como bottom sheet, mas otimizar para mobile:
  - Estado colapsado por defeito via badge/contador na barra.
  - Tap em erro chama `fix` existente e fecha/ancora na secção adequada.
  - Após correção, usar `navigator.vibrate?.(10)` quando disponível.
- Evitar que fique tapado pela barra sticky.

### 6. Formulários e toque mobile
- Auditar e ajustar targets móveis para mínimo 44x44px em:
  - botões da toolbar de legenda;
  - chips e botões `x` de hashtags/colaboradores/tags;
  - tabs de preview;
  - botões de reordenação/remover média;
  - accordion headers.
- Adicionar classes utilitárias mobile no `index.css`:
  - `.manual-touch-target`
  - `.manual-scroll-anchor`
  - `.manual-mobile-sheet-safe`
- Adicionar `scroll-margin-top` aos inputs/textarea relevantes para manter o campo visível com teclado aberto.
- Aplicar atributos de teclado:
  - `inputMode="url"` no CTA URL do Google Business.
  - `autoCapitalize="none"` e `autoCorrect="off"` para usernames.
  - `autoCapitalize="sentences"` nas legendas/texto livre.

### 7. Upload mobile
- Atualizar `MediaUploadSection` para mobile:
  - Texto mobile deixa de mencionar drag-and-drop.
  - Manter drag-and-drop apenas em `sm`/desktop.
  - Input com `accept="image/*,video/*"` quando aplicável e suporte a captura nativa via opção dedicada.
- Adicionar botões/labels mobile para escolher:
  - Câmara
  - Galeria
  - Ficheiros
- Não introduzir novas dependências para compressão neste prompt, porque a regra do workspace exige aprovação explícita para dependências novas. A compressão existente continua a ser usada.

### 8. Opções por rede mobile
- Ajustar `NetworkOptionsCard`:
  - Headers de accordion com largura total e 44px mínimo.
  - Conteúdo mobile sem padding lateral excessivo.
  - Chevrons/áreas clicáveis confortáveis.
  - Contadores abaixo dos campos, não à direita.
  - Inputs com altura mínima de 44px.
- Redesenhar a tag em fotografia em mobile como bottom sheet:
  - Imagem grande.
  - Tap define `x/y`.
  - Ponto pulsante na posição selecionada.
  - Input `@username` acima da ação.
  - Botão `Confirmar tag` sticky no fundo do sheet.

### 9. Acessibilidade mobile
- Garantir:
  - labels ARIA no FAB, drawer, overflow menu e ações icon-only;
  - `aria-live="polite"` para mensagens de estado rápidas quando fizer sentido;
  - focus trap do drawer/sheets via componentes existentes;
  - sem bloqueio de zoom no viewport.

### 10. Performance visual
- Lazy-render da pré-visualização mobile até abrir o drawer.
- Tabs de preview com scroll horizontal e targets adequados.
- Importações lucide continuam nomeadas, sem `import * as`.
- Evitar dynamic imports neste prompt se adicionarem complexidade desnecessária; aplicar apenas se for seguro para componentes raros como o sheet de tags.

### 11. Documentação e validação
- Atualizar `DESIGN_SYSTEM.md` com as regras mobile novas:
  - stepper sticky;
  - drawer de preview;
  - sticky action bar;
  - touch targets;
  - teclado/inputmode;
  - comportamento de upload mobile.
- Validar com build/typecheck disponível.
- Fazer QA visual em viewports: 375px, 390px, 412px e 768px no preview quando possível.

## Ficheiros previstos
- `src/pages/ManualCreate.tsx`
- `src/components/manual-post/StepProgress.tsx`
- `src/components/manual-post/steps/MobileStickyActionBar.tsx`
- `src/components/manual-post/steps/PreviewPanel.tsx`
- `src/components/manual-post/steps/NetworkOptionsCard.tsx`
- `src/components/manual-post/steps/Step2MediaCard.tsx`
- `src/components/manual-post/NetworkCaptionEditor.tsx`
- `src/components/media/MediaUploadSection.tsx`
- `src/components/manual-post/EnhancedSortableMediaItem.tsx`
- `src/components/manual-post/ValidationSidebar.tsx`
- `src/index.css`
- `DESIGN_SYSTEM.md`

## Fora de âmbito neste prompt
- Não alterar desktop para além de preservar compatibilidade.
- Não adicionar novas funcionalidades de produto.
- Não adicionar dependências novas.
- Não implementar compressão nova com biblioteca externa.
- Não produzir vídeo real em dispositivos físicos dentro do ambiente Lovable.

## Checklist de entrega
- [ ] Stepper sticky mobile funcional.
- [ ] Drawer da pré-visualização com fechado/peek/expanded.
- [ ] FAB de pré-visualização com indicador de alterações.
- [ ] Barra de ações sticky com safe-area e menu overflow.
- [ ] Toques críticos com mínimo 44x44px.
- [ ] Upload mobile com opções Câmara/Galeria/Ficheiros.
- [ ] Tags em imagem com bottom sheet mobile e tap para posição.
- [ ] Painel de validação mobile colapsável/tocável.
- [ ] Inputs com teclado adequado e scroll anchoring.
- [ ] `DESIGN_SYSTEM.md` atualizado.
- [ ] Build/typecheck sem erros.