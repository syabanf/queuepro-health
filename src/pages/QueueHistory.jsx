import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Clock, Search, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import PageHeader from "@/components/layout/PageHeader";

const EVENT_TYPE_CONFIG = {
  CALLED:     { label: "Dipanggil",    color: "bg-amber-100 text-amber-700 border-amber-200" },
  RECALLED:   { label: "Dipanggil Ulang", color: "bg-orange-100 text-orange-700 border-orange-200" },
  SERVING:    { label: "Dilayani",     color: "bg-purple-100 text-purple-700 border-purple-200" },
  DONE:       { label: "Selesai",      color: "bg-green-100 text-green-700 border-green-200" },
  SKIPPED:    { label: "Dilewati",     color: "bg-orange-100 text-orange-700 border-orange-200" },
  CANCELLED:  { label: "Dibatalkan",   color: "bg-red-100 text-red-700 border-red-200" },
  REGISTERED: { label: "Terdaftar",   color: "bg-blue-100 text-blue-700 border-blue-200" },
};

const STATUS_COLORS = {
  WAITING:   "bg-slate-100 text-slate-600 border-slate-200",
  CALLED:    "bg-amber-100 text-amber-700 border-amber-200",
  SERVING:   "bg-purple-100 text-purple-700 border-purple-200",
  DONE:      "bg-green-100 text-green-700 border-green-200",
  SKIPPED:   "bg-orange-100 text-orange-700 border-orange-200",
  CANCELLED: "bg-red-100 text-red-700 border-red-200",
};

const PAGE_SIZE = 20;

