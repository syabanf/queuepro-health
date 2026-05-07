import React from "react";
import { AlertTriangle, XCircle, CheckCircle } from "lucide-react";

export default function QuotaWarning({ service, slotType }) {
  if (!service) return null;

  const freeQuota = service.free_quota || 0;
  const paidQuota = service.paid_quota || 0;
  const hasQuota = (freeQuota + paidQuota) > 0;

  const freeRemaining = freeQuota - (service.used_free_quota || 0);
  const paidRemaining = paidQuota - (service.used_paid_quota || 0);
  const bothFull = hasQuota && freeRemaining <= 0 && paidRemaining <= 0;

  if (bothFull) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-medium">
        <XCircle className="w-4 h-4 flex-shrink-0" />
        <span>KUOTA HABIS — Layanan ini sudah tidak tersedia.</span>
      </div>
    );
  }

  if (slotType === "FREE" && freeQuota > 0 && freeRemaining <= 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
        <span>Kuota gratis layanan ini sudah penuh. Silakan gunakan slot Berbayar.</span>
      </div>
    );
  }

  if (slotType === "PAID" && paidQuota > 0 && paidRemaining <= 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
        <span>Kuota berbayar layanan ini sudah penuh.</span>
      </div>
    );
  }

  if (slotType && freeRemaining > 0) {
    return null;
  }

  return null;
}