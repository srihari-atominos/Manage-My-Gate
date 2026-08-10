import React, { useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';

interface AuthInitializerProps {
  children: React.ReactNode;
}

export const AuthInitializer: React.FC<AuthInitializerProps> = ({ children }) => {
  const { bootstrap } = useAuth();

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  return <>{children}</>;
};

export default AuthInitializer;

