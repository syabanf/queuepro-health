import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Stethoscope, Eye, Gift, CreditCard, Tag } from "lucide-react";

const QUOTA_TYPES = [
  { limitField: 'free_quota',    usedField: 'used_free_quota',    label: 'Free',    color: 'text-green-600',  barColor: 'bg-green-500' },
  { limitField: 'rp1_quota',     usedField: 'used_rp1_quota',     label: 'Rp1 BRI', color: 'text-blue-600',   barColor: 'bg-blue-500' },
  { limitField: 'special_quota', usedField: 'used_special_quota', label: 'Special', color: 'text-purple-600', barColor: 'bg-purple-500' },
];

function MiniBar({ used, total, barColor }) {
  if (!total) return null;
  const pct = Math.min(100, Math.round((used / total) * 100));
  return (
    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full ${pct >= 100 ? "bg-destructive" : pct >= 80 ? "bg-amber-500" : barColor}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export default function QuotaTable({ services }) {
  const active = services.filter(s => s.is_active);

  return (
    <Card>
      <CardHeader className="pb-3 pt-4 px-4">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          Status Kuota Real-time
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3 space-y-4">
        {active.map(s => {
          const isMedical = s.service_group === "MEDICAL";
          const Icon = isMedical ? Stethoscope : Eye;
          const totalLimit = QUOTA_TYPES.reduce((sum, qt) => sum + (s[qt.limitField] || 0), 0);
          const totalUsed  = QUOTA_TYPES.reduce((sum, qt) => sum + (s[qt.usedField]  || 0), 0);
          const totalRem   = Math.max(0, totalLimit - totalUsed);
          return (
            <div key={s.id} className="space-y-2">
              {/* Service header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${isMedical ? "text-primary" : "text-accent"}`} />
                  <span className="text-xs font-medium truncate">{s.service_name}</span>
                </div>
                {totalRem <= 0 && totalLimit > 0 ? (
                  <Badge className="text-[10px] px-1.5 bg-red-100 text-red-700 border-red-200">Penuh</Badge>
                ) : (
                  <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">{totalUsed}/{totalLimit}</span>
                )}
              </div>

              {/* Per-type breakdown */}
              <div className="space-y-1 pl-5">
                {QUOTA_TYPES.map(qt => {
                  const limit = s[qt.limitField] || 0;
                  const used  = s[qt.usedField]  || 0;
                  if (limit === 0) return null;
                  return (
                    <div key={qt.limitField} className="flex items-center gap-2">
                      <span className={`text-[10px] w-12 flex-shrink-0 ${qt.color}`}>{qt.label}</span>
                      <MiniBar used={used} total={limit} barColor={qt.barColor} />
                      <span className="text-[10px] text-muted-foreground flex-shrink-0 w-10 text-right font-mono">
                        {Math.max(0, limit - used)}/{limit}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
