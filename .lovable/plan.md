

## Plano: Retenção máxima de 7 dias no Storage

### Alterações

| Ficheiro | O quê |
|----------|-------|
| `supabase/functions/cleanup-storage/index.ts` | Alterar os limites de 30/90 dias para **7 dias** — todos os ficheiros (failed e published) com mais de 7 dias são eliminados |
| `src/pages/QuotaSettings.tsx` | Atualizar a descrição do card para refletir a política de 7 dias. Adicionar um banner/alerta informativo permanente com a política de retenção: _"Todos os ficheiros (imagens, vídeos e PDFs) são automaticamente eliminados após 7 dias para manter o sistema sustentável"_ |

### Detalhe técnico

1. **cleanup-storage/index.ts**: Substituir `thirtyDaysAgo` e `ninetyDaysAgo` por uma única variável `sevenDaysAgo`. Aplicar o mesmo filtro a posts falhados E publicados — ambos com `< 7 dias`.

2. **QuotaSettings.tsx**: Adicionar um `Alert` (com ícone `Clock` ou `Info`) acima do card de limpeza com a política de retenção visível. Atualizar o `CardDescription` de "30/90 dias" para "7 dias".

