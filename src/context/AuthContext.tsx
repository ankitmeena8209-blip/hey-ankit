import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { Profile } from '../types/database';
import { usernameToEmail, validateUsername } from '../lib/utils';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isAdmin: boolean;
  loading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const adminUsername = ((import.meta.env.VITE_ADMIN_USERNAME as string) || 'being_frzi').toLowerCase().trim();

  const fetchProfile = useCallback(async (userId: string, targetUser?: User | null) => {
    const activeUser = targetUser ?? user;
    const rawUsername =
      activeUser?.user_metadata?.username ||
      (activeUser?.email ? activeUser.email.split('@')[0] : 'user');
    const cleanUsername = rawUsername.toLowerCase().trim();
    const isAdminUser = cleanUsername === adminUsername || cleanUsername === 'ankit';

    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (data) {
        setProfile(data as Profile);
      } else {
        // Fallback profile in-memory so user is never blocked
        setProfile({
          id: userId,
          username: cleanUsername,
          role: isAdminUser ? 'admin' : 'user',
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    } catch {
      setProfile({
        id: userId,
        username: cleanUsername,
        role: isAdminUser ? 'admin' : 'user',
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
  }, [user, adminUsername]);

  const refreshProfile = useCallback(async () => {
    if (user?.id) {
      await fetchProfile(user.id, user);
    }
  }, [user, fetchProfile]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    // 1. Initial session check
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      if (!isMounted) return;
      setSession(initialSession);
      setUser(initialSession?.user ?? null);
      if (initialSession?.user) {
        fetchProfile(initialSession.user.id, initialSession.user).finally(() => {
          if (isMounted) setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    // 2. Auth state subscription
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!isMounted) return;
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.user) {
        await fetchProfile(newSession.user.id, newSession.user);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const login = async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    const validCheck = validateUsername(username);
    if (!validCheck.valid) {
      return { success: false, error: validCheck.error };
    }

    if (!password || password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters.' };
    }

    const cleanUsername = validCheck.cleanUsername;
    const email = usernameToEmail(cleanUsername);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { success: false, error: 'Invalid username or password.' };
      }

      if (data.user) {
        setUser(data.user);
        setSession(data.session);
        await fetchProfile(data.user.id, data.user);
      }

      return { success: true };
    } catch {
      return { success: false, error: 'Unable to connect to service. Please try again.' };
    }
  };

  const register = async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    const validCheck = validateUsername(username);
    if (!validCheck.valid) {
      return { success: false, error: validCheck.error };
    }

    if (!password || password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters.' };
    }

    const cleanUsername = validCheck.cleanUsername;
    const email = usernameToEmail(cleanUsername);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: cleanUsername,
          },
        },
      });

      if (error) {
        const lowerErr = error.message.toLowerCase();
        if (
          lowerErr.includes('already registered') ||
          lowerErr.includes('unique') ||
          lowerErr.includes('already exists')
        ) {
          // If already registered, immediately attempt sign-in with the same credentials!
          return login(cleanUsername, password);
        }
        if (
          lowerErr.includes('rate limit') ||
          lowerErr.includes('invalid email') ||
          lowerErr.includes('validate email')
        ) {
          return {
            success: false,
            error:
              "Supabase setup: In your Supabase Dashboard, go to Authentication > Providers > Email, and turn 'Confirm email' to OFF.",
          };
        }
        return { success: false, error: error.message || 'Registration failed.' };
      }

      if (data.session && data.user) {
        setUser(data.user);
        setSession(data.session);
        await fetchProfile(data.user.id, data.user);
        return { success: true };
      }

      // If signUp did not auto-create session, log in immediately
      return login(cleanUsername, password);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration error.';
      return { success: false, error: msg };
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Error during sign out:', err);
    } finally {
      setUser(null);
      setSession(null);
      setProfile(null);
    }
  };

  const isAdmin = Boolean(
    (profile?.role === 'admin' && profile?.status === 'active') ||
    profile?.username?.toLowerCase() === adminUsername ||
    profile?.username?.toLowerCase() === 'ankit'
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        isAdmin,
        loading,
        login,
        register,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
