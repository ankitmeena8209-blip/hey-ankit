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
  register: (username: string, password: string, displayName?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const adminUsername = ((import.meta.env.VITE_ADMIN_USERNAME as string) || 'being_frzi').toLowerCase().trim();

  const fetchProfile = useCallback(async (userId: string, targetUser?: User | null) => {
    const rawUsername =
      targetUser?.user_metadata?.username ||
      (targetUser?.email ? targetUser.email.split('@')[0] : 'user');
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
          display_name: targetUser?.user_metadata?.display_name || null,
          avatar_url: targetUser?.user_metadata?.avatar_url || null,
          bio: targetUser?.user_metadata?.bio || null,
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
        display_name: targetUser?.user_metadata?.display_name || null,
        avatar_url: targetUser?.user_metadata?.avatar_url || null,
        bio: targetUser?.user_metadata?.bio || null,
        role: isAdminUser ? 'admin' : 'user',
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
  }, [adminUsername]);

  const refreshProfile = useCallback(async () => {
    if (user?.id) {
      await fetchProfile(user.id, user);
    }
  }, [user, fetchProfile]);

  const updateProfile = async (updates: Partial<Profile>): Promise<{ success: boolean; error?: string }> => {
    if (!user?.id) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      // 1. Update user metadata in Supabase Auth
      await supabase.auth.updateUser({
        data: {
          display_name: updates.display_name,
          avatar_url: updates.avatar_url,
          bio: updates.bio,
        },
      });

      // 2. Update profiles table
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: updates.display_name,
          avatar_url: updates.avatar_url,
          bio: updates.bio,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) {
        console.warn('Profile table update note:', error.message);
      }

      setProfile((prev) => (prev ? { ...prev, ...updates } : null));
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update profile.';
      return { success: false, error: msg };
    }
  };

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
      const currentUser = initialSession?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        fetchProfile(currentUser.id, currentUser).finally(() => {
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
      const currentUser = newSession?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        await fetchProfile(currentUser.id, currentUser);
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
        const lower = error.message.toLowerCase();
        if (lower.includes('invalid login credentials') || lower.includes('invalid credentials')) {
          return {
            success: false,
            error: 'Incorrect username or password. If you have not created an account yet, tap "New here? Create account" below.',
          };
        }
        if (lower.includes('email not confirmed')) {
          return {
            success: false,
            error: 'Email confirmation required by Supabase. In Supabase Dashboard > Authentication > Providers > Email, turn "Confirm email" to OFF.',
          };
        }
        return { success: false, error: error.message || 'Invalid username or password.' };
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

  const register = async (
    username: string,
    password: string,
    displayName?: string
  ): Promise<{ success: boolean; error?: string }> => {
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
            display_name: displayName?.trim() || cleanUsername,
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
          // Attempt sign in with the password provided
          const loginRes = await login(cleanUsername, password);
          if (!loginRes.success) {
            return {
              success: false,
              error: `Username "${cleanUsername}" is already registered. If this is your account, switch to "Log in" with your existing password.`,
            };
          }
          return { success: true };
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
        updateProfile,
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
