import { requestJson } from '../utils/requestJson';
import React, { createContext, useState, useContext, useEffect } from 'react';
const AuthContext = createContext(null);

const getSupabase = async () => {
  const module = await import('../supabaseClient');
  return module.supabase;
};

const getActivityLogger = async () => import('../utils/activityLogger');
const getPermissions = async () => import('../utils/permissions');

const postJson = async (url, payload) => {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.status === 'error') {
    throw new Error(result.message || 'Request failed.');
  }
  return result;
};

const postAuthJson = (endpoint, payload, headers = {}) => requestJson(endpoint, {
  method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(payload)
});

const clearStoredSupabaseAuth = () => {
  if (typeof window === 'undefined') return;

  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
      localStorage.removeItem(key);
    }
  });
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      const currentPath = window.location.pathname;
      const storedUser = localStorage.getItem('deepskill_user');
      const sessionToken = localStorage.getItem('deepskill_session_token');

      // 1. Check for CNIC Session Token (Server-side validation)
      if (sessionToken) {
        try {
          let response = await fetch('/api/auth/validate-session', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${sessionToken}`
            }
          });

          const result = await response.json().catch(() => ({}));
          if (response.ok && result.status === 'success' && result.user) {
            const freshUser = result.user;
            if (!freshUser.sessionToken) {
              freshUser.sessionToken = sessionToken;
            }
            setUser(freshUser);
            localStorage.setItem('deepskill_user', JSON.stringify(freshUser));
            setLoading(false);
            return;
          } else {
            // Server rejected session
            localStorage.removeItem('deepskill_user');
            localStorage.removeItem('deepskill_session_token');
            setUser(null);
          }
        } catch (err) {
          console.error('Session validation error:', err);
          localStorage.removeItem('deepskill_user');
          localStorage.removeItem('deepskill_session_token');
          setUser(null);
        }
      }

      // If storedUser had authType === 'cnic' without valid session token, wipe it
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          if (parsed.authType === 'cnic') {
            localStorage.removeItem('deepskill_user');
          }
        } catch {
          localStorage.removeItem('deepskill_user');
        }
      }

      const shouldCheckSupabaseSession = currentPath.startsWith('/admin') || (storedUser && (() => {
        try { return JSON.parse(storedUser)?.authType === 'supabase_admin'; } catch { return false; }
      })());

      if (!shouldCheckSupabaseSession) {
        setLoading(false);
        return;
      }

      const supabase = await getSupabase();
      const { ADMIN_FULL_PERMISSIONS } = await getPermissions();

      // 2. Check Supabase session (for Super Admin)
      let session = null;
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        session = data.session;
      } catch (error) {
        if (error?.message?.toLowerCase().includes('refresh token')) {
          await supabase.auth.signOut({ scope: 'local' });
          clearStoredSupabaseAuth();
          localStorage.removeItem('deepskill_user');
        } else {
          throw error;
        }
      }

      if (session) {
        const adminUser = {
          id: session.user.id,
          email: session.user.email,
          name: 'Administrator',
          role: 'admin',
          permissions: { ...ADMIN_FULL_PERMISSIONS },
          authType: 'supabase_admin'
        };
        setUser(adminUser);
        localStorage.setItem('deepskill_user', JSON.stringify(adminUser));
      } else {
        setUser(null);
        localStorage.removeItem('deepskill_user');
      }
      setLoading(false);
    };

    checkSession();

    const currentPath = window.location.pathname;
    if (!currentPath.startsWith('/admin')) {
      return undefined;
    }

    let subscription;

    getSupabase().then(async (supabase) => {
      const { ADMIN_FULL_PERMISSIONS } = await getPermissions();
      // Listen for Auth changes
      const result = supabase.auth.onAuthStateChange((_event, session) => {
        if (session) {
          const adminUser = {
            id: session.user.id,
            email: session.user.email,
            name: 'Administrator',
            role: 'admin',
            permissions: { ...ADMIN_FULL_PERMISSIONS },
            authType: 'supabase_admin'
          };
          setUser(adminUser);
          localStorage.setItem('deepskill_user', JSON.stringify(adminUser));
        } else {
          const stored = localStorage.getItem('deepskill_user');
          if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed.authType === 'supabase_admin') {
              setUser(null);
              localStorage.removeItem('deepskill_user');
            }
          }
        }
      });
      subscription = result.data.subscription;
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const requestLoginOtp = async (cnic) => postAuthJson('/api/auth/send-otp', { cnic });

  const verifyLoginOtp = async (cnic, otp) => postAuthJson('/api/auth/verify-otp', { cnic, otp });

  const login = async (cnic, options = {}) => {
    try {
      if (!options.verificationToken) {
        throw new Error('Email OTP verification is required before login.');
      }

      const sessionResult = await postAuthJson('/api/auth/validate-token', {
        cnic,
        verificationToken: options.verificationToken
      });

      const userData = sessionResult.user;
      if (!userData) {
        throw new Error('Login verified, but no user session was returned.');
      }
      if (sessionResult.sessionToken && !userData.sessionToken) {
        userData.sessionToken = sessionResult.sessionToken;
      }
      setUser(userData);
      localStorage.setItem('deepskill_user', JSON.stringify(userData));
      if (sessionResult.sessionToken) {
        localStorage.setItem('deepskill_session_token', sessionResult.sessionToken);
      }
      return userData;
    } catch (error) {
      throw error;
    }
  };

  const register = async (applicationData) => {
    try {
      const supabase = await getSupabase();
      const { data, error } = await supabase
        .from('admissions')
        .insert([{
          ...applicationData,
          status: 'Pending',
          submitted_at: new Date().toISOString()
        }])
        .select();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Registration error:', error);
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(applicationData)
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.status === 'error') {
        throw new Error(result.message || error.message || 'Registration failed.');
      }
      return result.data || result.user || result;
    }
  };

  const logout = async () => {
    const sessionToken = localStorage.getItem('deepskill_session_token');
    const { logActivity } = await getActivityLogger();

    if (user) {
      await logActivity({
        userId: user.authType === 'cnic' && ['student', 'teacher'].includes(user.role) ? null : (user.id || null),
        userName: user.name || user.full_name || 'Unknown',
        userRole: user.role || 'unknown',
        eventType: 'logout',
        description: 'Logged out'
      });
    }

    if (user?.authType === 'supabase_admin') {
      const supabase = await getSupabase();
      await supabase.auth.signOut();
    } else if (sessionToken) {
      try {
        let res = await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionToken}`
          }
        });

      } catch (err) {
        console.warn('Server logout error:', err);
      }
    }

    setUser(null);
    localStorage.removeItem('deepskill_user');
    localStorage.removeItem('deepskill_session_token');
  };

  const updateProfile = (updatedData) => {
    const newUser = { ...user, ...updatedData };
    setUser(newUser);
    localStorage.setItem('deepskill_user', JSON.stringify(newUser));
  };

  return (
    <AuthContext.Provider value={{ 
      user, login, requestLoginOtp, verifyLoginOtp, logout, updateProfile, loading, register
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
