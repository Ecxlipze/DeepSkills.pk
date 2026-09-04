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

      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        if (parsed.authType !== 'supabase_admin') {
          setUser(parsed);
          setLoading(false);
          return;
        }
      }

      const shouldCheckSupabaseSession = currentPath.startsWith('/admin') || storedUser;

      if (!shouldCheckSupabaseSession) {
        setLoading(false);
        return;
      }

      const supabase = await getSupabase();
      const { ADMIN_FULL_PERMISSIONS } = await getPermissions();

      // 1. Check Supabase session first (for Admin)
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
        // 2. If no Supabase session, check for CNIC session in localStorage
        if (storedUser) {
          const parsed = JSON.parse(storedUser);
          if (parsed.authType === 'supabase_admin') {
            setUser(null);
            localStorage.removeItem('deepskill_user');
          } else {
            setUser(parsed);
          }
        }
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

  const requestLoginOtp = async (cnic) => postJson('/api/auth/send-otp.php', { cnic });

  const verifyLoginOtp = async (cnic, otp) => postJson('/api/auth/verify-otp.php', { cnic, otp });

  const login = async (cnic, options = {}) => {
    try {
      if (!options.verificationToken) {
        throw new Error('Email OTP verification is required before login.');
      }

      const sessionResult = await postJson('/api/auth/validate-token.php', {
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
      const response = await fetch('/api/register.php', {
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
