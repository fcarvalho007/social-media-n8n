

## Auditoria: Fiabilidade do Calendário

### Problemas identificados

| # | Problema | Gravidade |
|---|----------|-----------|
| 1 | **Eliminar rascunho falha silenciosamente** — `handleDelete` só gere tabelas `posts` e `stories`. Quando o utilizador clica "Eliminar" num evento de rascunho (vindo de `posts_drafts`), o sistema tenta eliminar da tabela `posts` com o ID do rascunho, que não existe lá. O delete retorna sem erro mas nada acontece. | Alta |
| 2 | **Botão "Editar" navega para rota errada em rascunhos** — Rascunhos são redirecionados para `/review/{id}`, que espera um post da tabela `posts`. Deveria navegar para `/manual-create?draft={id}`. | Alta |
| 3 | **Cache não é limpo imediatamente ao eliminar** — Após `handleDelete`, o `fetchScheduledContent()` actualiza o cache, mas se falhar (e.g. erro de rede), o cache antigo com o evento eliminado persiste. O utilizador verá o evento fantasma ao recarregar. | Média |
| 4 | **`scheduled_jobs` órfãos** — Quando um post agendado é eliminado do calendário, os registos em `scheduled_jobs` (se existirem) permanecem. Não causam problemas graves porque o edge function verifica existência do post, mas sujam a BD. | Baixa |
| 5 | **Diálogo de detalhes não distingue rascunhos** — O badge de status e a descrição do diálogo tratam rascunhos como posts normais ("Aprovada em..."), quando deveria dizer "Rascunho criado em...". | Média |

### Plano de correcção

| # | Ficheiro | Alteração |
|---|----------|-----------|
| 1 | `src/pages/Calendar.tsx` — `handleDelete` | Adicionar verificação: se `resource.status === 'draft'`, eliminar de `posts_drafts` em vez de `posts`/`stories`. Limpar cache localStorage imediatamente antes do refetch. |
| 2 | `src/pages/Calendar.tsx` — botão "Editar" | Se `resource.status === 'draft'`, navegar para `/manual-create?draft=${id}` em vez de `/review/${id}`. |
| 3 | `src/pages/Calendar.tsx` — `handleDelete` | Após a eliminação bem-sucedida, remover imediatamente o evento do state local (`setEvents(prev => prev.filter(...))`) e limpar o cache (`localStorage.removeItem(CACHE_KEY)`). Isto garante consistência instantânea mesmo sem o refetch. |
| 4 | `src/pages/Calendar.tsx` — `handleDelete` | Adicionar cleanup best-effort de `scheduled_jobs` quando se elimina um post: `supabase.from('scheduled_jobs').delete().eq('post_id', id)`. |
| 5 | `src/pages/Calendar.tsx` — diálogo de detalhes | Diferenciar texto da `DialogDescription` e badges para rascunhos: mostrar "Rascunho" com badge cinzento e data de criação em vez de "Aprovada/Agendada". |

### Detalhe técnico

**Ponto 1+3 — handleDelete corrigido:**
```typescript
const handleDelete = async (id: string, contentType: string) => {
  try {
    const isDraft = selectedEvent?.resource.status === 'draft';
    
    if (isDraft) {
      const { error } = await supabase.from('posts_drafts').delete().eq('id', id);
      if (error) throw error;
    } else {
      const table = contentType === 'stories' ? 'stories' : 'posts';
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
      // Cleanup orphaned scheduled_jobs
      if (table === 'posts') {
        await supabase.from('scheduled_jobs').delete().eq('post_id', id);
      }
    }
    
    // Optimistic: remove from local state immediately
    setEvents(prev => prev.filter(e => e.id !== id));
    localStorage.removeItem(CACHE_KEY);
    
    toast.success('Publicação eliminada com sucesso');
    setSelectedEvent(null);
    fetchScheduledContent();
  } catch (error) {
    toast.error('Falha ao eliminar item');
  }
};
```

**Ponto 2 — Editar rascunho:**
```typescript
onClick={() => {
  if (selectedEvent.resource.status === 'draft') {
    navigate(`/manual-create?draft=${selectedEvent.id}`);
  } else {
    const path = selectedEvent.resource.content_type === 'stories'
      ? `/review-story/${selectedEvent.id}`
      : `/review/${selectedEvent.id}`;
    navigate(path);
  }
  setSelectedEvent(null);
}}
```

**Ponto 5 — DialogDescription para rascunhos:**
```typescript
selectedEvent.resource.status === 'draft'
  ? `Rascunho criado em ${format(...)}`
  : // ...mensagem actual
```

5 correcções cirúrgicas, todas no mesmo ficheiro `Calendar.tsx`.

