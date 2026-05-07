import React from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";

const breadcrumbMap = {
  "/": { label: "Dashboard", section: null },
  "/registration": { label: "Registrasi Peserta", section: "Registrasi" },
  "/participants": { label: "Data Peserta", section: "Registrasi" },
  "/participants/detail": { label: "Detail Peserta", section: "Registrasi" },
  "/booth": { label: "Panel Booth", section: "Antrian" },
  "/queue-monitor": { label: "Monitor Real-time", section: "Antrian" },
  "/queue-history": { label: "Riwayat Antrian", section: "Antrian" },
  "/quota-dashboard": { label: "Dashboard Kuota", section: "Antrian" },
  "/reports": { label: "Laporan", section: "Laporan & Pengaturan" },
  "/user-management": { label: "Manajemen Pengguna", section: "Laporan & Pengaturan" },
  "/settings": { label: "Pengaturan", section: "Laporan & Pengaturan" },
};

export default function Breadcrumb() {
  const location = useLocation();
  const crumbs = breadcrumbMap[location.pathname];

  if (!crumbs) return null;

  return (
    <div className="flex items-center gap-2 px-1 py-2 text-sm text-muted-foreground">
      <Link to="/" className="flex items-center gap-1 hover:text-foreground transition-colors">
        <Home className="w-4 h-4" />
        <span className="hidden sm:inline">Home</span>
      </Link>
      {crumbs.section && (
        <>
          <ChevronRight className="w-4 h-4 text-border" />
          <span className="text-muted-foreground">{crumbs.section}</span>
        </>
      )}
      <ChevronRight className="w-4 h-4 text-border" />
      <span className="text-foreground font-medium">{crumbs.label}</span>
    </div>
  );
}