// context/AuthContext.tsx
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { User, Subscription, SupabaseClient } from '@supabase/supabase-js';
import { createClient as createSupabaseBrowserClient, getProfileWithRoleClientSide } from '@nextblock-cms/db';
import { Database } from '@nextblock-cms/db';

type Profile = Database['public']['Tables']['profiles']['Row'];
type UserRole = Database['public']['Enums']['user_role'];

interface AuthProviderProps {
  children: ReactNode;
  serverUser: User | null;
  serverProfile: Profile | null;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  role: UserRole | null;
  isLoading: boolean;
  isAdmin: boolean;
  isWriter: boolean;
  isUserRole: boolean;
  supabase: SupabaseClient | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children, serverUser, serverProfile }: AuthProviderProps) => {
  const [supabase] = useState(() => createSupabaseBrowserClient());
  
  const [user, setUser] = useState<User | null>(serverUser);
  const [profile, setProfile] = useState<Profile | null>(serverProfile);
  const [role, setRole] = useState<UserRole | null>(serverProfile?.role ?? null);
  const [isLoading] = useState(false);
  const [authSubscription, setAuthSubscription] = useState<Subscription | null>(null);

  const handleAuthStateChange = useCallback(async (event: string, session: unknown) => {
    const currentUser = (session && typeof session === 'object' && 'user' in session) ? (session as any).user : null;
    setUser(currentUser);

    if (currentUser) {
      try {
        const userProfileData = await getProfileWithRoleClientSide(supabase, currentUser.id);
        setProfile(userProfileData);
        setRole(userProfileData?.role ?? null);
      } catch (e) {
        console.error("AuthProvider: Error fetching profile on auth change", e);
        setProfile(null);
        setRole(null);
      }
    } else {
      setProfile(null);
      setRole(null);
    }
  }, [supabase]);

  const subscribeToAuth = useCallback(() => {
    if (authSubscription) return; // Already subscribed
    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthStateChange);
    setAuthSubscription(subscription);
  }, [supabase, handleAuthStateChange, authSubscription]);

  const unsubscribeFromAuth = useCallback(() => {
    if (authSubscription) {
      authSubscription.unsubscribe();
      setAuthSubscription(null);
    }
  }, [authSubscription]);

  useEffect(() => {
    subscribeToAuth();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        subscribeToAuth();
      } else {
        unsubscribeFromAuth();
      }
    };

    const handlePageHide = (event: PageTransitionEvent) => {
      if (!event.persisted) {
        unsubscribeFromAuth(); // This is crucial
        supabase.removeAllChannels();
      }
    };

    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        subscribeToAuth();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('pageshow', handlePageShow);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('pageshow', handlePageShow);
      unsubscribeFromAuth();
      supabase.removeAllChannels();
    };
  }, [subscribeToAuth, unsubscribeFromAuth, supabase]);

  const isAdmin = role === 'ADMIN';
  const isWriter = role === 'WRITER';
  const isUserRole = role === 'USER';

  const value = useMemo(() => ({
    user,
    profile,
    role,
    isLoading,
    isAdmin,
    isWriter,
    isUserRole,
    supabase,
  }), [user, profile, role, isLoading, isAdmin, isWriter, isUserRole, supabase]);

  return (
    <AuthContext.Provider value={value}>
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