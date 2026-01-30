
## Plano: Modal de Compressão com Etapa de Confirmação

### Problema Identificado

O modal atual fecha automaticamente após a compressão e inicia a publicação sem dar ao utilizador a oportunidade de verificar se as imagens foram correctamente processadas. Isto cria incerteza sobre o que está realmente a ser enviado.

---

### Solução: Fluxo de 2 Etapas

Adicionar uma **etapa de confirmação** ao modal de compressão:

```text
┌──────────────────────────────────────────────────────┐
│ ETAPA 1: Aviso de Compressão                        │
│ ────────────────────────────────────────────────────│
│ ⚠️ Imagens Excedem Limite de 4MB                   │
│                                                      │
│ ┌──────┐ Imagem 1        7.2 MB                     │
│ │ 📷   │ Excede o limite em 3.2 MB                  │
│ └──────┘                                             │
│ ┌──────┐ Imagem 5        5.8 MB                     │
│ │ 📷   │ Excede o limite em 1.8 MB                  │
│ └──────┘                                             │
│                                                      │
│        [Cancelar]  [Comprimir Imagens]              │
└──────────────────────────────────────────────────────┘
                        ↓
┌──────────────────────────────────────────────────────┐
│ ETAPA 2: Confirmação Pós-Compressão                 │
│ ────────────────────────────────────────────────────│
│ ✅ Compressão Concluída                             │
│                                                      │
│ ┌──────┐ Imagem 1                                   │
│ │  ✓   │ 7.2 MB → 3.8 MB ✓ (qualidade: 85%)        │
│ └──────┘ Poupou 3.4 MB                              │
│                                                      │
│ ┌──────┐ Imagem 5                                   │
│ │  ✓   │ 5.8 MB → 2.1 MB ✓ (qualidade: 75%)        │
│ └──────┘ Poupou 3.7 MB                              │
│                                                      │
│ ╭────────────────────────────────────────────╮      │
│ │ 📊 10 imagens prontas para publicação      │      │
│ │ Total poupado: 7.1 MB                      │      │
│ ╰────────────────────────────────────────────╯      │
│                                                      │
│    [← Voltar]  [✓ Confirmar e Publicar]             │
└──────────────────────────────────────────────────────┘
```

---

### Alterações Técnicas

#### Alteração 1: Estado para Controlar Etapas do Modal

**Ficheiro: `src/pages/ManualCreate.tsx`**

Adicionar novo estado:

```tsx
// Estado para rastrear a etapa do modal
const [compressionStep, setCompressionStep] = useState<'warning' | 'compressing' | 'confirmation'>('warning');
const [compressionResults, setCompressionResults] = useState<CompressionResult[]>([]);
const [compressedFiles, setCompressedFiles] = useState<File[]>([]);
```

#### Alteração 2: Modificar `handleConfirmCompression` para Não Publicar Imediatamente

```tsx
const handleConfirmCompression = async () => {
  setIsCompressing(true);
  setCompressionStep('compressing');
  
  try {
    const indicesToCompress = oversizedImages.map(img => img.index);
    
    const { files: compressedFiles, results } = await compressOversizedFiles(
      mediaFiles,
      indicesToCompress,
      4,
      (current, total, fileName) => {
        setCompressionProgress({ current, total, fileName });
      }
    );
    
    // Guardar resultados para mostrar na confirmação
    setCompressedFiles(compressedFiles);
    setCompressionResults(results);
    setIsCompressing(false);
    
    // Mudar para etapa de confirmação (NÃO fechar o modal)
    setCompressionStep('confirmation');
    
  } catch (error) {
    console.error('[ManualCreate] Compression failed:', error);
    toast.error('Erro ao comprimir imagens');
    setIsCompressing(false);
    setCompressionProgress(undefined);
    setCompressionStep('warning');
  }
};
```

#### Alteração 3: Nova Função para Confirmar e Publicar

```tsx
const handleConfirmAndPublish = async () => {
  // Actualizar ficheiros de mídia com versões comprimidas
  setMediaFiles(compressedFiles);
  
  // Fechar modal
  setCompressionModalOpen(false);
  setOversizedImages([]);
  setCompressionStep('warning');
  setCompressionResults([]);
  setCompressedFiles([]);
  setCompressionProgress(undefined);
  
  // Mostrar sucesso
  const totalSaved = compressionResults.reduce((acc, r) => acc + (r.originalSizeMB - r.finalSizeMB), 0);
  toast.success(`${compressionResults.length} imagem(ns) comprimida(s)`, {
    description: `Poupou ${totalSaved.toFixed(1)}MB`
  });
  
  // Continuar com publicação
  await handlePublishNow(compressedFiles);
};
```

