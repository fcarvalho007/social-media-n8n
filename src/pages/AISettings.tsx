import { useId, useState } from 'react';
import { Sparkles, Save, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { AICreditsBadge } from '@/components/ai/AICreditsBadge';
import { useAiPreferences } from '@/hooks/ai/useAiPreferences';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { normalizeHashtag } from '@/lib/hashtags/safety';

export default function AISettings() {
  const { preferences, loading, error, reload, savePreferences } = useAiPreferences();
  const [saving, setSaving] = useState(false);
  const [brandDraft, setBrandDraft] = useState('');

  const updatePreference = async (patch: Partial<typeof preferences>) => {
    setSaving(true);
    try {
      await savePreferences(patch);
      toast.success('Preferências de IA guardadas');
      return true;
    } catch {
      toast.error('Não foi possível guardar as preferências de IA');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const addBrandHashtag = async () => {
    const tag = normalizeHashtag(brandDraft);
    if (!tag || preferences.brand_hashtags.includes(tag) || preferences.brand_hashtags.length >= 5) return;
    if (await updatePreference({ brand_hashtags: [...preferences.brand_hashtags, tag] })) setBrandDraft('');
  };

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-3 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-normal">
            <Sparkles className="h-6 w-6 text-primary" />
            IA
          </h1>
          <p className="text-sm text-muted-foreground">Preferências transversais para gerações, insights e automações.</p>
        </div>
        <AICreditsBadge />
      </div>

      {error && <Alert variant="destructive"><AlertTitle>Preferências por confirmar</AlertTitle><AlertDescription className="space-y-3"><p>{error}</p><Button type="button" variant="outline" onClick={reload} disabled={loading || saving}><RefreshCw className="mr-2 h-4 w-4" />Recarregar preferências</Button></AlertDescription></Alert>}
      <Card>
        <CardHeader>
          <CardTitle>Preferências de geração</CardTitle>
          <CardDescription>Define o comportamento predefinido das ações de IA.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="ai-idioma">Idioma das gerações</Label>
              <Select value={preferences.preferred_language} disabled={!!error || loading || saving} onValueChange={(value) => updatePreference({ preferred_language: value })}>
                <SelectTrigger id="ai-idioma"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pt-PT">Português de Portugal</SelectItem>
                  <SelectItem value="en">Inglês</SelectItem>
                  <SelectItem value="es">Espanhol</SelectItem>
                  <SelectItem value="fr">Francês</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ai-tom">Tom por defeito</Label>
              <Select value={preferences.default_tone} disabled={!!error || loading || saving} onValueChange={(value) => updatePreference({ default_tone: value as typeof preferences.default_tone })}>
                <SelectTrigger id="ai-tom"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="neutro">Neutro</SelectItem>
                  <SelectItem value="direto">Direto</SelectItem>
                  <SelectItem value="emocional">Emocional</SelectItem>
                  <SelectItem value="técnico">Técnico</SelectItem>
                  <SelectItem value="humor">Humor</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="ai-modelo">Modelo preferido</Label>
              <Select value={preferences.preferred_model} disabled={!!error || loading || saving} onValueChange={(value) => updatePreference({ preferred_model: value as typeof preferences.preferred_model })}>
                <SelectTrigger id="ai-modelo"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fast">Rápido — mais económico</SelectItem>
                  <SelectItem value="smart">Melhor qualidade — consome mais créditos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <div>
              <Label htmlFor="ai-hashtag">Hashtags de marca</Label>
              <p className="text-sm text-muted-foreground">Até 5 hashtags fixas para sugestões editoriais.</p>
            </div>
            <div className="flex gap-2">
              <Input id="ai-hashtag" value={brandDraft} onChange={(event) => setBrandDraft(event.target.value)} placeholder="#aminhamarca" disabled={!!error || loading || saving || preferences.brand_hashtags.length >= 5} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addBrandHashtag(); } }} />
              <Button type="button" variant="outline" onClick={addBrandHashtag} disabled={!!error || loading || saving || preferences.brand_hashtags.length >= 5}>Adicionar</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {preferences.brand_hashtags.map((tag) => (
                <Badge key={tag} variant="secondary" className="gap-1">
                  {tag}
                  <button type="button" disabled={!!error || loading || saving} className="disabled:cursor-wait disabled:opacity-50" onClick={() => updatePreference({ brand_hashtags: preferences.brand_hashtags.filter(item => item !== tag) })} aria-label={`Remover ${tag}`}>×</button>
                </Badge>
              ))}
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <PreferenceToggle
              label="Usar as minhas publicações para gerar insights"
              description="Os insights são calculados apenas para a tua conta. Os dados nunca são partilhados com outros utilizadores nem usados para treinar modelos externos."
              checked={preferences.insights_enabled}
              disabled={!!error || loading || saving}
              onCheckedChange={(checked) => updatePreference({ insights_enabled: checked })}
            />
            <PreferenceToggle
              label="Gerar alt text automaticamente"
              description="Prepara texto alternativo para imagens quando uma feature de publicação o pedir."
              checked={preferences.auto_alt_text}
              disabled={!!error || loading || saving}
              onCheckedChange={(checked) => updatePreference({ auto_alt_text: checked })}
            />
            <PreferenceToggle
              label="Gerar primeiro comentário automaticamente"
              description="Permite preparar uma sugestão de primeiro comentário em fluxos futuros."
              checked={preferences.auto_first_comment}
              disabled={!!error || loading || saving}
              onCheckedChange={(checked) => updatePreference({ auto_first_comment: checked })}
            />
          </div>

          <div className="flex justify-end">
            <Button type="button" variant="outline" className="gap-2" disabled>
              <Save className="h-4 w-4" />
              {loading ? "A carregar preferências…" : saving ? "A guardar…" : error ? "Gravação por confirmar" : "As alterações são guardadas automaticamente"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PreferenceToggle({ label, description, checked, disabled, onCheckedChange }: {
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  const id = useId();
  return (
    <div className="flex items-center justify-between gap-4 rounded-md border border-border p-4">
      <div className="space-y-1">
        <Label htmlFor={id} className="text-sm font-medium">{label}</Label>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Switch id={id} checked={checked} disabled={disabled} onCheckedChange={onCheckedChange} />
    </div>
  );
}
