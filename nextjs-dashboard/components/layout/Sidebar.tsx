"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NavIcon } from "@/components/ui/NavIcon";

interface NavigationItem {
  name: string;
  href: string;
  icon: string;
  subItems?: { name: string; href: string }[];
}

const navigationItems: NavigationItem[] = [
  {
    name: "Overview",
    href: "/",
    icon: "/overview.png",
  },
  {
    name: "Live Monitoring",
    href: "/live-monitoring",
    icon: "/target.png",
  },
  {
    name: "Employees",
    href: "/employees",
    icon: "/employees.png",
  },
  {
    name: "Attendance",
    href: "/attendance",
    icon: "/sessions.png",
  },
  {
    name: "Sessions",
    href: "/sessions",
    icon: "/office.png",
  },
  {
    name: "Timesheet",
    href: "/timesheet",
    icon: "/calendar.png",
  },
  {
    name: "Monthly Hours",
    href: "/monthly-hours",
    icon: "/productivity.png",
  },
  {
    name: "Productivity",
    href: "/productivity",
    icon: "/focus.png",
    subItems: [
      {
        name: "Analytics",
        href: "/productivity",
      },
      {
        name: "Reports & Rankings",
        href: "/productivity-reports",
      },
      {
        name: "Detailed Breakdown",
        href: "/productivity-breakdown",
      },
    ],
  },
  {
    name: "Screenshots",
    href: "/screenshots",
    icon: "/screenshots.png",
  },
  {
    name: "Audio",
    href: "/audio",
    icon: "/audio.png",
  },
  {
    name: "Breaks",
    href: "/breaks",
    icon: "/focus.png",
  },
  {
    name: "Mute Events",
    href: "/mute-events",
    icon: "/audio.png",
  },
  {
    name: "Reports",
    href: "/reports",
    icon: "/report.png",
  },
  {
    name: "Settings",
    href: "/settings",
    icon: "/settings.png",
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [expandedItems, setExpandedItems] = React.useState<string[]>([]);

  // Auto-expand sections if on a related page
  React.useEffect(() => {
    if (pathname.startsWith('/productivity')) {
      setExpandedItems(prev => prev.includes('Productivity') ? prev : [...prev, 'Productivity']);
    }
  }, [pathname]);

  const toggleExpand = (itemName: string) => {
    setExpandedItems(prev =>
      prev.includes(itemName)
        ? prev.filter(name => name !== itemName)
        : [...prev, itemName]
    );
  };

  return (
    <div className="flex h-full w-64 flex-col bg-surface border-r border-line">
      {/* Logo */}
      <div className="flex h-16 items-center px-6 border-b border-line">
        <div className="flex items-center space-x-3">
          <div className="relative w-8 h-8">
            <Image
              src="/target.png"
              alt="Work Invigilator"
              fill
              className="object-contain"
              sizes="32px"
              priority
            />
          </div>
          <div>
            <h1 className="font-ui text-lg font-semibold text-ink-hi">
              Work Invigilator
            </h1>
            <p className="font-ui text-xs smallcaps text-ink-muted">
              Admin Dashboard
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 overflow-y-auto">
        <ul className="space-y-2">
          {navigationItems.map((item) => {
            const isActive = pathname === item.href;
            const hasSubItems = item.subItems && item.subItems.length > 0;
            const isExpanded = expandedItems.includes(item.name);
            const isSubItemActive = hasSubItems && item.subItems?.some(sub => pathname === sub.href);

            return (
              <li key={item.name}>
                {hasSubItems ? (
                  <>
                    <button
                      onClick={() => toggleExpand(item.name)}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors group",
                        "hover:bg-raised",
                        isSubItemActive
                          ? "bg-primary/10 text-primary border border-primary/20"
                          : "text-ink-mid hover:text-ink-hi"
                      )}
                    >
                      <div className="flex items-center">
                        <NavIcon
                          src={item.icon}
                          alt={item.name}
                          isActive={isSubItemActive}
                        />
                        <span className="font-ui text-sm">{item.name}</span>
                      </div>
                      <svg
                        className={cn(
                          "w-4 h-4 transition-transform",
                          isExpanded && "rotate-90"
                        )}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </button>
                    {isExpanded && (
                      <ul className="mt-1 ml-8 space-y-1">
                        {item.subItems?.map((subItem) => {
                          const isSubActive = pathname === subItem.href;
                          return (
                            <li key={subItem.name}>
                              <Link
                                href={subItem.href}
                                className={cn(
                                  "block px-3 py-2 rounded-lg text-sm transition-colors",
                                  "hover:bg-raised",
                                  isSubActive
                                    ? "bg-primary/5 text-primary font-medium"
                                    : "text-ink-mid hover:text-ink-hi"
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
                    href={item.href}
                    className={cn(
                      "flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors group",
                      "hover:bg-raised",
                      isActive
                        ? "bg-primary/10 text-primary border border-primary/20"
                        : "text-ink-mid hover:text-ink-hi"
                    )}
                  >
                    <NavIcon
                      src={item.icon}
                      alt={item.name}
                      isActive={isActive}
                    />
                    <span className="font-ui text-sm">{item.name}</span>
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom section */}
      <div className="p-4 border-t border-line">
        <div className="flex items-center space-x-2 text-xs text-ink-muted">
          <div className="w-2 h-2 bg-success rounded-full"></div>
          <span>All systems operational</span>
        </div>
      </div>
    </div>
  );
}
