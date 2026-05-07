import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Stethoscope, Eye, Users } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";

function QuotaProgressCard({ service }) {
  const freeUsed = service.used_free_quota || 0;
  const freeTotal = service.free_quota || 0;
  const paidUsed = service.used_paid_quota || 0;
  const paidTotal = service.paid_quota || 0;
  const freeRem = freeTotal - freeUsed;
  const paidRem = paidTotal - paidUsed;
  const freePct = freeTotal > 0 ? Math.min(100, Math.round((freeUsed / freeTotal) * 100)) : 0;
  const paidPct = paidTotal > 0 ? Math.min(100, Math.round((paidUsed / paidTotal) * 100)) : 0;
  const isEye = service.service_group === "EYE_CHECK";

  return (
    <Card className="overflow-hidden">
      <div className={`h-1 w-full ${isEye ? "bg-accent" : "bg-primary"}`} />
      <CardHeader className="pb-3 pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm
              ${isEye ? "bg-accent/10 text-accent" : "bg-primary/10 text-primary"}`}>
              {service.service_code}
            </div>
            <div>
              <CardTitle className="text-sm font-semibold">{service.service_name}</CardTitle>
              <p className="text-xs text-muted-foreground">Booth {service.booth_number}</p>
            </div>
          </div>
          <Badge
            className={`text-xs ${
              freeRem <= 0 && paidRem <= 0
                ? "bg-red-100 text-red-700 border-red-200"
                : (freeTotal > 0 && freePct >= 80) || (paidTotal > 0 && paidPct >= 80)
                ? "bg-amber-100 text-amber-700 border-amber-200"
                : "bg-green-100 text-green-700 border-green-200"
            }`}
          >
            {freeRem <= 0 && paidRem <= 0 ? "Penuh" : freePct >= 80 || paidPct >= 80 ? "Hampir Penuh" : "Tersedia"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pb-4">
        {/* FREE */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-muted-foreground">Slot Gratis</span>
            <span className="text-xs font-bold">
              {freeUsed} / {freeTotal}
              <span className="font-normal text-muted-foreground ml-1">({freeRem} sisa)</span>
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${freePct >= 100 ? "bg-destructive" : "bg-green-500"}`}
              style={{ width: `${freePct}%` }}
            />
          </div>
        </div>
        {/* PAID */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-muted-foreground">Slot Berbayar</span>
            <span className="text-xs font-bold">
              {paidUsed} / {paidTotal}
              <span className="font-normal text-muted-foreground ml-1">({paidRem} sisa)</span>
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${paidPct >= 100 ? "bg-destructive" : "bg-orange-400"}`}
              style={{ width: `${paidPct}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function QuotaDashboard() {
  const { data: services = [] } = useQuery({
    queryKey: ["services"],
    queryFn: () => base44.entities.Service.list(),
    refetchInterval: 10000,
  });

  const { data: participants = [] } = useQuery({
    queryKey: ["participants"],
    queryFn: () => base44.entities.Participant.list(),
    refetchInterval: 15000,
  });

  const medical = services.filter(s => s.service_group === "MEDICAL");
  const eye = services.filter(s => s.service_group === "EYE_CHECK");

  const totalFreeUsed = services.reduce((a, s) => a + (s.used_free_quota || 0), 0);
  const totalPaidUsed = services.reduce((a, s) => a + (s.used_paid_quota || 0), 0);

  return (
    <div>
      <PageHeader
        title="Dashboard Kuota"
        subtitle="Monitoring kuota layanan secara real-time"
        icon={Activity}
      />

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card><CardContent className="p-5">
          <p className="text-xs text-muted-foreground font-medium">Total Peserta</p>
          <p className="text-3xl font-black text-foreground mt-1">{participants.length}</p>
          <p className="text-xs text-muted-foreground">dari 200 maks</p>
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <p className="text-xs text-muted-foreground font-medium">Total Slot Gratis</p>
          <p className="text-3xl font-black text-green-600 mt-1">{totalFreeUsed}</p>
          <p className="text-xs text-muted-foreground">digunakan</p>
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <p className="text-xs text-muted-foreground font-medium">Total Slot Bayar</p>
          <p className="text-3xl font-black text-orange-500 mt-1">{totalPaidUsed}</p>
          <p className="text-xs text-muted-foreground">digunakan</p>
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <p className="text-xs text-muted-foreground font-medium">Booth Aktif</p>
          <p className="text-3xl font-black text-primary mt-1">{services.filter(s => s.is_active).length}</p>
          <p className="text-xs text-muted-foreground">dari {services.length} booth</p>
        </CardContent></Card>
      </div>

      {/* Medical */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Stethoscope className="w-5 h-5 text-primary" />
          <h2 className="text-base font-semibold">Layanan Medis</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {medical.map(s => <QuotaProgressCard key={s.id} service={s} />)}
        </div>
      </div>

      {/* Eye */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Eye className="w-5 h-5 text-accent" />
          <h2 className="text-base font-semibold">Pemeriksaan Mata</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {eye.map(s => <QuotaProgressCard key={s.id} service={s} />)}
        </div>
      </div>
    </div>
  );
}