import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { NavIcon } from '../ui/NavIcon';
import { useUIStore } from '../../store/uiStore';

interface NavigationItem {
  name: string;
  href: string;
  icon: string;
  subItems?: { name: string; href: string }[];
}

const navigationItems: NavigationItem[] = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: '/newIcons/dashboard.png',
  },
  {
    name: 'Live Monitoring',
    href: '/live-monitoring',
    icon: '/newIcons/monitoring.png',
  },
  {
    name: 'Employees',
    href: '/employees',
    icon: '/newIcons/employees.png',
  },
  {
    name: 'Timesheet',
    href: '/timesheet',
    icon: '/newIcons/timesheet.png',
  },
  {
    name: 'Attendance',
    href: '/attendance',
    icon: '/newIcons/attendance.png',
  },
  {
    name: 'Productivity',
    href: '/productivity',
    icon: '/newIcons/productivity.png',
    subItems: [
      {
        name: 'Analytics',
        href: '/productivity',
      },
      {
        name: 'Reports & Rankings',
        href: '/productivity-reports',
      },
      {
        name: 'Detailed Breakdown',
        href: '/productivity-breakdown',
      },
    ],
  },
  {
    name: 'Reports',
    href: '/reports',
    icon: '/newIcons/reports.png',
  },
  {
    name: 'Screenshots',
    href: '/screenshots',
    icon: '/newIcons/screenshots.png',
  },
  {
    name: 'Audio',
    href: '/audio',
    icon: '/newIcons/audio.png',
  },
  {
    name: 'Sessions',
    href: '/sessions',
    icon: '/newIcons/sessions.png',
  },
  {
    name: 'Mute Events',
    href: '/mute-events',
    icon: '/newIcons/audio.png',
  },
  {
    name: 'Breaks',
    href: '/breaks',
    icon: '/newIcons/timesheet.png',
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: '/newIcons/settings.png',
  },
];

export function Sidebar() {
  const location = useLocation();
  const pathname = location.pathname;
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const { isSidebarOpen } = useUIStore();

  // Auto-expand sections if on a related page
  useEffect(() => {
    if (pathname.startsWith('/productivity')) {
      setExpandedItems((prev) =>
        prev.includes('Productivity') ? prev : [...prev, 'Productivity']
      );
    }
  }, [pathname]);

  const toggleExpand = (itemName: string) => {
    setExpandedItems((prev) =>
      prev.includes(itemName)
        ? prev.filter((name) => name !== itemName)
        : [...prev, itemName]
    );
  };

  if (!isSidebarOpen) {
    return null;
  }

  return (
    <div className="flex h-full w-64 flex-col bg-white border-r border-slate-200/60 shadow-premium animate-slide-in-left">
      {/* Logo */}
      <div className="flex h-20 items-center px-6 border-b border-slate-200/60 bg-gradient-to-r from-blue-50/50 to-indigo-50/30">
        <div className="flex items-center space-x-3">
          <div className="relative w-14 h-14 rounded-xl overflow-hidden shadow-glow-blue group-hover:shadow-elevated transition-all duration-300">
            <img
              src="/newIcons/mainLogo.png"
              alt="Work Invigilator"
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">
              Work Invigilator
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Admin Portal
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-6 overflow-y-auto smooth-scroll">
        <ul className="space-y-1">
          {navigationItems.map((item) => {
            const isActive = pathname === item.href;
            const hasSubItems = item.subItems && item.subItems.length > 0;
            const isExpanded = expandedItems.includes(item.name);
            const isSubItemActive =
              hasSubItems &&
              item.subItems?.some((sub) => pathname === sub.href);

            return (
              <li key={item.name}>
                {hasSubItems ? (
                  <>
                    <button
                      onClick={() => toggleExpand(item.name)}
                      className={cn(
                        'w-full flex items-center justify-between px-3 py-3.5 rounded-xl text-sm font-medium transition-all duration-300 group',
                        'hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50/50 hover:shadow-premium hover:scale-[1.02]',
                        isSubItemActive
                          ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-glow-blue'
                          : 'text-slate-700 hover:text-slate-900'
                      )}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={cn(
                          'w-11 h-11 rounded-lg flex items-center justify-center transition-all duration-300',
                          isSubItemActive
                            ? 'bg-white/20'
                            : 'bg-slate-100 group-hover:bg-white group-hover:shadow-sm'
                        )}>
                          <NavIcon
                            src={item.icon}
                            alt={item.name}
                            isActive={isSubItemActive}
                            className={item.name === 'Live Monitoring' ? 'w-9 h-9' : ''}
                          />
                        </div>
                        <span className="text-sm font-semibold">{item.name}</span>
                      </div>
                      <svg
                        className={cn(
                          'w-4 h-4 transition-transform duration-300',
                          isExpanded && 'rotate-90'
                        )}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2.5}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </button>
                    {isExpanded && (
                      <ul className="mt-2 ml-11 space-y-1 animate-slide-in-down">
                        {item.subItems?.map((subItem) => {
                          const isSubActive = pathname === subItem.href;
                          return (
                            <li key={subItem.name}>
                              <Link
                                to={subItem.href}
                                className={cn(
                                  'block px-3 py-2 rounded-lg text-sm transition-all duration-200',
                                  'hover:bg-slate-50 hover:text-slate-900 hover:translate-x-1',
                                  isSubActive
                                    ? 'bg-blue-50 text-blue-600 font-semibold border-l-2 border-blue-500 pl-2.5'
                                    : 'text-slate-600 border-l-2 border-transparent pl-2.5'
                                )}
                              >
                                {subItem.name}
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </>
                ) : (
                  <Link
                    to={item.href}
                    className={cn(
                      'flex items-center space-x-3 px-3 py-3.5 rounded-xl text-sm font-medium transition-all duration-300 group',
                      'hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50/50 hover:shadow-premium hover:scale-[1.02]',
                      isActive
                        ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-glow-blue'
                        : 'text-slate-700 hover:text-slate-900'
                    )}
                  >
                    <div className={cn(
                      'w-11 h-11 rounded-lg flex items-center justify-center transition-all duration-300',
                      isActive
                        ? 'bg-white/20'
                        : 'bg-slate-100 group-hover:bg-white group-hover:shadow-sm'
                    )}>
                      <NavIcon
                        src={item.icon}
                        alt={item.name}
                        isActive={isActive}
                        className={item.name === 'Live Monitoring' ? 'w-9 h-9' : ''}
                      />
                    </div>
                    <span className="text-sm font-semibold">{item.name}</span>
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom section */}
      <div className="p-4 border-t border-slate-200/60 bg-gradient-to-r from-emerald-50/50 to-green-50/30">
        <div className="flex items-center space-x-3 px-3 py-2 rounded-lg bg-white/80 shadow-sm">
          <div className="relative flex items-center justify-center">
            <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
            <div className="absolute w-2 h-2 bg-emerald-500 rounded-full animate-ping"></div>
          </div>
          <div className="flex-1">
            <p className="text-xs font-semibold text-slate-900">All Systems Operational</p>
            <p className="text-xs text-slate-500">No issues detected</p>
          </div>
        </div>
      </div>
    </div>
  );
}
