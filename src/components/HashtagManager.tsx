import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Hash } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface HashtagManagerProps {
  hashtags: string[];
  onChange: (hashtags: string[]) => void;
  caption: string;
}

export const HashtagManager = ({ hashtags, onChange, caption }: HashtagManagerProps) => {
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
      onChange([...hashtags, tag]);
    }
  };

  const removeHashtag = (tag: string) => {
    onChange(hashtags.filter(h => h !== tag));
  };

  const suggestedHashtags = getSuggestedHashtags();

  return (
    <div className="space-y-3 mt-4">
      {/* Current Hashtags */}
      {hashtags.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Hashtags Selecionadas</Label>
          <div className="flex flex-wrap gap-2">
            {hashtags.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground transition-colors"
                onClick={() => removeHashtag(tag)}
              >
                {tag} ✕
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Suggested Hashtags */}
      {suggestedHashtags.length > 0 && (
        <div className="space-y-2">
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
                className="h-8 text-xs hover:bg-primary hover:text-primary-foreground transition-colors"
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
