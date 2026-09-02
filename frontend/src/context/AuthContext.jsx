import { createContext, useContext, useEffect, useState } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
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
      } catch (error) {
        localStorage.removeItem('token');
        setToken(null);
      } finally {
        setLoading(false);
      }
    };

    bootstrap();
  }, [token]);

  const login = async (payload) => {
    const { data } = await api.post('/auth/login', payload);
    localStorage.setItem('token', data.token);
    setToken(data.token);
    setUser(data.user);
    api.defaults.headers.common.Authorization = `Bearer ${data.token}`;
    return data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    delete api.defaults.headers.common.Authorization;
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
