import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { comLimite } from '@/lib/comLimite';

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
    let vivo = true;
    let eventoRecebido = false;
    const controlo = new AbortController();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!vivo) return;
        eventoRecebido = true;
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    comLimite(supabase.auth.getSession(), LIMITE_ENTRADA_MS, controlo.signal).then(({ data: { session } }) => {
      // A late bootstrap response must never restore a session after sign-out or a new sign-in.
      if (!vivo || eventoRecebido) return;
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    }).catch(() => { if (vivo && !eventoRecebido) setLoading(false); });

    return () => { vivo = false; controlo.abort(); subscription.unsubscribe(); };
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
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    toast.success('Sessão terminada');
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
