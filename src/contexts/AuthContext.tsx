import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AuthResult { error: { message: string } | null }

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  /** Entra só com o email autorizado de uma conta existente. Nunca cria utilizadores. */
  entrarComEmail: (email: string) => Promise<AuthResult>;
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

  const entrarComEmail = async (email: string): Promise<AuthResult> => {
    const { data, error } = await supabase.functions.invoke('entrar-email', {
      body: { email: email.toLowerCase().trim() },
    });
    if (error) {
      const mensagem = (data as { erro?: string } | null)?.erro
        ?? 'Não foi possível entrar. Tenta de novo.';
      return { error: { message: mensagem } };
    }
    const r = data as { ok?: boolean; access_token?: string; refresh_token?: string; erro?: string };
    if (!r.ok || !r.access_token || !r.refresh_token) {
      return { error: { message: r.erro ?? 'Não foi possível entrar. Tenta de novo.' } };
    }
    const { error: erroSessao } = await supabase.auth.setSession({
      access_token: r.access_token,
      refresh_token: r.refresh_token,
    });
    if (erroSessao) return { error: { message: 'Não foi possível abrir a sessão. Recarrega a página e tenta de novo.' } };
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
    <AuthContext.Provider value={{ user, session, loading, entrarComEmail, signOut }}>
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
