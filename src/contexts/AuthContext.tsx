import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Emails autorizados para acesso
const ALLOWED_EMAILS = [
  'comunicacao@fredericocarvalho.pt',
  'fredericodigital@gmail.com'
];

// Password interna fixa (utilizador nunca vê)
const INTERNAL_PASSWORD = 'internal-whitelist-auth-2024';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signInWithEmail: (email: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
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

  const signInWithEmail = async (email: string) => {
    const EXPECTED_HOST = 'vtmrimrr';
    
    try {
      const normalizedEmail = email.toLowerCase().trim();
      
      if (!ALLOWED_EMAILS.includes(normalizedEmail)) {
        toast.error('Email não autorizado');
        return { error: { message: 'Email não autorizado' } };
      }

      // Verificar se o bundle tem a URL correcta do projecto
      const currentUrl = import.meta.env.VITE_SUPABASE_URL || '';
      if (!currentUrl.includes(EXPECTED_HOST)) {
        console.warn('[Auth] Bundle com URL antiga detectada, a forçar cache-bust...');
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = window.location.pathname + '?cb=' + Date.now();
        return { error: { message: 'A recarregar com URL correcta' } };
      }

      // Limpar sessão antiga silenciosamente
      try {
        await supabase.auth.signOut();
      } catch {
        // Ignorar erros de signOut
      }
      
      // Tentativa 1: login directo
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: INTERNAL_PASSWORD,
      });
      
      if (!loginError) {
        toast.success('Bem-vindo!');
        return { error: null };
      }

      // Tentativa 2: garantir utilizador via edge function, depois login
      if (loginError.message.includes('Invalid login credentials') || loginError.message.includes('Email not confirmed')) {
        const { error: resetError } = await supabase.functions.invoke('admin-reset-password', {
          body: { email: normalizedEmail, newPassword: INTERNAL_PASSWORD }
        });
        
        if (resetError) {
          toast.error(`Erro no servidor: ${resetError.message}`);
          return { error: resetError };
        }
        
        const { error: retryError } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password: INTERNAL_PASSWORD,
        });
        
        if (!retryError) {
          toast.success('Bem-vindo!');
          return { error: null };
        }
        
        toast.error(`Falha ao entrar: ${retryError.message}`);
        return { error: retryError };
      }
      
      toast.error(`Erro: ${loginError.message}`);
      return { error: loginError };
    } catch (error: any) {
      const msg = error?.message || 'Erro desconhecido';
      if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('ERR_NAME_NOT_RESOLVED')) {
        console.warn('[Auth] Failed to fetch — a limpar cache local e a tentar reload...');
        // Limpar localStorage (pode ter tokens do projecto antigo)
        localStorage.clear();
        sessionStorage.clear();
        toast.error('Erro de rede — a recarregar a aplicação...');
        setTimeout(() => {
          window.location.href = window.location.pathname + '?cb=' + Date.now();
        }, 1500);
      } else {
        toast.error(`Erro ao fazer login: ${msg}`);
      }
      return { error };
    }
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
