import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { comLimite } from '../../supabase/functions/entrar-email/logica';

/** Client-side ceiling, above the server's per-call limit, so the button never stays disabled for minutes. */
export const LIMITE_ENTRADA_MS = 20_000;
export const SERVICO_INDISPONIVEL = 'Serviço indisponível. Tenta daqui a um minuto.';

interface AuthResult { error: { message: string } | null }

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  /** Email-only sign-in; the allowlist and account check live in the entrar-email function. */
  signInWithEmail: (email: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithEmail = async (email: string): Promise<AuthResult> => {
    let resposta: Awaited<ReturnType<typeof supabase.functions.invoke>>;
    try {
      resposta = await comLimite(
        supabase.functions.invoke('entrar-email', { body: { email: email.toLowerCase().trim() } }),
        LIMITE_ENTRADA_MS,
      );
    } catch {
      return { error: { message: SERVICO_INDISPONIVEL } };
    }
    const { data, error } = resposta;
    if (error) {
      let message = 'Não foi possível entrar. Tenta de novo.';
      const ctx = (error as { context?: unknown }).context;
      if (ctx instanceof Response) {
        try { const b = await ctx.json(); if (typeof b?.error === 'string') message = b.error; } catch { /* keep default */ }
      }
      return { error: { message } };
    }
    const tokens = data as { access_token?: string; refresh_token?: string } | null;
    if (!tokens?.access_token || !tokens.refresh_token) return { error: { message: 'Não foi possível entrar. Tenta de novo.' } };
    const { error: sErr } = await supabase.auth.setSession({ access_token: tokens.access_token, refresh_token: tokens.refresh_token });
    if (sErr) return { error: { message: 'Não foi possível entrar. Tenta de novo.' } };
    toast.success('Bem-vindo!');
    return { error: null };
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      toast.success('Logout efetuado');
    } catch (error: any) {
      toast.error('Erro ao fazer logout');
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signInWithEmail, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
