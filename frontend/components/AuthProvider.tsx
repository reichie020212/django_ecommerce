// Auth context — hydrates the current user from the stored access token on mount.
'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  type User,
  clearTokens,
  getAccessToken,
  login as apiLogin,
  logout as apiLogout,
  me,
  register as apiRegister,
} from '@/lib/auth';

type AuthContextValue = {
  user: User | null;
  isLoaded: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
  }) => Promise<void>;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoaded, setLoaded] = useState(false);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      setLoaded(true);
      return;
    }
    me()
      .then(setUser)
      .catch(() => clearTokens())
      .finally(() => setLoaded(true));
  }, []);

  const signIn: AuthContextValue['signIn'] = useCallback(async (email, password) => {
    const { user: u } = await apiLogin(email, password);
    setUser(u);
  }, []);

  const signUp: AuthContextValue['signUp'] = useCallback(async (input) => {
    const { user: u } = await apiRegister(input);
    setUser(u);
  }, []);

  const signOut: AuthContextValue['signOut'] = useCallback(() => {
    apiLogout();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, isLoaded, signIn, signUp, signOut }),
    [user, isLoaded, signIn, signUp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
