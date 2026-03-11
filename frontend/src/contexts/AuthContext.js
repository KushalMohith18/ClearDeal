import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);
const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('cd_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      axios.get(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => {
          // Handle both response formats: { user: {...} } or {...}
          const userData = res.data?.user || res.data;
          setUser(userData);
        })
        .catch(() => {
          localStorage.removeItem('cd_token');
          setToken(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = (userData, authToken) => {
    // Handle both formats
    const user = userData?.user || userData;
    setUser(user);
    setToken(authToken);
    localStorage.setItem('cd_token', authToken);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('cd_token');
  };

  const refreshUser = async () => {
    if (!token) return null;
    try {
      const res = await axios.get(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Handle both response formats
      const userData = res.data?.user || res.data;
      setUser(userData);
      return userData;
    } catch (e) {
      console.error('Failed to refresh user:', e);
      return null;
    }
  };

  // Update user data locally (for after company creation)
  const updateUser = (updates) => {
    setUser(prev => ({ ...prev, ...updates }));
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading, setUser, refreshUser, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
export default AuthContext;
