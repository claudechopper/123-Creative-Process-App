// Auth was removed — this is a free, local-only app. No accounts, no cloud
// sync, no OAuth. This stub exists so existing `useAuth()` consumers keep
// working without breaking. They'll always see user=null (anonymous).
//
// If you ever want accounts back: add a real Passport setup in server/index.js,
// re-wire server/routes/auth.js + api.js, then replace this stub.

import { createContext, useContext } from 'react';

const AuthContext = createContext({ user: null, loading: false, login: null, logout: null });

export function AuthProvider({ children }) {
  // No-op provider. Everyone is anonymous.
  return (
    <AuthContext.Provider value={{ user: null, loading: false, login: null, logout: null }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
