import React, { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Stethoscope, Eye, RefreshCw, Infinity as InfinityIcon } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";

function getServiceStatus(service) {
  if (!service.is_active) return { label: "NONAKTIF", color: "bg-gray-100 text-gray-500 border-gray-200" };
  if (service.is_unlimited) return { label: "UNLIMITED", color: "bg-blue-100 text-blue-700 border-blue-200" };
  const total = (service.full_free_quota || 0) + (service.cc_rp1_quota || 0) + (service.full_paid_quota || 0);
  const used = service.used_total || 0;
  const rem = total - used;
  if (rem <= 0) return { label: "KUOTA HABIS", color: "bg-red-100 text-red-700 border-red-200" };
  const pct = total > 0 ? used / total : 0;
  if (pct >= 0.9) return { label: "HAMPIR PENUH", color: "bg-orange-100 text-orange-700 border-orange-200" };
  return { label: "TERSEDIA", color: "bg-green-100 text-green-700 border-green-200" };
}

function ProgressBar({ used, total, color }) {
  const pct = total > 0 ? Math.min(100, (used / total) * 100) : 0;
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden min-w-[40px]">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function QuotaCell({ quota, used, color, isUnlimited }) {
  if (isUnlimited) {
    return (
      <td className="py-3 px-3 text-center">
        <span className="text-xs text-blue-600 font-bold">∞</span>
      </td>
    );
  }
  const rem = Math.max(0, quota - used);
  return (
    <td className="py-3 px-3">
      <div className="text-center">
        <div className="text-xs font-bold">
          <span className={quota === 0 ? "text-muted-foreground" : ""}>{quota}</span>
        </div>
        <div className="text-[10px] text-muted-foreground">{used} terpakai</div>
        <div className={`text-[10px] font-semibold ${rem <= 0 && quota > 0 ? "text-destructive" : "text-green-700"}`}>
          {rem} sisa
        </div>
        {quota > 0 && <ProgressBar used={used} total={quota} color={rem <= 0 ? "bg-destructive" : color} />}
      </div>
    </td>
  );
}

