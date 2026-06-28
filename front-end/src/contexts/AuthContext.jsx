import React, { createContext, useState, useContext, useCallback, useEffect } from 'react';
import { setAuthToken, setOnSessionExpired } from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [sessionExpired, setSessionExpired] = useState(false);

  const login = useCallback((jwt, user_id, name) => {
    setAuthToken(jwt);
    setSessionExpired(false);
    setUser({
      playerId: user_id,
      name: name,
      jwt: jwt,
      isAnonymous: false,
    });
  }, []);

  const logout = useCallback(() => {
    setAuthToken(null);
    setUser(null);
  }, []);

  const joinAsAnonymous = useCallback(() => {
    const anonId = `anon:${crypto.randomUUID()}`;
    
    setUser({
      playerId: anonId,
      name: 'Jogador Anônimo', 
      jwt: null, 
      isAnonymous: true,
    });

    return anonId;
  }, []);

  const updateName = useCallback((newName) => {
    setUser((prev) => (prev ? { ...prev, name: newName } : prev));
  }, []);

  useEffect(() => {
    setOnSessionExpired(() => {
      setSessionExpired(true);
      setUser(null);
    });
    return () => setOnSessionExpired(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, joinAsAnonymous, sessionExpired, updateName }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve ser usado dentro de um AuthProvider");
  }
  return context;
};