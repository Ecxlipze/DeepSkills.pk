import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import {
  DEPARTMENTS,
  getDefaultDepartmentPath,
  getDepartmentByPath,
  getVisibleDepartments
} from '../utils/departments';

const DepartmentContext = createContext({
  departments: DEPARTMENTS,
  visibleDepartments: [],
  activeDepartment: 'all',
  setActiveDepartment: () => {},
  getDefaultDepartmentPath
});

const storageKey = 'deepskill_active_department';

export const DepartmentProvider = ({ children }) => {
  const { user } = useAuth();
  const visibleDepartments = useMemo(() => getVisibleDepartments(user), [user]);
  const [activeDepartment, setActiveDepartmentState] = useState('all');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const pathDepartment = getDepartmentByPath(window.location.pathname)?.id;
    const stored = localStorage.getItem(storageKey);
    const next = pathDepartment || stored || visibleDepartments[0]?.id || 'all';
    setActiveDepartmentState(next);
  }, [visibleDepartments]);

  const setActiveDepartment = (departmentId) => {
    setActiveDepartmentState(departmentId);
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, departmentId);
    }
  };

  const value = useMemo(() => ({
    departments: DEPARTMENTS,
    visibleDepartments,
    activeDepartment,
    setActiveDepartment,
    getDefaultDepartmentPath
  }), [activeDepartment, visibleDepartments]);

  return (
    <DepartmentContext.Provider value={value}>
      {children}
    </DepartmentContext.Provider>
  );
};

export const useDepartment = () => useContext(DepartmentContext);
