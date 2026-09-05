import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { canAccess, getFirstAccessibleAdminPath } from '../utils/permissions';
import { canAccessDepartment } from '../utils/departments';

const loadingStyle = {
  height: '100vh',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  background: '#000',
  color: '#fff',
  fontFamily: 'Inter, sans-serif'
};

const getRedirectPath = (user, fallback = '/login') => {
  if (!user) return fallback;
  if (user.role === 'teacher') {
    if (user.status === 'Pending' || user.status === 'Onboarding') {
      return '/teacher/hr';
    }
    return '/teacher/dashboard';
  }
  if (user.role === 'student') return '/student/dashboard';
  if (user.role === 'admin') return '/admin/dashboard';
  return getFirstAccessibleAdminPath(user.permissions || {});
};

const NextPortalGuard = ({
  children,
  allowedRoles,
  permissionKey,
  departmentId,
  minimum = 'view',
  loginPath = '/login'
}) => {
  const router = useRouter();
  const { user, loading } = useAuth();

  const currentPath = (router.asPath ? router.asPath.split('?')[0] : router.pathname) || '';
  const isTeacherHR = currentPath === '/teacher/hr' || currentPath.startsWith('/teacher/hr/');
  const isPendingTeacher = user?.role === 'teacher' && (user?.status === 'Pending' || user?.status === 'Onboarding');
  const isActiveTeacher = user?.role === 'teacher' && user?.status === 'Active';

  const roleBlocked = Boolean(user && allowedRoles && !allowedRoles.includes(user.role));
  const permissionBlocked = Boolean(
    user &&
    permissionKey &&
    user.role !== 'admin' &&
    !canAccess(user.permissions || {}, permissionKey, minimum)
  );
  const departmentBlocked = Boolean(
    user &&
    departmentId &&
    !permissionKey &&
    user.role !== 'admin' &&
    !canAccessDepartment(user, departmentId)
  );
  const teacherBlocked = Boolean(
    (isPendingTeacher && !isTeacherHR) ||
    (isActiveTeacher && isTeacherHR)
  );

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace(loginPath);
      return;
    }

    if (teacherBlocked) {
      if (isPendingTeacher) {
        toast.error("Please complete your onboarding first.");
        router.replace('/teacher/hr');
      } else if (isActiveTeacher) {
        router.replace('/teacher/dashboard');
      }
      return;
    }

    if (roleBlocked || permissionBlocked || departmentBlocked) {
      toast.error("You don't have permission to access this section.");
      router.replace(getRedirectPath(user, loginPath));
    }
  }, [loading, user, roleBlocked, permissionBlocked, departmentBlocked, teacherBlocked, isPendingTeacher, isActiveTeacher, router, loginPath]);

  if (loading || !user || roleBlocked || permissionBlocked || departmentBlocked || teacherBlocked) {
    return <div style={loadingStyle}>Loading...</div>;
  }

  return children;
};

export default NextPortalGuard;
