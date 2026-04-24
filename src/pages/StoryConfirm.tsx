import { useMemo, useState } from 'react';
import { CheckCircle2, Clock3, Instagram, XCircle } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

type Action = 'published' | 'skipped' | 'later';

export default function StoryConfirm() {
  const [searchParams] = useSearchParams();
  const storyId = searchParams.get('id') ?? '';
  const token = searchParams.get('token') ?? '';
  const [loading, setLoading] = useState<Action | null>(null);
  const [done, setDone] = useState<Action | null>(null);

  const invalid = useMemo(() => !storyId || !token, [storyId, token]);

  const confirm = async (action: Action) => {
    if (invalid) return;
    setLoading(action);
    const { data, error } = await (supabase.rpc as any)('confirm_story_link_publication', {
      _story_id: storyId,
      _token: token,
      _action: action,
      _device: /Android/i.test(navigator.userAgent) ? 'android' : /iPhone|iPad/i.test(navigator.userAgent) ? 'ios' : 'web',
    });
    setLoading(null);
    if (error || data !== true) {
      toast.error('Este link de confirmação não é válido ou expirou.');
      return;
    }
    setDone(action);
    toast.success(action === 'published' ? 'Story marcada como publicada.' : action === 'later' ? 'Novo lembrete agendado.' : 'Story marcada como não publicada.');
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <Card className="w-full max-w-lg border-2 shadow-lg">
        <CardHeader className="text-center">
          <Badge variant="secondary" className="mx-auto mb-2 w-fit gap-2"><Instagram className="h-3.5 w-3.5" /> Story com Link</Badge>
          <CardTitle className="text-2xl">Confirmação da Story</CardTitle>
          <CardDescription>Atualiza o estado depois de adicionares o link sticker no Instagram.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {invalid ? (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">Link de confirmação incompleto.</div>
          ) : done ? (
            <div className="rounded-lg border border-success/40 bg-success/10 p-4 text-center text-sm text-success">
              <CheckCircle2 className="mx-auto mb-2 h-6 w-6" /> Estado atualizado com sucesso.
            </div>
          ) : (
            <div className="grid gap-3">
              <div className="hidden rounded-lg border bg-muted/30 p-4 text-center sm:block">
                <QRCodeSVG value={window.location.href} size={132} className="mx-auto rounded-md bg-background p-2" />
                <p className="mt-3 text-xs text-muted-foreground">Se estiveres no desktop, lê o QR code no telemóvel para confirmar depois de publicar.</p>
              </div>
              <Button type="button" className="min-h-12 gap-2" onClick={() => confirm('published')} disabled={!!loading}>
                <CheckCircle2 className="h-4 w-4" /> Publiquei
              </Button>
              <Button type="button" variant="outline" className="min-h-12 gap-2" onClick={() => confirm('later')} disabled={!!loading}>
                <Clock3 className="h-4 w-4" /> Lembrar daqui a 1 hora
              </Button>
              <Button type="button" variant="ghost" className="min-h-12 gap-2 text-muted-foreground" onClick={() => confirm('skipped')} disabled={!!loading}>
                <XCircle className="h-4 w-4" /> Não publiquei
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
