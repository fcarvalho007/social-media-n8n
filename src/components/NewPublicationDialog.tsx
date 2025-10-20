import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Upload } from 'lucide-react';

export const NewPublicationDialog = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [contentText, setContentText] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        toast({
          title: 'Erro',
          description: 'Por favor, selecione apenas ficheiros PDF.',
          variant: 'destructive',
        });
        return;
      }
      if (file.size > 100 * 1024 * 1024) { // 100MB
        toast({
          title: 'Erro',
          description: 'O ficheiro não pode exceder 100MB.',
          variant: 'destructive',
        });
        return;
      }
      setPdfFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation: at least one field must be filled
    if (!contentText.trim() && !pdfFile) {
      toast({
        title: 'Erro de validação',
        description: 'Por favor, preencha o conteúdo em texto ou carregue um PDF.',
        variant: 'destructive',
      });
      return;
    }

    if (contentText.length > 5000) {
      toast({
        title: 'Erro de validação',
        description: 'O conteúdo não pode exceder 5000 caracteres.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      let pdfUrl = null;
      let pdfFilename = null;

      // If PDF is uploaded, convert to base64 and send directly to n8n
      if (pdfFile) {
        pdfFilename = pdfFile.name;
        const reader = new FileReader();
        
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onload = () => {
            const base64 = reader.result as string;
            // Remove the data:application/pdf;base64, prefix
            const base64Data = base64.split(',')[1];
            resolve(base64Data);
          };
          reader.onerror = reject;
        });

        reader.readAsDataURL(pdfFile);
        const base64Data = await base64Promise;
        pdfUrl = base64Data;
      }

      // Send to n8n webhook
      const payload = {
        content_text: contentText.trim() || null,
        pdf_url: pdfUrl,
        pdf_filename: pdfFilename,
        source: 'lovable_form',
        submitted_at: new Date().toISOString(),
        submitted_by: user?.email || 'unknown',
      };

      console.log('Sending to n8n:', { ...payload, pdf_url: pdfUrl ? '[BASE64_DATA]' : null });

      const response = await fetch(
        'https://n8n.srv881120.hstgr.cloud/webhook/nova-publicacao-lovable',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        throw new Error('Falha ao enviar para o n8n');
      }

      toast({
        title: 'Sucesso',
        description: 'Publicação enviada com sucesso!',
      });

      // Reset form and close
      setContentText('');
      setPdfFile(null);
      setOpen(false);
    } catch (error) {
      console.error('Error submitting publication:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao enviar a publicação. Por favor, tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Nova Publicação
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>🎪🎡🎢 Carrossel Automático para Instagram n8n</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground pt-2">
            O nome, o email e a foto associados à sua Conta Google serão registados quando carregar ficheiros e enviar este formulário
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
          <div className="space-y-2">
            <Label htmlFor="content">Conteúdo</Label>
            <Textarea
              id="content"
              placeholder="A sua resposta"
              value={contentText}
              onChange={(e) => setContentText(e.target.value)}
              maxLength={5000}
              rows={8}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              {contentText.length}/5000 caracteres
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pdf">Carregar PDF</Label>
            <div className="flex items-center gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById('pdf-input')?.click()}
                className="w-full"
              >
                <Upload className="h-4 w-4 mr-2" />
                {pdfFile ? pdfFile.name : 'Adicionar ficheiro'}
              </Button>
              <input
                id="pdf-input"
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
            {pdfFile && (
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{(pdfFile.size / (1024 * 1024)).toFixed(2)} MB</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setPdfFile(null)}
                  className="h-auto p-0 text-xs"
                >
                  Remover
                </Button>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setOpen(false);
                setContentText('');
                setPdfFile(null);
              }}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  A enviar...
                </>
              ) : (
                'Obter link'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
