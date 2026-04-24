# Plano de execução — sequência única sem paragens

Executar 3 fases em cadeia, com `tsc --noEmit` no fim. Sem paragens intermédias para confirmação — só reporto no fim.

---

## Fase 1 — Lote B-bis (refinamentos alt-text)

### 1.1 `src/lib/altTextSupport.ts` — fallback defensivo
No `else` do loop, garantir que rede desconhecida não produz `undefined`:
```ts
unsupportedLabels.push(NETWORK_LABELS[getNetworkFromFormat(format)] ?? format);
```
E o mesmo no ramo dos `supportedNetworks` por simetria.

### 1.2 `src/components/manual-post/ai/AltTextPanel.tsx` — acessibilidade
- Adicionar `id="alt-text-microcopy"` ao `<p>` que mostra o microtexto.
- Adicionar `aria-describedby={microcopy ? 'alt-text-microcopy' : undefined}` ao `Textarea`.

### 1.3 `src/lib/altTextSupport.test.ts` (novo) — testes unitários
8 casos cobrindo todas as branches:
1. `[]` → `hasSupported: false, microcopy: null`
2. `['instagram_image']` → `microcopy: null` (todas suportam)
3. `['instagram_stories']` → `hasSupported: false`
4. `['instagram_image', 'tiktok_video']` → `"Usado em Instagram. Ignorado em TikTok."`
5. `['instagram_image', 'linkedin_post', 'instagram_stories']` → `"Usado em Instagram e LinkedIn. Ignorado em Stories."`
6. `['instagram_image', 'linkedin_post', 'instagram_stories', 'tiktok_video']` → ambos lados com 2 itens
7. `['instagram_image', 'linkedin_post', 'facebook_image']` + 3 não-suportados → colapsa para "3 redes" do lado dos ignorados
8. `['instagram_image', 'instagram_carousel']` (rede duplicada) → deduplica para "Instagram"

---

## Fase 2 — Lote A-bis #2 (validação YouTube por tag)

### 2.1 `src/lib/validation/validators/networkOptionsValidator.ts`
Adicionar regra dentro do bloco `if (networks.has('youtube'))` — depois da regra existente de 500 caracteres totais:
```ts
(youtube?.tags ?? []).forEach((tag, idx) => {
  if (tag.length > 100) {
    issues.push({
      id: `network-options:youtube:tag-too-long:${idx}`,
      severity: 'error',
      category: 'platform',
      platform: 'youtube',
      title: 'Tag YouTube demasiado longa',
      description: `A tag «${tag.slice(0, 30)}${tag.length > 30 ? '…' : ''}» tem ${tag.length}/100 caracteres.`,
      autoFixable: !!ctx.fixHelpers?.focusNetworkOption,
      fixLabel: 'Editar tags',
      fixAction: () => ctx.fixHelpers?.focusNetworkOption?.('youtube', 'youtubeTags'),
    });
  }
});
```

---

## Fase 3 — Lote C (refactor + metadata bar + drop area)

### 3.1 Auditar e completar toque mínimo 44×44
Rever rapidamente e aplicar `min-h-11 min-w-11` (ou equivalentes `h-11 w-11`) em botões de acção primária dos seguintes ficheiros, **apenas onde faltar**:
- `Step2MediaCard.tsx`
- `Step3CaptionCard.tsx`
- `Step3ScheduleCard.tsx`
- `MobileStickyActionBar.tsx`
- `NetworkOptionsCard.tsx`

Não tocar em ícones secundários (e.g. trash dentro de chips) onde 32px é deliberado.

### 3.2 Extracção de subcomponentes do `NetworkOptionsCard`
Criar `src/components/manual-post/network-options/`:
- `LinkedInOptions.tsx` — mentions (com handler `insertLinkedInMention` e microcopy "admin de organização" já existente) + first comment.
- `YouTubeOptions.tsx` — categoria + título + descrição + tags + privacidade.
- `InstagramOptions.tsx` — first comment + collaborators + photo tags + story link.
- `FacebookOptions.tsx` — first comment.
- `GoogleBusinessOptions.tsx` — CTA.

