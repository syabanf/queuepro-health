import React from "react";
import { Activity } from "lucide-react";
import PlaceholderPage from "@/components/layout/PlaceholderPage";

export default function QuotaDashboard() {
  return (
    <PlaceholderPage 
      title="Dashboard Kuota" 
      subtitle="Monitoring kuota layanan gratis dan berbayar"
      icon={Activity}
    />
  );
}