function QuotaTableRow({ service, isEye }) {
  const status = getServiceStatus(service);
  const totalSlot = (service.full_free_quota || 0) + (service.cc_rp1_quota || 0) + (service.full_paid_quota || 0);
  const usedTotal = service.used_total || 0;
  const remTotal = service.is_unlimited ? Infinity : Math.max(0, totalSlot - usedTotal);

  return (
    <tr className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
      <td className="py-3 px-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold
          ${isEye ? "bg-accent/10 text-accent" : "bg-primary/10 text-primary"}`}>
          {service.service_code}
        </div>
      </td>
      <td className="py-3 px-3">
        <p className="text-sm font-medium">{service.service_name}</p>
        <p className="text-xs text-muted-foreground">Booth {service.booth_number}</p>
      </td>

      {/* Full Free */}
      <QuotaCell
        quota={service.full_free_quota || 0}
        used={service.used_full_free || 0}
        color="bg-green-500"
        isUnlimited={service.is_unlimited}
      />

      {/* CC Rp 1 */}
      <QuotaCell
        quota={service.cc_rp1_quota || 0}
        used={service.used_cc_rp1 || 0}
        color="bg-blue-500"
        isUnlimited={false}
      />

      {/* Full Paid */}
      <QuotaCell
        quota={service.full_paid_quota || 0}
        used={service.used_full_paid || 0}
        color="bg-orange-400"
        isUnlimited={false}
      />

      {/* Total */}
      <td className="py-3 px-3">
        {service.is_unlimited ? (
          <div className="text-center">
            <span className="text-sm text-blue-600 font-bold">∞</span>
            <div className="text-[10px] text-muted-foreground">{usedTotal} terpakai</div>
          </div>
        ) : (
          <div className="text-center">
            <div className="text-xs font-bold">{totalSlot}</div>
            <div className="text-[10px] text-muted-foreground">{usedTotal} terpakai</div>
            <div className={`text-[10px] font-semibold ${remTotal <= 0 && totalSlot > 0 ? "text-destructive" : "text-green-700"}`}>
              {remTotal} sisa
            </div>
            {totalSlot > 0 && <ProgressBar used={usedTotal} total={totalSlot} color={remTotal <= 0 ? "bg-destructive" : "bg-primary"} />}
          </div>
        )}
      </td>

      <td className="py-3 px-3">
        <Badge className={`text-[10px] border whitespace-nowrap ${status.color}`}>{status.label}</Badge>
      </td>
    </tr>
  );
}

const TableHeader = () => (
  <thead>
    <tr className="bg-muted/60 border-b border-border">
      <th className="text-left text-xs font-semibold text-muted-foreground py-3 px-3 w-10">Kode</th>
      <th className="text-left text-xs font-semibold text-muted-foreground py-3 px-3">Layanan</th>
      <th className="text-center text-xs font-semibold text-green-700 py-3 px-3">
        <div>Tanpa Syarat</div>
        <div className="text-[10px] font-normal text-muted-foreground">Full Free</div>
      </th>
      <th className="text-center text-xs font-semibold text-blue-700 py-3 px-3">
        <div>Dengan CC Rp 1</div>
        <div className="text-[10px] font-normal text-muted-foreground">CC Rp 1</div>
      </th>
      <th className="text-center text-xs font-semibold text-orange-600 py-3 px-3">
        <div>Berbayar Penuh</div>
        <div className="text-[10px] font-normal text-muted-foreground">Full Paid</div>
      </th>
      <th className="text-center text-xs font-semibold text-muted-foreground py-3 px-3">Total Slot</th>
      <th className="text-left text-xs font-semibold text-muted-foreground py-3 px-3">Status</th>
    </tr>
  </thead>
);

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

  useEffect(() => {
    const unsubP = base44.entities.Participant.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ["participants"] });
      queryClient.invalidateQueries({ queryKey: ["services"] });
    });
    const unsubS = base44.entities.Service.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
    });
    return () => { unsubP(); unsubS(); };
  }, [queryClient]);

  const medical = services.filter(s => s.service_group === "MEDICAL");
  const eye = services.filter(s => s.service_group === "EYE_CHECK");

  const totalUsed = services.reduce((a, s) => a + (s.used_total || 0), 0);
  const totalFullFreeUsed = services.filter(s => !s.is_unlimited).reduce((a, s) => a + (s.used_full_free || 0), 0);
  const totalCcRp1Used = services.reduce((a, s) => a + (s.used_cc_rp1 || 0), 0);
  const totalFullPaidUsed = services.reduce((a, s) => a + (s.used_full_paid || 0), 0);
  const activeBooths = services.filter(s => s.is_active).length;
  const lastUpdatedStr = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString("id-ID") : "—";

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
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card className="bg-primary text-primary-foreground">
          <CardContent className="p-4">
            <p className="text-xs text-primary-foreground/70 font-medium">Total Peserta</p>
            <p className="text-3xl font-black mt-1">{participants.length}</p>
            <p className="text-xs text-primary-foreground/60 mt-1">terdaftar</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium">Tanpa Syarat</p>
            <p className="text-2xl font-black text-green-600 mt-1">{totalFullFreeUsed}</p>
            <p className="text-xs text-muted-foreground mt-1">antrian FULL FREE</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium">Dengan CC Rp 1</p>
            <p className="text-2xl font-black text-blue-600 mt-1">{totalCcRp1Used}</p>
            <p className="text-xs text-muted-foreground mt-1">antrian CC RP1</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium">Berbayar Penuh</p>
            <p className="text-2xl font-black text-orange-500 mt-1">{totalFullPaidUsed}</p>
            <p className="text-xs text-muted-foreground mt-1">antrian FULL PAID</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium">Booth Aktif</p>
            <p className="text-2xl font-black text-primary mt-1">{activeBooths}</p>
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
                  ? <tr><td colSpan={7} className="text-center py-8 text-sm text-muted-foreground">Tidak ada data</td></tr>
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
                  ? <tr><td colSpan={7} className="text-center py-8 text-sm text-muted-foreground">Tidak ada data</td></tr>
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