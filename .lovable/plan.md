

## Plano: Corrigir Legendas Diferenciadas por Rede

### Problema Identificado

Quando o utilizador activa "Legendas separadas" e escreve legendas diferentes para cada rede, o sistema **ignora** essas legendas. Em todos os fluxos (publicar, guardar rascunho, submeter para aprovação), apenas a `caption` unificada é enviada — os `networkCaptions` nunca são passados.

**Locais afectados:**

1. **`handlePublishNow`** (linha 1412): passa `caption` fixa ao `executePublish`
2. **`usePublishWithProgress.ts`** (linha 639): envia `caption` ao edge function, sem suporte para legendas por rede
3. **`handleSaveDraft`** (linha 1012): guarda apenas `caption`, sem `linkedin_body` ou outros campos por rede
4. **`handleSubmitForApproval`** (linha 1289/1315): idem

---

### Alterações a Implementar

#### 1. Adicionar `networkCaptions` ao `PublishParams` e usar na publicação

**Ficheiro: `src/hooks/usePublishWithProgress.ts`**

- Adicionar `networkCaptions?: Record<string, string>` ao `PublishParams`
- Na publicação de cada formato (linha 639), usar a legenda específica da rede quando disponível:
  ```tsx
  const networkCaption = params.networkCaptions?.[network] || caption;
  ```
- Aplicar a mesma lógica no `initialPostData.caption` (guardar a caption principal) e adicionar `linkedin_body` quando houver legenda específica do LinkedIn

#### 2. Passar `networkCaptions` desde `handlePublishNow`

**Ficheiro: `src/pages/ManualCreate.tsx`**

- No `executePublish` (linha 1412), adicionar:
  ```tsx
  networkCaptions: useSeparateCaptions ? networkCaptions : undefined,
  ```

#### 3. Guardar `linkedin_body` no rascunho

**Ficheiro: `src/pages/ManualCreate.tsx`**

- No `draftData` (linha 1009), se `useSeparateCaptions` está activo, guardar a legenda específica de cada rede (ex: `linkedin_body`)

#### 4. Incluir legendas diferenciadas na submissão para aprovação

**Ficheiro: `src/pages/ManualCreate.tsx`**

- No `handleSubmitForApproval`, incluir legendas por rede no body do `submit-to-n8n` e no `postData`

---

### Ficheiros a Alterar

| Ficheiro | Alteração |
|----------|-----------|
| `src/hooks/usePublishWithProgress.ts` | Adicionar `networkCaptions` ao `PublishParams`, usar legenda por rede ao publicar cada formato |
| `src/pages/ManualCreate.tsx` | Passar `networkCaptions` no publish, draft save, e submit flows |

---

### Resultado Esperado

- Quando "Legendas separadas" está activo, cada plataforma recebe a sua legenda específica
- Rascunhos guardam as legendas diferenciadas (campo `linkedin_body` etc.)
- A legenda unificada continua a funcionar quando o toggle está desligado

