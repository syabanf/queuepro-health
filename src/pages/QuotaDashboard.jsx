import React, { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Stethoscope, Eye, RefreshCw } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";

function getQuotaStatus(freeRem, paidRem) {
  if (freeRem > 0) return { label: "FREE TERSEDIA", color: "bg-green-100 text-green-700 border-green-200" };
  if (freeRem <= 0 && paidRem > 0) return { label: "FREE HABIS · PAID TERSEDIA", color: "bg-blue-100 text-blue-700 border-blue-200" };
  return { label: "KUOTA HABIS", color: "bg-gray-100 text-gray-600 border-gray-200" };
}

function QuotaTableRow({ service, isEye }) {
  const freeTotal = service.free_quota || 0;
  const freeUsed = service.used_free_quota || 0;
  const freeRem = freeTotal - freeUsed;
  const paidTotal = service.paid_quota || 0;
  const paidUsed = service.used_paid_quota || 0;
  const paidRem = paidTotal - paidUsed;
  const status = getQuotaStatus(freeRem, paidRem);
  const freePct = freeTotal > 0 ? Math.min(100, (freeUsed / freeTotal) * 100) : 0;
  const paidPct = paidTotal > 0 ? Math.min(100, (paidUsed / paidTotal) * 100) : 0;

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
      {/* FREE */}
      <td className="py-3 px-4 text-center text-sm font-medium">{freeTotal}</td>
      <td className="py-3 px-4 text-center">
        <span className="text-sm font-bold text-green-700">{freeUsed}</span>
      </td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden min-w-[60px]">
            <div
              className={`h-full rounded-full transition-all ${freePct >= 100 ? "bg-destructive" : "bg-green-500"}`}
              style={{ width: `${freePct}%` }}
            />
          </div>
          <span className={`text-sm font-bold w-6 text-right ${freeRem <= 0 ? "text-destructive" : "text-foreground"}`}>
            {freeRem}
          </span>
        </div>
      </td>
      {/* PAID */}
      <td className="py-3 px-4 text-center text-sm font-medium">{paidTotal}</td>
      <td className="py-3 px-4 text-center">
        <span className="text-sm font-bold text-orange-600">{paidUsed}</span>
      </td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden min-w-[60px]">
            <div
              className={`h-full rounded-full transition-all ${paidPct >= 100 ? "bg-destructive" : "bg-orange-400"}`}
              style={{ width: `${paidPct}%` }}
            />
          </div>
          <span className={`text-sm font-bold w-6 text-right ${paidRem <= 0 ? "text-destructive" : "text-foreground"}`}>
            {paidRem}
          </span>
        </div>
      </td>
      <td className="py-3 px-4">
        <Badge className={`text-xs border whitespace-nowrap ${status.color}`}>{status.label}</Badge>
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
  const totalFreeUsed = services.reduce((a, s) => a + (s.used_free_quota || 0), 0);
  const totalPaidUsed = services.reduce((a, s) => a + (s.used_paid_quota || 0), 0);
  const totalFreeQuota = services.reduce((a, s) => a + (s.free_quota || 0), 0);
  const totalPaidQuota = services.reduce((a, s) => a + (s.paid_quota || 0), 0);
  const activeBooths = services.filter(s => s.is_active).length;
  const lastUpdatedStr = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString("id-ID") : "—";

  const TableHeader = () => (
    <thead>
      <tr className="bg-muted/60 border-b border-border">
        <th className="text-left text-xs font-semibold text-muted-foreground py-3 px-4 w-12">Kode</th>
        <th className="text-left text-xs font-semibold text-muted-foreground py-3 px-4">Nama Layanan</th>
        <th className="text-center text-xs font-semibold text-muted-foreground py-3 px-4">Kuota Gratis</th>
        <th className="text-center text-xs font-semibold text-muted-foreground py-3 px-4">Terpakai</th>
        <th className="text-left text-xs font-semibold text-muted-foreground py-3 px-4">Sisa Gratis</th>
        <th className="text-center text-xs font-semibold text-muted-foreground py-3 px-4">Kuota Bayar</th>
        <th className="text-center text-xs font-semibold text-muted-foreground py-3 px-4">Terpakai</th>
        <th className="text-left text-xs font-semibold text-muted-foreground py-3 px-4">Sisa Bayar</th>
        <th className="text-left text-xs font-semibold text-muted-foreground py-3 px-4">Status</th>
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
            <p className="text-xs text-muted-foreground font-medium">Slot Gratis Terpakai</p>
            <p className="text-3xl font-black text-green-600 mt-1">{totalFreeUsed}</p>
            <p className="text-xs text-muted-foreground mt-1">dari {totalFreeQuota} total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground font-medium">Slot Bayar Terpakai</p>
            <p className="text-3xl font-black text-orange-500 mt-1">{totalPaidUsed}</p>
            <p className="text-xs text-muted-foreground mt-1">dari {totalPaidQuota} total</p>
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
                  ? <tr><td colSpan={9} className="text-center py-8 text-sm text-muted-foreground">Tidak ada data</td></tr>
                  : medical.map(s => <QuotaTableRow key={s.id} service={s} isEye={false} />)
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
                  ? <tr><td colSpan={9} className="text-center py-8 text-sm text-muted-foreground">Tidak ada data</td></tr>
                  : eye.map(s => <QuotaTableRow key={s.id} service={s} isEye={true} />)
                }
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}