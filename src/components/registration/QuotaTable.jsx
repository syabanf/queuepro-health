import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Stethoscope, Eye } from "lucide-react";

function QuotaBar({ used, total, color }) {
  if (!total || total === 0) return <span className="text-xs text-muted-foreground">—</span>;
  const pct = Math.min(100, Math.round((used / total) * 100));
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-muted-foreground w-8 text-right">{pct}%</span>
    </div>
  );
}

export default function QuotaTable({ services }) {
  return (
    <Card>
      <CardHeader className="pb-3 pt-4 px-4">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          Status Kuota Real-time
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3 space-y-3">
        {services.filter(s => s.is_active).map(s => {
          const isMedical = s.service_group === "MEDICAL";
          const Icon = isMedical ? Stethoscope : Eye;
          const freeRem = Math.max(0, (s.free_quota || 0) - (s.used_free_quota || 0));
          const pct = s.free_quota > 0 ? Math.min(100, Math.round(((s.used_free_quota || 0) / s.free_quota) * 100)) : 0;
          return (
            <div key={s.id} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${isMedical ? "text-primary" : "text-accent"}`} />
                  <span className="text-xs font-medium truncate">{s.service_name}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs text-muted-foreground">{s.used_free_quota || 0}/{s.free_quota || 0}</span>
                  {freeRem <= 0
                    ? <Badge className="text-[10px] px-1.5 bg-red-100 text-red-700 border-red-200">Penuh</Badge>
                    : freeRem <= 20
                    ? <Badge className="text-[10px] px-1.5 bg-amber-100 text-amber-700 border-amber-200">Sisa {freeRem}</Badge>
                    : <Badge className="text-[10px] px-1.5 bg-green-100 text-green-700 border-green-200">Sisa {freeRem}</Badge>}
                </div>
              </div>
              <QuotaBar used={s.used_free_quota || 0} total={s.free_quota || 0} color={pct >= 100 ? "bg-destructive" : pct >= 80 ? "bg-amber-500" : "bg-green-500"} />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
