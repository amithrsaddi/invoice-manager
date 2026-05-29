import React, { useEffect, useMemo, useState } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { LayoutDashboard, FileText, Users, BarChart2, Repeat, PieChart, Menu, X, LogOut, Activity as ActivityIcon, CalendarCheck, Moon, UserCircle2, ChevronDown, ChevronRight, Settings as SettingsIcon, DatabaseBackup } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import { db } from "@/api/dbClient";

import { motion, AnimatePresence } from "framer-motion";

const navItems = [
  { label: "Dashboard", path: "/", icon: LayoutDashboard },
  {
    label: "Invoices & Expenses",
    path: "/invoices",
    icon: FileText,
    children: [
      { label: "Additional Expenses", path: "/additional-expenses" },
      { label: "Invoicing", path: "/generate" }
    ]
  },
  { label: "Contracts", path: "/contacts", icon: Users },
  { label: "Schedules", path: "/schedules", icon: Repeat },
  { label: "Timesheets", path: "/timesheets", icon: CalendarCheck },
  { label: "Analytics", path: "/analytics", icon: PieChart },
  { label: "Reports", path: "/reports", icon: BarChart2 },
  { label: "Activity", path: "/activity", icon: ActivityIcon },
];

export default function AppLayout() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains("dark"));
  const [invoicesMenuOpen, setInvoicesMenuOpen] = useState(false);
  const { logout } = useAuth();
  const { data: apiHealthy = false } = useQuery({
    queryKey: ["api-health"],
    queryFn: async () => {
      const response = await fetch("/api/health");
      if (!response.ok) return false;
      const data = await response.json();
      return !!data?.ok;
    },
    refetchInterval: 30000,
    retry: 0
  });
  const { data: profileDocs = [] } = useQuery({
    queryKey: ["profile"],
    queryFn: () => db.entities.Profile.list("-updated_date")
  });

  const isInvoicesGroupPath =
    location.pathname === "/invoices" ||
    location.pathname === "/additional-expenses" ||
    location.pathname === "/generate";

  useEffect(() => {
    if (isInvoicesGroupPath) setInvoicesMenuOpen(true);
  }, [isInvoicesGroupPath]);

  const profileDisplayName = useMemo(() => {
    const profile = profileDocs[0] || {};
    const first = String(profile.firstName || "").trim();
    const last = String(profile.lastName || "").trim();
    return `${first} ${last}`.trim() || "Profile";
  }, [profileDocs]);

  const systemNavItems = [
    { label: "Settings", path: "/settings", icon: SettingsIcon },
    { label: "Backup & Restore", path: "/backup-restore", icon: DatabaseBackup },
  ];

  const toggleTheme = () => {
    const nextIsDark = !isDark;
    setIsDark(nextIsDark);
    if (nextIsDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("invoice_manager_theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("invoice_manager_theme", "light");
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-72 bg-sidebar border-r border-sidebar-border fixed inset-y-0 z-30">
        <div className="p-6 border-b border-sidebar-border">
          <div>
            <h1 className="text-[26px] font-bold text-sidebar-foreground tracking-tight">
              Invoice Manager
            </h1>
            <p className="mt-1 text-[15px] text-sidebar-foreground/70">Management Suite</p>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            if (item.children) {
              const groupActive =
                location.pathname === item.path ||
                item.children.some((child) => child.path === location.pathname);
              return (
                <div key={item.path} className="space-y-1">
                  <div
                    className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                      groupActive
                        ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md"
                        : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    }`}
                  >
                    <Link to={item.path} className="flex min-w-0 flex-1 items-center gap-3">
                      <item.icon className="w-5 h-5" />
                      {item.label}
                    </Link>
                    <button
                      type="button"
                      onClick={() => setInvoicesMenuOpen((prev) => !prev)}
                      className="shrink-0 p-0.5"
                      aria-label="Toggle invoices submenu"
                    >
                      {invoicesMenuOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                  </div>
                  {invoicesMenuOpen && (
                    <div className="ml-9 space-y-1">
                      {item.children.map((child) => {
                        const childActive = location.pathname === child.path;
                        return (
                          <Link
                            key={child.path}
                            to={child.path}
                            className={`block rounded-lg px-3 py-2 text-sm transition-all duration-200 ${
                              childActive
                                ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                                : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                            }`}
                          >
                            {child.label}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mb-2 px-4 pb-3">
          <div className="pt-2 border-t border-sidebar-border">
            <p className="px-4 pb-2 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/55">
              System
            </p>
            <div className="space-y-1">
              {systemNavItems.map((item) => {
                const active = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                      active
                        ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md"
                        : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    {item.label}
                  </Link>
                );
              })}
              <button
                type="button"
                onClick={toggleTheme}
                className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-sidebar-foreground/80 transition-all duration-200 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                aria-label="Toggle light and dark mode"
              >
                <Moon className="h-5 w-5" />
                <span className="flex-1 text-left">Dark mode</span>
                <span
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors ${
                    isDark
                      ? "border-sidebar-primary/70 bg-sidebar-primary"
                      : "border-sidebar-border bg-sidebar-accent"
                  }`}
                >
                  <span
                    className={`inline-block h-[18px] w-[18px] rounded-full bg-white shadow-sm transition-transform ${
                      isDark ? "translate-x-5" : "translate-x-1"
                    }`}
                  />
                </span>
              </button>
            </div>
          </div>
        </div>
        <div className="p-4 border-t border-sidebar-border">
          <Link
            to="/profile"
            className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200 ${
              location.pathname === "/profile"
                ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            }`}
          >
            <UserCircle2 className="h-5 w-5" />
            {profileDisplayName}
          </Link>
        </div>
        <div className="p-4 border-t border-sidebar-border flex items-center gap-2">
          <button
            type="button"
            className="flex min-w-0 flex-1 items-center rounded-md px-3 py-2 text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-destructive"
            onClick={logout}
          >
            <LogOut className="w-4 h-4 mr-2 shrink-0" />
            Log Out
          </button>
          <span
            className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[10px] font-medium whitespace-nowrap ${apiHealthy ? "bg-emerald-500/15 text-emerald-500" : "bg-rose-500/15 text-rose-500"}`}
            title={apiHealthy ? "API reachable" : "API unreachable"}
          >
            <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${apiHealthy ? "bg-emerald-500" : "bg-rose-500"}`} />
            {apiHealthy ? "API Online" : "API Offline"}
          </span>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-40 bg-sidebar border-b border-sidebar-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold text-sidebar-foreground">
            Invoice Manager
          </h1>
          <span className={`h-2 w-2 rounded-full ${apiHealthy ? "bg-emerald-500" : "bg-rose-500"}`}></span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-sidebar-foreground transition-colors hover:bg-sidebar-accent"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Nav Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, x: -300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -300 }}
            className="lg:hidden fixed inset-0 z-30 bg-sidebar/95 backdrop-blur-sm pt-16 overflow-y-auto"
          >
            <nav className="p-4 space-y-1">
              {navItems.map((item) => {
                if (item.children) {
                  const groupActive =
                    location.pathname === item.path ||
                    item.children.some((child) => child.path === location.pathname);
                  return (
                    <div key={item.path} className="space-y-1">
                      <div
                        className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                          groupActive
                            ? "bg-sidebar-primary text-sidebar-primary-foreground"
                            : "text-sidebar-foreground/80 hover:bg-sidebar-accent"
                        }`}
                      >
                        <Link
                          to={item.path}
                          onClick={() => setMobileOpen(false)}
                          className="flex flex-1 items-center gap-3"
                        >
                          <item.icon className="w-5 h-5" />
                          {item.label}
                        </Link>
                        <button
                          type="button"
                          onClick={() => setInvoicesMenuOpen((prev) => !prev)}
                          className="shrink-0 p-0.5"
                          aria-label="Toggle invoices submenu"
                        >
                          {invoicesMenuOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                      </div>
                      {invoicesMenuOpen && (
                        <div className="ml-9 space-y-1">
                          {item.children.map((child) => {
                            const childActive = location.pathname === child.path;
                            return (
                              <Link
                                key={child.path}
                                to={child.path}
                                onClick={() => setMobileOpen(false)}
                                className={`block rounded-lg px-3 py-2 text-sm transition-all ${
                                  childActive
                                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent"
                                }`}
                              >
                                {child.label}
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                }
                const active = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                      active
                        ? "bg-sidebar-primary text-sidebar-primary-foreground"
                        : "text-sidebar-foreground/80 hover:bg-sidebar-accent"
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="mb-2 px-4 pb-3">
              <div className="pt-2 border-t border-sidebar-border">
                <p className="px-4 pb-2 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/55">
                  System
                </p>
                <div className="space-y-1">
                  {systemNavItems.map((item) => {
                    const active = location.pathname === item.path;
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setMobileOpen(false)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                          active
                            ? "bg-sidebar-primary text-sidebar-primary-foreground"
                            : "text-sidebar-foreground/80 hover:bg-sidebar-accent"
                        }`}
                      >
                        <item.icon className="w-5 h-5" />
                        {item.label}
                      </Link>
                    );
                  })}
                  <button
                    type="button"
                    onClick={toggleTheme}
                    className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-sidebar-foreground/80 transition-all hover:bg-sidebar-accent"
                    aria-label="Toggle light and dark mode"
                  >
                    <Moon className="h-5 w-5" />
                    <span className="flex-1 text-left">Dark mode</span>
                    <span
                      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors ${
                        isDark
                          ? "border-sidebar-primary/70 bg-sidebar-primary"
                          : "border-sidebar-border bg-sidebar-accent"
                      }`}
                    >
                      <span
                        className={`inline-block h-[18px] w-[18px] rounded-full bg-white shadow-sm transition-transform ${
                          isDark ? "translate-x-5" : "translate-x-1"
                        }`}
                      />
                    </span>
                  </button>
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-sidebar-border">
              <Link
                to="/profile"
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all ${
                  location.pathname === "/profile"
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent"
                }`}
              >
                <UserCircle2 className="h-5 w-5" />
                {profileDisplayName}
              </Link>
            </div>
            <div className="p-4 border-t border-sidebar-border space-y-3">
              <div>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-medium whitespace-nowrap ${apiHealthy ? "bg-emerald-500/15 text-emerald-500" : "bg-rose-500/15 text-rose-500"}`}
                  title={apiHealthy ? "API reachable" : "API unreachable"}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${apiHealthy ? "bg-emerald-500" : "bg-rose-500"}`} />
                  {apiHealthy ? "API Online" : "API Offline"}
                </span>
              </div>
              <button
                type="button"
                className="flex w-full items-center rounded-md px-3 py-2 text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-destructive"
                onClick={logout}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Log Out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 lg:ml-72 pt-16 lg:pt-0 min-w-0">
        <div className="p-4 md:p-8 max-w-7xl mx-auto overflow-x-hidden">
          <Outlet />
        </div>
      </main>
    </div>
  );
}