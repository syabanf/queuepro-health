import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  UserPlus, Monitor, LayoutDashboard, Users, Clock, 
  FileText, Settings, LogOut, Menu, X, ChevronRight,
  Activity, CalendarDays
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";

const adminMenuItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/" },
  { label: "Registrasi Peserta", icon: UserPlus, path: "/registration" },
  { label: "Antrian Real-time", icon: Monitor, path: "/queue-monitor" },
  { label: "Dashboard Kuota", icon: Activity, path: "/quota-dashboard" },
  { label: "Data Peserta", icon: Users, path: "/participants" },
  { label: "Riwayat Antrian", icon: Clock, path: "/queue-history" },
  { label: "Laporan", icon: FileText, path: "/reports" },
  { label: "Manajemen Pengguna", icon: Users, path: "/user-management" },
  { label: "Daftar Event", icon: CalendarDays, path: "/events" },
  { label: "Pengaturan", icon: Settings, path: "/settings" },
];

const nakesMenuItemsList = [
  { label: "Booth Operasi", icon: Monitor, path: "/booth" },
  { label: "Monitor Antrian", icon: Monitor, path: "/queue-monitor" },
];



export default function Sidebar({ user }) {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isAdmin = user?.role === "admin";
  const menuItems = isAdmin ? adminMenuItems : nakesMenuItemsList;

  const handleLogout = () => {
    base44.auth.logout("/demo");
  };

  const NavContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-5 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sidebar-primary flex items-center justify-center flex-shrink-0">
            <Activity className="w-5 h-5 text-sidebar-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <h1 className="text-sm font-bold text-sidebar-foreground leading-tight">Brilian Talks</h1>
              <p className="text-xs text-sidebar-foreground/60">Health Care</p>
            </div>
          )}
        </div>
      </div>

      {/* User Info */}
      {!collapsed && (
        <div className="px-5 py-4 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-sidebar-accent flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-semibold text-sidebar-foreground">
                {user?.full_name?.charAt(0)?.toUpperCase() || "U"}
              </span>
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-sidebar-foreground truncate">{user?.full_name || "User"}</p>
              <p className="text-xs text-sidebar-foreground/60">{isAdmin ? "Admin Pusat" : "Petugas Pelayanan"}</p>
            </div>
          </div>
        </div>
      )}

      {/* Menu */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = item.path === "/events"
            ? location.pathname === "/events" || location.pathname.startsWith("/events/")
            : location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group
                ${isActive 
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-sidebar-primary/20" 
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                }`}
            >
              <item.icon className={`w-5 h-5 flex-shrink-0 ${isActive ? "" : "group-hover:scale-110 transition-transform"}`} />
              {!collapsed && <span>{item.label}</span>}
              {!collapsed && isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-sidebar-border">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:bg-red-500/10 hover:text-red-400 w-full transition-all duration-200"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span>Keluar</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 lg:hidden bg-card shadow-md"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </Button>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-full bg-sidebar z-40 transition-all duration-300 flex flex-col
        ${collapsed ? "w-[72px]" : "w-64"}
        ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}>
        <NavContent />
        
        {/* Collapse Toggle - Desktop Only */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex absolute -right-3 top-20 w-6 h-6 bg-card border border-border rounded-full items-center justify-center shadow-sm hover:bg-muted transition-colors"
        >
          <ChevronRight className={`w-3 h-3 text-foreground transition-transform ${collapsed ? "" : "rotate-180"}`} />
        </button>
      </aside>

      {/* Spacer */}
      <div className={`hidden lg:block flex-shrink-0 transition-all duration-300 ${collapsed ? "w-[72px]" : "w-64"}`} />
    </>
  );
}