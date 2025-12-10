import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Save, RefreshCw, Trash2, AlertCircle, Cloud, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { usePublishingQuota } from '@/hooks/usePublishingQuota';
import { Badge } from '@/components/ui/badge';

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
  const { instagram, linkedin, planName, isLoading: quotaLoading, refresh: refreshQuota, lastUpdated } = usePublishingQuota();
  
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
        const { error } = await supabase
          .from('quota_overrides')
          .update(quotaData)
          .eq('id', quota.id);

        if (error) throw error;
      } else {
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
      toast.success('Override removido! A usar dados reais do Getlate.dev');
      refreshQuota();
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
    <div className="space-y-6">
      {/* Real-time Getlate Data Card */}
      <Card className="border-green-200 bg-green-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-700">
            <Cloud className="h-5 w-5" />
            Dados em Tempo Real do Getlate.dev
            <Badge variant="outline" className="ml-2 text-green-600 border-green-300">
              {planName}
            </Badge>
          </CardTitle>
          <CardDescription className="text-green-600">
            Estes são os dados reais da sua conta Getlate.dev, atualizados automaticamente.
            {lastUpdated && (
              <span className="block text-xs mt-1">
                Última atualização: {lastUpdated.toLocaleTimeString('pt-PT')}
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Instagram Real */}
            <div className="p-4 rounded-lg bg-white border border-green-200">
              <h3 className="text-lg font-semibold text-pink-600 mb-2">Instagram</h3>
              {quotaLoading ? (
                <p className="text-muted-foreground">A carregar...</p>
              ) : (
                <>
                  <p className="text-2xl font-bold">{instagram.quotaText}</p>
                  <p className="text-sm text-muted-foreground">
                    {instagram.quota.remaining} publicações restantes hoje
                  </p>
                  {instagram.status === 'danger' && (
                    <Badge variant="destructive" className="mt-2">Quota esgotada</Badge>
                  )}
                  {instagram.status === 'warning' && (
                    <Badge variant="secondary" className="mt-2 bg-yellow-100 text-yellow-800">Quase esgotada</Badge>
                  )}
                  {instagram.status === 'ok' && (
                    <Badge variant="secondary" className="mt-2 bg-green-100 text-green-800">OK</Badge>
                  )}
                </>
              )}
            </div>

            {/* LinkedIn Real */}
            <div className="p-4 rounded-lg bg-white border border-green-200">
              <h3 className="text-lg font-semibold text-blue-600 mb-2">LinkedIn</h3>
              {quotaLoading ? (
                <p className="text-muted-foreground">A carregar...</p>
              ) : (
                <>
                  <p className="text-2xl font-bold">{linkedin.quotaText}</p>
                  <p className="text-sm text-muted-foreground">
                    {linkedin.quota.remaining} publicações restantes hoje
                  </p>
                  {linkedin.status === 'danger' && (
                    <Badge variant="destructive" className="mt-2">Quota esgotada</Badge>
                  )}
                  {linkedin.status === 'warning' && (
                    <Badge variant="secondary" className="mt-2 bg-yellow-100 text-yellow-800">Quase esgotada</Badge>
                  )}
                  {linkedin.status === 'ok' && (
                    <Badge variant="secondary" className="mt-2 bg-green-100 text-green-800">OK</Badge>
                  )}
                </>
              )}
            </div>
          </div>

          <Button 
            variant="outline" 
            onClick={refreshQuota}
            className="mt-4 border-green-300 text-green-700 hover:bg-green-100"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Sincronizar com Getlate
          </Button>
        </CardContent>
      </Card>

      {/* Override Status */}
      {!hasOverride ? (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-700">Sincronizado com Getlate.dev</AlertTitle>
          <AlertDescription className="text-green-600">
            A aplicação está a usar os dados reais do Getlate.dev. Isto é o recomendado.
          </AlertDescription>
        </Alert>
      ) : (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertCircle className="h-4 w-4 text-orange-600" />
          <AlertTitle className="text-orange-700">Override Manual Ativo</AlertTitle>
          <AlertDescription className="text-orange-600">
            Você tem uma quota personalizada ativa que substitui os dados do Getlate.dev. 
            Recomendamos remover o override para usar os dados reais.
          </AlertDescription>
        </Alert>
      )}

      {/* Manual Override Card (Collapsed by default) */}
      <Card className="w-full max-w-2xl opacity-75 hover:opacity-100 transition-opacity">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-muted-foreground">
            <RefreshCw className="h-5 w-5" />
            Override Manual (Avançado)
          </CardTitle>
          <CardDescription>
            Use apenas se precisar de sobrepor os dados do Getlate.dev com valores personalizados.
            Isto NÃO é recomendado para uso normal.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Instagram Override */}
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
                  <Label htmlFor="instagram_limit">Limite Diário</Label>
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

            {/* LinkedIn Override */}
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
                  <Label htmlFor="linkedin_limit">Limite Diário</Label>
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
              variant="outline"
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {saving ? 'A guardar...' : hasOverride ? 'Atualizar Override' : 'Ativar Override'}
            </Button>
            
            {hasOverride && (
              <Button 
                variant="destructive" 
                onClick={handleDelete}
                disabled={saving}
                className="flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Remover Override (Recomendado)
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
    </div>
  );
}
