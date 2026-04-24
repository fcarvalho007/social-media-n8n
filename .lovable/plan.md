## 🎯 Objectivo

Fechar os 2 itens em falta do Prompt 3/4:

1. Barra fixa global de acções com contador "X/5" e estado de erro
2. Toggle "Modo guiado" + integração de `transitionTo` (só para a frente)

E validar (já confirmado) que `SectionCard` aplica `opacity-65` em estado inactive.

---

## 📦 Ficheiros a editar

### 1. `src/components/manual-post/steps/PublishActionsCard.tsx` — refactor
- **Adicionar props opcionais** (não-breaking):
  ```ts
  completedSteps?: number;
  totalSteps?: number;          // default 5
  fixedBottom?: boolean;
  hasErrors?: boolean;
  onShowValidationIssues?: () => void;
  guidedEnabled?: boolean;
  onToggleGuided?: () => void;
  ```
- Quando `fixedBottom !== true`: comportamento idêntico ao actual (zero regressão).
- Quando `fixedBottom === true`:
  - Wrapper passa de `<Card>` para `<div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur-md shadow-[0_-4px_24px_rgba(0,0,0,0.08)]">`.
  - Container interno: `max-w-screen-xl mx-auto px-4 py-3 space-y-2`.
  - **Linha de topo compacta**: contador esquerda (`✅ {completedSteps}/{totalSteps} secções completas`) + barra `Progress` fina (h-1) + `Switch` "Modo guiado" à direita.
  - **Linha primária**: CTA principal (Publicar/Agendar) ocupa flex-1; botão "Submeter para aprovação" em variant="secondary" lado a lado em desktop, empilhado em mobile (`flex-col sm:flex-row`).
  - **Linha secundária**: Guardar rascunho · Ver rascunhos · Ver calendário (links discretos).
  - **Estado de erro** (`hasErrors=true`): CTA principal vira `bg-destructive text-destructive-foreground`, label "Corrige antes de publicar", `onClick → onShowValidationIssues` (em vez de `onPublish`).

### 2. `src/pages/ManualCreate.tsx` — integração
1. **Importar** `useGuidedFlow` e instanciar uma vez:
   ```ts
   const guided = useGuidedFlow();
   ```
2. **Calcular `completedSections`** a partir dos states já existentes:
   ```ts
   const completedSections = [
     networksState, mediaState, captionState, optionsState, scheduleState
   ].filter(s => s === 'complete').length;
   ```
3. **Passar props ao `PublishActionsCard`**:
   ```tsx
   fixedBottom
   completedSteps={completedSections}
   totalSteps={5}
   hasErrors={selectedFormats.length > 0 && !smartValidation.canPublish}
   onShowValidationIssues={() => setValidationSheetOpen(true)}
   guidedEnabled={guided.enabled}
   onToggleGuided={guided.toggle}
   ```
4. **Adicionar padding inferior** ao container principal (linha 1167) para evitar que a barra fixa tape conteúdo:
   - `pb-40 sm:pb-32` no wrapper raiz.
5. **Remover** o `MobileStickyActionBar` (passa a ser substituído pela barra global única) — **OU** mantê-lo apenas para a navegação entre passos do stepper. **Decisão segura**: manter o `MobileStickyActionBar` porque tem lógica de stepper distinta; a nova barra fica acima dele em mobile (`bottom-16`) ou substitui-o quando `currentStep >= 3`.
   - **Plano conservador**: ajustar a barra fixa para `bottom-16 sm:bottom-0` em mobile para não colidir com `MobileStickyActionBar`.
6. **Aplicar `transitionTo`** com `useRef<Set<string>>` para garantir disparo único por sessão:
   ```ts
   const guidedFiredRef = useRef<Set<string>>(new Set());

   // 1 → 2 (Networks → Media)
   useEffect(() => {
     if (selectedFormats.length > 0 && !guidedFiredRef.current.has('media')) {
       guidedFiredRef.current.add('media');
       guided.transitionTo('section-media', () => activate('media'));
     }
   }, [selectedFormats.length]);

   // 2 → 3 (Media → Caption)
   useEffect(() => {
     if (mediaFiles.length > 0 && !guidedFiredRef.current.has('caption')) {
       guidedFiredRef.current.add('caption');
       guided.transitionTo('section-caption', () => activate('caption'));
     }
   }, [mediaFiles.length]);

   // 3 → 4 (Caption → Options) — debounce 1.5s
   useEffect(() => {
     if (hasAnyCaption && !guidedFiredRef.current.has('options')) {
       const t = window.setTimeout(() => {
         guidedFiredRef.current.add('options');
         guided.transitionTo('section-options', () => activate('options'));
       }, 1500);
       return () => window.clearTimeout(t);
     }
   }, [hasAnyCaption]);

   // 4 → 5 (Options → Schedule)
   useEffect(() => {
     if (hasOptionsConfigured && !guidedFiredRef.current.has('schedule')) {
       guidedFiredRef.current.add('schedule');
       guided.transitionTo('section-schedule', () => activate('schedule'));
     }
   }, [hasOptionsConfigured]);
   ```
   **Nota**: confirmar IDs reais usados nos `<SectionCard id="...">` (provavelmente `networks`, `media`, `caption`, `options`, `schedule` — sem prefixo). Será validado durante a implementação.

### 3. Validação visual `SectionCard`
✅ **Já confirmado** durante a inspecção: linhas 113-114 aplicam `opacity-65` em inactive e `opacity-100` em active/complete. **Nenhuma alteração necessária**.

### 4. Toaster (Sonner)
- Sonner default-renderiza em `top-right` → **sem colisão** com a barra inferior. Nenhuma alteração necessária.

---

## ✅ Checkpoint final do Prompt 3/4

- ☐ `PublishActionsCard` suporta modo `fixedBottom` com contador X/5
- ☐ Estado de erro mostra CTA vermelho "Corrige antes de publicar"
- ☐ Toggle "Modo guiado" visível no header da barra, persistido em localStorage
- ☐ `transitionTo` dispara apenas para a frente (Set ref garante uma vez por sessão)
- ☐ Padding inferior do container evita conteúdo tapado
- ☐ `tsc --noEmit` compila sem erros
- ☐ Sem regressões em desktop ou mobile

## 🔒 Diferido para Prompt 4 (já acordado)
- Detecção de "desistência" (toast 10s sem editar)
- Atalhos de teclado
- Screenshots comparativos
