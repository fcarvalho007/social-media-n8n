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

  const requestEmailCode = async (email: string): Promise<AuthResult> => {
    const normalizedEmail = email.toLowerCase().trim();
    if (!ALLOWED_EMAILS.includes(normalizedEmail)) {
      return { error: { message: 'Email não autorizado' } };
    }
    const { error } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: { shouldCreateUser: false, emailRedirectTo: window.location.origin },
    });
    if (error) return { error: { message: error.message } };
    return { error: null };
  };

  const verifyEmailCode = async (email: string, code: string): Promise<AuthResult> => {
    const { error } = await supabase.auth.verifyOtp({
      email: email.toLowerCase().trim(),
      token: code.trim(),
      type: 'email',
    });
    if (error) return { error: { message: 'Código inválido ou expirado' } };
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
