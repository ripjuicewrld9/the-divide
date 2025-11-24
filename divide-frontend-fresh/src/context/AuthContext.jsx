// src/context/AuthContext.jsx
import React, { createContext, useState, useEffect, useContext } from "react";
import { API_BASE } from "../config";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token") || null);

  useEffect(() => {
    if (token) localStorage.setItem("token", token);
    else localStorage.removeItem("token");
  }, [token]);

useEffect(() => {
  const loadUser = async () => {
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE}/api/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch /api/me');
      const data = await res.json();
      setUser({
        id: data.id,
        username: data.username,
        balance: data.balance,
        role: data.role || data?.role || 'user',
        profileImage: data.profileImage || ''
      });
    } catch (err) {
      console.error('[Auth] loadUser error:', err.message);
      logout();
    }
  };
  loadUser();
}, [token]);

  // REGISTER
  const register = async (username, password) => {
    try {
      const res = await fetch(`${API_BASE}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Registration failed");

  setToken(data.token);
  setUser({ username, id: data.userId, role: data.role || 'user' });
      return true;
    } catch (err) {
      console.error("Register error:", err);
      alert(err.message);
      return false;
    }
  };

  // LOGIN
  const login = async (username, password) => {
    try {
      const res = await fetch(`${API_BASE}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");

  setToken(data.token);
  setUser({ username, id: data.userId, role: data.role || 'user' });
      return true;
    } catch (err) {
      console.error("Login error:", err);
      alert(err.message);
      return false;
    }
  };

  // ADD FUNDS
  const addFunds = async (amount = 10) => {
    try {
      const res = await fetch(`${API_BASE}/add-funds`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ amount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add funds");

      // server returns { balance }
      setUser((u) => ({ ...u, balance: data.balance }));
      return true;
    } catch (err) {
      console.error("Add funds error:", err);
      return false;
    }
  };

  // DEDUCT VOTE COST
  const deductForVote = async (divideId) => {
    try {
      if (!divideId) throw new Error("Missing divide ID");

      const res = await fetch(`${API_BASE}/api/divides/${divideId}/deduct`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to deduct vote");

      // server returns { balance }
      setUser((u) => ({ ...u, balance: data.balance }));
      return true;
    } catch (err) {
      console.error("Deduct vote error:", err);
      return false;
    }
  };

  // LOGOUT
  const logout = () => {
    setToken(null);
    setUser(null);
  };

  // Refresh user data from server
  const refreshUser = async () => {
    if (!token) return null;
    try {
      const res = await fetch(`${API_BASE}/api/me`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return null;
      const data = await res.json();
      setUser((u) => ({ ...(u || {}), id: data.id, username: data.username, balance: data.balance, role: data.role || 'user', profileImage: data.profileImage || '' }));
      return data;
    } catch (err) {
      console.error('refreshUser error', err);
      return null;
    }
  };

  // Update user object locally (used for optimistic UI updates)
  const updateUser = (patch = {}) => {
    // Defer the update to avoid triggering React's "setState during render" warning
    // when child components call updateUser synchronously during their render.
    // Using a macrotask ensures the update runs after the current render completes.
    setTimeout(() => {
      try {
        setUser((u) => ({ ...(u || {}), ...patch }));
      } catch (e) {
        console.error('updateUser deferred setUser failed', e);
      }
    }, 0);
  };

  return (
    <AuthContext.Provider
      value={{ user, balance: user?.balance ?? 0, token, login, register, logout, addFunds, deductForVote, refreshUser, updateUser }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);