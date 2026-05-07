import React from "react";
import { FileText } from "lucide-react";
import PlaceholderPage from "@/components/layout/PlaceholderPage";

export default function Reports() {
  return (
    <PlaceholderPage 
      title="Laporan" 
      subtitle="Laporan kegiatan dan statistik event"
      icon={FileText}
    />
  );
}