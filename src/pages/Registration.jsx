import React from "react";
import { UserPlus } from "lucide-react";
import PlaceholderPage from "@/components/layout/PlaceholderPage";

export default function Registration() {
  return (
    <PlaceholderPage 
      title="Registrasi Peserta" 
      subtitle="Pendaftaran peserta untuk layanan kesehatan"
      icon={UserPlus}
    />
  );
}