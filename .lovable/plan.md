

## Correcção: Botões cortados no modal de detalhes do Calendário

### Problema
O modal usa `sm:max-w-lg` (~512px) e os 3 botões ("Eliminar", "Fechar", "Editar") com `flex-1` não cabem, ficando cortados à direita — especialmente em mobile ou viewports estreitos.

### Correcção (1 ficheiro, 2 alterações)

**`src/pages/Calendar.tsx`**

1. **Linha 1685** — Alargar o modal de `sm:max-w-lg` para `sm:max-w-xl` para dar mais espaço aos botões

2. **Linha 1958** — Tornar os botões responsivos: em mobile empilham verticalmente, em desktop ficam lado a lado:
   - Mudar `<div className="flex gap-3">` para `<div className="flex flex-col sm:flex-row gap-2">`
   - Remover `flex-1` dos botões e usar largura completa em mobile: `className="w-full sm:flex-1"`

Resultado: botões sempre visíveis e legíveis em qualquer tamanho de ecrã.

