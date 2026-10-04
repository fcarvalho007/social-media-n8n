import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// UX pre-check only; real authorisation is the existing account + server-side roles.
const ALLOWED_EMAILS = [
  'comunicacao@fredericocarvalho.pt',
  'fredericodigital@gmail.com'
];

interface AuthResult { error: { message: string } | null }

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  /** Sends a one-time code/link to an existing authorised account. Never creates users. */
  requestEmailCode: (email: string) => Promise<AuthResult>;
  verifyEmailCode: (email: string, code: string) => Promise<AuthResult>;
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
    const { data, error } = await supabase.functions.invoke('entrar-email', {
      body: { email: email.toLowerCase().trim() },
    });
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
    <AuthContext.Provider value={{ user, session, loading, requestEmailCode, verifyEmailCode, signOut }}>
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
