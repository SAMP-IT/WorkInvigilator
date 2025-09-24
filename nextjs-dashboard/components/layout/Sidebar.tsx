"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NavIcon } from "@/components/ui/NavIcon";

const navigationItems = [
  {
    name: "Overview",
    href: "/",
    icon: "/overview.png",
  },
  {
    name: "Employees",
    href: "/employees",
    icon: "/employees.png",
  },
  {
    name: "Sessions",
    href: "/sessions",
    icon: "/sessions.png",
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
      <nav className="flex-1 px-4 py-6">
        <ul className="space-y-2">
          {navigationItems.map((item) => {
            const isActive = pathname === item.href;

            return (
              <li key={item.name}>
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
