import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Mail, AlertTriangle } from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const emailSchema = z.object({
  email: z.string().email('Email inválido'),
});

const Auth = () => {
  const { user, signInWithEmail } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [diagnosticInfo, setDiagnosticInfo] = useState<string | null>(null);

  const from = (location.state as any)?.from?.pathname || '/';

  // Auto-detect stale bundle and force cache-bust before user interacts
  useEffect(() => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
    if (!supabaseUrl.includes('vtmrimrr')) {
      console.warn('[Auth] Stale bundle detected on mount, forcing cache-bust redirect');
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = window.location.pathname + '?cb=' + Date.now();
    }
  }, []);

  useEffect(() => {
    if (user) {
      navigate(from, { replace: true });
    }
  }, [user, navigate, from]);

  const form = useForm({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      email: '',
    },
  });

  const handleSubmit = async (values: z.infer<typeof emailSchema>) => {
    setIsLoading(true);
    setDiagnosticInfo(null);
    const result = await signInWithEmail(values.email);
    if (result.error) {
      // Show diagnostic info with the Supabase URL being used
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'não definida';
      const domain = supabaseUrl.replace('https://', '').replace('http://', '');
      setDiagnosticInfo(`A ligar a: ${domain}`);
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-accent/10 to-background p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Mail className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold">Bem-vindo</CardTitle>
          <CardDescription>Introduza o seu email para continuar</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="seu@email.com" 
                        type="email" 
                        autoComplete="email"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {diagnosticInfo && (
                <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium">Erro de ligação</p>
                    <p className="text-xs mt-1 font-mono">{diagnosticInfo}</p>
                    <p className="text-xs mt-1">Se o domínio não contém <strong>vtmrimrr</strong>, limpe o cache do browser (Cmd+Shift+R ou Ctrl+Shift+R).</p>
                  </div>
                </div>
              )}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    A entrar...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Entrar
                  </>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
