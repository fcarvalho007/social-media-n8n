# Diagnóstico

A pré-visualização não aparece na coluna direita sticky por causa de **um `</div>` em falta** em `src/pages/ManualCreate.tsx`. A barra cinzenta visível no screenshot é a 2ª coluna do grid, vazia.

## Estrutura actual (linhas 1408–1649)

```
<div className="manual-create-grid">           ← grid 2 cols (lg+)
  <div className="space-y-6 min-w-0">          ← 1411: COL ESQUERDA
    ...NetworkFormatSelector / Step2 ...
    <div className={cn("overflow-hidden ...")}>← 1503: wrapper Step 3
      ...Caption / NetworkOptions / Schedule
    </div>                                      ← 1628: fecha wrapper Step 3
                                                ← FALTA </div> da col esquerda
    <PreviewPanel variant="desktop" ... />     ← 1631: cai DENTRO da col esquerda
  </div>                                        ← 1649: fecha grid
```

Como o `PreviewPanel` é renderizado como filho único da 1ª coluna (não como irmão), herda toda a largura desta e renderiza por baixo do formulário, sem nunca activar `lg:sticky lg:top-24` (que só funciona quando vive directamente como filho de uma célula do grid com `overflow-visible`).

CSS, `PreviewPanel` interno e `MainLayout` já estão correctos das iterações anteriores — só falta corrigir a hierarquia JSX.

## Correção

Ficheiro único: `src/pages/ManualCreate.tsx`.

1. Adicionar `</div>` entre as linhas 1628 e 1630 (antes do comentário `{/* Right - Preview ... */}`), fechando a coluna esquerda (`space-y-6 min-w-0`).
2. Estrutura final:
   ```
   <div manual-create-grid>
     <div col-esquerda>
       ...
       <div Step 3 wrapper>...</div>
     </div>                  ← NOVA: fecha col esquerda
     <PreviewPanel desktop /> ← agora filho directo do grid → 2ª coluna
   </div>
   ```
3. Não tocar em mais nada.

## Validação

- [ ] `npx tsc --noEmit` verde
- [ ] `npx vitest run` 37/37
- [ ] 1462px: preview aparece à direita desde o início; barra cinzenta vazia desaparece
- [ ] Scroll do formulário: preview mantém-se sticky a `top: 96px`
- [ ] <1024px: preview some da direita; FAB de Drawer mobile continua a funcionar
- [ ] Progressive disclosure: seleccionar Carrossel + Documento PDF → Secção 2 entra em `active` e preview à direita actualiza ao adicionar média

## Não tocar

- `useActiveSection`, `useGuidedFlow`, validação, publicação
- CSS `manual-create-grid` (já tem `overflow-visible` e `lg:grid-cols-[minmax(0,1.55fr)_minmax(360px,0.95fr)]`)
- `MainLayout` (já sem `overflow-x-hidden`)
- `PreviewPanel` interno (já tem `lg:sticky lg:top-24 lg:h-[calc(100vh-8rem)]`)

## Risco

Mínimo — alteração de uma única tag de fecho. Erro de JSX seria apanhado imediatamente pelo TypeScript/Vite.
