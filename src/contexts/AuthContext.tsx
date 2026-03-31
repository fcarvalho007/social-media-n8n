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
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithEmail = async (email: string) => {
    try {
      const normalizedEmail = email.toLowerCase().trim();
      
      // Verificar se está na whitelist
      if (!ALLOWED_EMAILS.includes(normalizedEmail)) {
        toast.error('Email não autorizado');
        return { error: { message: 'Email não autorizado' } };
      }
      
      // Tentar sign in com password interna
      let { error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: INTERNAL_PASSWORD,
      });
      
      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          // Utilizador pode existir com password diferente - tentar resetar via admin
          const { error: resetError } = await supabase.functions.invoke('admin-reset-password', {
            body: { 
              email: normalizedEmail, 
              newPassword: INTERNAL_PASSWORD 
            }
          });
          
          if (!resetError) {
            // Tentar login novamente após reset
            const { error: retryError } = await supabase.auth.signInWithPassword({
              email: normalizedEmail,
              password: INTERNAL_PASSWORD,
            });
            
            if (!retryError) {
              toast.success('Bem-vindo!');
              return { error: null };
            }
          }
          
          // Se reset falhou, tentar criar utilizador novo
          const { error: signUpError } = await supabase.auth.signUp({
            email: normalizedEmail,
            password: INTERNAL_PASSWORD,
            options: { emailRedirectTo: window.location.origin }
          });
          
          if (signUpError && !signUpError.message.includes('already registered')) {
            toast.error('Erro ao criar conta');
            return { error: signUpError };
          }
          
          // Tentar login novamente após criar
          const { error: finalError } = await supabase.auth.signInWithPassword({
            email: normalizedEmail,
            password: INTERNAL_PASSWORD,
          });
          
          if (finalError) {
            toast.error('Erro ao entrar');
            return { error: finalError };
          }
        } else {
          toast.error(error.message);
          return { error };
        }
      }
      
      toast.success('Bem-vindo!');
      return { error: null };
    } catch (error: any) {
      if (error?.message?.includes('Failed to fetch') || error?.message?.includes('NetworkError')) {
        toast.error('Erro de rede. Limpe o cache do browser (Cmd+Shift+R) e tente novamente.');
      } else {
        toast.error('Erro ao fazer login');
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
