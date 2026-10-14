import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/client';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('solar_token');
      const savedUser = localStorage.getItem('solar_user');
      if (token && savedUser) {
        try {
          setUser(JSON.parse(savedUser));
          // Refresh profile in background
          const res = await api.get('/auth/me');
          setUser(res.data.user);
          localStorage.setItem('solar_user', JSON.stringify(res.data.user));
        } catch (err) {
          localStorage.removeItem('solar_token');
          localStorage.removeItem('solar_user');
          setUser(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { access_token, user: loggedUser } = res.data;
    localStorage.setItem('solar_token', access_token);
    localStorage.setItem('solar_user', JSON.stringify(loggedUser));
    setUser(loggedUser);
    return loggedUser;
  };

  const register = async (name, email, password, confirm_password) => {
    const res = await api.post('/auth/register', { name, email, password, confirm_password });
    const { access_token, user: registeredUser } = res.data;
    localStorage.setItem('solar_token', access_token);
    localStorage.setItem('solar_user', JSON.stringify(registeredUser));
    setUser(registeredUser);
    return registeredUser;
  };

  const logout = () => {
    localStorage.removeItem('solar_token');
    localStorage.removeItem('solar_user');
    setUser(null);
  };

  const updateProfile = async (updateData) => {
    const res = await api.put('/auth/profile', updateData);
    setUser(res.data.user);
    localStorage.setItem('solar_user', JSON.stringify(res.data.user));
    return res.data;
  };

  const hasRole = (...roles) => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateProfile, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
