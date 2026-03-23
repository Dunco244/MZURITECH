import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User } from '@/types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string, remember?: boolean) => Promise<void>;
  register: (name: string, email: string, password: string, phone: string) => Promise<void>;
  registerAsVendor: (name: string, email: string, password: string, phone: string, businessName: string, businessDescription: string, businessPhone: string) => Promise<void>;
  logout: () => void;
  updateProfile: (data: Partial<User>) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Safe JSON parse helper to prevent crashes from corrupted localStorage
const safeJSONParse = <T,>(storage: Storage, key: string, fallback: T): T => {
  try {
    if (typeof window === 'undefined') return fallback;
    const stored = storage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch (error) {
    console.error(`Error parsing ${key} from localStorage:`, error);
    // Clear corrupted data
    storage.removeItem(key);
    return fallback;
  }
};

const getStoredToken = (): string | null =>
  (typeof window === 'undefined')
    ? null
    : localStorage.getItem('token') || sessionStorage.getItem('token');

const getStoredUser = (): User | null => {
  if (typeof window === 'undefined') return null;
  const localUser = safeJSONParse<User | null>(localStorage, 'user', null);
  if (localUser) return localUser;
  return safeJSONParse<User | null>(sessionStorage, 'user', null);
};

const getActiveStorage = (): Storage | null => {
  if (typeof window === 'undefined') return null;
  if (localStorage.getItem('token')) return localStorage;
  if (sessionStorage.getItem('token')) return sessionStorage;
  return null;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Initialize user from localStorage to prevent blank state on page load
  const [user, setUser] = useState<User | null>(() => getStoredUser());
  
  const [token, setToken] = useState<string | null>(() => getStoredToken());
  
  const [isLoading, setIsLoading] = useState(true);
  
  // Track if initial auth check has completed
  const [authChecked, setAuthChecked] = useState(false);

  const fetchProfile = useCallback(async (authToken: string) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch(`${API_URL}/api/auth/profile`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        // Update both state and localStorage with fresh user data
        setUser(data.user);
        const storage = getActiveStorage() || localStorage;
        storage.setItem('user', JSON.stringify(data.user));
      } else if (response.status === 401) {
        // Token is truly invalid (expired, etc.), clear storage
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        setToken(null);
        setUser(null);
      }
      // For other errors (network, server), do NOT clear user - keep from localStorage
    } catch (error: any) {
      console.error('Error fetching profile:', error);
      // Network error or timeout - keep user from localStorage, don't clear
      // This prevents white screen when backend is slow/unavailable
    }
    // Note: isLoading is set to false after initial check completes
  }, []);

  useEffect(() => {
    let mounted = true;
    
    const initAuth = async () => {
      const storedToken = getStoredToken();
      if (storedToken && mounted) {
        await fetchProfile(storedToken);
      }
      if (mounted) {
        setIsLoading(false);
        setAuthChecked(true);
      }
    };
    
    // Don't wait too long - proceed with app after timeout
    const timeoutId = setTimeout(() => {
      if (mounted) {
        setIsLoading(false);
        setAuthChecked(true);
      }
    }, 3000); // 3 second max wait
    
    initAuth();
    
    return () => {
      mounted = false;
      clearTimeout(timeoutId);
    };
  }, [fetchProfile]);

  const login = async (email: string, password: string, remember: boolean = true) => {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Login failed');
    }

    if (remember) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
    } else {
      sessionStorage.setItem('token', data.token);
      sessionStorage.setItem('user', JSON.stringify(data.user));
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    setToken(data.token);
    setUser(data.user);
  };

  const register = async (name: string, email: string, password: string, phone: string) => {
    const response = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name, email, password, phone })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Registration failed');
    }

    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    setToken(data.token);
    setUser(data.user);
  };

  const registerAsVendor = async (
    name: string, 
    email: string, 
    password: string, 
    phone: string, 
    businessName: string, 
    businessDescription: string, 
    businessPhone: string
  ) => {
    const response = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        name, 
        email, 
        password, 
        phone,
        isVendor: true,
        businessName,
        businessDescription,
        businessPhone
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Vendor registration failed');
    }

    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
  };

  const logout = () => {
    // Clear stored auth from both storages
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  const updateProfile = async (data: Partial<User>) => {
    if (!token) return;

    const response = await fetch(`${API_URL}/api/auth/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Update failed');
    }

    setUser(result.user);
    const storage = getActiveStorage() || localStorage;
    storage.setItem('user', JSON.stringify(result.user));
  };

  const forgotPassword = async (email: string) => {
    const response = await fetch(`${API_URL}/api/auth/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to send reset email');
    }
  };

  const resetPassword = async (token: string, password: string) => {
    const response = await fetch(`${API_URL}/api/auth/reset-password/${token}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ password })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to reset password');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        registerAsVendor,
        logout,
        updateProfile,
        forgotPassword,
        resetPassword
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
