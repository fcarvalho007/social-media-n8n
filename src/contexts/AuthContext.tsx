import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  signInWithPassword: (password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithPassword = async (password: string) => {
    const ADMIN_EMAIL = 'admin@instagram.com';
    const VALID_PASSWORD = '#123@!';
    
    // Check if password matches
    if (password !== VALID_PASSWORD) {
      return false;
    }
    
    try {
      // Try to sign in with the admin email and provided password
      const { data, error } = await supabase.auth.signInWithPassword({
        email: ADMIN_EMAIL,
        password: VALID_PASSWORD,
      });

      if (error) {
        // If user doesn't exist, create account
        if (error.message.includes('Invalid')) {
          const { error: signUpError } = await supabase.auth.signUp({
            email: ADMIN_EMAIL,
            password: VALID_PASSWORD,
            options: {
              emailRedirectTo: `${window.location.origin}/`,
              data: {
                full_name: 'Admin',
              },
            },
          });

          if (signUpError) {
            console.error('Error creating account:', signUpError);
            return false;
          }

          // Sign in after creating account
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email: ADMIN_EMAIL,
            password: VALID_PASSWORD,
          });

          if (signInError) {
            console.error('Error signing in:', signInError);
            return false;
          }

          return true;
        }
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in signInWithPassword:', error);
      return false;
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error);
      throw error;
    }
    navigate('/auth');
  };

  return (
    <AuthContext.Provider value={{ user, session, signInWithPassword, signOut, loading }}>
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
