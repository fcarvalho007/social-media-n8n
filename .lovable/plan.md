
## Plano: Remover Limite de 10 Imagens para Instagram Carousel

### Objetivo
Permitir inserir mais de 10 imagens no carrossel, exibindo um aviso no momento da publicação de que a API do Instagram só aceita 10 imagens, mas prosseguindo com o envio para a Getlate.dev.

---

### Análise Técnica

A limitação de 10 imagens está implementada em 3 locais:

| Ficheiro | Linha | O que faz |
|----------|-------|-----------|
| `src/types/social.ts` | 48 | Define `maxMedia: 10` no config do `instagram_carousel` |
| `src/lib/formatValidation.ts` | 37, 52, 99-101 | Calcula `maxMedia` mínimo entre formatos e retorna **erro** se excedido |
| `src/pages/ManualCreate.tsx` | 699-706, 645-647 | Bloqueia upload e mostra erro se exceder limite |

---

### Alterações

#### 1. Aumentar limite no config do formato (`src/types/social.ts`)

Alterar o `maxMedia` do `instagram_carousel` de 10 para um valor mais alto (ex: 50), permitindo uploads maiores:

```typescript
// Linha 48
maxMedia: 50, // Permite uploads grandes, aviso será dado na publicação
```

Também atualizar a descrição para refletir:

```typescript
// Linha 45
description: '1-50 imagens (API IG suporta máx. 10)',
```

#### 2. Converter erro em aviso na validação (`src/lib/formatValidation.ts`)

Para o formato `instagram_carousel`, quando `totalMedia > 10`:
- **Não bloquear** (não retornar erro)
- **Mostrar aviso** informativo

```typescript
// Dentro de validateFormat(), após validação de minMedia:

// Instagram carousel: warning instead of error for >10 media
if (format === 'instagram_carousel' && totalMedia > 10) {
  warnings.push(`Instagram aceita máx. 10 imagens. A Getlate receberá ${totalMedia} - poderá ser necessário ajustar.`);
} else if (format === 'linkedin_document') {
  // LinkedIn Document validation (existing code)
  ...
} else if (config.maxMedia && totalMedia > config.maxMedia) {
  errors.push(`Máximo ${config.maxMedia} ficheiro(s) permitido(s)`);
}
```

#### 3. Remover bloqueio de upload (`src/pages/ManualCreate.tsx`)

Atualmente, o upload é bloqueado se exceder `maxAllowed`. Precisamos:

1. **Permitir o upload** mesmo que exceda 10
2. **Mostrar toast de aviso** (não erro) quando o total exceder 10 para Instagram

```typescript
// Linha 699-706 - Alterar de erro para aviso
if (totalAfterUpload > maxAllowed) {
  // For Instagram carousel, allow but warn
  const hasInstagramCarousel = selectedFormats.includes('instagram_carousel');
  if (hasInstagramCarousel && totalAfterUpload <= 50) {
    toast.warning(
      `Atenção: Instagram suporta máx. 10 imagens. A publicar ${totalAfterUpload} - Getlate receberá todas.`,
      { duration: 6000 }
    );
    // Continue with upload - don't return
  } else {
    toast.error(`Máximo ${maxAllowed} ficheiros. Já tem ${mediaFiles.length}.`);
    return;
  }
}
```

#### 4. Validação na publicação (`src/pages/ManualCreate.tsx` ou `PublishConfirmationModal`)

No momento de clicar "Publicar", se houver mais de 10 imagens e Instagram estiver selecionado:

```typescript
// Em handlePublishNow() ou handlePublishWithValidation()
const instagramSelected = selectedNetworks.includes('instagram');
const hasMoreThan10 = mediaFiles.length > 10;

if (instagramSelected && hasMoreThan10) {
  toast.warning(
    `⚠️ Instagram aceita máx. 10 imagens. Enviando ${mediaFiles.length} para Getlate. Poderá ser necessário ajustar no dashboard.`,
    { duration: 8000 }
  );
}
// Continue with publishing - don't block
```

#### 5. Atualizar tooltips e labels

**`src/components/manual-post/SectionHelp.tsx`** - Linha 60:
```typescript
instagram_carousel: "1-50 imagens ou vídeos (API IG suporta máx. 10, receberá aviso)",
```

**`src/components/publishing/TargetSelector.tsx`** - Linha 121:
```typescript
<p>• 1-50 imagens (IG suporta máx. 10 via API)</p>
```

---

### Resultado Esperado

| Cenário | Comportamento Atual | Comportamento Novo |
|---------|---------------------|---------------------|
| Upload 15 imagens (IG carousel) | ❌ Bloqueado com erro | ✅ Permitido com toast de aviso |
| Validação com 15 imagens | ❌ Erro: "Máximo 10 ficheiros" | ✅ Aviso: "Instagram aceita máx. 10" |
| Publicar com 15 imagens | ❌ Não chega aqui | ✅ Toast de aviso + envio para Getlate |
| Download com 15 imagens | ✅ Funciona | ✅ Continua a funcionar |
| LinkedIn Document com 50 páginas | ✅ Funciona (limite 300) | ✅ Sem alteração |

---

### Ficheiros a Alterar

1. `src/types/social.ts` - Aumentar `maxMedia` e descrição
2. `src/lib/formatValidation.ts` - Converter erro em aviso para instagram_carousel
3. `src/pages/ManualCreate.tsx` - Permitir upload com aviso, adicionar aviso na publicação
4. `src/components/manual-post/SectionHelp.tsx` - Atualizar tooltip
5. `src/components/publishing/TargetSelector.tsx` - Atualizar descrição

---

### Notas Técnicas

- A Getlate.dev receberá todas as imagens - a limitação de 10 é apenas da API oficial do Instagram
- O utilizador é informado em 3 momentos: upload, validação visual, e no momento de publicar
- O download ZIP funcionará normalmente com qualquer número de ficheiros
- O LinkedIn Document não é afetado (já suporta até 300 páginas)
