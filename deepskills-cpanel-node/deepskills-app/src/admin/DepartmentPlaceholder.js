import React from 'react';
import styled from 'styled-components';
import AdminLayout from '../components/AdminLayout';
import { getDepartmentByPath } from '../utils/departments';

const DepartmentPlaceholder = ({ title, icon = '🏢', description }) => {
  const department = getDepartmentByPath(typeof window !== 'undefined' ? window.location.pathname : '/admin/dashboard');

  return (
    <AdminLayout>
      <Container $color={department.color}>
        <Icon>{icon}</Icon>
        <h1>{title}</h1>
        <p>{description || 'This department workspace is ready. The detailed tools for this section will be connected here.'}</p>
      </Container>
    </AdminLayout>
  );
};

const Container = styled.div`
  min-height: 420px;
  background:
    radial-gradient(circle at top left, ${({ $color }) => `${$color}26`}, transparent 34%),
    #111318;
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 18px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 44px 24px;

  h1 {
    color: #fff;
    margin: 18px 0 10px;
    font-size: 2rem;
  }

  p {
    color: #9ca3af;
    max-width: 560px;
    line-height: 1.7;
    margin: 0;
  }
`;

const Icon = styled.div`
  width: 82px;
  height: 82px;
  border-radius: 24px;
  background: rgba(255,255,255,0.06);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.8rem;
`;

export default DepartmentPlaceholder;
