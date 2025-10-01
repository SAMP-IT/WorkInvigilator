'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

interface User {
  id: string;
  email: string;
  name?: string;
  role?: string;
}

export function TopBar() {
  const [dateRange, setDateRange] = useState('Last 7 days');
  const [user, setUser] = useState<User | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [activeSessions, setActiveSessions] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const { profile } = useAuth();

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load active sessions count
  useEffect(() => {
    const loadActiveSessions = async () => {
      if (!profile?.organization_id) return;

      try {
        const { count } = await supabase
          .from('recording_sessions')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', profile.organization_id)
          .is('session_end_time', null);

        setActiveSessions(count || 0);
      } catch (error) {
        console.error('Error loading active sessions:', error);
      }
    };

    loadActiveSessions();

    // Refresh every 30 seconds
    const interval = setInterval(loadActiveSessions, 30000);
    return () => clearInterval(interval);
  }, [profile]);

  useEffect(() => {
    // Get current user
    const getCurrentUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        // Get user profile for role and name
        const { data: profile } = await supabase
          .from('profiles')
          .select('name, role')
          .eq('id', session.user.id)
          .single() as { data: { name?: string; role?: 'admin' | 'user' } | null };

        setUser({
          id: session.user.id,
          email: session.user.email || '',
          name: profile?.name || session.user.email?.split('@')[0] || 'User',
          role: profile?.role || 'user'
        });
      }
    };

    getCurrentUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        setUser(null);
        router.push('/login');
      } else if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('name, role')
          .eq('id', session.user.id)
          .single() as { data: { name?: string; role?: 'admin' | 'user' } | null };

        setUser({
          id: session.user.id,
          email: session.user.email || '',
          name: profile?.name || session.user.email?.split('@')[0] || 'User',
          role: profile?.role || 'user'
        });
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setShowUserMenu(false);
  };

  const getUserInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      // Redirect to employees page with search query
      router.push(`/employees?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  const handleDateRangeChange = (newRange: string) => {
    setDateRange(newRange);

    // If on dashboard, reload with new period
    if (pathname === '/') {
      let period = 'today';
      if (newRange === 'Last 7 days') period = 'week';
      else if (newRange === 'Last 14 days' || newRange === 'Last 30 days') period = 'month';

      // Trigger page reload with new period (you can make this more elegant with state management)
      window.location.href = `/?period=${period}`;
    }
  };

  return (
    <div className="flex h-16 items-center justify-between px-6 bg-surface border-b border-line">
      {/* Left section */}
      <div className="flex items-center space-x-4">
        {/* Global search */}
        <div className="relative">
          <Input
            placeholder="Search employees, sessions..."
            className="w-80"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearch}
          />
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <span className="text-ink-muted text-xs">⏎</span>
          </div>
        </div>
      </div>

      {/* Right section */}
      <div className="flex items-center space-x-4">
        {/* Date range picker */}
        <div className="flex items-center space-x-2">
          <select
            value={dateRange}
            onChange={(e) => handleDateRangeChange(e.target.value)}
            className="bg-surface border border-line rounded-lg px-3 py-1.5 text-sm text-ink-hi focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option>Today</option>
            <option>Last 7 days</option>
            <option>Last 14 days</option>
            <option>Last 30 days</option>
            <option>Last 90 days</option>
            <option>This month</option>
            <option>Custom range</option>
          </select>
        </div>

        {/* User menu */}
        <div className="relative" ref={menuRef}>
          <div className="flex items-center space-x-3">
            <div
              className="flex items-center space-x-2 cursor-pointer hover:bg-raised/50 rounded-lg p-2 transition-colors"
              onClick={() => setShowUserMenu(!showUserMenu)}
            >
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-primary text-sm font-medium">
                  {user ? getUserInitials(user.name || user.email) : 'U'}
                </span>
              </div>
              <div className="text-sm">
                <div className="text-ink-hi font-medium">
                  {user?.name || user?.email?.split('@')[0] || 'Loading...'}
                </div>
                <div className="text-ink-muted text-xs capitalize">
                  {user?.role || 'user'}
                </div>
              </div>
              <svg
                className={`w-4 h-4 text-ink-muted transition-transform ${showUserMenu ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          {/* Dropdown Menu */}
          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-64 bg-surface border border-line rounded-lg shadow-lg z-50">
              <div className="p-4 border-b border-line">
                <div className="text-sm font-medium text-ink-hi">{user?.name || 'User'}</div>
                <div className="text-xs text-ink-muted">{user?.email}</div>
                <div className="text-xs text-ink-muted mt-1">
                  <Badge variant={user?.role === 'admin' ? 'warning' : 'info'} size="sm">
                    {user?.role || 'user'}
                  </Badge>
                </div>
              </div>

              <div className="p-2">
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    router.push('/settings');
                  }}
                  className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-ink-mid hover:text-ink-hi hover:bg-raised rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>Settings</span>
                </button>

                <div className="border-t border-line my-2"></div>

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span>Sign out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}