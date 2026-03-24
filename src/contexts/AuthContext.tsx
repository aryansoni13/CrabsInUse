import React, { createContext, useContext, useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { toast } from "sonner";
import { userStorage } from "@/lib/storage";

// Mock user constants
const MOCK_USER_ID = "local-user-id";
const MOCK_USER: User = {
  id: MOCK_USER_ID,
  aud: "authenticated",
  role: "authenticated",
  email: "localuser@example.com",
  user_metadata: {
    display_name: "Local Admin",
  },
  app_metadata: {},
  created_at: new Date().toISOString(),
  last_sign_in_at: new Date().toISOString(),
};

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (
    email: string,
    password: string,
    fullName: string,
    additionalData?: {
      companyName: string;
      mobileNumber: string;
      gstNumber: string;
    },
  ) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate getting session from localStorage
    const savedUser = localStorage.getItem("auth_user");
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
    } else {
      // For this specific requirement (bypass login/signup), we can auto-login
      setCurrentUser(MOCK_USER);
      localStorage.setItem("auth_user", JSON.stringify(MOCK_USER));
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const user = { ...MOCK_USER, email };
      setCurrentUser(user);
      localStorage.setItem("auth_user", JSON.stringify(user));
      toast.success("Logged in successfully (Dev Mode)");
    } catch (error: any) {
      toast.error(error.message || "Failed to login");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signup = async (
    email: string,
    password: string,
    fullName: string,
    additionalData?: {
      companyName: string;
      mobileNumber: string;
      gstNumber: string;
    },
  ) => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const user = { 
        ...MOCK_USER, 
        email, 
        user_metadata: { display_name: fullName } 
      };
      
      setCurrentUser(user);
      localStorage.setItem("auth_user", JSON.stringify(user));

      if (additionalData) {
        await userStorage.create(user.id, {
          email,
          displayName: fullName,
          ...additionalData,
        });
      }

      toast.success("Account created successfully (Dev Mode)");
    } catch (error: any) {
      toast.error(error.message || "Failed to create account");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setCurrentUser(null);
      localStorage.removeItem("auth_user");
      toast.success("Logged out successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to logout");
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    try {
      toast.success("Password reset simulated (Dev Mode)");
    } catch (error: any) {
      toast.error(error.message || "Failed to send reset email");
      throw error;
    }
  };

  const value = {
    currentUser,
    loading,
    login,
    signup,
    logout,
    resetPassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

