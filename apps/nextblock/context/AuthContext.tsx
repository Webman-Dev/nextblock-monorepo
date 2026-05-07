// context/AuthContext.tsx
'use client';

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import type { ReactNode } from 'react';
import type { User, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@nextblock-cms/db';

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
  const [user, setUser] = useState<User | null>(serverUser);
  const [profile, setProfile] = useState<Profile | null>(serverProfile);
  const [role, setRole] = useState<UserRole | null>(serverProfile?.role ?? null);
  const [isLoading] = useState(false);

  useEffect(() => {
    setUser(serverUser);
    setProfile(serverProfile);
    setRole(serverProfile?.role ?? null);
  }, [serverUser, serverProfile]);

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
    supabase: null,
  }), [user, profile, role, isLoading, isAdmin, isWriter, isUserRole]);

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
