"use client";

/**
 * User Context
 *
 * Provides authenticated user data to components within the dashboard.
 * Used by VerificationGate to share user data fetched during auth check.
 *
 * Story 2.3: User Login - Display user info in sidebar
 */

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

/**
 * User data structure matching /api/auth/me response
 */
export interface User {
  id: string;
  email: string;
  name: string | null;
  baseCurrency: string;
  emailVerified: boolean;
  createdAt: string;
}

/**
 * Context value type
 */
interface UserContextValue {
  /** Current user data, null if not loaded */
  user: User | null;
  /** Whether user data is being fetched */
  isLoading: boolean;
  /** Set user data (called by VerificationGate) */
  setUser: (user: User | null) => void;
  /** Set loading state */
  setIsLoading: (loading: boolean) => void;
  /** Clear user data (called on logout) */
  clearUser: () => void;
}

const UserContext = createContext<UserContextValue | null>(null);

/**
 * UserProvider
 *
 * Wraps components that need access to user data.
 * Should be placed inside VerificationGate or at dashboard layout level.
 */
export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [isLoading, setIsLoadingState] = useState(true);

  const setUser = useCallback((newUser: User | null) => {
    setUserState(newUser);
  }, []);

  const setIsLoading = useCallback((loading: boolean) => {
    setIsLoadingState(loading);
  }, []);

  const clearUser = useCallback(() => {
    setUserState(null);
  }, []);

  return (
    <UserContext.Provider
      value={{
        user,
        isLoading,
        setUser,
        setIsLoading,
        clearUser,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

/**
 * useUser hook
 *
 * Access the current authenticated user's data.
 *
 * @returns User context value with user data and loading state
 * @throws Error if used outside of UserProvider
 *
 * @example
 * ```tsx
 * function UserProfile() {
 *   const { user, isLoading } = useUser();
 *
 *   if (isLoading) return <Skeleton />;
 *   if (!user) return null;
 *
 *   return <span>{user.name ?? user.email}</span>;
 * }
 * ```
 */
export function useUser(): UserContextValue {
  const context = useContext(UserContext);

  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }

  return context;
}

/**
 * useUserOptional hook
 *
 * Access user data without throwing if outside provider.
 * Useful for components that may render outside the dashboard.
 *
 * @returns User context value or null if outside provider
 */
export function useUserOptional(): UserContextValue | null {
  return useContext(UserContext);
}
