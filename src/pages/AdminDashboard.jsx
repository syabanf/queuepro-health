import React, { useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users, Activity, Monitor, CheckCircle2, Clock,
  Stethoscope, Eye, AlertCircle, TrendingUp, SkipForward,
  XCircle, CreditCard, Gift, ChevronRight
} from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import { format } from "date-fns";
import { PARTICIPANT_STATUS_LABELS, PARTICIPANT_STATUS_COLORS } from "@/lib/registrationUtils";
import { Link } from "react-router-dom";

function StatCard({ title, value, icon: Icon, bgClass, textClass, subtitle }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground truncate">{title}</p>
            <p className={`text-3xl font-black mt-1 ${textClass || "text-foreground"}`}>{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground mt-1 truncate">{subtitle}</p>}
          </div>
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${bgClass || "bg-primary/10"} ${textClass || "text-primary"}`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ServiceQueueRow({ service, queues }) {
  const svcQueues = queues.filter(q => q.service_id === service.id);
  const serving = svcQueues.find(q => q.status === "SERVING" || q.status === "CALLED");
  const waiting = svcQueues.filter(q => q.status === "WAITING").length;
  const done = svcQueues.filter(q => q.status === "DONE").length;
  const isEye = service.service_group === "EYE_CHECK";

  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 hover:bg-muted/70 transition-colors">
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0
          ${isEye ? "bg-accent/10 text-accent" : "bg-primary/10 text-primary"}`}>
          {service.service_code}
        </div>
        <div>
          <p className="text-sm font-medium leading-tight">{service.service_name}</p>
          <p className="text-xs text-muted-foreground">Booth {service.booth_number}</p>
        </div>
      </div>
      <div className="flex items-center gap-4 text-xs">
        <div className="text-center">
          {serving ? (
            <p className="font-mono font-black text-lg text-primary leading-none">{serving.queue_number}</p>
          ) : (
            <p className="font-mono text-muted-foreground/40 text-lg leading-none">—</p>
          )}
          <p className="text-muted-foreground mt-0.5">Serving</p>
        </div>
        <div className="text-center w-10">
          <p className="font-bold text-base text-amber-600 leading-none">{waiting}</p>
          <p className="text-muted-foreground mt-0.5">Tunggu</p>
        </div>
        <div className="text-center w-10">
          <p className="font-bold text-base text-green-600 leading-none">{done}</p>
          <p className="text-muted-foreground mt-0.5">Selesai</p>
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const queryClient = useQueryClient();
  const { data: services = [] } = useQuery({
    queryKey: ["services"],
    queryFn: () => base44.entities.Service.list(),
    refetchInterval: 8000,
  });

  const { data: eventSettings = [] } = useQuery({
    queryKey: ["eventSettings"],
    queryFn: () => base44.entities.EventSetting.list(),
  });

  const { data: participants = [] } = useQuery({
    queryKey: ["participants"],
    queryFn: () => base44.entities.Participant.list("-created_date"),
    refetchInterval: 8000,
  });

  const { data: queues = [] } = useQuery({
    queryKey: ["queues"],
    queryFn: () => base44.entities.Queue.list(),
    refetchInterval: 8000,
  });

  // Real-time subscriptions
  useEffect(() => {
    const unsubP = base44.entities.Participant.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ["participants"] });
    });
    const unsubQ = base44.entities.Queue.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ["queues"] });
    });
    return () => { unsubP(); unsubQ(); };
  }, [queryClient]);

  const event = eventSettings[0];
  const maxParticipants = event?.max_participants || 200;

  const stats = useMemo(() => {
    const completed = participants.filter(p => p.participant_status === "COMPLETED").length;
    const partial = participants.filter(p => p.participant_status === "PARTIALLY_COMPLETED").length;
    const waiting = queues.filter(q => q.status === "WAITING").length;
    const serving = queues.filter(q => q.status === "SERVING" || q.status === "CALLED").length;
    const skipped = queues.filter(q => q.status === "SKIPPED").length;
    const cancelled = queues.filter(q => q.status === "CANCELLED").length;
    const freeUsed = queues.filter(q => q.slot_type === "FREE" && q.status !== "CANCELLED").length;
    const paidUsed = queues.filter(q => q.slot_type === "PAID" && q.status !== "CANCELLED").length;
    const remaining = maxParticipants - participants.length;
    return { completed, partial, waiting, serving, skipped, cancelled, freeUsed, paidUsed, remaining };
  }, [participants, queues, maxParticipants]);

  const fillPct = Math.min(100, Math.round((participants.length / maxParticipants) * 100));
  const medicalServices = services.filter(s => s.service_group === "MEDICAL");
  const eyeServices = services.filter(s => s.service_group === "EYE_CHECK");
  const latestParticipants = participants.slice(0, 5);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle={event ? `${event.event_name} · ${event.location}` : "Memuat data..."}
        icon={Activity}
      />

      {/* Capacity Bar */}
      <Card className={`border-2 ${fillPct >= 100 ? "border-destructive/40" : fillPct >= 80 ? "border-warning/40" : "border-success/30"}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold">Kapasitas Peserta</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black">{participants.length}</span>
              <span className="text-muted-foreground text-sm">/ {maxParticipants}</span>
              {stats.remaining <= 0 ? (
                <Badge className="bg-red-100 text-red-700 border-red-200 gap-1"><AlertCircle className="w-3 h-3" />Penuh</Badge>
              ) : stats.remaining <= 20 ? (
                <Badge className="bg-amber-100 text-amber-700 border-amber-200">Sisa: {stats.remaining}</Badge>
              ) : (
                <Badge className="bg-green-100 text-green-700 border-green-200">Sisa: {stats.remaining}</Badge>
              )}
            </div>
          </div>
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${fillPct >= 100 ? "bg-destructive" : fillPct >= 80 ? "bg-warning" : "bg-success"}`}
              style={{ width: `${fillPct}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1 text-right">{fillPct}% kapasitas terisi</p>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        <Card className="bg-primary text-primary-foreground col-span-2 sm:col-span-1">
          <CardContent className="p-5">
            <p className="text-xs font-medium text-primary-foreground/70">Terdaftar</p>
            <p className="text-3xl font-black mt-1">{participants.length} <span className="text-lg font-normal text-primary-foreground/50">/ {maxParticipants}</span></p>
            <p className="text-xs text-primary-foreground/60 mt-1">total peserta</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground font-medium">Selesai</p>
            <p className="text-3xl font-black text-green-600 mt-1">{stats.completed}</p>
            <p className="text-xs text-muted-foreground mt-1">peserta</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground font-medium">Sebagian Selesai</p>
            <p className="text-3xl font-black text-amber-500 mt-1">{stats.partial}</p>
            <p className="text-xs text-muted-foreground mt-1">peserta</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground font-medium">Menunggu</p>
            <p className="text-3xl font-black text-blue-600 mt-1">{stats.waiting}</p>
            <p className="text-xs text-muted-foreground mt-1">antrian</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground font-medium">Dilayani</p>
            <p className="text-3xl font-black text-purple-600 mt-1">{stats.serving}</p>
            <p className="text-xs text-muted-foreground mt-1">antrian</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground font-medium">Dilewati</p>
            <p className="text-3xl font-black text-orange-500 mt-1">{stats.skipped}</p>
            <p className="text-xs text-muted-foreground mt-1">antrian</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground font-medium">Dibatalkan</p>
            <p className="text-3xl font-black text-red-500 mt-1">{stats.cancelled}</p>
            <p className="text-xs text-muted-foreground mt-1">antrian</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground font-medium">Slot Gratis</p>
            <p className="text-3xl font-black text-green-600 mt-1">{stats.freeUsed}</p>
            <p className="text-xs text-muted-foreground mt-1">digunakan</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground font-medium">Slot Berbayar</p>
            <p className="text-3xl font-black text-orange-500 mt-1">{stats.paidUsed}</p>
            <p className="text-xs text-muted-foreground mt-1">digunakan</p>
          </CardContent>
        </Card>
      </div>

      {/* Real-time Queue per Service */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Stethoscope className="w-4 h-4 text-primary" /> Antrian Layanan Medis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {medicalServices.length === 0
              ? <p className="text-sm text-muted-foreground text-center py-6">Tidak ada layanan medis</p>
              : medicalServices.map(s => <ServiceQueueRow key={s.id} service={s} queues={queues} />)
            }
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Eye className="w-4 h-4 text-accent" /> Antrian Pemeriksaan Mata
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {eyeServices.length === 0
              ? <p className="text-sm text-muted-foreground text-center py-6">Tidak ada layanan mata</p>
              : eyeServices.map(s => <ServiceQueueRow key={s.id} service={s} queues={queues} />)
            }
          </CardContent>
        </Card>
      </div>

      {/* Latest Participants */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Users className="w-4 h-4 text-primary" /> Peserta Terbaru
            </CardTitle>
            <Link to="/participants" className="text-xs text-primary hover:underline flex items-center gap-1">
              Lihat Semua <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {latestParticipants.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Belum ada peserta terdaftar</p>
          ) : (
            <div className="space-y-2">
              {latestParticipants.map(p => (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/40">
                  <div>
                    <p className="text-sm font-medium">{p.full_name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{p.registration_number} · {p.unit_division}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={`text-xs border ${PARTICIPANT_STATUS_COLORS[p.participant_status]}`}>
                      {PARTICIPANT_STATUS_LABELS[p.participant_status]}
                    </Badge>
                    {p.registered_at && (
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(p.registered_at), "HH:mm")}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}