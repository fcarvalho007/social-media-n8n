import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import {
  detectOversizedImages,
  compressOversizedFiles,
  OversizedImage,
} from '@/lib/canvas/imageCompression';

export type CompressionStep = 'warning' | 'compressing' | 'confirmation';

export interface CompressionResult {
  originalSizeMB: number;
  finalSizeMB: number;
  qualityUsed: number;
  wasResized: boolean;
}

interface UseImageCompressionOptions {
  /**
   * Limite em MB acima do qual a imagem é considerada "oversized".
   * Default: 4 (Instagram).
   */
  maxSizeMB?: number;
}

/**
 * useImageCompression
 * -------------------
 * Encapsula todo o fluxo de detecção + compressão de imagens demasiado grandes
 * (típico do Instagram, com limite de 4 MB por ficheiro). Mantém o estado
 * em 3 fases (`warning` → `compressing` → `confirmation`) e o conjunto de
 * ficheiros comprimidos pendentes até ao utilizador confirmar a publicação.
 *
 * Extraído de `src/pages/ManualCreate.tsx` (Fase 2 do refactor) para permitir
 * reutilização em fluxos futuros (ex.: Recovery, republicação de falhas).
 *
 * Uso típico em `ManualCreate`:
 *
 *   const compression = useImageCompression();
 *   // ...
 *   if (instagramSelected) {
 *     const triggered = compression.requestCompressionIfNeeded(files);
 *     if (triggered) return; // espera confirmação no modal
 *   }
 *   await actuallyPublish(files);
 *
 *   // No modal:
 *   <ImageCompressionConfirmModal
 *     {...compression.modalProps}
 *     onConfirm={() => compression.runCompression(mediaFiles)}
 *     onConfirmPublish={async () => {
 *       const compressed = compression.acceptCompressedFiles();
 *       setMediaFiles(compressed);
 *       await actuallyPublish(compressed);
 *     }}
 *     onClose={compression.cancel}
 *     totalMediaCount={mediaFiles.length}
 *   />
 */
export function useImageCompression(
  options: UseImageCompressionOptions = {},
) {
  const maxSizeMB = options.maxSizeMB ?? 4;

  const [modalOpen, setModalOpen] = useState(false);
  const [oversizedImages, setOversizedImages] = useState<OversizedImage[]>([]);
  const [isCompressing, setIsCompressing] = useState(false);
  const [progress, setProgress] = useState<
    { current: number; total: number; fileName: string } | undefined
  >();
  const [step, setStep] = useState<CompressionStep>('warning');
  const [results, setResults] = useState<CompressionResult[]>([]);
  const [pendingCompressedFiles, setPendingCompressedFiles] = useState<File[]>(
    [],
  );

  /**
   * Verifica se há imagens oversized e, se houver, abre o modal e devolve
   * `true` para o caller saber que deve interromper o fluxo de publicação.
   * Devolve `false` se não houver nada a comprimir.
   */
  const requestCompressionIfNeeded = useCallback(
    (files: File[]): boolean => {
      const oversized = detectOversizedImages(files, maxSizeMB);
      if (oversized.length === 0) return false;

      console.debug('[manual-create:compression] oversized detected', {
        count: oversized.length,
        maxSizeMB,
      });
      setOversizedImages(oversized);
      setModalOpen(true);
      return true;
    },
    [maxSizeMB],
  );

  /**
   * Executa efectivamente a compressão. Chamar quando o utilizador clicar
   * "Comprimir e Continuar" no modal. Avança o `step` para `confirmation`
   * em sucesso ou volta a `warning` em erro.
   */
  const runCompression = useCallback(
    async (mediaFiles: File[]): Promise<void> => {
      setIsCompressing(true);
      setStep('compressing');

      try {
        const indicesToCompress = oversizedImages.map(img => img.index);

        const { files: compressedFiles, results: compressionResults } =
          await compressOversizedFiles(
            mediaFiles,
            indicesToCompress,
            maxSizeMB,
            (current, total, fileName) => {
              setProgress({ current, total, fileName });
            },
          );

        setPendingCompressedFiles(compressedFiles);
        setResults(compressionResults);
        setIsCompressing(false);
        setStep('confirmation');

        console.debug('[manual-create:compression] completed', {
          compressedCount: compressionResults.length,
          totalSavedMB: compressionResults.reduce(
            (acc, r) => acc + (r.originalSizeMB - r.finalSizeMB),
            0,
          ),
        });
      } catch (error) {
        console.error('[manual-create:compression] failed', error);
        toast.error('Erro ao comprimir imagens');
        setIsCompressing(false);
        setProgress(undefined);
        setStep('warning');
      }
    },
    [oversizedImages, maxSizeMB],
  );

  /**
   * Aceita os ficheiros comprimidos pendentes e devolve-os ao caller para
   * continuar o fluxo de publicação. Limpa o estado interno e fecha o modal.
   */
  const acceptCompressedFiles = useCallback((): File[] => {
    const compressed = pendingCompressedFiles;
    const totalSaved = results.reduce(
      (acc, r) => acc + (r.originalSizeMB - r.finalSizeMB),
      0,
    );

    setModalOpen(false);
    setOversizedImages([]);
    setStep('warning');
    setResults([]);
    setProgress(undefined);
    setPendingCompressedFiles([]);

    toast.success(`${results.length} imagem(ns) comprimida(s)`, {
      description: `Poupou ${totalSaved.toFixed(1)}MB`,
    });

    return compressed;
  }, [pendingCompressedFiles, results]);

  /**
   * Cancela. No `step="confirmation"` volta a `warning` (utilizador pode
   * tentar de novo); caso contrário fecha o modal completamente.
   */
  const cancel = useCallback(() => {
    if (isCompressing) return;

    if (step === 'confirmation') {
      setStep('warning');
      setResults([]);
      setPendingCompressedFiles([]);
      return;
    }

    setModalOpen(false);
    setOversizedImages([]);
    setStep('warning');
  }, [isCompressing, step]);

  return {
    /** Para spread directo no `<ImageCompressionConfirmModal>` */
    modalProps: {
      open: modalOpen,
      oversizedImages,
      isCompressing,
      compressionProgress: progress,
      step,
      compressionResults: results,
    },
    requestCompressionIfNeeded,
    runCompression,
    acceptCompressedFiles,
    cancel,
    isCompressing,
  };
}
