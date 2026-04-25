# Plano — Refinamentos da Secção 1 (`/manual-create`)

Baseado na avaliação do estado actual do redesenho. **Nenhuma alteração funcional ou de lógica de seleção.** Apenas qualidade de código, consistência cromática, A11y e limpeza.

---

## R1 — Apagar 4 ficheiros legados órfãos 🔴

Ficheiros sem qualquer import no projeto (confirmado via `rg`):

- `src/components/manual-post/QuickPresets.tsx`
- `src/components/manual-post/FormatsPanel.tsx`
- `src/components/manual-post/SelectedFormatsTags.tsx`
- `src/components/manual-post/PostTypeSelector.tsx`

**Acção:** apagar os 4 ficheiros. Reduz ruído em pesquisas, evita reusos acidentais e mantém o tree limpo.

---

## R2 — Harmonizar cor Instagram (`#E4405F`) 🔴

O brief pediu explicitamente `#E4405F` mas o `networkIcons.ts` usa `#E1306C` "por consistência com 3 ficheiros já existentes". Isto **inverte a hierarquia**: o brief deve ditar, não os ficheiros legados.

**Acção:** numa única passagem, substituir `#E1306C` → `#E4405F` em:

- `src/lib/networkIcons.ts` (fonte de verdade)
- `src/components/manual-post/platformConfig.tsx` (verificar com `rg`)
- `src/components/publishing/PublishSuccessModal.tsx`
- `src/components/publishing/PublishProgressModal.tsx`
- Qualquer outro hit de `rg "E1306C" src/`

Actualizar o comentário em `networkIcons.ts` para reflectir a decisão.

---

## R3 — Ícone TikTok decente (SVG inline) 🟡

`Music2` (nota musical) não comunica TikTok. Como o brief proíbe novas dependências:

**Acção:** criar `src/components/icons/TikTokIcon.tsx` com SVG inline do logótipo TikTok (path `d` standard, ~15 linhas), interface compatível com `LucideIcon` (`className`, `strokeWidth`, `style`, `aria-hidden`, `aria-label`). Substituir referência em `NETWORK_ICONS.tiktok.icon`.

Para evitar dor de tipos: como `LucideIcon` é um tipo específico do package, o `TikTokIcon` será tipado como `React.FC<React.SVGProps<SVGSVGElement> & { strokeWidth?: number }>` e o tipo do campo `icon` em `NetworkIconConfig` muda para uma união (`LucideIcon | typeof TikTokIcon`) ou para `React.ComponentType<...>` mais genérico.

---

## R4 — A11y dos chips de rede 🟡

Estado de conexão actualmente não chega a leitores de ecrã (apenas visual via `opacity-50`). O gancho `isConnected` existe mas está hard-coded a `true`.

**Acção** em `NetworkChipSelector.tsx > NetworkChip`:

- Adicionar `<span className="sr-only">` interno com texto "Conta conectada" / "Conta não conectada — clica para conectar nas Definições" conforme estado.
- Quando seleccionado, adicionar também `<span className="sr-only">selecionado</span>` (complementa `aria-pressed`).

Não alterar a lógica de `isConnected` (continua sempre `true`); apenas preparar a infra-estrutura semântica para quando ligar a `social_profiles.connection_status`.

---

## R5 — Remover `overflow-hidden` no cartão de preset 🟡

`PresetCard` tem `overflow-hidden` mas:
- Não existe conteúdo interno que precise de clipping.
- O glow `shadow-[0_0_24px_-8px_...]` no estado activo é uma sombra externa que pode parecer cortada visualmente em hover (a transição combinada com `-translate-y-0.5` cria leve flicker da sombra).

**Acção:** remover `overflow-hidden` do `className` na linha 116 de `VisualPresets.tsx`.

---

## R6 — Remover `useMemo` micro-overhead 🟢

```tsx
const isActive = useMemo(
  () => preset.formats.every((f) => selectedFormats.includes(f)),
  [preset.formats, selectedFormats],
);
```

Para 4 cartões com arrays de 2-4 formatos, o overhead do hook (criação de cell + comparação de deps) supera o ganho. Simplificar para:

```tsx
const isActive = preset.formats.every((f) => selectedFormats.includes(f));
```

Remover também o `import { useMemo }` (passa a ser só `import { Check }`).

---

## Validação final (build mode)

- `npx tsc --noEmit` — verde
- `bunx vitest run` — 37/37 verde
- `rg "E1306C" src/` — sem hits
- `rg "QuickPresets|FormatsPanel|SelectedFormatsTags|PostTypeSelector" src/` — sem hits
- Visual check: presets continuam a alternar selecção, glow não pisca em hover, ícone TikTok mostra logo correcto, leitores de ecrã anunciam estado.

## NÃO mexer

- Lógica de seleção, `useActiveSection`, `SectionCard`, progressive disclosure, `NetworkFormatSelector` (já está limpo).
- Qualquer ficheiro listado em `LOCKED_FILES.md` (verificar antes de tocar nos modais de Publish).

## Ficheiros editados

1. `src/components/manual-post/QuickPresets.tsx` — **DELETE**
2. `src/components/manual-post/FormatsPanel.tsx` — **DELETE**
3. `src/components/manual-post/SelectedFormatsTags.tsx` — **DELETE**
4. `src/components/manual-post/PostTypeSelector.tsx` — **DELETE**
5. `src/lib/networkIcons.ts` — cor IG + ícone TikTok + comentários
6. `src/components/icons/TikTokIcon.tsx` — **NOVO**
7. `src/components/manual-post/platformConfig.tsx` — cor IG (se aplicável)
8. `src/components/publishing/PublishSuccessModal.tsx` — cor IG (se aplicável e não locked)
9. `src/components/publishing/PublishProgressModal.tsx` — cor IG (se aplicável e não locked)
10. `src/components/manual-post/VisualPresets.tsx` — remover `overflow-hidden` + `useMemo`
11. `src/components/manual-post/NetworkChipSelector.tsx` — `sr-only` para A11y

## Checkpoint

- ☐ R1 — 4 ficheiros legados apagados
- ☐ R2 — `#E4405F` aplicado em todos os locais (verificado via `rg`)
- ☐ R3 — `TikTokIcon` criado e integrado
- ☐ R4 — `sr-only` para estado de conexão e selecção
- ☐ R5 — `overflow-hidden` removido do PresetCard
- ☐ R6 — `useMemo` removido em PresetCard
- ☐ tsc + vitest verdes
