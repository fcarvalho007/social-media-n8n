

## Plano: Melhorar Pesquisa de Emojis em /manual-create

### Problema

O `emoji-picker-react` usa dados em inglês por defeito. Quando o utilizador pesquisa "fogo" não encontra 🔥, precisa escrever "fire". A pesquisa é limitada a um único idioma.

### Solução

A biblioteca suporta internacionalização via prop `emojiData`. Importar o pacote `emojis-pt` (Português) que já vem incluído no `emoji-picker-react`:

```tsx
import pt from 'emoji-picker-react/dist/data/emojis-pt';

<EmojiPicker emojiData={pt} ... />
```

Isto traduz **nomes e keywords dos emojis** para Português, permitindo pesquisar "fogo", "coração", "rir", etc.

**Limitação**: com `emojiData={pt}`, a pesquisa passa a ser **apenas em PT** — pesquisar "fire" deixa de funcionar. A biblioteca não suporta pesquisa bilingue nativamente.

**Solução prática**: Como o público-alvo é PT-PT, usar locale PT por defeito. Pesquisa em inglês deixará de funcionar, mas é o trade-off correcto para utilizadores portugueses.

### Alterações

#### 1. `src/components/manual-post/NetworkCaptionEditor.tsx`

- Importar dados PT: `import pt from 'emoji-picker-react/dist/data/emojis-pt';`
- Adicionar `emojiData={pt}` ao `<EmojiPicker>`
- Actualizar `searchPlaceholder` para `"Pesquisar emoji..."`
- Aumentar ligeiramente o picker: `width={320}` para melhor legibilidade
- Adicionar `lazyLoadEmojis={true}` para performance

#### 2. `src/components/manual-post/CaptionInput.tsx`

- Mesma alteração: importar locale PT e passar `emojiData={pt}`

#### 3. `src/components/RichTextEditor.tsx`

- Mesma alteração para consistência em todos os editores

### Ficheiros a Alterar

| Ficheiro | Alteração |
|----------|-----------|
| `src/components/manual-post/NetworkCaptionEditor.tsx` | Adicionar locale PT ao emoji picker |
| `src/components/manual-post/CaptionInput.tsx` | Adicionar locale PT ao emoji picker |
| `src/components/RichTextEditor.tsx` | Adicionar locale PT ao emoji picker |

