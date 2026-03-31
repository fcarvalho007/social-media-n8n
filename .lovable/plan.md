

## Diagnóstico: Estado Actual do Cloud Storage

### Resultados

**O storage DIMINUIU drasticamente.** A limpeza foi executada com sucesso:

| Métrica | Antes | Agora |
|---------|-------|-------|
| Ficheiros totais | 2,647 | **8** |
| Espaço estimado | ~4.1 GB | **~0 MB** |
| Buckets publications | 1,834 ficheiros | 3 ficheiros |
| Buckets pdfs | 812 ficheiros | 4 ficheiros |
| ai-generated-images | 1 ficheiro | 1 ficheiro |

**Redução de ~99.7% nos ficheiros.** O storage está praticamente limpo.

### Problemas identificados

1. **Bug: `totalStorageBytes` e `freedBytes` mostram 0 na UI** — O `file.metadata?.size` da API do storage não está a devolver o tamanho dos ficheiros restantes. A UI mostra "0 B" em vez do valor real. Isto torna os cards "Total utilizado" e "Eliminável" inúteis.

2. **Contagem inflada de "ficheiros a eliminar"** — O dry-run diz "4,594 ficheiros podem ser eliminados", mas na realidade só existem 8 ficheiros no storage. Os 4,594 vêm de URLs referenciadas nos posts da base de dados que apontam para ficheiros já eliminados. Isto confunde o utilizador.

3. **Posts antigos permanecem na base de dados** — Existem 2,302 posts publicados e 233 falhados com mais de 7 dias. Os ficheiros foram eliminados, mas os registos na BD ficaram. Não é um problema de espaço significativo, mas polui os dados.

4. **Comunicação na UI**: O texto "Serão eliminados aproximadamente 4594 ficheiros" no dialog de confirmação é enganador quando na realidade só há 8 ficheiros.

### Plano de refinamentos

| # | Ficheiro | Alteração |
|---|----------|-----------|
| 1 | `cleanup-storage/index.ts` | **Separar contagem real vs referências**: distinguir entre ficheiros que realmente existem no storage (via `listAllFiles`) e URLs de posts que referenciam ficheiros já inexistentes. Devolver `actualFilesInStorage` e `referencedUrls` separadamente. |
| 2 | `cleanup-storage/index.ts` | **Corrigir bytes**: usar `file.metadata?.size ?? file.metadata?.contentLength ?? 0` como fallback para o tamanho. Se mesmo assim for 0, tentar obter o tamanho via header de download individual (apenas para os poucos ficheiros restantes). |
| 3 | `QuotaSettings.tsx` | **Mostrar contagens reais**: exibir "X ficheiros no storage" em vez da contagem inflada de URLs. Quando `totalStorageBytes` é 0 mas há ficheiros, mostrar "tamanho indisponível" em vez de "0 B". |
| 4 | `QuotaSettings.tsx` | **Melhorar comunicação**: quando o storage está quase vazio (< 10 ficheiros), mostrar um estado de "Storage limpo" com ícone de sucesso, em vez de apresentar os mesmos cards de limpeza. |
| 5 | `QuotaSettings.tsx` | **Atualizar dialog de confirmação**: mostrar apenas a contagem real de ficheiros existentes no storage, não as referências de posts. |

### Detalhe técnico

**Contagem real vs referências**: O cleanup passará a devolver:
- `storageFilesCount`: total de ficheiros que realmente existem nos buckets
- `storageFilesToDelete`: ficheiros no storage com mais de 7 dias (os únicos que serão eliminados)
- `postReferencesCount`: URLs de posts que apontam para ficheiros (informativo, podem já não existir)

O `filesToDelete` no resultado principal passará a usar apenas `storageFilesToDelete`.

**UI "Storage limpo"**: Quando `storageFilesCount < 10` e `storageFilesToDelete === 0`, a UI mostra um card com `CheckCircle` verde e a mensagem "O storage está limpo — apenas X ficheiros recentes".

