'use client';

import { AuthProvider } from '@/features/auth/AuthProvider';
import { DashboardProvider } from '@/features/dashboard/DashboardProvider';
import { NavHeader } from '@/components/layout/NavHeader';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <DashboardProvider>
          <NavHeader />
          {children}
        </DashboardProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
