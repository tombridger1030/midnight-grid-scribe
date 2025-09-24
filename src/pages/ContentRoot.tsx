import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

// Wrapper to default to dashboard if user visits /content
const ContentRoot: React.FC = () => {
  return (
    <Outlet />
  );
};

export default ContentRoot;


