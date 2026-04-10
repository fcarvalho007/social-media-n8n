

## Diagnóstico: Reel Instagram falhou sem registo + Erros desaparecem

### Problemas confirmados

**1. Tentativa de vídeo/reel não ficou registada no histórico**
O post record é criado apenas na linha ~489 (`supabase.from('posts').insert()`), DEPOIS do upload de ficheiros. Se o upload falhar ou houver um erro de validação (ex: formato de vídeo, tamanho), o código faz `return false` (linhas 384, 419) SEM criar o registo na BD. A tentativa de publicação desaparece completamente — nenhum log, nenhum registo no histórico.

**2. Reel publicou no LinkedIn mas não no Instagram**
Os formatos são processados sequencialmente (LinkedIn primeiro, Instagram depois — linhas 438-446). Se o LinkedIn publica com sucesso mas o Instagram falha (ex: erro de formato de vídeo, rate limit, ou timeout), o post é atualizado como "published" porque `hasSuccess = true` (linha 921). O erro do Instagram fica invisível no registo final.

**3. Mensagem de erro desaparece demasiado rápido**
O Sonner (toast) usa duração padrão (~4 segundos). Nenhum `toast.error` no `usePublishWithProgress.ts` define `duration`. Quando o modal de progresso está aberto, o erro aparece no modal E num toast que desaparece rápido. Mas se o modal também fecha (ex: `publishing` torna-se `false` imediatamente no bloco catch), ambos desaparecem.

### Plano de correção

| # | Ficheiro | Alteração |
|---|----------|-----------|
| 1 | `src/hooks/usePublishWithProgress.ts` | **Criar post record ANTES do upload**: Mover a criação do registo na BD (linhas 448-524) para ANTES do upload de ficheiros (antes da linha 374). O post é criado com status `publishing` logo no início, garantindo que QUALQUER tentativa fica registada, mesmo que o upload falhe. Se o upload falhar, atualizar o post para `failed` com o erro. |
| 2 | `src/hooks/usePublishWithProgress.ts` | **Registar erros pré-publicação**: Nos pontos de `return false` (linhas 329, 339, 384, 419), antes de sair, atualizar o post recém-criado com `status: 'failed'` e `error_log` com a mensagem do erro. |
| 3 | `src/hooks/usePublishWithProgress.ts` | **Tratar parcialmente sucesso (LinkedIn OK, Instagram falhou)**: Quando `hasSuccess && hasFailed`, definir `finalStatus = 'partial'` ou manter como `published` mas persistir o `error_log` com detalhes das plataformas que falharam. Atualmente o `error_log` só é guardado se TUDO falha. |
| 4 | `src/hooks/usePublishWithProgress.ts` | **Aumentar duração dos toasts de erro**: Em todos os `toast.error()` relacionados com publicação, definir `duration: 15000` (15 segundos). Erros de publicação são críticos e o utilizador precisa de tempo para ler. |
| 5 | `src/components/ui/sonner.tsx` | **Aumentar duração padrão dos toasts de erro**: Configurar o Sonner com `duration` padrão mais longo para erros (10s) via `toastOptions`. |
| 6 | `src/components/publishing/PublishProgressModal.tsx` | **Manter modal aberto em caso de erro**: Garantir que o modal NÃO fecha automaticamente quando há erros — o utilizador deve fechar manualmente. Verificar que o `isOpen` condition na ManualCreate.tsx não força o fecho quando `publishing = false` mas `phase2.status = 'error'`. |

### Detalhe técnico

**Mover criação do post para antes do upload** (ficheiro 1):
- Mover o bloco de criação do post (linhas 448-524) para logo depois da autenticação (após linha 342)
- O post é criado com `status: 'publishing'`, `template_a_images: ['']` (vazio inicialmente)
- Após o upload, atualizar o post com as URLs reais: `supabase.from('posts').update({ template_a_images: mediaUrls })`

**Registar erros pré-publicação** (ficheiro 2):
- Em cada `return false` precoce, adicionar:
```typescript
if (createdPostId) {
  await supabase.from('posts').update({
    status: 'failed',
    error_log: 'Erro no upload: ficheiro X',
    failed_at: new Date().toISOString(),
  }).eq('id', createdPostId);
}
```

**Erro parcial** (ficheiro 3):
- Quando `hasSuccess && hasFailed`, guardar no `error_log` os detalhes das plataformas que falharam:
```typescript
error_log: failedFormats.map(f => `${f.format}: ${f.errorMessage}`).join('; ')
```
- Isto permite ver no histórico exactamente o que falhou em cada rede.

**Toasts duradouros** (ficheiro 4-5):
- `toast.error('...', { duration: 15000 })` em todos os erros de publicação
- No Sonner global: `duration={10000}` apenas para o tipo error (via configuração)

