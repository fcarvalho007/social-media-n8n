import { useState } from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { DashboardHeader } from '@/components/DashboardHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useProfiles } from '@/hooks/useProfiles';
import { useCurrentUserRoles } from '@/hooks/useUserRoles';
import { toast } from 'sonner';
import { Loader2, UserCog, UserPlus, Shield, Mail, Key, Trash2, MoreVertical } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';

type DialogType = 'invite' | 'edit' | 'email' | 'password' | 'role' | null;
type AppRole = 'admin' | 'editor' | 'viewer';

const UserManagement = () => {
  const { profiles, isLoading, refetch } = useProfiles();
  const { isAdmin, isLoading: rolesLoading } = useCurrentUserRoles();
  const [dialogType, setDialogType] = useState<DialogType>(null);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [processing, setProcessing] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Form states
  const [inviteForm, setInviteForm] = useState({ email: '', fullName: '', role: 'viewer' as AppRole });
  const [editForm, setEditForm] = useState({ fullName: '' });
  const [emailForm, setEmailForm] = useState({ newEmail: '' });
  const [passwordForm, setPasswordForm] = useState({ newPassword: '' });
  const [roleForm, setRoleForm] = useState({ role: 'viewer' as AppRole, action: 'add' as 'add' | 'remove' });

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

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'editor': return 'default';
      case 'viewer': return 'secondary';
      default: return 'outline';
    }
  };

  const handleInviteUser = async () => {
    if (!inviteForm.email || !inviteForm.fullName) {
      toast.error('Preencha todos os campos');
      return;
    }

    setProcessing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const { data, error } = await supabase.functions.invoke('invite-user', {
        body: {
          email: inviteForm.email,
          full_name: inviteForm.fullName,
          role: inviteForm.role,
        },
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (error) throw error;

      toast.success('Utilizador convidado com sucesso!');
      setDialogType(null);
      setInviteForm({ email: '', fullName: '', role: 'viewer' });
      refetch();
    } catch (error: any) {
      console.error('Error inviting user:', error);
      toast.error(error.message || 'Erro ao convidar utilizador');
    } finally {
      setProcessing(false);
    }
  };

  const handleUpdateName = async () => {
    if (!editForm.fullName.trim()) {
      toast.error('O nome não pode estar vazio');
      return;
    }

    setProcessing(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: editForm.fullName.trim() })
        .eq('id', selectedUser.id);

      if (error) throw error;

      toast.success('Nome atualizado com sucesso');
      setDialogType(null);
      refetch();
    } catch (error: any) {
      console.error('Error updating name:', error);
      toast.error('Erro ao atualizar nome');
    } finally {
      setProcessing(false);
    }
  };

  const handleUpdateEmail = async () => {
    if (!emailForm.newEmail.trim()) {
      toast.error('Email inválido');
      return;
    }

    setProcessing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const { error } = await supabase.functions.invoke('update-user-email', {
        body: {
          userId: selectedUser.id,
          newEmail: emailForm.newEmail.trim(),
        },
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (error) throw error;

      toast.success('Email atualizado com sucesso');
      setDialogType(null);
      setEmailForm({ newEmail: '' });
      refetch();
    } catch (error: any) {
      console.error('Error updating email:', error);
      toast.error(error.message || 'Erro ao atualizar email');
    } finally {
      setProcessing(false);
    }
  };

  const handleResetPassword = async () => {
    setProcessing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const body: any = { userId: selectedUser.id };
      if (passwordForm.newPassword) {
        body.newPassword = passwordForm.newPassword;
      }

      const { error } = await supabase.functions.invoke('reset-user-password', {
        body,
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (error) throw error;

      toast.success(passwordForm.newPassword ? 'Password atualizada' : 'Email de reset enviado');
      setDialogType(null);
      setPasswordForm({ newPassword: '' });
    } catch (error: any) {
      console.error('Error resetting password:', error);
      toast.error(error.message || 'Erro ao resetar password');
    } finally {
      setProcessing(false);
    }
  };

  const handleManageRole = async () => {
    setProcessing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const { error } = await supabase.functions.invoke('manage-user-role', {
        body: {
          userId: selectedUser.id,
          role: roleForm.role,
          action: roleForm.action,
        },
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (error) throw error;

      toast.success(`Role ${roleForm.action === 'add' ? 'adicionada' : 'removida'} com sucesso`);
      setDialogType(null);
      refetch();
    } catch (error: any) {
      console.error('Error managing role:', error);
      toast.error(error.message || 'Erro ao gerir role');
    } finally {
      setProcessing(false);
    }
  };

  const openDialog = (type: DialogType, user?: any) => {
    setSelectedUser(user);
    setDialogType(type);
    
    if (type === 'edit' && user) {
      setEditForm({ fullName: user.full_name || '' });
    } else if (type === 'email' && user) {
      setEmailForm({ newEmail: user.email });
    }
  };

  if (rolesLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-destructive">Acesso Negado</CardTitle>
            <CardDescription className="text-center">
              Apenas administradores podem aceder a esta página
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <DashboardHeader />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-background">
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <UserCog className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-foreground">Gestão de Utilizadores</h1>
                  <p className="text-sm text-muted-foreground">
                    Gerir utilizadores, roles e permissões do sistema
                  </p>
                </div>
              </div>
              <Button onClick={() => openDialog('invite')} size="default">
                <UserPlus className="h-4 w-4 mr-2" />
                Convidar Utilizador
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Utilizadores ({profiles?.length || 0})</CardTitle>
                <CardDescription>
                  Lista completa de utilizadores do sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {profiles?.map((profile) => (
                    <div
                      key={profile.id}
                      className="flex items-center gap-4 p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <Avatar className="h-12 w-12">
                        {profile.avatar_url && (
                          <AvatarImage src={profile.avatar_url} alt={profile.full_name || profile.email} />
                        )}
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                          {getInitials(profile.full_name, profile.email)}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <p className="text-base font-semibold text-foreground truncate">
                          {profile.full_name || <span className="text-muted-foreground italic">Sem nome</span>}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">{profile.email}</p>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                          <DropdownMenuItem onClick={() => openDialog('edit', profile)}>
                            <UserCog className="h-4 w-4 mr-2" />
                            Editar Nome
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openDialog('email', profile)}>
                            <Mail className="h-4 w-4 mr-2" />
                            Alterar Email
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openDialog('password', profile)}>
                            <Key className="h-4 w-4 mr-2" />
                            Reset Password
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => openDialog('role', profile)}>
                            <Shield className="h-4 w-4 mr-2" />
                            Gerir Roles
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}

                  {profiles && profiles.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      Nenhum utilizador encontrado
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </SidebarInset>

      {/* Invite User Dialog */}
      <Dialog open={dialogType === 'invite'} onOpenChange={() => setDialogType(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convidar Novo Utilizador</DialogTitle>
            <DialogDescription>
              Criar uma nova conta e atribuir role
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome Completo</Label>
              <Input
                value={inviteForm.fullName}
                onChange={(e) => setInviteForm({ ...inviteForm, fullName: e.target.value })}
                placeholder="João Silva"
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={inviteForm.email}
                onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                placeholder="joao@exemplo.com"
              />
            </div>
            <div>
              <Label>Role</Label>
              <Select
                value={inviteForm.role}
                onValueChange={(value) => setInviteForm({ ...inviteForm, role: value as AppRole })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="viewer">Viewer</SelectItem>
                  <SelectItem value="editor">Editor</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogType(null)}>
              Cancelar
            </Button>
            <Button onClick={handleInviteUser} disabled={processing}>
              {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Convidar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Name Dialog */}
      <Dialog open={dialogType === 'edit'} onOpenChange={() => setDialogType(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Nome</DialogTitle>
            <DialogDescription>Atualizar o nome do utilizador</DialogDescription>
          </DialogHeader>
          <div>
            <Label>Nome Completo</Label>
            <Input
              value={editForm.fullName}
              onChange={(e) => setEditForm({ fullName: e.target.value })}
              placeholder="Nome do utilizador"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogType(null)}>Cancelar</Button>
            <Button onClick={handleUpdateName} disabled={processing}>
              {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update Email Dialog */}
      <Dialog open={dialogType === 'email'} onOpenChange={() => setDialogType(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Email</DialogTitle>
            <DialogDescription>Atualizar o email do utilizador</DialogDescription>
          </DialogHeader>
          <div>
            <Label>Novo Email</Label>
            <Input
              type="email"
              value={emailForm.newEmail}
              onChange={(e) => setEmailForm({ newEmail: e.target.value })}
              placeholder="novo@email.com"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogType(null)}>Cancelar</Button>
            <Button onClick={handleUpdateEmail} disabled={processing}>
              {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Atualizar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={dialogType === 'password'} onOpenChange={() => setDialogType(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Definir nova password ou enviar email de reset
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label>Nova Password (opcional)</Label>
            <Input
              type="password"
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm({ newPassword: e.target.value })}
              placeholder="Deixe vazio para enviar email"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Se deixar vazio, será enviado um email de recuperação
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogType(null)}>Cancelar</Button>
            <Button onClick={handleResetPassword} disabled={processing}>
              {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {passwordForm.newPassword ? 'Definir Password' : 'Enviar Email'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Role Dialog */}
      <Dialog open={dialogType === 'role'} onOpenChange={() => setDialogType(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gerir Roles</DialogTitle>
            <DialogDescription>Adicionar ou remover roles do utilizador</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Ação</Label>
              <Select
                value={roleForm.action}
                onValueChange={(value) => setRoleForm({ ...roleForm, action: value as 'add' | 'remove' })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="add">Adicionar Role</SelectItem>
                  <SelectItem value="remove">Remover Role</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Role</Label>
              <Select
                value={roleForm.role}
                onValueChange={(value) => setRoleForm({ ...roleForm, role: value as AppRole })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="viewer">Viewer</SelectItem>
                  <SelectItem value="editor">Editor</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogType(null)}>Cancelar</Button>
            <Button onClick={handleManageRole} disabled={processing}>
              {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {roleForm.action === 'add' ? 'Adicionar' : 'Remover'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
};

export default UserManagement;