#### Alteração 4: Modificar `handleCancelCompression`

```tsx
const handleCancelCompression = () => {
  if (!isCompressing) {
    // Se estiver na etapa de confirmação, voltar para warning
    if (compressionStep === 'confirmation') {
      setCompressionStep('warning');
      setCompressionResults([]);
      setCompressedFiles([]);
    } else {
      // Fechar completamente
      setCompressionModalOpen(false);
      setOversizedImages([]);
      setCompressionStep('warning');
    }
  }
};
```

---

#### Alteração 5: Actualizar o Modal para Mostrar Ambas as Etapas

**Ficheiro: `src/components/publishing/ImageCompressionConfirmModal.tsx`**

Expandir as props e lógica:

```tsx
interface ImageCompressionConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onConfirmPublish?: () => void; // Nova prop para confirmar publicação
  oversizedImages: OversizedImage[];
  isCompressing?: boolean;
  compressionProgress?: { current: number; total: number; fileName: string };
  step?: 'warning' | 'compressing' | 'confirmation'; // Nova prop
  compressionResults?: CompressionResult[]; // Nova prop
  totalMediaCount?: number; // Nova prop - total de ficheiros
}
```

**Lógica do Modal:**

```tsx
// Etapa 1: Warning (mostrar imagens que precisam compressão)
// Etapa 2: Compressing (progresso da compressão - já existe)
// Etapa 3: Confirmation (mostrar resultados e confirmar publicação)
```

**UI da Etapa de Confirmação:**

```tsx
{step === 'confirmation' && compressionResults && (
  <>
    <DialogHeader>
      <DialogTitle className="flex items-center gap-2 text-green-600">
        <CheckCircle className="h-5 w-5" />
        Compressão Concluída
      </DialogTitle>
      <DialogDescription>
        Todas as imagens foram comprimidas com sucesso. Verifique os resultados abaixo:
      </DialogDescription>
    </DialogHeader>

    <div className="my-4 space-y-3">
      {/* Lista de resultados */}
      <div className="rounded-lg border bg-muted/30 divide-y max-h-[200px] overflow-y-auto">
        {compressionResults.map((result, idx) => (
          <div key={idx} className="flex items-center gap-3 px-3 py-2.5">
            <div className="w-10 h-10 rounded bg-green-100 flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">Imagem {idx + 1}</span>
                <Badge variant="outline" className="text-green-600 border-green-200">
                  -{(result.originalSizeMB - result.finalSizeMB).toFixed(1)} MB
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {result.originalSizeMB.toFixed(1)} MB → {result.finalSizeMB.toFixed(1)} MB
                (qualidade: {Math.round(result.qualityUsed * 100)}%)
                {result.wasResized && ' • redimensionada'}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Resumo */}
      <div className="rounded-lg bg-green-50 dark:bg-green-950/30 p-3 border border-green-200 dark:border-green-800">
        <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
          <FileCheck className="h-4 w-4" />
          <span className="font-medium text-sm">
            {totalMediaCount} {totalMediaCount === 1 ? 'imagem pronta' : 'imagens prontas'} para publicação
          </span>
        </div>
        <p className="text-xs text-green-600 dark:text-green-500 mt-1">
          Espaço poupado: {compressionResults.reduce((acc, r) => acc + (r.originalSizeMB - r.finalSizeMB), 0).toFixed(1)} MB
        </p>
      </div>
    </div>

    <DialogFooter className="gap-2 sm:gap-0">
      <Button variant="outline" onClick={onClose}>
        ← Voltar
      </Button>
      <Button onClick={onConfirmPublish} className="gap-2">
        <CheckCircle className="h-4 w-4" />
        Confirmar e Publicar
      </Button>
    </DialogFooter>
  </>
)}
```

---

### Ficheiros a Alterar

| Ficheiro | Alterações |
|----------|------------|
| `src/pages/ManualCreate.tsx` | Novos estados, modificar handlers de compressão |
| `src/components/publishing/ImageCompressionConfirmModal.tsx` | Novas props, UI para etapa de confirmação |

---

### Resultado Esperado

1. **Transparência Total**: O utilizador vê exactamente quais imagens foram comprimidas e quanto espaço foi poupado
2. **Confirmação Explícita**: A publicação só avança após o utilizador confirmar que os resultados estão correctos
3. **Detalhes Técnicos**: Qualidade utilizada e se houve redimensionamento são visíveis
4. **Opção de Voltar**: Se algo parecer errado, o utilizador pode voltar atrás antes de publicar
