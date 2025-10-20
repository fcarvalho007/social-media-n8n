import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
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
      let pdfBase64 = null;
      let pdfFilename = null;

      // If PDF is uploaded, convert to base64
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
        pdfBase64 = await base64Promise;
      }

      // Call edge function to handle submission
      const payload = {
        content_text: contentText.trim() || null,
        pdf_base64: pdfBase64,
        pdf_filename: pdfFilename,
        submitted_by: user?.email || 'unknown',
      };

      console.log('Submitting publication via edge function...');

      const { data, error } = await supabase.functions.invoke('submit-publication', {
        body: payload,
      });

      if (error) {
        throw error;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      toast({
        title: 'Sucesso',
        description: data?.message || 'Publicação enviada com sucesso!',
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
