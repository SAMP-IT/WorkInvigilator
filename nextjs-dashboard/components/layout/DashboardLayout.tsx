'use client';

import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { AuthGuard } from '@/components/auth/AuthGuard';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-bg">
        <div className="flex">
          {/* Sidebar */}
          <Sidebar />

          {/* Main content */}
          <div className="flex-1 flex flex-col">
            {/* Top bar */}
            <TopBar />

            {/* Page content */}
            <main className="flex-1 p-6">
              {children}
            </main>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}