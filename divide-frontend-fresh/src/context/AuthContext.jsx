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
                    profileImage: data.profileImage || '',
                    wagered: data.wagered || 0,
                    totalWon: data.totalWon || 0,
                    totalDeposited: data.totalDeposited || 0,
                    totalWithdrawn: data.totalWithdrawn || 0,
                    totalBets: data.totalBets || 0,
                    totalWins: data.totalWins || 0,
                    totalLosses: data.totalLosses || 0,
                    createdAt: data.createdAt,
                    discordId: data.discordId || null,
                    discordUsername: data.discordUsername || null,
                    xp: data.xp || 0,
                    level: data.level || 1,
                    currentBadge: data.currentBadge || 'Sheep',
                    xpThisWeek: data.xpThisWeek || 0,
                    xpThisMonth: data.xpThisMonth || 0
                });
            } catch (err) {
                console.error('[Auth] loadUser error:', err.message);
                logout();
            }
        };
        loadUser();

        // CRITICAL FIX: Periodically refresh balance from server to prevent desync
        // This ensures Header always shows accurate balance even after game plays
        const refreshInterval = setInterval(async () => {
            if (token) {
                try {
                    const res = await fetch(`${API_BASE}/api/me`, {
                        headers: { Authorization: `Bearer ${token}` },
                    });
                    if (res.ok) {
                        const data = await res.json();
                        setUser((prevUser) => {
                            // Only update if balance changed on server (prevents fighting with local updates)
                            if (prevUser && Math.abs((prevUser.balance || 0) - data.balance) > 0.01) {
                                console.log('[Auth] Balance synced from server:', data.balance);
                                return {
                                    ...prevUser,
                                    balance: data.balance,
                                    wagered: data.wagered || prevUser.wagered,
                                    totalWon: data.totalWon || prevUser.totalWon,
                                    xp: data.xp || prevUser.xp,
                                    level: data.level || prevUser.level,
                                    currentBadge: data.currentBadge || prevUser.currentBadge,
                                    xpThisWeek: data.xpThisWeek || prevUser.xpThisWeek,
                                    xpThisMonth: data.xpThisMonth || prevUser.xpThisMonth
                                };
                            }
                            return prevUser;
                        });
                    }
                } catch (err) {
                    console.error('[Auth] Periodic refresh error:', err.message);
                }
            }
        }, 5000); // Refresh every 5 seconds

        return () => clearInterval(refreshInterval);
    }, [token]);

    // REGISTER
    const register = async (username, password, email, dateOfBirth, marketingConsent) => {
        try {
            const res = await fetch(`${API_BASE}/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password, email, dateOfBirth, marketingConsent }),
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

            // Check if 2FA is required
            if (data.requires2FA) {
                return { requires2FA: true, userId: data.userId };
            }

            if (!res.ok) throw new Error(data.error || "Login failed");

            setToken(data.token);
            setUser({ username, id: data.userId, role: data.role || 'user' });
            return { success: true };
        } catch (err) {
            console.error("Login error:", err);
            throw err;
        }
    };

    // VERIFY 2FA
    const verify2FA = async (userId, tfaToken) => {
        try {
            const res = await fetch(`${API_BASE}/verify-2fa`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId, token: tfaToken }),
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || "Invalid 2FA code");

            setToken(data.token);
            setUser({ id: data.userId, role: data.role || 'user' });
            return { success: true };
        } catch (err) {
            console.error("2FA verification error:", err);
            throw err;
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

    // WITHDRAW FUNDS
    const withdrawFunds = async (amount) => {
        try {
            const res = await fetch(`${API_BASE}/api/withdraw`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ amount }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to withdraw");

            // server returns { balance, withdrawn }
            setUser((u) => ({ ...u, balance: data.balance }));
            return { success: true };
        } catch (err) {
            console.error("Withdraw error:", err);
            return { success: false, error: err.message };
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
            setUser({
                id: data.id,
                username: data.username,
                balance: data.balance,
                role: data.role || 'user',
                profileImage: data.profileImage || '',
                wagered: data.wagered || 0,
                totalWon: data.totalWon || 0,
                totalDeposited: data.totalDeposited || 0,
                totalWithdrawn: data.totalWithdrawn || 0,
                discordId: data.discordId || null,
                discordUsername: data.discordUsername || null
            });
            console.log('[Auth] refreshUser completed - user:', data.username);
            return data;
        } catch (err) {
            console.error('refreshUser error', err);
            return null;
        }
    };

    // Update user object locally AND persist to server
    const updateUser = async (patch = {}) => {
        try {
            // 1. Optimistic update - ALWAYS update local state immediately
            setUser((u) => ({ ...(u || {}), ...patch }));

            // 2. Persist to backend (only for allowed fields like profileImage, discordId, discordUsername)
            if (token && Object.keys(patch).some(key => ['profileImage', 'discordId', 'discordUsername'].includes(key))) {
                const res = await fetch(`${API_BASE}/api/me`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify(patch)
                });

                if (!res.ok) {
                    console.error('Failed to persist user update');
                    refreshUser();
                }
            }

            // 3. If balance was updated, log it for debugging
            if (patch.balance !== undefined) {
                // Round balance to avoid floating point errors
                const roundedBalance = Math.round(patch.balance * 100) / 100;
                setUser((u) => ({ ...(u || {}), ...patch, balance: roundedBalance }));
            }
        } catch (e) {
            console.error('updateUser failed', e);
        }
    };

    // Update balance locally only (optimistic UI, server will send authoritative value)
    const setBalance = (newBalance) => {
        // Round to 2 decimal places to avoid floating point errors
        const roundedBalance = Math.round(newBalance * 100) / 100;
        setUser((u) => ({ ...(u || {}), balance: roundedBalance }));
    };

    return (
        <AuthContext.Provider
            value={{ user, balance: user?.balance ?? 0, token, setToken, login, register, verify2FA, logout, addFunds, withdrawFunds, deductForVote, refreshUser, updateUser, setBalance }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);