export default function QueueHistory() {
  const [search, setSearch] = useState("");
  const [filterService, setFilterService] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterSlot, setFilterSlot] = useState("all");
  const [page, setPage] = useState(1);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["queue-events"],
    queryFn: () => base44.entities.QueueEvent.list("-created_at"),
    refetchInterval: 10000,
  });

  const { data: queues = [] } = useQuery({
    queryKey: ["queues"],
    queryFn: () => base44.entities.Queue.list(),
  });

  const { data: participants = [] } = useQuery({
    queryKey: ["participants"],
    queryFn: () => base44.entities.Participant.list(),
  });

  const { data: services = [] } = useQuery({
    queryKey: ["services"],
    queryFn: () => base44.entities.Service.list(),
  });

  const queueMap = useMemo(() => Object.fromEntries(queues.map(q => [q.id, q])), [queues]);
  const participantMap = useMemo(() => Object.fromEntries(participants.map(p => [p.id, p])), [participants]);
  const serviceMap = useMemo(() => Object.fromEntries(services.map(s => [s.id, s])), [services]);

  const enriched = useMemo(() => {
    return events.map(ev => {
      const queue = queueMap[ev.queue_id];
      const participant = queue ? participantMap[queue.participant_id] : null;
      const service = queue ? serviceMap[queue.service_id] : null;
      return { ...ev, queue, participant, service };
    });
  }, [events, queueMap, participantMap, serviceMap]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return enriched.filter(ev => {
      const matchSearch = !q ||
        ev.queue?.queue_number?.toLowerCase().includes(q) ||
        ev.participant?.full_name?.toLowerCase().includes(q) ||
        ev.participant?.registration_number?.toLowerCase().includes(q);
      const matchService = filterService === "all" || ev.service?.id === filterService;
      const matchStatus = filterStatus === "all" || ev.event_type === filterStatus;
      const matchSlot = filterSlot === "all" || ev.queue?.quota_status === filterSlot || (!ev.queue?.quota_status && filterSlot === "FREE");
      return matchSearch && matchService && matchStatus && matchSlot;
    });
  }, [enriched, search, filterService, filterStatus, filterSlot]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Riwayat Antrian"
        subtitle="Log seluruh aktivitas antrian layanan"
        icon={Clock}
      />

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filter Riwayat</span>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Cari nomor antrian, nama peserta..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                className="pl-9"
              />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              <Select value={filterService} onValueChange={v => { setFilterService(v); setPage(1); }}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Semua Layanan" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Layanan</SelectItem>
                  {services.map(s => <SelectItem key={s.id} value={s.id}>[{s.service_code}] {s.service_name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={v => { setFilterStatus(v); setPage(1); }}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Semua Event" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Event</SelectItem>
                  {Object.entries(EVENT_TYPE_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterSlot} onValueChange={v => { setFilterSlot(v); setPage(1); }}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Tipe Quota" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Tipe Quota</SelectItem>
                  <SelectItem value="FREE">Free</SelectItem>
                  <SelectItem value="RP1_BRI">Rp 1 BRI</SelectItem>
                  <SelectItem value="SPECIAL_PRICE">Special Price</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            Log Aktivitas Antrian
            <Badge variant="secondary" className="ml-1 text-xs">{filtered.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-y border-border">
                <tr>
                  {["Waktu", "No. Antrian", "Nama Peserta", "Layanan", "Slot", "Status Sebelum", "Status Baru", "Dilakukan Oleh", "Catatan"].map((h, i) => (
                    <th key={i} className="text-left text-xs font-semibold text-muted-foreground py-2.5 px-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={9} className="text-center py-12">
                    <div className="flex justify-center"><div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /></div>
                  </td></tr>
                ) : paged.length === 0 ? (
                  <tr><td colSpan={9} className="text-center py-12 text-sm text-muted-foreground">Tidak ada riwayat antrian ditemukan.</td></tr>
                ) : (
                  paged.map(ev => {
                    const cfg = EVENT_TYPE_CONFIG[ev.event_type] || { label: ev.event_type, color: "bg-gray-100 text-gray-600" };
                    return (
                      <tr key={ev.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="py-2.5 px-3 text-xs text-muted-foreground whitespace-nowrap">
                          {ev.created_at ? format(new Date(ev.created_at), "HH:mm:ss") : "—"}
                          <br /><span className="text-[10px]">{ev.created_at ? format(new Date(ev.created_at), "dd/MM") : ""}</span>
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-primary">{ev.queue?.queue_number || "—"}</td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <p className="font-medium text-sm">{ev.participant?.full_name || "—"}</p>
                          <p className="text-xs text-muted-foreground">{ev.participant?.unit_division || ""}</p>
                        </td>
                        <td className="py-2.5 px-3 text-xs whitespace-nowrap">
                          {ev.service ? `[${ev.service.service_code}] ${ev.service.service_name}` : "—"}
                        </td>
                        <td className="py-2.5 px-3">
                          {(() => {
                            const qs = ev.queue?.quota_status || (ev.queue ? "FREE" : null);
                            if (!qs) return null;
                            const cfg = {
                              FREE: { cls: "bg-green-100 text-green-700 border-green-200", label: "Free" },
                              RP1_BRI: { cls: "bg-blue-100 text-blue-700 border-blue-200", label: "Rp 1 BRI" },
                              SPECIAL_PRICE: { cls: "bg-purple-100 text-purple-700 border-purple-200", label: "Special Price" },
                            }[qs] || { cls: "bg-gray-100 text-gray-600 border-gray-200", label: qs };
                            return <Badge className={`text-xs border ${cfg.cls}`}>{cfg.label}</Badge>;
                          })()}
                        </td>
                        <td className="py-2.5 px-3">
                          {ev.previous_status && (
                            <Badge className={`text-xs border ${STATUS_COLORS[ev.previous_status] || "bg-gray-100 text-gray-600"}`}>
                              {ev.previous_status}
                            </Badge>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <Badge className={`text-xs border ${cfg.color}`}>{cfg.label}</Badge>
                        </td>
                        <td className="py-2.5 px-3 text-xs text-muted-foreground max-w-[120px] truncate">{ev.performed_by || "—"}</td>
                        <td className="py-2.5 px-3 text-xs text-muted-foreground max-w-[120px] truncate">{ev.notes || "—"}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          {filtered.length > PAGE_SIZE && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <span className="text-xs text-muted-foreground">
                {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} dari {filtered.length}
              </span>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-xs font-medium px-2">{page} / {totalPages}</span>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}