'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export function TopBar() {
  const [dateRange, setDateRange] = useState('Last 7 days');

  return (
    <div className="flex h-16 items-center justify-between px-6 bg-surface border-b border-line">
      {/* Left section */}
      <div className="flex items-center space-x-4">
        {/* Environment badge */}
        <Badge variant="info" size="sm">
          PROD
        </Badge>

        {/* Global search */}
        <div className="relative">
          <Input
            placeholder="Search employees, sessions..."
            className="w-80"
          />
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <span className="text-ink-muted text-xs">⌘K</span>
          </div>
        </div>

        {/* Live status */}
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
          <span className="text-sm text-ink-mid">12 active sessions</span>
        </div>
      </div>

      {/* Right section */}
      <div className="flex items-center space-x-4">
        {/* Date range picker */}
        <div className="flex items-center space-x-2">
          <div className="relative w-4 h-4">
            <img
              src="/calendar.png"
              alt="Calendar"
              className="w-full h-full object-contain opacity-70"
            />
          </div>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
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
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-primary text-sm font-medium">JD</span>
            </div>
            <div className="text-sm">
              <div className="text-ink-hi font-medium">John Doe</div>
              <div className="text-ink-muted text-xs">Admin</div>
            </div>
          </div>
          <Button variant="ghost" size="sm">
            <div className="relative w-4 h-4">
              <img
                src="/settings.png"
                alt="Settings"
                className="w-full h-full object-contain opacity-70"
              />
            </div>
          </Button>
        </div>
      </div>
    </div>
  );
}