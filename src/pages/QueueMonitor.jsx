import React from "react";
import { Monitor } from "lucide-react";
import PlaceholderPage from "@/components/layout/PlaceholderPage";

export default function QueueMonitor() {
  return (
    <PlaceholderPage 
      title="Antrian Real-time" 
      subtitle="Monitor antrian layanan secara langsung"
      icon={Monitor}
    />
  );
}