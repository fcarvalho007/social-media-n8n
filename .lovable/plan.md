

## Avaliação: Estado Actual e Refinamentos Necessários

### O que foi verificado no browser

- **Histórico de Publicações** (`/publication-history`): Funciona correctamente, mostra 200 registos, com tabs Tudo/Sucesso/Falhas/Pendentes. A última publicação visível é de 8 de abril (carrossel Instagram + LinkedIn). A tentativa de reel de 9 de abril **não aparece** porque foi feita antes da correcção de "criação antecipada do post".
- **Página de criação** (`/manual-create`): Rota existe mas não foi possível testar no browser (sessão não autenticada).
- **Stats**: 200 Total, 195 Sucesso, 5 Falharam, 0 Pendentes.

### Refinamentos identificados

| # | Área | Problema | Correcção |
|---|------|----------|-----------|
| 1 | **Sonner - duração de erros** | O `duration={5000}` é global para todos os tipos de toast. Erros de publicação usam `duration: 15000` inline, mas erros genéricos da app (ex: falhas de rede, erros de BD) mantêm os 5s padrão. Não há diferenciação por tipo no Sonner. | Aumentar `duration` no Sonner para erros via `toastOptions` com classe CSS específica, ou manter 5s global e garantir que **todos** os `toast.error()` críticos passam `duration: 15000` explicitamente. |
| 2 | **PublishProgressModal - isOpen** | A condição `isOpen={publishing \|\| (publishProgress.phase2.status !== 'idle' && publishProgress.phase2.status !== 'waiting')}` está correcta: o modal permanece aberto enquanto `phase2` tiver status de erro/sucesso/partial. O utilizador precisa de fechar manualmente (`onClose` só funciona se `!publishing`). **Sem problema aqui.** | Nenhuma alteração necessária. |
| 3 | **Histórico - posts com `publishing` órfãos** | Com a nova lógica de "criação antecipada", se o browser crashar ou o utilizador fechar a tab durante o upload, o post fica com `status: 'publishing'` para sempre. Não há cleanup. | Adicionar ao `PublicationHistory` um indicador visual para posts com `status: 'publishing'` há mais de 10 minutos, com badge "Possivelmente interrompido" e opção de marcar como `failed`. |
| 4 | **Histórico - thumbnail placeholder** | Posts criados antecipadamente têm `template_a_images: ['placeholder-pending-upload']`. Se o upload falhar, o histórico mostra imagem quebrada. | No componente de renderização do histórico, tratar `'placeholder-pending-upload'` como ausência de imagem (mostrar ícone placeholder em vez de img tag). |
| 5 | **Post-publish verification - 90s timeout** | O polling de 90s é suficiente para a maioria dos casos, mas reels podem demorar até 4-5 minutos. Após 90s sem confirmação da BD, posts com erro continuam marcados como erro mesmo que publiquem depois. | Reduzir o problema: após o timeout de 90s, se o status na BD for `publishing` (não `failed`), mostrar toast informativo "A publicação pode ainda estar a ser processada. Verifique o histórico em alguns minutos." em vez de tratar como erro definitivo. |
| 6 | **Comunicação - subtítulo do Histórico** | O subtítulo actual é "Todas as publicações e tentativas" que está correcto mas poderia ser mais claro sobre o facto de incluir tentativas falhadas. | Alterar para "Registo de todas as publicações e tentativas, incluindo falhas" para clarificar o propósito de log. |

### Plano de implementação

| # | Ficheiro | Alteração |
|---|----------|-----------|
| 1 | `src/pages/PublicationHistory.tsx` | Tratar `template_a_images` com valor `['placeholder-pending-upload']` como sem imagem. Adicionar badge "Interrompido?" para posts `publishing` com mais de 10 minutos. Actualizar subtítulo. |
| 2 | `src/hooks/usePublishWithProgress.ts` | Após timeout de 90s, se o post está `publishing` na BD (não `failed`), mostrar toast informativo em vez de erro. |
| 3 | `src/components/ui/sonner.tsx` | Sem alteração necessária - a duração de 5s padrão é adequada; erros críticos já passam `duration: 15000` explicitamente. |

### Detalhe técnico

**Placeholder de imagem** (ficheiro 1):
```typescript
// Na renderização da thumbnail do histórico
const imageUrl = item.image_url === 'placeholder-pending-upload' ? null : item.image_url;
```

**Badge "Interrompido"** (ficheiro 1):
```typescript
// Ao renderizar status de posts
if (item.status === 'publishing') {
  const createdAt = new Date(item.timestamp);
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
  if (createdAt < tenMinutesAgo) {
    // Mostrar badge "Possivelmente interrompido" com opção de marcar como failed
  }
}
```

**Toast informativo após timeout** (ficheiro 2):
No final do bloco de verificação (após linha 929), quando `!verified` e o post na BD tem status `publishing`:
```typescript
toast.info('A publicação pode ainda estar a ser processada. Verifique o histórico em alguns minutos.', { duration: 10000 });
```

