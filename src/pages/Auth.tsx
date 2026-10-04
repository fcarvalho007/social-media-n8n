import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Mail, AlertTriangle } from 'lucide-react';
import { z } from 'zod';

const emailSchema = z.string().trim().email('Email inválido');

const Auth = () => {
  const { user, requestEmailCode, verifyEmailCode } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || '/';

  useEffect(() => {
    if (user) navigate(from, { replace: true });
  }, [user, navigate, from]);

  const pedirCodigo = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) { setError('Email inválido'); return; }
    setIsLoading(true); setError(null);
    const r = await requestEmailCode(parsed.data);
    setIsLoading(false);
    if (r.error) setError(r.error.message);
    else setStep('code');
  };

  const confirmar = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true); setError(null);
    const r = await verifyEmailCode(email, code);
    setIsLoading(false);
    if (r.error) setError(r.error.message);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Mail className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold">Bem-vindo</CardTitle>
          <CardDescription>
            {step === 'email' ? 'Introduz o teu email para receber um código de acesso' : `Enviámos um código para ${email}. Também podes abrir a ligação no email.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 'email' ? (
            <form onSubmit={pedirCodigo} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              {error && <Erro msg={error} />}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
                Enviar código
              </Button>
            </form>
          ) : (
            <form onSubmit={confirmar} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="code">Código</Label>
                <Input id="code" inputMode="numeric" autoComplete="one-time-code" maxLength={10} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} />
              </div>
              {error && <Erro msg={error} />}
              <Button type="submit" className="w-full" disabled={isLoading || code.length < 6}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Entrar
              </Button>
              <Button type="button" variant="ghost" className="w-full" onClick={() => { setStep('email'); setCode(''); setError(null); }}>
                Usar outro email
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const Erro = ({ msg }: { msg: string }) => (
  <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
    <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
    <p>{msg}</p>
  </div>
);

export default Auth;
