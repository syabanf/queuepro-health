import React from "react";
import { Monitor } from "lucide-react";
import PlaceholderPage from "@/components/layout/PlaceholderPage";

export default function NakesBooth() {
  return (
    <PlaceholderPage 
      title="Booth Operasi" 
      subtitle="Panel operasi booth layanan kesehatan"
      icon={Monitor}
    />
  );
}