'use client';

import React, { DependencyList, createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { SupabaseClient, type User } from '@supabase/supabase-js';

interface FirebaseProviderProps {
  children: ReactNode;
  supabase: SupabaseClient;
}

// Internal state for user authentication
interface UserAuthState {
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
}

// Combined state for the Supabase context
export interface FirebaseContextState {
  areServicesAvailable: boolean;
  supabase: SupabaseClient | null;
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
}

// Return type for useFirebase()
export interface FirebaseServicesAndUser {
  supabase: SupabaseClient;
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
}

// Return type for useUser() - specific to user auth state
export interface UserHookResult {
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
}

// React Context
export const FirebaseContext = createContext<FirebaseContextState | undefined>(undefined);

/**
 * FirebaseProvider manages and provides Supabase services and user authentication state.
 */
export const FirebaseProvider: React.FC<FirebaseProviderProps> = ({
  children,
  supabase,
}) => {
  const [userAuthState, setUserAuthState] = useState<UserAuthState>({
    user: null,
    isUserLoading: true,
    userError: null,
  });

  useEffect(() => {
    if (!supabase) {
      setUserAuthState({ user: null, isUserLoading: false, userError: new Error('Supabase client not provided.') });
      return;
    }

    setUserAuthState({ user: null, isUserLoading: true, userError: null });

    const loadCurrentUser = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error('FirebaseProvider: supabase.auth.getSession error:', error);
        setUserAuthState({ user: null, isUserLoading: false, userError: error });
        return;
      }

      setUserAuthState({ user: data.session?.user ?? null, isUserLoading: false, userError: null });
    };

    void loadCurrentUser();

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserAuthState({ user: session?.user ?? null, isUserLoading: false, userError: null });
    });

    return () => {
      try {
        // `data` may contain the subscription object depending on supabase-js version
        // defensively call unsubscribe if present
        (data as any)?.subscription?.unsubscribe?.();
      } catch (e) {
        // ignore cleanup errors
      }
    };
  }, [supabase]);

  const contextValue = useMemo((): FirebaseContextState => ({
    areServicesAvailable: !!supabase,
    supabase: supabase ?? null,
    user: userAuthState.user,
    isUserLoading: userAuthState.isUserLoading,
    userError: userAuthState.userError,
  }), [supabase, userAuthState]);

  return (
    <FirebaseContext.Provider value={contextValue}>
      {children}
    </FirebaseContext.Provider>
  );
};

/**
 * Hook to access core Firebase services and user authentication state.
 * Throws error if core services are not available or used outside provider.
 */
export const useFirebase = (): FirebaseServicesAndUser => {
  const context = useContext(FirebaseContext);

  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider.');
  }

  if (!context.areServicesAvailable || !context.supabase) {
    throw new Error('Supabase services not available. Check FirebaseProvider props.');
  }

  return {
    supabase: context.supabase,
    user: context.user,
    isUserLoading: context.isUserLoading,
    userError: context.userError,
  };
};

type MemoFirebase<T> = T & { __memo?: boolean };

export function useMemoFirebase<T>(factory: () => T, deps: DependencyList): T | (MemoFirebase<T>) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const memoized = useMemo(() => factory(), deps);
  
  if(typeof memoized !== 'object' || memoized === null) return memoized;
  (memoized as MemoFirebase<T>).__memo = true;
  
  return memoized;
}

/**
 * Hook specifically for accessing the authenticated user's state.
 * This provides the User object, loading status, and any auth errors.
 * @returns {UserHookResult} Object with user, isUserLoading, userError.
 */
export const useUser = (): UserHookResult => { // Renamed from useAuthUser
  const { user, isUserLoading, userError } = useFirebase(); // Leverages the main hook
  return { user, isUserLoading, userError };
};