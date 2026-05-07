import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity } from "lucide-react";

function QuotaBar({ used, total, color }) {
  if (!total || total === 0) return <span className="text-xs text-muted-foreground">—</span>;
  const pct = Math.min(100, Math.round((used / total) * 100));
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground w-8 text-right">{pct}%</span>
    </div>
  );
}

function StatusBadge({ service }) {
  const freeRem = (service.free_quota || 0) - (service.used_free_quota || 0);
  const paidRem = (service.paid_quota || 0) - (service.used_paid_quota || 0);
  const totalFree = service.free_quota || 0;
  const totalPaid = service.paid_quota || 0;
  const hasQuota = totalFree > 0 || totalPaid > 0;

  if (!hasQuota) return <Badge variant="outline" className="text-xs">Belum Diset</Badge>;
  if (freeRem <= 0 && paidRem <= 0) return <Badge className="text-xs bg-red-100 text-red-700 border-red-200">Penuh</Badge>;
  if ((freeRem / totalFree) < 0.2 || (paidRem / totalPaid) < 0.2) return <Badge className="text-xs bg-amber-100 text-amber-700 border-amber-200">Hampir Penuh</Badge>;
  return <Badge className="text-xs bg-green-100 text-green-700 border-green-200">Tersedia</Badge>;
}

export default function QuotaTable({ services }) {
  const medical = services.filter(s => s.service_group === "MEDICAL");
  const eye = services.filter(s => s.service_group === "EYE_CHECK");

  const renderRows = (list) =>
    list.map(s => {
      const freeRem = (s.free_quota || 0) - (s.used_free_quota || 0);
      const paidRem = (s.paid_quota || 0) - (s.used_paid_quota || 0);
      return (
        <tr key={s.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
          <td className="py-2.5 px-3">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-primary/10 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0">
                {s.service_code}
              </span>
              <span className="text-xs font-medium text-foreground">{s.service_name}</span>
            </div>
          </td>
          <td className="py-2.5 px-3 text-center">
            <div className="text-xs font-semibold text-foreground">{freeRem}</div>
            <QuotaBar used={s.used_free_quota || 0} total={s.free_quota || 0} color="bg-green-500" />
          </td>
          <td className="py-2.5 px-3 text-center">
            <div className="text-xs font-semibold text-foreground">{paidRem}</div>
            <QuotaBar used={s.used_paid_quota || 0} total={s.paid_quota || 0} color="bg-orange-400" />
          </td>
          <td className="py-2.5 px-3 text-center">
            <StatusBadge service={s} />
          </td>
        </tr>
      );
    });

  return (
    <Card>
      <CardHeader className="pb-3 pt-4 px-4">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          Status Kuota Real-time
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0 pb-3">
        <table className="w-full">
          <thead>
            <tr className="bg-muted/50">
              <th className="text-left text-xs font-medium text-muted-foreground py-2 px-3">Layanan</th>
              <th className="text-center text-xs font-medium text-muted-foreground py-2 px-3">Sisa Gratis</th>
              <th className="text-center text-xs font-medium text-muted-foreground py-2 px-3">Sisa Bayar</th>
              <th className="text-center text-xs font-medium text-muted-foreground py-2 px-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {medical.length > 0 && (
              <tr><td colSpan={4} className="pt-2 pb-1 px-3"><span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Medis</span></td></tr>
            )}
            {renderRows(medical)}
            {eye.length > 0 && (
              <tr><td colSpan={4} className="pt-3 pb-1 px-3"><span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Pemeriksaan Mata</span></td></tr>
            )}
            {renderRows(eye)}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}