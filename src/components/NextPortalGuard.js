import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { canAccess, getFirstAccessibleAdminPath } from '../utils/permissions';
import { canAccessDepartment, getDefaultDepartmentPath } from '../utils/departments';
import { mapAdminPathToStaffPath } from '../../lib/staffRouting';

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
  if (['custom', 'admin'].includes(user.role)) {
    if (['onboarding', 'pending'].includes(String(user.status || '').toLowerCase())) {
      return '/staff/onboarding';
    }
    if (user.role === 'admin') return '/admin/dashboard';
    return '/staff/dashboard';
  }
  return fallback;
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

  const isStaffOnboarding = currentPath === '/staff/onboarding' || currentPath.startsWith('/staff/onboarding/');
  const isPendingStaff = (user?.role === 'custom' || user?.role === 'admin') && ['onboarding', 'pending'].includes(String(user?.status || '').toLowerCase());
  const isActiveStaff = (user?.role === 'custom' || user?.role === 'admin') && String(user?.status || '').toLowerCase() === 'active';

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
    isPendingTeacher && !isTeacherHR
  );
  const staffBlocked = Boolean(
    isPendingStaff && !isStaffOnboarding
  );
  const activeStaffOnboardingBlocked = Boolean(
    isActiveStaff && isStaffOnboarding
  );
  const staffAdminBlocked = Boolean(
    user?.role === 'custom' && (currentPath === '/admin' || currentPath.startsWith('/admin/'))
  );

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace(loginPath);
      return;
    }

    if (staffAdminBlocked) {
      router.replace(mapAdminPathToStaffPath(currentPath));
      return;
    }

    if (teacherBlocked) {
      if (isPendingTeacher) {
        toast.error("Please complete your onboarding first.");
        router.replace('/teacher/hr');
      }
      return;
    }

    if (staffBlocked) {
      toast.error("Please complete your onboarding first.");
      router.replace('/staff/onboarding');
      return;
    }

    if (activeStaffOnboardingBlocked) {
      router.replace(getRedirectPath(user, loginPath));
      return;
    }

    if (roleBlocked || permissionBlocked || departmentBlocked) {
      toast.error("You don't have permission to access this section.");
      router.replace(getRedirectPath(user, loginPath));
    }
  }, [loading, user, roleBlocked, permissionBlocked, departmentBlocked, teacherBlocked, staffBlocked, staffAdminBlocked, activeStaffOnboardingBlocked, isPendingTeacher, isActiveTeacher, isPendingStaff, isActiveStaff, router, loginPath, currentPath]);

  if (loading || !user || roleBlocked || permissionBlocked || departmentBlocked || teacherBlocked || staffBlocked || activeStaffOnboardingBlocked || staffAdminBlocked) {
    return <div style={loadingStyle}>Loading...</div>;
  }

  return children;
};

export default NextPortalGuard;
