"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { Search, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";

interface HeaderProps {
  sidebarCollapsed: boolean;
  onMobileMenuToggle: () => void;
}

function getBreadcrumbs(pathname: string): { label: string; href: string }[] {
  const segments = pathname.split("/").filter(Boolean);
  const crumbs: { label: string; href: string }[] = [];

  let currentPath = "";
  for (const segment of segments) {
    currentPath += `/${segment}`;
    const label = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " ");
    crumbs.push({ label, href: currentPath });
  }

  return crumbs.slice(0, 3);
}

export function Header({ sidebarCollapsed, onMobileMenuToggle }: HeaderProps) {
  const pathname = usePathname();
  const breadcrumbs = getBreadcrumbs(pathname);

  return (
    <header
      className={cn(
        "sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-gray-200 bg-white px-6 transition-all",
        sidebarCollapsed ? "lg:pl-[calc(64px+1.5rem)]" : "lg:pl-[calc(260px+1.5rem)]",
      )}
    >
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onMobileMenuToggle}
        aria-label="Toggle menu"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Breadcrumbs */}
      <nav className="hidden items-center gap-1.5 text-sm md:flex" aria-label="Breadcrumb">
        {breadcrumbs.map((crumb, index) => (
          <React.Fragment key={crumb.href}>
            {index > 0 && <span className="text-gray-300">/</span>}
            <span
              className={cn(
                index === breadcrumbs.length - 1 ? "font-medium text-gray-900" : "text-gray-500",
              )}
            >
              {crumb.label}
            </span>
          </React.Fragment>
        ))}
      </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Search */}
      <div className="hidden w-64 md:block">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input placeholder="Search... (Ctrl+K)" className="pl-9" readOnly aria-label="Search" />
        </div>
      </div>

      {/* Notifications */}
      <NotificationCenter />

      {/* User avatar */}
      <Avatar size="sm">
        <AvatarFallback>U</AvatarFallback>
      </Avatar>
    </header>
  );
}
