import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('resq_token') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      const isExplicitlyLoggedOut = localStorage.getItem('resq_logged_out') === 'true';
      if (token) {
        try {
          const res = await api.getMe();
          setUser(res.user);
        } catch (err) {
          console.warn('Session expired or invalid token');
          localStorage.removeItem('resq_token');
          setToken(null);
          setUser(null);
        }
      } else if (!isExplicitlyLoggedOut) {
        // Auto-login as Admin Aadarsh Sahu by default for immediate preview
        await tryLoginDefault();
      }
      setLoading(false);
    }
    loadUser();
  }, [token]);

  async function tryLoginDefault() {
    try {
      const data = await api.login('admin@resq.ai', 'ResqSecure2026!');
      localStorage.setItem('resq_token', data.token);
      localStorage.removeItem('resq_logged_out');
      setToken(data.token);
      setUser(data.user);
    } catch (e) {
      console.warn('Default auth unavailable:', e.message);
    }
  }

  async function login(email, password) {
    const data = await api.login(email, password);
    localStorage.setItem('resq_token', data.token);
    localStorage.removeItem('resq_logged_out');
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }

  async function register(name, email, password, role, phone) {
    const data = await api.register(name, email, password, role, phone);
    localStorage.setItem('resq_token', data.token);
    localStorage.removeItem('resq_logged_out');
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }

  function logout() {
    localStorage.removeItem('resq_token');
    localStorage.setItem('resq_logged_out', 'true');
    setToken(null);
    setUser(null);
  }

  // Fast demo role switch with Indian Personnel
  async function switchDemoRole(targetKey) {
    const roleAccounts = {
      'admin': { email: 'admin@resq.ai', pass: 'ResqSecure2026!' },
      'authority': { email: 'authority@resq.ai', pass: 'ResqSecure2026!' },
      'rescue1': { email: 'rescue1@resq.ai', pass: 'ResqSecure2026!' },
      'rescue2': { email: 'rescue2@resq.ai', pass: 'ResqSecure2026!' },
      'rescue3': { email: 'rescue3@resq.ai', pass: 'ResqSecure2026!' },
      'rescue4': { email: 'rescue4@resq.ai', pass: 'ResqSecure2026!' },
      'public': { email: 'public@resq.ai', pass: 'ResqSecure2026!' },
      'shreyas': { email: 'shreyas@resq.ai', pass: 'ResqSecure2026!' },
      'ankitesh': { email: 'ankitesh@resq.ai', pass: 'ResqSecure2026!' },
    };

    const target = roleAccounts[targetKey] || roleAccounts['admin'];
    if (target) {
      return await login(target.email, target.pass);
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
        switchDemoRole,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'Admin',
        isAuthority: user?.role === 'Disaster Authority' || user?.role === 'Admin',
        isRescueTeam: user?.role === 'Rescue Team',
        isPublic: user?.role === 'Public User',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
