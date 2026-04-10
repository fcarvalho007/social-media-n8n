

## Diagnóstico claro de erros no upload — saber sempre o motivo

### Problema actual

Quando o upload falha, o toast diz apenas "Falha no upload do ficheiro 1. Verifique o histórico para detalhes." e o `error_log` guarda a mensagem técnica do storage (ex: `Invalid key`). O utilizador não sabe se é nome do ficheiro, tamanho, dimensão ou formato.

### Plano

| # | Ficheiro | Alteração |
|---|----------|-----------|
| 1 | `src/hooks/usePublishWithProgress.ts` | **Diagnóstico inteligente de erros de upload**: Quando o upload falha, analisar o erro e gerar uma mensagem clara com a causa provável. Criar função `diagnoseUploadError(file, error, safeName)` que verifica: (a) Se o erro contém "Invalid key" → "Nome do ficheiro incompatível"; (b) Se `file.size` excede 4MB (imagem) ou 650MB (vídeo) → "Ficheiro demasiado grande (Xmb, máx Ymb)"; (c) Se o tipo MIME não é suportado → "Formato não suportado (.xyz)"; (d) Outros → mensagem técnica original. |
| 2 | `src/hooks/usePublishWithProgress.ts` | **Toast com causa específica**: Substituir o toast genérico por um que mostra a causa: `toast.error('Causa: Nome do ficheiro contém caracteres inválidos. O nome original "riverside_v1_[editado]..." foi corrigido mas o upload falhou.', { duration: 15000 })` |
| 3 | `src/hooks/usePublishWithProgress.ts` | **Error log enriquecido**: Guardar no `error_log` um objecto legível com: `causa`, `nome_original`, `nome_sanitizado`, `tamanho_mb`, `tipo`, `mensagem_tecnica`. |
| 4 | `src/lib/publishingErrors.ts` | **Adicionar classificações de upload**: Novos tipos `filename_invalid`, `file_too_large`, `file_format_unsupported` com mensagens claras e acções sugeridas (ex: "Renomeie o ficheiro removendo caracteres especiais como [ ] e acentos"). |
| 5 | `src/pages/PublicationHistory.tsx` | **Mostrar causa no card de erro**: Quando o `error_log` tem informação estruturada de upload, mostrar a causa e sugestão directamente no card expandido em vez de apenas o texto técnico. |

### Detalhe técnico

**Função de diagnóstico (ponto 1)**:
```typescript
function diagnoseUploadError(file: File, error: any, safeName: string): {
  causa: string;
  detalhe: string;
  sugestao: string;
} {
  const msg = error?.message?.toLowerCase() || '';
  const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
  const isVideo = file.type.startsWith('video/');
  const maxMB = isVideo ? 650 : 4;

  if (msg.includes('invalid key')) {
    return {
      causa: 'Nome do ficheiro incompatível',
      detalhe: `"${file.name}" contém caracteres especiais ([], espaços, acentos)`,
      sugestao: 'Renomeie o ficheiro usando apenas letras, números e hífens',
    };
  }
  if (file.size > maxMB * 1024 * 1024) {
    return {
      causa: 'Ficheiro demasiado grande',
      detalhe: `${sizeMB}MB (máximo: ${maxMB}MB para ${isVideo ? 'vídeos' : 'imagens'})`,
      sugestao: `Reduza o tamanho do ficheiro para menos de ${maxMB}MB`,
    };
  }
  // ... tipo MIME, etc.
}
```

**Toast melhorado**:
```
❌ Upload falhou: Nome do ficheiro incompatível
   "riverside_v1_[editado]..." → Renomeie sem caracteres especiais
```

### Resultado esperado

Quando um upload falhar, o utilizador vê imediatamente:
- **O quê** falhou (nome, tamanho, formato)
- **Porquê** (mensagem clara, não técnica)
- **Como resolver** (acção concreta)

Tanto no toast imediato como no histórico de publicações.

