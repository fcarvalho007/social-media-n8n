import { useState } from 'react';
import { Sparkles, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { AICreditsBadge } from '@/components/ai/AICreditsBadge';
import { useAiPreferences } from '@/hooks/ai/useAiPreferences';

export default function AISettings() {
  const { preferences, loading, savePreferences } = useAiPreferences();
  const [saving, setSaving] = useState(false);

  const updatePreference = async (patch: Partial<typeof preferences>) => {
    setSaving(true);
    try {
      await savePreferences(patch);
      toast.success('Preferências de IA guardadas');
    } catch {
      toast.error('Não foi possível guardar as preferências de IA');
    } finally {
      setSaving(false);
    }
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

      <Card>
        <CardHeader>
          <CardTitle>Preferências de geração</CardTitle>
          <CardDescription>Define o comportamento predefinido das ações de IA.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Idioma das gerações</Label>
              <Select value={preferences.preferred_language} disabled={loading || saving} onValueChange={(value) => updatePreference({ preferred_language: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pt-PT">Português de Portugal</SelectItem>
                  <SelectItem value="en">Inglês</SelectItem>
                  <SelectItem value="es">Espanhol</SelectItem>
                  <SelectItem value="fr">Francês</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tom por defeito</Label>
              <Select value={preferences.default_tone} disabled={loading || saving} onValueChange={(value) => updatePreference({ default_tone: value as typeof preferences.default_tone })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
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
              <Label>Modelo preferido</Label>
              <Select value={preferences.preferred_model} disabled={loading || saving} onValueChange={(value) => updatePreference({ preferred_model: value as typeof preferences.preferred_model })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fast">Rápido — mais económico</SelectItem>
                  <SelectItem value="smart">Melhor qualidade — consome mais créditos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <PreferenceToggle
              label="Ativar banners de insights"
              description="Permite mostrar recomendações editoriais quando existirem dados suficientes."
              checked={preferences.insights_enabled}
              disabled={loading || saving}
              onCheckedChange={(checked) => updatePreference({ insights_enabled: checked })}
            />
            <PreferenceToggle
              label="Gerar alt text automaticamente"
              description="Prepara texto alternativo para imagens quando uma feature de publicação o pedir."
              checked={preferences.auto_alt_text}
              disabled={loading || saving}
              onCheckedChange={(checked) => updatePreference({ auto_alt_text: checked })}
            />
            <PreferenceToggle
              label="Gerar primeiro comentário automaticamente"
              description="Permite preparar uma sugestão de primeiro comentário em fluxos futuros."
              checked={preferences.auto_first_comment}
              disabled={loading || saving}
              onCheckedChange={(checked) => updatePreference({ auto_first_comment: checked })}
            />
          </div>

          <div className="flex justify-end">
            <Button type="button" variant="outline" className="gap-2" disabled>
              <Save className="h-4 w-4" />
              Guardado automaticamente
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
  return (
    <div className="flex items-center justify-between gap-4 rounded-md border border-border p-4">
      <div className="space-y-1">
        <Label className="text-sm font-medium">{label}</Label>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} disabled={disabled} onCheckedChange={onCheckedChange} />
    </div>
  );
}
