import React, { useMemo, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users, Activity, Monitor, CheckCircle2, Clock,
  Stethoscope, Eye, AlertCircle, TrendingUp, SkipForward,
  XCircle, CreditCard, Gift, Tag, ChevronRight, LogOut
} from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import { format } from "date-fns";
import { PARTICIPANT_STATUS_LABELS, PARTICIPANT_STATUS_COLORS } from "@/lib/registrationUtils";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";

const QUOTA_TYPES = [
  { key: 'free',    limitField: 'free_quota',    usedField: 'used_free_quota',    statusValue: 'FREE',          label: 'Free',      color: 'text-green-700',  bg: 'bg-green-500',  trackBg: 'bg-green-100'  },
  { key: 'rp1',     limitField: 'rp1_quota',     usedField: 'used_rp1_quota',     statusValue: 'RP1_BRI',       label: 'Rp 1 BRI',  color: 'text-blue-700',   bg: 'bg-blue-500',   trackBg: 'bg-blue-100'   },
  { key: 'special', limitField: 'special_quota', usedField: 'used_special_quota', statusValue: 'SPECIAL_PRICE', label: 'Special',   color: 'text-purple-700', bg: 'bg-purple-500', trackBg: 'bg-purple-100' },
];

// Only SERVING and DONE count as a consumed quota slot
const OCCUPYING_STATUSES = new Set(["SERVING", "DONE"]);

