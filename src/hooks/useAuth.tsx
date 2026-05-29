import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Synchronously read the persisted Supabase session from localStorage so the
// app can render immediately, even offline, without waiting for any async call.
const readCachedSession = (): Session | null => {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        // supabase-js stores { access_token, refresh_token, user, ... }
        if (parsed?.user && parsed?.access_token) return parsed as Session;
      }
    }
  } catch {
    // ignore
  }
  return null;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const initial = readCachedSession();
  const [user, setUser] = useState<User | null>(initial?.user ?? null);
  const [session, setSession] = useState<Session | null>(initial);
  // If we already have a cached session, we are not "loading" — render immediately.
  const [loading, setLoading] = useState(!initial);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, s) => {
        setSession(s);
        setUser(s?.user ?? null);
        setLoading(false);
      }
    );

    // Confirm session in background; don't block UI if offline.
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (s) {
        setSession(s);
        setUser(s.user);
      }
      setLoading(false);
    }).catch(() => setLoading(false));

    // Safety net: if for any reason loading stays true (e.g. network hang offline),
    // release the UI after 1s — the cached session is enough to work.
    const t = setTimeout(() => setLoading(false), 1000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(t);
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (email: string, password: string) => {
    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirectUrl },
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut }}>
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
