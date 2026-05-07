import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

// SettingsPage now redirects to /events (Event management hub)
export default function SettingsPage() {
  const navigate = useNavigate();
  useEffect(() => { navigate("/events", { replace: true }); }, [navigate]);
  return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
    </div>
  );
}