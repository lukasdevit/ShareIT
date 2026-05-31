'use client';

import { AuthProvider } from '@/features/auth/AuthProvider';
import { DashboardProvider } from '@/features/dashboard/DashboardProvider';
import { NavigationProvider } from '@/hooks/use-navigation';
import { NavHeader } from '@/components/layout/NavHeader';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { ErrorReporter } from '@/components/ui/ErrorReporter';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <ErrorReporter />
      <AuthProvider>
        <NavigationProvider>
          <DashboardProvider>
            <NavHeader />
            {children}
          </DashboardProvider>
        </NavigationProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
