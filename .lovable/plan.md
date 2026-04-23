
## Correção — Validação de caracteres com legendas separadas em `/create`

### Problema identificado

Quando a opção **“Separadas”** está ativa, o editor mostra corretamente o contador por rede. No teu exemplo:

- TikTok mostra **293/300**
- Ainda assim o painel de validação continua a dizer **“Legenda excede 300 caracteres”**
- A publicação fica bloqueada

A causa provável está no fluxo de validação: o `useSmartValidation` e o `captionValidator` continuam a validar a legenda global (`caption`) contra todas as redes selecionadas, em vez de validar a legenda específica de cada rede (`networkCaptions.tiktok`, `networkCaptions.instagram`, etc.).

Ou seja: mesmo que a legenda TikTok esteja com 293 caracteres, a validação ainda está a comparar o TikTok contra a legenda principal, que no screenshot tem 660 caracteres.

### Implementação proposta

#### 1. Tornar a validação consciente de legendas separadas

Atualizar o contexto de validação para incluir:

```ts
useSeparateCaptions: boolean
networkCaptions: Record<string, string>
```

Assim, cada validador consegue saber se deve usar:

```ts
caption
```

ou:

```ts
networkCaptions[network]
```

#### 2. Corrigir `captionValidator`

Alterar a validação de comprimento para usar a legenda correta por rede:

```ts
const captionForNetwork =
  ctx.useSeparateCaptions && ctx.networkCaptions?.[network]
    ? ctx.networkCaptions[network]
    : ctx.caption;
```

Depois, para TikTok, valida:

```ts
captionForNetwork.length > 300
```

e não o comprimento da legenda global.

Isto deve fazer desaparecer o erro quando o separador TikTok estiver dentro do limite.

#### 3. Corrigir hashtags e links por rede

No mesmo validador, aplicar a mesma lógica a:

- links não clicáveis em plataformas que não suportam links
- contagem de hashtags do Instagram
- legenda obrigatória do LinkedIn

Exemplo: se o LinkedIn tiver legenda separada, validar a legenda do LinkedIn, não a global.

#### 4. Atualizar cache da validação

O `buildValidationCacheKey` atualmente considera só:

```ts
caption.length
captionHead
```

Vou incluir também:

```ts
useSeparateCaptions
networkCaptions
```

Isto evita validações antigas em cache quando se corrige apenas a legenda de uma rede específica.

#### 5. Atualizar `ManualCreate.tsx`

Passar os novos dados para o hook:

```ts
useSmartValidation({
  selectedFormats,
  caption,
  networkCaptions,
  useSeparateCaptions,
  ...
})
```

E adicionar helper de correção para uma rede específica, para que o botão automático “Cortar para 300 caracteres” não corte a legenda errada.

#### 6. Garantir que publicação e pré-validação usam a mesma regra

Validar que:

- o painel lateral deixa de mostrar erro para TikTok quando a legenda TikTok tem ≤300 caracteres
- o botão publicar/avançar deixa de estar bloqueado nesse caso
- os restantes limites continuam ativos:
  - Instagram: 2200
  - Facebook: 63206
  - YouTube: 5000
  - LinkedIn: 3000
  - TikTok: 300

### Ficheiros a alterar

- `src/lib/validation/types.ts`
- `src/hooks/useSmartValidation.ts`
- `src/lib/validation/runValidators.ts`
- `src/lib/validation/validators/captionValidator.ts`
- `src/pages/ManualCreate.tsx`

### Checklist de validação

☐ Com “Separadas” ativo, TikTok com 293/300 não gera erro  
☐ TikTok com 301/300 continua a gerar erro  
☐ Instagram, Facebook, YouTube e LinkedIn continuam a usar os seus próprios limites  
☐ LinkedIn continua a exigir legenda quando selecionado  
☐ Cache da validação atualiza ao editar só a legenda TikTok  
☐ Botão de publicação deixa de bloquear quando não há erros reais  
☐ `npx tsc --noEmit` sem erros  
☐ Testes Vitest continuam verdes  
