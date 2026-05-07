import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Download, Printer, Users, CheckCircle2, Clock, SkipForward, XCircle, TrendingUp, Stethoscope, Eye } from "lucide-react";
import { format } from "date-fns";
import PageHeader from "@/components/layout/PageHeader";

export default function Reports() {
  const [filterService, setFilterService] = useState("all");
  const [filterSlot, setFilterSlot] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const { data: participants = [] } = useQuery({
    queryKey: ["participants"],
    queryFn: () => base44.entities.Participant.list(),
  });

  const { data: queues = [] } = useQuery({
    queryKey: ["queues"],
    queryFn: () => base44.entities.Queue.list(),
  });

  const { data: services = [] } = useQuery({
    queryKey: ["services"],
    queryFn: () => base44.entities.Service.list(),
  });

  const { data: eventSettings = [] } = useQuery({
    queryKey: ["eventSettings"],
    queryFn: () => base44.entities.EventSetting.list(),
  });

  const { data: queueEvents = [] } = useQuery({
    queryKey: ["queue-events"],
    queryFn: () => base44.entities.QueueEvent.list(),
  });

  const event = eventSettings[0];
  const serviceMap = useMemo(() => Object.fromEntries(services.map(s => [s.id, s])), [services]);

  // Filtered participants based on filters
  const filteredParticipants = useMemo(() => {
    return participants.filter(p => {
      const matchService = filterService === "all" ||
        p.medical_service_id === filterService ||
        p.eye_service_id === filterService;
      const matchSlot = filterSlot === "all" ||
        p.medical_slot_type === filterSlot ||
        p.eye_slot_type === filterSlot;
      const matchStatus = filterStatus === "all" || p.participant_status === filterStatus;
      return matchService && matchSlot && matchStatus;
    });
  }, [participants, filterService, filterSlot, filterStatus]);

  const stats = useMemo(() => {
    const pIds = new Set(filteredParticipants.map(p => p.id));
    const filteredQueues = queues.filter(q => {
      const p = filteredParticipants.find(pp => pp.id === q.participant_id);
      if (!p) return false;
      if (filterService !== "all" && q.service_id !== filterService) return false;
      return true;
    });

    const completed = filteredParticipants.filter(p => p.participant_status === "COMPLETED").length;
    const partial = filteredParticipants.filter(p => p.participant_status === "PARTIALLY_COMPLETED").length;
    const registered = filteredParticipants.filter(p => p.participant_status === "REGISTERED").length;
    const skipped = filteredQueues.filter(q => q.status === "SKIPPED").length;
    const cancelled = filteredQueues.filter(q => q.status === "CANCELLED").length;
    const freeUsed = filteredQueues.filter(q => q.slot_type === "FREE" && q.status !== "CANCELLED").length;
    const paidUsed = filteredQueues.filter(q => q.slot_type === "PAID" && q.status !== "CANCELLED").length;
    const completionRate = filteredParticipants.length > 0
      ? Math.round((completed / filteredParticipants.length) * 100)
      : 0;

    // Avg service time from DONE queues with serving_at + done_at
    const doneWithTimes = filteredQueues.filter(q => q.status === "DONE" && q.serving_at && q.done_at);
    const avgServiceMs = doneWithTimes.length > 0
      ? doneWithTimes.reduce((sum, q) => sum + (new Date(q.done_at) - new Date(q.serving_at)), 0) / doneWithTimes.length
      : null;
    const avgServiceMin = avgServiceMs ? Math.round(avgServiceMs / 60000) : null;

    // Avg wait time from CALLED queues with created_date + called_at
    const calledWithTimes = filteredQueues.filter(q => q.called_at && q.created_date);
    const avgWaitMs = calledWithTimes.length > 0
      ? calledWithTimes.reduce((sum, q) => sum + (new Date(q.called_at) - new Date(q.created_date)), 0) / calledWithTimes.length
      : null;
    const avgWaitMin = avgWaitMs ? Math.round(avgWaitMs / 60000) : null;

    // Per service breakdown
    const serviceBreakdown = services.map(svc => {
      const svcQueues = filteredQueues.filter(q => q.service_id === svc.id);
      const done = svcQueues.filter(q => q.status === "DONE").length;
      const total = svcQueues.filter(q => q.status !== "CANCELLED").length;
      const freeQ = svcQueues.filter(q => q.slot_type === "FREE" && q.status !== "CANCELLED").length;
      const paidQ = svcQueues.filter(q => q.slot_type === "PAID" && q.status !== "CANCELLED").length;
      return { svc, done, total, freeQ, paidQ };
    }).filter(b => b.total > 0);

    return { completed, partial, registered, skipped, cancelled, freeUsed, paidUsed, completionRate, avgServiceMin, avgWaitMin, serviceBreakdown, totalFiltered: filteredParticipants.length };
  }, [filteredParticipants, queues, services, filterService]);

  const handlePrint = () => window.print();

  const handleExportCSV = () => {
    const headers = ["No. Reg", "Nama", "No. Telp", "Unit/Divisi", "Layanan Medis", "Slot Medis", "Layanan Mata", "Slot Mata", "Status", "Waktu Daftar"];
    const rows = filteredParticipants.map(p => [
      p.registration_number,
      p.full_name,
      p.phone_number,
      p.unit_division,
      serviceMap[p.medical_service_id]?.service_name || "",
      p.medical_slot_type || "",
      serviceMap[p.eye_service_id]?.service_name || "",
      p.eye_slot_type || "",
      p.participant_status,
      p.registered_at ? format(new Date(p.registered_at), "dd/MM/yyyy HH:mm") : ""
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `laporan-brilian-talks-${format(new Date(), "yyyyMMdd-HHmm")}.csv`;
    a.click();
  };

  const StatBox = ({ label, value, colorClass, children }) => (
    <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/40">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${colorClass}`}>
        {children}
      </div>
      <div>
        <p className="text-2xl font-black leading-none">{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Laporan Harian"
        subtitle="Statistik dan ringkasan kegiatan event"
        icon={FileText}
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={handlePrint}>
              <Printer className="w-4 h-4" /> Cetak
            </Button>
            <Button size="sm" className="gap-1.5" onClick={handleExportCSV}>
              <Download className="w-4 h-4" /> Export CSV
            </Button>
          </div>
        }
      />

      {/* Event Info */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Nama Event</p>
              <p className="font-bold text-base mt-0.5">{event?.event_name || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Lokasi</p>
              <p className="font-bold text-base mt-0.5">{event?.location || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Tanggal Event</p>
              <p className="font-bold text-base mt-0.5">
                {event?.event_date ? format(new Date(event.event_date), "dd MMMM yyyy") : format(new Date(), "dd MMMM yyyy")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <span className="text-sm font-medium text-muted-foreground">Filter:</span>
            <Select value={filterService} onValueChange={setFilterService}>
              <SelectTrigger className="h-8 text-xs w-44"><SelectValue placeholder="Semua Layanan" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Layanan</SelectItem>
                {services.map(s => <SelectItem key={s.id} value={s.id}>[{s.service_code}] {s.service_name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterSlot} onValueChange={setFilterSlot}>
              <SelectTrigger className="h-8 text-xs w-36"><SelectValue placeholder="Tipe Slot" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Slot</SelectItem>
                <SelectItem value="FREE">Gratis (FREE)</SelectItem>
                <SelectItem value="PAID">Berbayar (PAID)</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="h-8 text-xs w-44"><SelectValue placeholder="Status Peserta" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="REGISTERED">Terdaftar</SelectItem>
                <SelectItem value="PARTIALLY_COMPLETED">Sebagian Selesai</SelectItem>
                <SelectItem value="COMPLETED">Selesai</SelectItem>
                <SelectItem value="CANCELLED">Dibatalkan</SelectItem>
              </SelectContent>
            </Select>
            {(filterService !== "all" || filterSlot !== "all" || filterStatus !== "all") && (
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => { setFilterService("all"); setFilterSlot("all"); setFilterStatus("all"); }}>
                Reset Filter
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <StatBox label="Total Peserta (Filter)" value={stats.totalFiltered} colorClass="bg-primary/10 text-primary"><Users className="w-5 h-5" /></StatBox>
        <StatBox label="Selesai Lengkap" value={stats.completed} colorClass="bg-green-100 text-green-600"><CheckCircle2 className="w-5 h-5" /></StatBox>
        <StatBox label="Sebagian Selesai" value={stats.partial} colorClass="bg-amber-100 text-amber-600"><Clock className="w-5 h-5" /></StatBox>
        <StatBox label="Masih Terdaftar" value={stats.registered} colorClass="bg-blue-100 text-blue-600"><Users className="w-5 h-5" /></StatBox>
        <StatBox label="Antrian Dilewati" value={stats.skipped} colorClass="bg-orange-100 text-orange-600"><SkipForward className="w-5 h-5" /></StatBox>
        <StatBox label="Antrian Dibatalkan" value={stats.cancelled} colorClass="bg-red-100 text-red-600"><XCircle className="w-5 h-5" /></StatBox>
        <StatBox label="Slot Gratis Terpakai" value={stats.freeUsed} colorClass="bg-green-100 text-green-600"><FileText className="w-5 h-5" /></StatBox>
        <StatBox label="Slot Bayar Terpakai" value={stats.paidUsed} colorClass="bg-orange-100 text-orange-600"><FileText className="w-5 h-5" /></StatBox>
      </div>

      {/* Completion Rate + Timing */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="sm:col-span-1">
          <CardContent className="p-5 flex flex-col items-center justify-center text-center">
            <TrendingUp className="w-8 h-8 text-primary mb-2" />
            <p className="text-5xl font-black text-primary">{stats.completionRate}%</p>
            <p className="text-sm text-muted-foreground mt-1">Tingkat Penyelesaian</p>
            <p className="text-xs text-muted-foreground">({stats.completed} dari {stats.totalFiltered} peserta)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 text-center">
            <Clock className="w-6 h-6 text-accent mx-auto mb-2" />
            <p className="text-4xl font-black text-accent">
              {stats.avgWaitMin !== null ? `${stats.avgWaitMin}` : "—"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">Rata-rata Waktu Tunggu</p>
            <p className="text-xs text-muted-foreground">menit</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 text-center">
            <CheckCircle2 className="w-6 h-6 text-success mx-auto mb-2" />
            <p className="text-4xl font-black text-success">
              {stats.avgServiceMin !== null ? `${stats.avgServiceMin}` : "—"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">Rata-rata Waktu Layanan</p>
            <p className="text-xs text-muted-foreground">menit</p>
          </CardContent>
        </Card>
      </div>

      {/* Per Service Breakdown */}
      {stats.serviceBreakdown.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Rincian Per Layanan</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-y border-border">
                  <tr>
                    {["Kode", "Nama Layanan", "Terlayani", "Total Antrian", "Slot Gratis", "Slot Berbayar", "Selesai (%)"].map((h, i) => (
                      <th key={i} className="text-left text-xs font-semibold text-muted-foreground py-2.5 px-4">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stats.serviceBreakdown.map(({ svc, done, total, freeQ, paidQ }) => {
                    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                    const isEye = svc.service_group === "EYE_CHECK";
                    return (
                      <tr key={svc.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                        <td className="py-3 px-4">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold
                            ${isEye ? "bg-accent/10 text-accent" : "bg-primary/10 text-primary"}`}>
                            {svc.service_code}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-medium">{svc.service_name}</p>
                          <p className="text-xs text-muted-foreground">Booth {svc.booth_number}</p>
                        </td>
                        <td className="py-3 px-4 font-bold text-green-600">{done}</td>
                        <td className="py-3 px-4">{total}</td>
                        <td className="py-3 px-4 text-green-700">{freeQ}</td>
                        <td className="py-3 px-4 text-orange-600">{paidQ}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden min-w-[60px]">
                              <div className="h-full bg-green-500 rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs font-bold w-10">{pct}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}