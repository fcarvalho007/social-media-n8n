import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Instagram, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const Auth = () => {
  const { user, signInWithPassword, loading } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      navigate('/pending');
    }
  }, [user, navigate]);

  const handlePasswordSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      toast.error('Por favor, insira a password');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const success = await signInWithPassword(password);
      if (!success) {
        toast.error('Password incorreta');
      }
    } catch (error) {
      console.error('Erro ao fazer login:', error);
      toast.error('Erro ao entrar');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Instagram className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Bem-vindo</CardTitle>
          <CardDescription>
            Faça login para rever e aprovar conteúdo Instagram
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordSignIn} className="space-y-4">
            <Input
              type="password"
              placeholder="#***"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handlePasswordSignIn(e)}
              disabled={isSubmitting}
              className="w-full text-center text-lg py-6"
              autoFocus
            />

            <p className="text-center text-xs text-muted-foreground">
              #***
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
