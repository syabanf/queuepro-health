import React from "react";
import { Clock } from "lucide-react";
import PlaceholderPage from "@/components/layout/PlaceholderPage";

export default function QueueHistory() {
  return (
    <PlaceholderPage 
      title="Riwayat Antrian" 
      subtitle="Histori antrian seluruh layanan"
      icon={Clock}
    />
  );
}