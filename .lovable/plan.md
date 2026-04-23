
## Correção — Alternar para “Separadas” sem apagar a legenda original

### Problema

Em `/create`, ao alternar de **Unificada** para **Separadas**, a legenda longa deve ser copiada para cada rede sem destruição de texto.

O comportamento correto é:

- Instagram mantém a legenda completa.
- Facebook mantém a legenda completa.
- YouTube mantém a legenda completa.
- LinkedIn mantém a legenda completa.
- Apenas TikTok fica sujeito ao limite de 300 caracteres.

Neste momento há dois pontos frágeis:

1. O editor por rede corta texto no `onChange` com:
   ```ts
   e.target.value.slice(0, maxLength)
   ```
   Isto pode destruir texto quando a rede ativa tem limite baixo, como TikTok.

2. A inicialização das legendas separadas deve garantir que copia a legenda global para todas as redes sem aplicar o menor limite global.

### Implementação proposta

#### 1. Remover truncamento destrutivo no editor por rede

Em `src/components/manual-post/NetworkCaptionEditor.tsx`, alterar o `onChange` das legendas separadas para guardar exatamente o texto escrito:

```ts
onNetworkCaptionChange(network, e.target.value)
```

em vez de:

```ts
onNetworkCaptionChange(network, e.target.value.slice(0, maxLength))
```

Assim, o texto nunca é apagado automaticamente enquanto o utilizador está a editar.

#### 2. Manter a legenda completa ao ativar “Separadas”

Em `src/pages/ManualCreate.tsx`, rever o `onToggleSeparate`.

Quando o utilizador liga “Separadas”:

- copiar a legenda global completa para todas as redes selecionadas;
- preservar qualquer legenda específica que já exista;
- não aplicar limite de TikTok às outras redes;
- não cortar Instagram/Facebook/YouTube/LinkedIn por causa do limite de TikTok.

A lógica ficará alinhada com:

```ts
selectedNetworks.forEach(network => {
  initial[network] = networkCaptions[network] ?? caption;
});
```

#### 3. TikTok continua a ser validado, mas sem apagar texto automaticamente

Se a legenda TikTok tiver mais de 300 caracteres:

- o badge TikTok mostra erro, por exemplo `661/300`;
- o painel de validação mantém o erro “Legenda excede limite”;
- o botão automático “Cortar para 300 caracteres” corta apenas a legenda TikTok;
- as outras redes mantêm a legenda original.

Isto evita perda de conteúdo e deixa claro que só o TikTok precisa de ajuste.

#### 4. Garantir que a publicação continua segura

O fluxo de publicação já limita a legenda enviada por rede antes de chamar o backend:

```ts
(params.networkCaptions?.[network] || caption).slice(0, maxCaptionLen)
```

Vou confirmar que este corte final continua isolado por rede. Ou seja, se TikTok for publicado, recebe no máximo 300 caracteres; Instagram/Facebook/YouTube/LinkedIn não são afetados.

#### 5. Atualizar cobertura de testes

Adicionar teste para o editor de legendas separadas:

- começa com legenda global de 500+ caracteres;
- ativa “Separadas”;
- confirma que Instagram/Facebook/YouTube/LinkedIn mantêm o texto completo;
- confirma que TikTok não apaga automaticamente o texto no editor;
- confirma que a validação/auto-fix de TikTok corta apenas TikTok.

### Ficheiros a alterar

- `src/components/manual-post/NetworkCaptionEditor.tsx`
- `src/pages/ManualCreate.tsx`
- Possível novo teste:
  - `src/components/manual-post/NetworkCaptionEditor.test.tsx`
  - ou teste integrado no fluxo de `ManualCreate`, se for mais estável com a estrutura atual.

### Checklist

☐ Ao ativar “Separadas”, a legenda global completa é copiada para todas as redes  
☐ Instagram mantém 500+ caracteres quando TikTok está selecionado  
☐ Facebook mantém 500+ caracteres quando TikTok está selecionado  
☐ YouTube mantém 500+ caracteres quando TikTok está selecionado  
☐ LinkedIn mantém 500+ caracteres quando TikTok está selecionado  
☐ TikTok mostra excesso quando passa de 300 caracteres, sem apagar automaticamente  
☐ Auto-fix “Cortar para 300 caracteres” altera só TikTok  
☐ Publicação continua a enviar TikTok com máximo de 300 caracteres  
☐ `npx tsc --noEmit` sem erros  
☐ Testes Vitest verdes  
