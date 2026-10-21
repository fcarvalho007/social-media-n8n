import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

export function AvisoResultados({titulo,ocupado,repetir}:{titulo:string;ocupado:boolean;repetir:()=>void}) {
  return <section className="hub-page"><h1 className="text-3xl font-semibold tracking-tight">{titulo}</h1>
    <Alert variant="destructive" className="text-aviso-texto"><AlertTitle>Não foi possível carregar os resultados</AlertTitle><AlertDescription><p>Os resultados ficam indisponíveis até ser possível consultar publicações e perfis. Uma falha de leitura não significa que tenhas zero resultados.</p><Button variant="outline" className="mt-3 min-h-11 text-foreground" disabled={ocupado} onClick={repetir}>{ocupado?'A atualizar…':'Tentar novamente'}</Button></AlertDescription></Alert>
  </section>;
}
