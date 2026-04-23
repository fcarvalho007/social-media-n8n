import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SocialProfile, SocialNetwork } from '@/types/social';
import { NETWORK_INFO } from '@/lib/socialNetworks';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AlertCircle, CheckCircle2, XCircle, Plus } from 'lucide-react';
import { toast } from 'sonner';

interface ProfileSelectorProps {
  selectedNetworks: SocialNetwork[];
  onNetworksChange: (networks: SocialNetwork[]) => void;
}

export function ProfileSelector({ selectedNetworks, onNetworksChange }: ProfileSelectorProps) {
  const [profiles, setProfiles] = useState<SocialProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Defesa em profundidade: nunca puxar access_token / refresh_token para o cliente.
      // RLS já restringe ao próprio user, mas excluímos colunas sensíveis explicitamente.
      const { data, error } = await supabase
        .from('social_profiles')
        .select('id, user_id, network, profile_name, profile_handle, profile_image_url, connection_status, token_expires_at, profile_metadata, created_at, updated_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setProfiles((data || []) as SocialProfile[]);
    } catch (error) {
      console.error('Error fetching profiles:', error);
      toast.error('Falha ao carregar perfis sociais');
    } finally {
      setLoading(false);
    }
  };

  const toggleNetwork = (network: SocialNetwork) => {
    if (selectedNetworks.includes(network)) {
      onNetworksChange(selectedNetworks.filter(n => n !== network));
    } else {
      onNetworksChange([...selectedNetworks, network]);
    }
  };

  const getConnectionStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle2 className="h-4 w-4 text-success" />;
      case 'expired':
        return <AlertCircle className="h-4 w-4 text-warning" />;
      case 'missing_permission':
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return null;
    }
  };

  const getConnectionStatusLabel = (status: string) => {
    switch (status) {
      case 'connected':
        return 'Ligado';
      case 'expired':
        return 'Expirado';
      case 'missing_permission':
        return 'Sem permissão';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <Card>
      <CardHeader>
        <CardTitle>Perfis</CardTitle>
        <CardDescription>A carregar perfis...</CardDescription>
      </CardHeader>
      </Card>
    );
  }

  if (profiles.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Perfis</CardTitle>
          <CardDescription>Nenhum perfil ligado</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 space-y-4">
            <p className="text-sm text-muted-foreground">
              Sem perfis ligados. Ligue perfis para agendar, ou guarde o rascunho para mais tarde.
            </p>
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Ligar perfis
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Perfis</CardTitle>
        <CardDescription>Selecione as redes onde pretende publicar</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {profiles.map((profile) => {
            const networkInfo = NETWORK_INFO[profile.network];
            const isSelected = selectedNetworks.includes(profile.network);
            const isDisabled = profile.connection_status !== 'connected';

            return (
              <div
                key={profile.id}
                className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                  isSelected
                    ? 'border-primary bg-primary/5'
                    : isDisabled
                    ? 'border-border bg-muted/30 opacity-60'
                    : 'border-border hover:border-border/80 hover:bg-accent/50'
                }`}
              >
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => toggleNetwork(profile.network)}
                  disabled={isDisabled}
                  className="mt-0.5"
                />

                <Avatar className="h-10 w-10">
                  <AvatarImage src={profile.profile_image_url} />
                  <AvatarFallback style={{ backgroundColor: networkInfo.bgColor }}>
                    <networkInfo.icon className="h-5 w-5" style={{ color: networkInfo.color }} />
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm truncate">{profile.profile_name}</span>
                    <Badge variant="outline" className="text-xs">
                      {networkInfo.name}
                    </Badge>
                  </div>
                  {profile.profile_handle && (
                    <p className="text-xs text-muted-foreground truncate">@{profile.profile_handle}</p>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  {getConnectionStatusIcon(profile.connection_status)}
                  <span className="text-xs text-muted-foreground">
                    {getConnectionStatusLabel(profile.connection_status)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
