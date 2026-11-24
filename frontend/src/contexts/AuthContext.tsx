import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { User } from "../types";
import { authApi } from "../services/auth.api";
import { toast } from "sonner";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  loginWithGoogle: () => void;
  loginWithDev: (email: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchCurrentUser = useCallback(async () => {
    try {
      const currentUser = await authApi.getCurrentUser();
      setUser(currentUser);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Check if redirect contains token in query params
    const searchParams = new URLSearchParams(window.location.search);
    const tokenFromUrl = searchParams.get("token");

    if (tokenFromUrl) {
      localStorage.setItem("reachinbox_token", tokenFromUrl);
      // Clean query parameter from URL
      searchParams.delete("token");
      const newSearch = searchParams.toString();
      const newUrl = window.location.pathname + (newSearch ? `?${newSearch}` : "") + window.location.hash;
      window.history.replaceState({}, document.title, newUrl);
    }

    fetchCurrentUser();
  }, [fetchCurrentUser]);

  const loginWithGoogle = () => {
    window.location.href = authApi.getGoogleAuthUrl();
  };

  const loginWithDev = async (email: string, name?: string) => {
    try {
      setIsLoading(true);
      const res = await authApi.devLogin(email, name);
      if (res.token) {
        localStorage.setItem("reachinbox_token", res.token);
      }
      setUser(res.user);
      toast.success(`Welcome back, ${res.user.name || res.user.email}!`);
    } catch (error: any) {
      const msg = error.response?.data?.message || "Login failed";
      toast.error(msg);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch {
      // Continue cleanup even if server call fails
    } finally {
      localStorage.removeItem("reachinbox_token");
      setUser(null);
      toast.info("Logged out successfully");
    }
  };

  const refreshUser = async () => {
    await fetchCurrentUser();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        loginWithGoogle,
        loginWithDev,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
