import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Save, RefreshCw, Trash2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface QuotaOverride {
  id?: string;
  instagram_used: number;
  instagram_limit: number;
  linkedin_used: number;
  linkedin_limit: number;
}

interface QuotaManagementProps {
  onQuotaChange?: () => void;
}

export function QuotaManagement({ onQuotaChange }: QuotaManagementProps) {
  const [quota, setQuota] = useState<QuotaOverride>({
    instagram_used: 0,
    instagram_limit: 5,
    linkedin_used: 0,
    linkedin_limit: 5,
  });
  const [hasOverride, setHasOverride] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadQuotaOverride();
  }, []);

  const loadQuotaOverride = async () => {
    setLoading(true);
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        toast.error('Utilizador não autenticado');
        return;
      }

      const { data: override, error: overrideError } = await supabase
        .from('quota_overrides')
        .select('*')
        .eq('user_id', userData.user.id)
        .maybeSingle();

      if (overrideError && overrideError.code !== 'PGRST116') {
        throw overrideError;
      }

      if (override) {
        setQuota({
          id: override.id,
          instagram_used: override.instagram_used,
          instagram_limit: override.instagram_limit,
          linkedin_used: override.linkedin_used,
          linkedin_limit: override.linkedin_limit,
        });
        setHasOverride(true);
      } else {
        setHasOverride(false);
      }
    } catch (error) {
      console.error('Erro ao carregar quota override:', error);
      toast.error('Falha ao carregar configurações de quota');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) {
        toast.error('Utilizador não autenticado');
        return;
      }

      const quotaData = {
        user_id: data.user.id,
        instagram_used: quota.instagram_used,
        instagram_limit: quota.instagram_limit,
        linkedin_used: quota.linkedin_used,
        linkedin_limit: quota.linkedin_limit,
      };

      if (hasOverride && quota.id) {
        // Update existing override
        const { error } = await supabase
          .from('quota_overrides')
          .update(quotaData)
          .eq('id', quota.id);

        if (error) throw error;
      } else {
        // Create new override
        const { data, error } = await supabase
          .from('quota_overrides')
          .insert(quotaData)
          .select()
          .single();

        if (error) throw error;

        setQuota({ ...quota, id: data.id });
        setHasOverride(true);
      }

      toast.success('Quota personalizada guardada com sucesso!');
      onQuotaChange?.();
    } catch (error) {
      console.error('Erro ao guardar quota override:', error);
      toast.error('Falha ao guardar quota personalizada');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!hasOverride || !quota.id) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('quota_overrides')
        .delete()
        .eq('id', quota.id);

      if (error) throw error;

      setQuota({
        instagram_used: 0,
        instagram_limit: 5,
        linkedin_used: 0,
        linkedin_limit: 5,
      });
      setHasOverride(false);
      toast.success('Quota personalizada removida. A aplicação voltará a usar a quota do Getlate.dev');
      onQuotaChange?.();
    } catch (error) {
      console.error('Erro ao remover quota override:', error);
      toast.error('Falha ao remover quota personalizada');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: keyof QuotaOverride, value: string) => {
    const numValue = parseInt(value) || 0;
    setQuota(prev => ({ ...prev, [field]: Math.max(0, numValue) }));
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Gestão de Quota</CardTitle>
          <CardDescription>A carregar...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          Gestão de Quota
        </CardTitle>
        <CardDescription>
          Configure manualmente a quota de publicações para cada plataforma. 
          Isto sobrepõe-se aos dados do Getlate.dev.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!hasOverride && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Atualmente a usar quota do Getlate.dev. Configure aqui para sobrepor com valores personalizados.
            </AlertDescription>
          </Alert>
        )}

        {hasOverride && (
          <Alert className="border-orange-200 bg-orange-50">
            <AlertCircle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-700">
              Quota personalizada ativa. Estes valores substituem os dados do Getlate.dev.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Instagram */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-pink-600 flex items-center gap-2">
              Instagram
            </h3>
            <div className="space-y-3">
              <div>
                <Label htmlFor="instagram_used">Publicações Usadas</Label>
                <Input
                  id="instagram_used"
                  type="number"
                  min="0"
                  value={quota.instagram_used}
                  onChange={(e) => handleInputChange('instagram_used', e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="instagram_limit">Limite Mensal</Label>
                <Input
                  id="instagram_limit"
                  type="number"
                  min="1"
                  value={quota.instagram_limit}
                  onChange={(e) => handleInputChange('instagram_limit', e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="text-sm text-muted-foreground">
                Restantes: {Math.max(0, quota.instagram_limit - quota.instagram_used)}
              </div>
            </div>
          </div>

          {/* LinkedIn */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-blue-600 flex items-center gap-2">
              LinkedIn
            </h3>
            <div className="space-y-3">
              <div>
                <Label htmlFor="linkedin_used">Publicações Usadas</Label>
                <Input
                  id="linkedin_used"
                  type="number"
                  min="0"
                  value={quota.linkedin_used}
                  onChange={(e) => handleInputChange('linkedin_used', e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="linkedin_limit">Limite Mensal</Label>
                <Input
                  id="linkedin_limit"
                  type="number"
                  min="1"
                  value={quota.linkedin_limit}
                  onChange={(e) => handleInputChange('linkedin_limit', e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="text-sm text-muted-foreground">
                Restantes: {Math.max(0, quota.linkedin_limit - quota.linkedin_used)}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            {saving ? 'A guardar...' : hasOverride ? 'Atualizar Quota' : 'Ativar Quota Personalizada'}
          </Button>
          
          {hasOverride && (
            <Button 
              variant="outline" 
              onClick={handleDelete}
              disabled={saving}
              className="flex items-center gap-2 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
              Remover Override
            </Button>
          )}
          
          <Button 
            variant="ghost" 
            onClick={loadQuotaOverride}
            disabled={saving}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Recarregar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}