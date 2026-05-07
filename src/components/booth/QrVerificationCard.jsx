import React from "react";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, AlertTriangle, User, Hash, Building2, Tag, ShieldCheck } from "lucide-react";

const QR_STATUS_CONFIG = {
  NOT_SCANNED: { label: "Belum Di-scan", color: "bg-slate-100 text-slate-600 border-slate-200", icon: null },
  VERIFIED:    { label: "Terverifikasi", color: "bg-green-100 text-green-700 border-green-200", icon: CheckCircle2 },
  INVALID:     { label: "QR Tidak Valid", color: "bg-red-100 text-red-700 border-red-200", icon: XCircle },
  WRONG_SERVICE: { label: "Booth Salah", color: "bg-orange-100 text-orange-700 border-orange-200", icon: AlertTriangle },
  ALREADY_COMPLETED: { label: "Sudah Selesai", color: "bg-purple-100 text-purple-700 border-purple-200", icon: AlertTriangle },
  CANCELLED:   { label: "Dibatalkan", color: "bg-red-100 text-red-700 border-red-200", icon: XCircle },
};

/**
 * QrVerificationCard
 * Props:
 *   result: {
 *     status: "VERIFIED" | "INVALID" | "WRONG_SERVICE" | "ALREADY_COMPLETED" | "CANCELLED"
 *     message: string
 *     queue: queue object (if found)
 *     participant: participant object (if found)
 *     service: service object (if found)
 *   }
 */
export default function QrVerificationCard({ result }) {
  if (!result) return null;

  const cfg = QR_STATUS_CONFIG[result.status] || QR_STATUS_CONFIG.INVALID;
  const Icon = cfg.icon;
  const isVerified = result.status === "VERIFIED";

  return (
    <div className={`rounded-xl border-2 p-4 transition-all ${
      isVerified
        ? "border-green-300 bg-green-50"
        : "border-orange-200 bg-orange-50"
    }`}>
      {/* Status Banner */}
      <div className="flex items-center gap-2 mb-3">
        {Icon && <Icon className={`w-5 h-5 ${isVerified ? "text-green-600" : "text-orange-600"}`} />}
        <Badge className={`text-sm px-3 py-1 border font-semibold ${cfg.color}`}>
          {cfg.label}
        </Badge>
      </div>

      {/* Message */}
      <p className={`text-sm mb-3 ${isVerified ? "text-green-800" : "text-orange-800"}`}>
        {result.message}
      </p>

      {/* Participant / Queue Details */}
      {result.participant && result.queue && (
        <div className="bg-white rounded-lg border border-border p-3 space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <User className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <span className="font-semibold">{result.participant.full_name}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Hash className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <span className="font-mono font-bold text-primary text-base">{result.queue.queue_number}</span>
          </div>
          {result.service && (
            <>
              <div className="flex items-center gap-2 text-sm">
                <Building2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span>{result.service.service_name} — Booth {result.service.booth_number}</span>
              </div>
            </>
          )}
          <div className="flex items-center gap-2 text-sm">
            <Tag className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <Badge variant="outline" className={`text-xs ${
              result.participant.participant_category === "FREE_CHECK"
                ? "border-green-300 text-green-700 bg-green-50"
                : "border-orange-300 text-orange-700 bg-orange-50"
            }`}>
              {result.participant.participant_category === "FREE_CHECK" ? "FREE CHECK" : "PAYMENT"}
            </Badge>
          </div>
          {isVerified && (
            <div className="flex items-center gap-2 text-xs text-green-700 pt-1 border-t border-green-100">
              <ShieldCheck className="w-3.5 h-3.5" />
              Identitas peserta terverifikasi. Layanan dapat dimulai.
            </div>
          )}
        </div>
      )}
    </div>
  );
}