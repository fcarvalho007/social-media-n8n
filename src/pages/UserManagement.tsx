import { useState } from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { DashboardHeader } from '@/components/DashboardHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useProfiles } from '@/hooks/useProfiles';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, UserCog, Save } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const UserManagement = () => {
  const { profiles, isLoading, refetch } = useProfiles();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [saving, setSaving] = useState(false);

  const handleEdit = (profileId: string, currentName: string | null) => {
    setEditingId(profileId);
    setEditingName(currentName || '');
  };

  const handleSave = async (profileId: string) => {
    if (!editingName.trim()) {
      toast.error('O nome não pode estar vazio');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: editingName.trim() })
        .eq('id', profileId);

      if (error) throw error;

      toast.success('Nome atualizado com sucesso');
      setEditingId(null);
      refetch();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Erro ao atualizar nome');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditingName('');
  };

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
    }
    return email.substring(0, 2).toUpperCase();
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <DashboardHeader />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-background">
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <UserCog className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Gestão de Utilizadores</h1>
                <p className="text-sm text-muted-foreground">
                  Defina nomes para os utilizadores do sistema
                </p>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Utilizadores</CardTitle>
                <CardDescription>
                  Atribua nomes aos utilizadores para facilitar a identificação nas tarefas
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {profiles?.map((profile) => (
                      <div
                        key={profile.id}
                        className="flex items-center gap-4 p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors"
                      >
                        <Avatar className="h-10 w-10">
                          {profile.avatar_url && (
                            <AvatarImage src={profile.avatar_url} alt={profile.full_name || profile.email} />
                          )}
                          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                            {getInitials(profile.full_name, profile.email)}
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-muted-foreground truncate">
                            {profile.email}
                          </p>
                          {editingId === profile.id ? (
                            <Input
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              placeholder="Nome do utilizador"
                              className="mt-1"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleSave(profile.id);
                                } else if (e.key === 'Escape') {
                                  handleCancel();
                                }
                              }}
                            />
                          ) : (
                            <p className="text-base font-semibold text-foreground">
                              {profile.full_name || (
                                <span className="text-muted-foreground italic">Sem nome</span>
                              )}
                            </p>
                          )}
                        </div>

                        <div className="flex gap-2">
                          {editingId === profile.id ? (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleSave(profile.id)}
                                disabled={saving}
                              >
                                {saving ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <Save className="h-4 w-4 mr-1" />
                                    Guardar
                                  </>
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={handleCancel}
                                disabled={saving}
                              >
                                Cancelar
                              </Button>
                            </>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(profile.id, profile.full_name)}
                            >
                              Editar
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}

                    {profiles && profiles.length === 0 && (
                      <p className="text-center text-muted-foreground py-8">
                        Nenhum utilizador encontrado
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default UserManagement;
