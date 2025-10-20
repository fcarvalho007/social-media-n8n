import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Hash } from 'lucide-react';

interface CaptionEditorProps {
  initialCaption: string;
  initialHashtags: string[];
  onChange: (caption: string, hashtags: string[]) => void;
}

export const CaptionEditor = ({ initialCaption, initialHashtags, onChange }: CaptionEditorProps) => {
  const [caption, setCaption] = useState(initialCaption);
  const [hashtags, setHashtags] = useState<string[]>(initialHashtags);

  const maxCaptionLength = 2200;

  useEffect(() => {
    onChange(caption, hashtags);
  }, [caption, hashtags]);

  const getSuggestedHashtags = (): string[] => {
    const text = caption.toLowerCase();
    const suggestions: string[] = [];
    
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
          if (!suggestions.includes(tag) && !hashtags.includes(tag)) {
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
      if (!suggestions.includes(tag) && !hashtags.includes(tag) && suggestions.length < 8) {
        suggestions.push(tag);
      }
    });

    return suggestions.slice(0, 12);
  };

  const addHashtag = (tag: string) => {
    if (!hashtags.includes(tag)) {
      setHashtags([...hashtags, tag]);
    }
  };

  const removeHashtag = (tagToRemove: string) => {
    setHashtags(hashtags.filter(tag => tag !== tagToRemove));
  };

  const handleRestore = () => {
    setCaption(initialCaption);
    setHashtags(initialHashtags);
  };

  const suggestedHashtags = getSuggestedHashtags();

  return (
    <div className="space-y-6 rounded-xl border border-border bg-card p-6">
      <div className="space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <Label htmlFor="caption" className="text-base font-semibold">
            Legenda
          </Label>
          <div className="flex items-center gap-2">
            <span className={`text-sm ${caption.length > maxCaptionLength ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
              {caption.length}/{maxCaptionLength}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRestore}
              className="whitespace-nowrap"
            >
              Restaurar original
            </Button>
          </div>
        </div>
        <Textarea
          id="caption"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          className="min-h-[150px] resize-none"
          placeholder="Escreva a sua legenda do Instagram aqui..."
        />
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Label className="text-base font-semibold">
            Hashtags Selecionadas
          </Label>
          <Badge variant="outline" className="text-xs">
            {hashtags.length}
          </Badge>
        </div>
        
        <div className="flex flex-wrap gap-2 min-h-[40px] p-3 rounded-lg bg-muted/50">
          {hashtags.length > 0 ? (
            hashtags.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="gap-1 px-3 py-1.5 text-sm"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeHashtag(tag)}
                  className="ml-1 hover:text-destructive transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">Clique nas hashtags recomendadas para adicionar</p>
          )}
        </div>

        {suggestedHashtags.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Hash className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm font-medium text-muted-foreground">
                Hashtags Recomendadas
              </Label>
            </div>
            <div className="flex flex-wrap gap-2">
              {suggestedHashtags.map((tag) => (
                <Button
                  key={tag}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addHashtag(tag)}
                  className="h-9 text-sm hover:bg-primary hover:text-primary-foreground transition-colors"
                >
                  {tag}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
