

## Plano: Sanitização de Nomes de Ficheiros para Supabase Storage

### Problema Identificado

O erro `"Invalid key"` ocorre porque o Supabase Storage não aceita certos caracteres nos nomes de ficheiros:

**Nome problemático:**
```
ea10c20c-17e0-47c0-876b-fb669eabbc9d/1769787996284-2 - refaça esta imagem. melhore.__retire o texto silencio total__clareza.__tudo deve estar em pt-pt__rod.png
```

**Caracteres inválidos detectados:**
- Espaços (` `)
- Acentos (`ç`, `ã`)
- Múltiplos pontos finais (`.`)
- Caracteres especiais (`__`)

O Supabase Storage aceita apenas: letras (a-z, A-Z), números (0-9), hífenes (`-`), underscores (`_`), e pontos (`.`) limitados.

---

### Solução: Função de Sanitização + Aplicação Global

#### 1. Criar Função de Sanitização

**Novo ficheiro: `src/lib/fileNameSanitizer.ts`**

```typescript
/**
 * Sanitize filename for Supabase Storage compatibility
 * 
 * - Remove accents and special characters
 * - Replace spaces with hyphens
 * - Remove consecutive underscores/hyphens
 * - Preserve file extension
 * - Limit total length
 */
export function sanitizeFileName(fileName: string): string {
  // Separate name and extension
  const lastDotIndex = fileName.lastIndexOf('.');
  const name = lastDotIndex > 0 ? fileName.slice(0, lastDotIndex) : fileName;
  const extension = lastDotIndex > 0 ? fileName.slice(lastDotIndex) : '';

  let sanitized = name
    // Normalize unicode (decompose accents)
    .normalize('NFD')
    // Remove accent marks
    .replace(/[\u0300-\u036f]/g, '')
    // Replace spaces with hyphens
    .replace(/\s+/g, '-')
    // Replace underscores with hyphens for consistency
    .replace(/_+/g, '-')
    // Remove any character that's not alphanumeric or hyphen
    .replace(/[^a-zA-Z0-9-]/g, '')
    // Replace multiple consecutive hyphens with single
    .replace(/-+/g, '-')
    // Remove leading/trailing hyphens
    .replace(/^-|-$/g, '')
    // Truncate to reasonable length (50 chars max for name)
    .slice(0, 50)
    // Fallback if empty
    || 'file';

  return sanitized + extension.toLowerCase();
}

/**
 * Generate safe storage path for uploads
 */
export function generateSafeStoragePath(userId: string, file: File): string {
  const timestamp = Date.now();
  const sanitizedName = sanitizeFileName(file.name);
  return `${userId}/${timestamp}-${sanitizedName}`;
}
```

---

#### 2. Aplicar no Fluxo de Guardar Rascunho

**Ficheiro: `src/pages/ManualCreate.tsx`**

Linha 979:
```diff
+ import { generateSafeStoragePath } from '@/lib/fileNameSanitizer';

// Linha 979
- const fileName = `${user.id}/${Date.now()}-${file.name}`;
+ const fileName = generateSafeStoragePath(user.id, file);
```

---

#### 3. Aplicar no Fluxo de Submissão para Aprovação

**Ficheiro: `src/pages/ManualCreate.tsx`**

Linha 1233:
```diff
// Linha 1233
- const fileName = `${user.id}/${Date.now()}-${file.name}`;
+ const fileName = generateSafeStoragePath(user.id, file);
```

---

### Exemplos de Transformação

| Nome Original | Nome Sanitizado |
|---------------|-----------------|
| `refaça esta imagem. melhore.__retire o texto silencio total__clareza.png` | `refaca-esta-imagem-melhore-retire-o-texto-silenc.png` |
| `Imagem com espaços e ACENTOS.jpg` | `imagem-com-espacos-e-acentos.jpg` |
| `foto (1).png` | `foto-1.png` |
| `___multiple___underscores___.jpg` | `multiple-underscores.jpg` |

---

### Ficheiros a Criar/Alterar

| Ficheiro | Tipo | Alteração |
|----------|------|-----------|
| `src/lib/fileNameSanitizer.ts` | **Novo** | Função de sanitização |
| `src/pages/ManualCreate.tsx` | Alterar | Usar função em linhas 979 e 1233 |

---

### Resultado Esperado

1. **Uploads funcionam** independentemente do nome original do ficheiro
2. **Nomes legíveis** são mantidos (sem caracteres estranhos)
3. **Extensão preservada** para identificar o tipo de ficheiro
4. **Comprimento controlado** para evitar problemas de path

