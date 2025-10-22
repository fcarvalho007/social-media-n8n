import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Hash } from 'lucide-react';

interface CaptionEditorProps {
  initialCaption: string;
  initialHashtags: string[];
  onChange: (caption: string, hashtags: string[]) => void;
}

export const CaptionEditor = ({ initialCaption, initialHashtags, onChange }: CaptionEditorProps) => {
  const [caption, setCaption] = useState(initialCaption);
  const maxCaptionLength = 2200;

  // Sync internal state when initialCaption prop changes
  useEffect(() => {
    setCaption(initialCaption);
  }, [initialCaption]);

  useEffect(() => {
    // Extract hashtags from caption text
    const hashtagMatches = caption.match(/#[\w\u00C0-\u017F]+/g);
    onChange(caption, hashtagMatches ? hashtagMatches : []);
  }, [caption, onChange]);

  const getSuggestedHashtags = (): string[] => {
    const text = caption.toLowerCase();
    const suggestions: string[] = [];
    const hashtagMatches = caption.match(/#[\w\u00C0-\u017F]+/g);
    const existingHashtags: string[] = hashtagMatches ? hashtagMatches : [];
    
    const hashtagMap: { [key: string]: string[] } = {
      'marketing': ['#marketingdigital', '#marketing', '#marketingdeconteudo', '#estrategiadigital'],
      'digital': ['#marketingdigital', '#transformacaodigital', '#negociosdigitais', '#vendasonline'],
      'redes sociais': ['#redessociais', '#socialmedia', '#gestaoderedes', '#contentcreator'],
      'conteúdo': ['#conteudodigital', '#criadordeconteudo', '#marketingdeconteudo', '#contentmarketing'],
      'negócios': ['#empreendedorismo', '#negocios', '#empresas', '#gestao'],
      'vendas': ['#vendas', '#vendasonline', '#conversao', '#funil'],
      'instagram': ['#instagram', '#insta', '#instagrammarketing', '#instagramtips'],
      'estratégia': ['#estrategia', '#planejamento', '#estrategiadigital', '#plano'],
      'crescimento': ['#crescimento', '#crescimentopessoal', '#crescimentoprofissional', '#resultados'],
      'tráfego': ['#trafegopago', '#anuncios', '#ads', '#googleads'],
    };

    Object.entries(hashtagMap).forEach(([keyword, tags]) => {
      if (text.includes(keyword)) {
        tags.forEach(tag => {
          if (!suggestions.includes(tag) && !existingHashtags.includes(tag)) {
            suggestions.push(tag);
          }
        });
      }
    });

    // Adicionar hashtags gerais se não houver muitas sugestões
    const generalHashtags = [
      '#marketingdigital', '#empreendedorismo', '#negocios', 
      '#redessociais', '#conteudodigital', '#estrategiadigital'
    ];
    
    generalHashtags.forEach(tag => {
      if (!suggestions.includes(tag) && !existingHashtags.includes(tag) && suggestions.length < 8) {
        suggestions.push(tag);
      }
    });

    return suggestions.slice(0, 12);
  };

  const addHashtag = (tag: string) => {
    const hashtagMatches = caption.match(/#[\w\u00C0-\u017F]+/g);
    const existingHashtags: string[] = hashtagMatches ? hashtagMatches : [];
    if (!existingHashtags.includes(tag)) {
      setCaption(prev => prev + (prev.endsWith(' ') || prev.endsWith('\n') || !prev ? '' : ' ') + tag);
    }
  };

  const handleRestore = () => {
    setCaption(initialCaption);
  };

  const suggestedHashtags = getSuggestedHashtags();

  return (
    <div className="space-y-4 sm:space-y-6 rounded-lg sm:rounded-xl border border-border bg-card p-3 sm:p-4 md:p-6">
      <div className="space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <Label htmlFor="caption" className="text-sm sm:text-base font-semibold">
            Legenda
          </Label>
          <div className="flex items-center gap-2">
            <span className={`text-xs sm:text-sm ${caption.length > maxCaptionLength ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
              {caption.length}/{maxCaptionLength}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRestore}
              className="whitespace-nowrap text-xs sm:text-sm h-8 sm:h-9 px-2 sm:px-3"
            >
              Restaurar original
            </Button>
          </div>
        </div>
        <Textarea
          id="caption"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          className="min-h-[150px] sm:min-h-[200px] resize-none text-sm sm:text-base"
          placeholder="Escreva a sua legenda do Instagram aqui... Adicione hashtags diretamente no texto ou clique nas recomendadas abaixo."
        />
      </div>

      {suggestedHashtags.length > 0 && (
        <div className="space-y-3 sm:space-y-4">
          <div className="flex items-center gap-2">
            <Hash className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
            <Label className="text-xs sm:text-sm font-medium text-muted-foreground">
              Hashtags Recomendadas
            </Label>
          </div>
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {suggestedHashtags.map((tag) => (
              <Button
                key={tag}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addHashtag(tag)}
                className="h-7 sm:h-9 text-xs sm:text-sm px-2 sm:px-3 hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                {tag}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