function ServiceQuotaCard({ service, queues }) {
  const isEye = service.service_group === "EYE_CHECK";
  const svcQueues = queues.filter(q => q.service_id === service.id && OCCUPYING_STATUSES.has(q.status));
  const totalLimit = QUOTA_TYPES.reduce((sum, qt) => sum + (service[qt.limitField] || 0), 0);
  const totalUsed = svcQueues.length;
  const totalRem = Math.max(0, totalLimit - totalUsed);
  const fillPct = totalLimit > 0 ? Math.min(100, Math.round((totalUsed / totalLimit) * 100)) : 0;
  const activeTypes = QUOTA_TYPES.filter(qt => (service[qt.limitField] || 0) > 0);

  return (
    <Card className={`border ${totalRem <= 0 && totalLimit > 0 ? "border-destructive/40" : totalRem <= 20 ? "border-amber-200" : isEye ? "border-accent/30" : "border-primary/20"}`}>
      <CardContent className="p-3">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-black flex-shrink-0 ${isEye ? "bg-accent/10 text-accent" : "bg-primary/10 text-primary"}`}>
              {service.service_code}
            </div>
            <span className="text-sm font-semibold truncate">{service.service_name}</span>
          </div>
          {totalRem <= 0 && totalLimit > 0 ? (
            <Badge className="bg-red-100 text-red-700 border-red-200 text-[10px] flex-shrink-0">Penuh</Badge>
          ) : (
            <Badge className={`text-[10px] flex-shrink-0 ${totalRem <= 20 ? "bg-amber-100 text-amber-700 border-amber-200" : "bg-green-100 text-green-700 border-green-200"}`}>
              Sisa: {totalRem}
            </Badge>
          )}
        </div>

        {/* Overall bar */}
        <div className="flex items-center gap-2 mb-2.5">
          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-700 ${fillPct >= 100 ? "bg-destructive" : fillPct >= 80 ? "bg-amber-400" : isEye ? "bg-accent" : "bg-primary"}`}
              style={{ width: `${fillPct}%` }} />
          </div>
          <span className="text-xs text-muted-foreground flex-shrink-0 font-mono">{totalUsed}/{totalLimit}</span>
        </div>

        {/* Per-quota rows — read used_*_quota from DB (updated by booth on DONE, realtime via Service subscription) */}
        {activeTypes.length > 0 && (
          <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${activeTypes.length}, 1fr)` }}>
            {activeTypes.map(qt => {
              const limit = service[qt.limitField] || 0;
              const used  = service[qt.usedField]  || 0;
              const rem   = Math.max(0, limit - used);
              const pct   = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
              return (
                <div key={qt.key} className={`rounded px-2 py-1.5 ${qt.trackBg}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-[9px] font-bold uppercase tracking-wide ${qt.color}`}>{qt.label}</span>
                    <span className={`text-[9px] font-mono font-bold ${qt.color}`}>{rem}</span>
                  </div>
                  <div className="h-1 bg-white/60 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${qt.bg}`} style={{ width: `${100 - pct}%` }} />
                  </div>
                  <p className="text-[8px] text-right text-muted-foreground mt-0.5 font-mono">{used}/{limit}</p>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

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
    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 hover:bg-muted/70 transition-colors">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0
        ${isEye ? "bg-accent/10 text-accent" : "bg-primary/10 text-primary"}`}>
        {service.service_code}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-tight truncate">{service.service_name}</p>
        <p className="text-xs text-muted-foreground">Booth {service.booth_number}</p>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0 text-xs text-right">
        <div className="text-center min-w-[2.5rem]">
          <p className={`font-mono font-bold text-base leading-none ${serving ? "text-primary" : "text-muted-foreground/30"}`}>
            {serving ? serving.queue_number : "—"}
          </p>
          <p className="text-muted-foreground mt-0.5">Serving</p>
        </div>
        <div className="text-center min-w-[2rem]">
          <p className="font-bold text-base text-amber-600 leading-none">{waiting}</p>
          <p className="text-muted-foreground mt-0.5">Tunggu</p>
        </div>
        <div className="text-center min-w-[2rem]">
          <p className="font-bold text-base text-green-600 leading-none">{done}</p>
          <p className="text-muted-foreground mt-0.5">Selesai</p>
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
const { user } = useAuth();
  const queryClient = useQueryClient();
  const [switching, setSwitching] = useState(false);

  const switchRole = async () => {
    setSwitching(true);
    try {
      const newRole = user?.role === 'admin' ? 'nakes' : 'admin';
      const response = await base44.functions.invoke('getDemoToken', { 
        username: newRole,
        password: newRole === 'admin' ? 'admin123' : 'nakes'
      });
      
      const token = response.data?.token || response.data;
      if (token) {
        localStorage.setItem('token', token);
        window.location.reload();
      }
    } catch (err) {
      console.error('Role switch failed:', err);
      setSwitching(false);
    }
  };
  const { data: services = [] } = useQuery({
    queryKey: ["services"],
    queryFn: () => base44.entities.Service.list(),
    refetchInterval: 5000,
  });

  const { data: eventSettings = [] } = useQuery({
    queryKey: ["eventSettings"],
    queryFn: () => base44.entities.EventSetting.list(),
    refetchInterval: 10000,
  });

  const { data: participants = [] } = useQuery({
    queryKey: ["participants"],
    queryFn: () => base44.entities.Participant.list("-created_date"),
    refetchInterval: 5000,
  });

  const { data: queues = [], isLoading: loadingQueues } = useQuery({
    queryKey: ["queues"],
    queryFn: () => base44.entities.Queue.list(),
    refetchInterval: 5000,
  });

  // Real-time subscriptions
  useEffect(() => {
    const unsubS = base44.entities.Service.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
    });
    const unsubP = base44.entities.Participant.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ["participants"] });
    });
    const unsubQ = base44.entities.Queue.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ["queues"] });
    });
    return () => { unsubS(); unsubP(); unsubQ(); };
  }, [queryClient]);

  const event = eventSettings[0];
  const eventMaxParticipants = event?.max_participants || 200;

  // Calculate quota from service definitions (all 3 types summed per service)
  const totalFreeQuota = services.reduce((sum, s) => sum + (s.free_quota || 0), 0);
  const totalRp1Quota  = services.reduce((sum, s) => sum + (s.rp1_quota  || 0), 0);
  const totalSpecialQuota = services.reduce((sum, s) => sum + (s.special_quota || 0), 0);
  const totalQuota = totalFreeQuota + totalRp1Quota + totalSpecialQuota || eventMaxParticipants;

  // Count actual by quota status
  const freeCheckParticipants   = participants.filter(p => p.quota_status === "FREE").length;
  const rp1Participants         = participants.filter(p => p.quota_status === "RP1_BRI").length;
  const specialParticipants     = participants.filter(p => p.quota_status === "SPECIAL_PRICE").length;

  const stats = useMemo(() => {
    const completed = participants.filter(p => p.participant_status === "COMPLETED").length;
    const partial = participants.filter(p => p.participant_status === "PARTIALLY_COMPLETED").length;
    const waiting = queues.filter(q => q.status === "WAITING").length;
    const serving = queues.filter(q => q.status === "SERVING" || q.status === "CALLED").length;
    const skipped = queues.filter(q => q.status === "SKIPPED").length;
    const cancelled = queues.filter(q => q.status === "CANCELLED").length;
    const freeUsed    = freeCheckParticipants;
    const rp1Used     = rp1Participants;
    const specialUsed = specialParticipants;
    const remaining = totalQuota - participants.length;
    return { completed, partial, waiting, serving, skipped, cancelled, freeUsed, rp1Used, specialUsed, remaining };
  }, [participants, queues, totalQuota, freeCheckParticipants, rp1Participants, specialParticipants]);

  const fillPct = Math.min(100, Math.round((participants.length / totalQuota) * 100));
  const medicalServices = services.filter(s => s.service_group === "MEDICAL");
  const eyeServices = services.filter(s => s.service_group === "EYE_CHECK");
  const latestParticipants = participants.slice(0, 5);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle={event ? `${event.event_name} · ${event.location}` : "Memuat data..."}
        icon={Activity}
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={switchRole} disabled={switching} className="gap-2">
              <LogOut className="w-4 h-4" />
              {switching ? 'Mengganti...' : `Ganti ke ${user?.role === 'admin' ? 'Nakes' : 'Admin'}`}
            </Button>
          </div>
        }
      />

      {/* Quota Info — grouped by provider */}
      <div className="space-y-3">
        {medicalServices.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2 px-0.5">
              <Stethoscope className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Primaya Hospital</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {loadingQueues
                ? [1,2,3].map(i => <Card key={i} className="border border-primary/20 animate-pulse"><CardContent className="p-3 h-24" /></Card>)
                : medicalServices.filter(s => s.is_active).map(s => (
                    <ServiceQuotaCard key={s.id} service={s} queues={queues} />
                  ))
              }
            </div>
          </div>
        )}
        {eyeServices.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2 px-0.5">
              <Eye className="w-3.5 h-3.5 text-accent" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Optik Melawai</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {loadingQueues
                ? [1,2].map(i => <Card key={i} className="border border-accent/30 animate-pulse"><CardContent className="p-3 h-24" /></Card>)
                : eyeServices.filter(s => s.is_active).map(s => (
                    <ServiceQuotaCard key={s.id} service={s} queues={queues} />
                  ))
              }
            </div>
          </div>
        )}
      </div>

      {/* Capacity Bar */}
      <Card className={`border-2 ${fillPct >= 100 ? "border-destructive/40" : fillPct >= 80 ? "border-warning/40" : "border-success/30"}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold">Total Peserta Terdaftar</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black">{participants.length}</span>
              <span className="text-muted-foreground text-sm">/ {totalQuota}</span>
              {stats.remaining <= 0 ? (
                <Badge className="bg-red-100 text-red-700 border-red-200 gap-1"><AlertCircle className="w-3 h-3" />Penuh</Badge>
              ) : stats.remaining <= 20 ? (
                <Badge className="bg-amber-100 text-amber-700 border-amber-200">Sisa: {stats.remaining}</Badge>
              ) : (
                <Badge className="bg-green-100 text-green-700 border-green-200">Sisa: {stats.remaining}</Badge>
              )}
            </div>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${fillPct >= 100 ? "bg-destructive" : fillPct >= 80 ? "bg-warning" : "bg-success"}`}
              style={{ width: `${fillPct}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1 text-right">{fillPct}% kapasitas terisi</p>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="bg-primary text-primary-foreground">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-primary-foreground/70">Total Terdaftar</p>
            <p className="text-3xl font-black mt-1 leading-none">{participants.length}</p>
            <p className="text-xs text-primary-foreground/50 mt-1">/ {totalQuota} kapasitas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium">Selesai</p>
            <p className="text-3xl font-black text-green-600 mt-1 leading-none">{stats.completed}</p>
            <p className="text-xs text-muted-foreground mt-1">peserta</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium">Menunggu</p>
            <p className="text-3xl font-black text-blue-600 mt-1 leading-none">{stats.waiting}</p>
            <p className="text-xs text-muted-foreground mt-1">antrian</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium">Dilayani</p>
            <p className="text-3xl font-black text-purple-600 mt-1 leading-none">{stats.serving}</p>
            <p className="text-xs text-muted-foreground mt-1">antrian</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium">Sebagian Selesai</p>
            <p className="text-3xl font-black text-amber-500 mt-1 leading-none">{stats.partial}</p>
            <p className="text-xs text-muted-foreground mt-1">peserta</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium">Dilewati</p>
            <p className="text-3xl font-black text-orange-500 mt-1 leading-none">{stats.skipped}</p>
            <p className="text-xs text-muted-foreground mt-1">antrian</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium">Dibatalkan</p>
            <p className="text-3xl font-black text-red-500 mt-1 leading-none">{stats.cancelled}</p>
            <p className="text-xs text-muted-foreground mt-1">antrian</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <Gift className="w-3.5 h-3.5 text-green-600" />
              <p className="text-xs text-muted-foreground font-medium">Free Terpakai</p>
            </div>
            <p className="text-3xl font-black text-green-600 leading-none">{stats.freeUsed}</p>
            <p className="text-xs text-muted-foreground mt-1">dari {totalFreeQuota}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <CreditCard className="w-3.5 h-3.5 text-blue-600" />
              <p className="text-xs text-muted-foreground font-medium">Rp 1 BRI Terpakai</p>
            </div>
            <p className="text-3xl font-black text-blue-600 leading-none">{stats.rp1Used}</p>
            <p className="text-xs text-muted-foreground mt-1">dari {totalRp1Quota}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <Tag className="w-3.5 h-3.5 text-purple-600" />
              <p className="text-xs text-muted-foreground font-medium">Special Terpakai</p>
            </div>
            <p className="text-3xl font-black text-purple-600 leading-none">{stats.specialUsed}</p>
            <p className="text-xs text-muted-foreground mt-1">dari {totalSpecialQuota}</p>
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