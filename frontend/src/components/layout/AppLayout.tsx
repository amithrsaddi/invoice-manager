import React, { useState } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { LayoutDashboard, FileText, Users, BarChart2, Repeat, Receipt, PieChart, Menu, X, LogOut, Activity as ActivityIcon, CalendarCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";

import { motion, AnimatePresence } from "framer-motion";

const navItems = [
  { label: "Dashboard", path: "/", icon: LayoutDashboard },
  { label: "Invoices & Expenses", path: "/invoices", icon: FileText },
  { label: "Additional Expenses", path: "/additional-expenses", icon: Receipt },
  { label: "Contacts", path: "/contacts", icon: Users },
  { label: "Schedules", path: "/schedules", icon: Repeat },
  { label: "Timesheets", path: "/timesheets", icon: CalendarCheck },
  { label: "Analytics", path: "/analytics", icon: PieChart },
  { label: "Reports", path: "/reports", icon: BarChart2 },
  { label: "Activity", path: "/activity", icon: ActivityIcon },
];

export default function AppLayout() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
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

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-sidebar border-r border-sidebar-border fixed inset-y-0 z-30">
        <div className="p-6 border-b border-sidebar-border">
          <h1 className="text-xl font-bold text-sidebar-foreground tracking-tight">
            Invoice Manager
          </h1>
          <p className="text-xs text-sidebar-foreground/70 mt-1">Management Suite</p>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
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
        <div className="p-4 border-t border-sidebar-border flex items-center gap-2">
          <Button
            variant="ghost"
            className="flex-1 min-w-0 justify-start text-sidebar-foreground/80 hover:text-destructive hover:bg-sidebar-accent"
            onClick={logout}
          >
            <LogOut className="w-4 h-4 mr-2 shrink-0" />
            Sign Out
          </Button>
          <span
            className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[10px] font-medium whitespace-nowrap ${apiHealthy ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}
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
        <Button variant="ghost" size="icon" className="text-sidebar-foreground hover:bg-sidebar-accent" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
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
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 lg:ml-64 pt-16 lg:pt-0 min-w-0">
        <div className="p-4 md:p-8 max-w-7xl mx-auto overflow-x-hidden">
          <Outlet />
        </div>
      </main>
    </div>
  );
}