`NetworkOptionsCard.tsx` torna-se orquestrador puro. **API pública (props + ref handle) inalterada** para não partir consumidor (`ManualCreate.tsx`).

### 3.3 Metadata bar fixa no `PreviewPanel`
Substituir o bloco `Metadata` actual (linhas 124-142) por uma barra **sticky no rodapé** apenas para a variante `desktop` (em mobile mantém-se inline porque já vai dentro de `Drawer` com scroll natural).

Na variante `desktop`:
```tsx
<div className="sticky bottom-0 -mx-5 -mb-5 h-[52px] border-t border-border/40 bg-background/95 backdrop-blur px-5 flex items-center gap-4">
  {selectedFormats.length === 0 ? (
    <span className="text-sm text-muted-foreground">—</span>
  ) : (
    <>
      <span className={cn('text-xs font-medium', activeCaption.length > activeLimit && 'text-destructive')}>
        {activeCaption.length}/{activeLimit}
      </span>
      <span className="text-xs text-muted-foreground">{hashtagCount} hashtags</span>
      <span className="text-xs text-muted-foreground truncate">{scheduleLabel}</span>
      <span className="text-xs text-muted-foreground ml-auto">{mediaCount} {mediaCount === 1 ? 'ficheiro' : 'ficheiros'}</span>
    </>
  )}
</div>
```

`activeLimit` derivado de `getNetworkFromFormat(activeFormat)`:
- Instagram: 2200
- LinkedIn: 3000
- Facebook: 63206
- X: 280
- TikTok: 2200
- YouTube: 5000 (descrição) — mas título é 100; usar 5000 por defeito
- Google Business: 1500

Helper inline (~10 linhas) ou novo `src/lib/manual-create/captionLimits.ts`. Vou inline por simplicidade.

### 3.4 Drop area mobile polish
Em `Step2MediaCard.tsx`, confirmar que a drop area:
- Tem `min-h-[120px]` em mobile.
- Texto pt-PT claro: "Toca para adicionar média ou arrasta aqui".
- Ícone visível.

Se já estiver bem, só validar e seguir.

---

## Fase 4 — Validação final
- `tsc --noEmit` (Lovable corre automático).
- `vitest run src/lib/altTextSupport.test.ts` para confirmar que os 8 testes passam.
- Reportar resumo consolidado.

---

## Ficheiros tocados
**Novos (6):**
- `src/lib/altTextSupport.test.ts`
- `src/components/manual-post/network-options/LinkedInOptions.tsx`
- `src/components/manual-post/network-options/YouTubeOptions.tsx`
- `src/components/manual-post/network-options/InstagramOptions.tsx`
- `src/components/manual-post/network-options/FacebookOptions.tsx`
- `src/components/manual-post/network-options/GoogleBusinessOptions.tsx`

**Editados (~5):**
- `src/lib/altTextSupport.ts`
- `src/components/manual-post/ai/AltTextPanel.tsx`
- `src/lib/validation/validators/networkOptionsValidator.ts`
- `src/components/manual-post/steps/NetworkOptionsCard.tsx` (refactor extenso)
- `src/components/manual-post/steps/PreviewPanel.tsx` (metadata bar)
- `src/components/manual-post/steps/Step2MediaCard.tsx` (apenas se drop area precisar)

## Riscos
- **Refactor `NetworkOptionsCard`** é o ponto de risco. Mitigação: manter API pública (props + `NetworkOptionsCardHandle.focusField`) idêntica e mover apenas lógica interna.
- **Metadata bar sticky** dentro de `Card`/`CardContent` requer que o pai não tenha `overflow-hidden`. O wrapper actual usa `overflow-auto` (linha 204), portanto sticky funciona contra o scroll do próprio painel.

## Não fazer
- Não tentar autocomplete de menções LinkedIn (Fase 2 futura).
- Não mexer em espaçamentos/iconografia globais (outro prompt em standby).
- Não avançar para Stories Fase B/C.
