import React, { useEffect } from 'react';
import { useTheme } from '@/kernel/hooks/useTheme';

interface AppShellProps { children: React.ReactNode; }

export function AppShell({ children }: AppShellProps) {
  return (
    <>
      {children}
    </>
  );
}