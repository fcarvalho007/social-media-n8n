import { useEffect, useState } from 'react';
import { FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

export function CapaDocumento({ capa, capaUrl, titulo, grande = false, galeria = false, decorativa = false }: { capa?: Blob; capaUrl?:string; titulo: string; grande?: boolean; galeria?: boolean; decorativa?: boolean }) {
  const [url, setUrl] = useState<string | null>(null); const [erro, setErro] = useState(false);
  useEffect(() => { setErro(false); if (!capa) { setUrl(capaUrl??null); return; } const u = URL.createObjectURL(capa); setUrl(u); return () => URL.revokeObjectURL(u); }, [capa,capaUrl]);
  return <div className={cn('flex shrink-0 items-center justify-center overflow-hidden rounded-md bg-card', galeria ? 'h-full w-full' : grande ? 'aspect-[3/4] w-28 sm:w-36' : 'aspect-[3/4] w-12')}>
    {url && !erro ? <img src={url} alt={decorativa ? '' : `Primeira página de ${titulo}`} width={600} height={800} className="h-full w-full object-contain" loading="lazy" onError={() => setErro(true)} /> : <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-muted/50 p-2 text-muted-foreground"><FileText className="size-6" aria-hidden="true" />{(grande || galeria) && <span className="text-center text-xs">{erro ? 'Capa indisponível' : 'Sem capa'}</span>}</div>}
  </div>;
}
