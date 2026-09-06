import { createContext, useContext, useEffect, useState } from 'react';
import api from '../services/api';

const AuthContext = createContext();

const getStoredUser = () => {
  try {
    const storedUser = localStorage.getItem('auth_user');
    return storedUser ? JSON.parse(storedUser) : null;
  } catch {
    localStorage.removeItem('auth_user');
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(getStoredUser);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const bootstrap = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        api.defaults.headers.common.Authorization = `Bearer ${token}`;
        const { data } = await api.get('/auth/me');
        setUser(data.user);
        localStorage.setItem('auth_user', JSON.stringify(data.user));
      } catch (error) {
        // Only discard the session when the server confirms the token is no
        // longer valid. A temporary network/database error must not log out a
        // user on page refresh.
        if (error.response?.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('auth_user');
          setToken(null);
          setUser(null);
        }
      } finally {
        setLoading(false);
      }
    };

    bootstrap();
  }, [token]);

  const login = async (payload) => {
    const { data } = await api.post('/auth/login', payload);
    localStorage.setItem('token', data.token);
    localStorage.setItem('auth_user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    api.defaults.headers.common.Authorization = `Bearer ${data.token}`;
    return data;
  };

  const googleLogin = async (credential) => {
    const { data } = await api.post('/auth/google', { credential });
    localStorage.setItem('token', data.token);
    localStorage.setItem('auth_user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    api.defaults.headers.common.Authorization = `Bearer ${data.token}`;
    return data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('auth_user');
    setToken(null);
    setUser(null);
    delete api.defaults.headers.common.Authorization;
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, googleLogin, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
