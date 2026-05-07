import React from "react";
import { Users } from "lucide-react";
import PlaceholderPage from "@/components/layout/PlaceholderPage";

export default function Participants() {
  return (
    <PlaceholderPage 
      title="Data Peserta" 
      subtitle="Daftar seluruh peserta yang telah terdaftar"
      icon={Users}
    />
  );
}