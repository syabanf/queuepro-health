import React, { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Stethoscope, Eye, RefreshCw } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";

// ── Shared queue-based used computation ──────────────────────────────────────
const OCCUPYING = new Set(["SERVING", "DONE"]);

function usedFromQueues(allQueues, serviceId, quotaStatus) {
  const svcQueues = allQueues.filter(q => q.service_id === serviceId && OCCUPYING.has(q.status));
  if (quotaStatus === "FREE") {
    return svcQueues.filter(q => !q.quota_status || q.quota_status === "FREE").length;
  }
  return svcQueues.filter(q => q.quota_status === quotaStatus).length;
}

function QuotaTableRow({ service, isEye, queues }) {
  // Free tier
  const freeUsed    = usedFromQueues(queues, service.id, "FREE");
  const rp1Used     = usedFromQueues(queues, service.id, "RP1_BRI");
  const specialUsed = usedFromQueues(queues, service.id, "SPECIAL_PRICE");
  const freeTotal    = service.free_quota    || 0;
  const rp1Total     = service.rp1_quota     || 0;
  const specialTotal = service.special_quota || 0;

  const freeRem    = freeTotal    - freeUsed;
  const rp1Rem     = rp1Total     - rp1Used;
  const specialRem = specialTotal - specialUsed;

  const freePct    = freeTotal    > 0 ? Math.min(100, (freeUsed    / freeTotal)    * 100) : 0;
  const rp1Pct     = rp1Total     > 0 ? Math.min(100, (rp1Used     / rp1Total)     * 100) : 0;
  const specialPct = specialTotal > 0 ? Math.min(100, (specialUsed / specialTotal) * 100) : 0;

  const totalUsed = freeUsed + rp1Used + specialUsed;
  const isUnlimited = service.is_unlimited;

  const renderQuota = (total, used, pct) => {
    if (total === 0 && !isUnlimited) return "-";
    if (isUnlimited) return "Unlimited";
    return (
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden min-w-[50px]">
          <div
            className={`h-full rounded-full transition-all ${pct >= 100 ? "bg-destructive" : "bg-primary"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-xs font-bold w-8 text-right">{total - used}</span>
      </div>
    );
  };

  return (
    <tr className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
      <td className="py-3 px-4">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold
          ${isEye ? "bg-accent/10 text-accent" : "bg-primary/10 text-primary"}`}>
          {service.service_code}
        </div>
      </td>
      <td className="py-3 px-4">
        <p className="text-sm font-medium">{service.service_name}</p>
        <p className="text-xs text-muted-foreground">Booth {service.booth_number}</p>
      </td>
      {/* Free */}
      <td className="py-3 px-4 text-center text-sm font-medium">{freeTotal}</td>
      <td className="py-3 px-4 text-center text-sm font-bold text-green-700">{freeUsed}</td>
      <td className="py-3 px-4">{renderQuota(freeTotal, freeUsed, freePct)}</td>
      {/* Rp 1 BRI */}
      <td className="py-3 px-4 text-center text-sm font-medium">{rp1Total || "-"}</td>
      <td className="py-3 px-4 text-center text-sm font-bold text-blue-700">{rp1Used}</td>
      <td className="py-3 px-4">{rp1Total > 0 ? renderQuota(rp1Total, rp1Used, rp1Pct) : "-"}</td>
      {/* Special Price */}
      <td className="py-3 px-4 text-center text-sm font-medium">{specialTotal || "-"}</td>
      <td className="py-3 px-4 text-center text-sm font-bold text-orange-600">{specialUsed}</td>
      <td className="py-3 px-4">{specialTotal > 0 ? renderQuota(specialTotal, specialUsed, specialPct) : "-"}</td>
      {/* Total Slot */}
      <td className="py-3 px-4 text-center text-sm font-medium">
        {isUnlimited ? "Unlimited" : freeTotal + rp1Total + specialTotal}
      </td>
    </tr>
  );
}

export default function QuotaDashboard() {
  const queryClient = useQueryClient();

  const { data: services = [], dataUpdatedAt } = useQuery({
    queryKey: ["services"],
    queryFn: () => base44.entities.Service.list(),
    refetchInterval: 5000,
  });

  const { data: participants = [] } = useQuery({
    queryKey: ["participants"],
    queryFn: () => base44.entities.Participant.list(),
    refetchInterval: 5000,
  });

  const { data: queues = [] } = useQuery({
    queryKey: ["queues"],
    queryFn: () => base44.entities.Queue.list(),
    refetchInterval: 5000,
  });

  // Real-time subscription
  useEffect(() => {
    const unsubP = base44.entities.Participant.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ["participants"] });
      queryClient.invalidateQueries({ queryKey: ["services"] });
    });
    const unsubQ = base44.entities.Queue.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ["queues"] });
    });
    const unsubS = base44.entities.Service.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
    });
    return () => { unsubP(); unsubQ(); unsubS(); };
  }, [queryClient]);

  const medical = services.filter(s => s.service_group === "MEDICAL");
  const eye = services.filter(s => s.service_group === "EYE_CHECK");

  const totalFreeUsed    = services.reduce((s, svc) => s + usedFromQueues(queues, svc.id, "FREE"), 0);
  const totalRp1Used     = services.reduce((s, svc) => s + usedFromQueues(queues, svc.id, "RP1_BRI"), 0);
  const totalSpecialUsed = services.reduce((s, svc) => s + usedFromQueues(queues, svc.id, "SPECIAL_PRICE"), 0);
  const totalFreeQuota    = services.reduce((a, s) => a + (s.free_quota    || 0), 0);
  const totalRp1Quota     = services.reduce((a, s) => a + (s.rp1_quota     || 0), 0);
  const totalSpecialQuota = services.reduce((a, s) => a + (s.special_quota || 0), 0);

  const activeBooths = services.filter(s => s.is_active).length;
  const lastUpdatedStr = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString("id-ID") : "—";

  const TableHeader = () => (
    <thead>
      <tr className="bg-muted/60 border-b border-border">
        <th className="text-left text-xs font-semibold text-muted-foreground py-3 px-4 w-12">Kode</th>
        <th className="text-left text-xs font-semibold text-muted-foreground py-3 px-4">Layanan</th>
        <th className="text-center text-xs font-semibold text-muted-foreground py-3 px-4" colSpan={3}>Free</th>
        <th className="text-center text-xs font-semibold text-muted-foreground py-3 px-4" colSpan={3}>Rp 1 BRI</th>
        <th className="text-center text-xs font-semibold text-muted-foreground py-3 px-4" colSpan={3}>Special Price</th>
        <th className="text-center text-xs font-semibold text-muted-foreground py-3 px-4">Total Slot</th>
      </tr>
      <tr className="bg-muted/30 border-b border-border">
        <th colSpan={2}></th>
        <th className="text-center text-xs font-semibold text-muted-foreground py-2 px-4">Kuota</th>
        <th className="text-center text-xs font-semibold text-muted-foreground py-2 px-4">Pakai</th>
        <th className="text-center text-xs font-semibold text-muted-foreground py-2 px-4">Sisa</th>
        <th className="text-center text-xs font-semibold text-muted-foreground py-2 px-4">Kuota</th>
        <th className="text-center text-xs font-semibold text-muted-foreground py-2 px-4">Pakai</th>
        <th className="text-center text-xs font-semibold text-muted-foreground py-2 px-4">Sisa</th>
        <th className="text-center text-xs font-semibold text-muted-foreground py-2 px-4">Kuota</th>
        <th className="text-center text-xs font-semibold text-muted-foreground py-2 px-4">Pakai</th>
        <th className="text-center text-xs font-semibold text-muted-foreground py-2 px-4">Sisa</th>
        <th className="text-center text-xs font-semibold text-muted-foreground py-2 px-4"></th>
      </tr>
    </thead>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard Kuota"
        subtitle="Monitoring kuota layanan secara real-time"
        icon={Activity}
        action={
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <RefreshCw className="w-3.5 h-3.5 animate-pulse text-green-500" />
            Update: {lastUpdatedStr}
          </div>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="bg-primary text-primary-foreground">
          <CardContent className="p-5">
            <p className="text-xs text-primary-foreground/70 font-medium">Total Peserta</p>
            <p className="text-3xl font-black mt-1">{participants.length}</p>
            <p className="text-xs text-primary-foreground/60 mt-1">dari 200 maks</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground font-medium">Free</p>
            <p className="text-3xl font-black text-green-600 mt-1">{totalFreeUsed}</p>
            <p className="text-xs text-muted-foreground mt-1">dari {totalFreeQuota} total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground font-medium">Rp 1 BRI</p>
            <p className="text-3xl font-black text-blue-600 mt-1">{totalRp1Used}</p>
            <p className="text-xs text-muted-foreground mt-1">dari {totalRp1Quota} total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground font-medium">Special Price</p>
            <p className="text-3xl font-black text-orange-600 mt-1">{totalSpecialUsed}</p>
            <p className="text-xs text-muted-foreground mt-1">dari {totalSpecialQuota} total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground font-medium">Booth Aktif</p>
            <p className="text-3xl font-black text-primary mt-1">{activeBooths}</p>
            <p className="text-xs text-muted-foreground mt-1">dari {services.length} booth</p>
          </CardContent>
        </Card>
      </div>

      {/* Medical Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Stethoscope className="w-4 h-4 text-primary" /> Layanan Medis
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <TableHeader />
              <tbody>
                {medical.length === 0
                  ? <tr><td colSpan={12} className="text-center py-8 text-sm text-muted-foreground">Tidak ada data</td></tr>
                  : medical.map(s => <QuotaTableRow key={s.id} service={s} isEye={false} queues={queues} />)
                }
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Eye Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Eye className="w-4 h-4 text-accent" /> Pemeriksaan Mata
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <TableHeader />
              <tbody>
                {eye.length === 0
                  ? <tr><td colSpan={12} className="text-center py-8 text-sm text-muted-foreground">Tidak ada data</td></tr>
                  : eye.map(s => <QuotaTableRow key={s.id} service={s} isEye={true} queues={queues} />)
                }
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
