import React, { useEffect, useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/client";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Users, Search, Printer, Eye, Download,
  ChevronLeft, ChevronRight, RefreshCw, Filter, Trash2
} from "lucide-react";
import { format } from "date-fns";
import PageHeader from "@/components/layout/PageHeader";
import { printCoupon } from "@/lib/couponPrinter";
import { PARTICIPANT_STATUS_LABELS, PARTICIPANT_STATUS_COLORS, SLOT_TYPE_COLORS } from "@/lib/registrationUtils";

const PAGE_SIZE = 15;

const MOBILE_STATUS_LABELS = {
  REGISTERED: "Daftar",
  PARTIALLY_COMPLETED: "Sebagian",
  COMPLETED: "Selesai",
  CANCELLED: "Batal",
};

function StatusBadge({ status }) {
  return (
    <Badge className={`text-[10px] sm:text-xs font-medium border whitespace-nowrap ${PARTICIPANT_STATUS_COLORS[status] || "bg-gray-100 text-gray-700"}`}>
      <span className="sm:hidden">{MOBILE_STATUS_LABELS[status] || status}</span>
      <span className="hidden sm:inline">{PARTICIPANT_STATUS_LABELS[status] || status}</span>
    </Badge>
  );
}

function SlotBadge({ type }) {
  return (
    <Badge className={`text-xs border ${SLOT_TYPE_COLORS[type] || ""}`}>
      {type === "FREE" ? "Gratis" : type === "PAID" ? "Bayar" : "—"}
    </Badge>
  );
}

function CategoryBadge({ category }) {
  const colors = {
    "FREE_CHECK": "bg-green-50 text-green-700 border-green-200",
    "PAYMENT": "bg-blue-50 text-blue-700 border-blue-200"
  };
  const labels = {
    "FREE_CHECK": "FREE CHECK",
    "PAYMENT": "PAYMENT"
  };
  return (
    <Badge className={`text-xs border ${colors[category] || ""}`}>
      {labels[category] || "—"}
    </Badge>
  );
}

export default function Participants() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [filterMedical, setFilterMedical] = useState("all");
  const [filterEye, setFilterEye] = useState("all");
  const [filterSlot, setFilterSlot] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [page, setPage] = useState(1);

  const { data: participants = [], isLoading } = useQuery({
    queryKey: ["participants"],
    queryFn: () => base44.entities.Participant.list("-created_date"),
    refetchInterval: 5000,
  });

  const { data: queues = [] } = useQuery({
    queryKey: ["queues"],
    queryFn: () => base44.entities.Queue.list(),
    refetchInterval: 5000,
  });

  const { data: services = [] } = useQuery({
    queryKey: ["services"],
    queryFn: () => base44.entities.Service.list(),
  });

  const { data: eventSettings = [] } = useQuery({
    queryKey: ["eventSettings"],
    queryFn: () => base44.entities.EventSetting.list(),
  });

  // Real-time subscriptions
  useEffect(() => {
    const unsubP = base44.entities.Participant.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ["participants"] });
    });
    const unsubQ = base44.entities.Queue.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ["queues"] });
    });
    const unsubS = base44.entities.Service.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
    });
    return () => { unsubP(); unsubQ(); unsubS(); };
  }, [queryClient]);

  const serviceMap = useMemo(() => Object.fromEntries(services.map(s => [s.id, s])), [services]);
  const medicalServices = services.filter(s => s.service_group === "MEDICAL");
  const eyeServices = services.filter(s => s.service_group === "EYE_CHECK");
  const eventSetting = eventSettings[0];

  // Enrich participants with queue data
  const enriched = useMemo(() => {
    return participants.map(p => {
      const pQueues = queues.filter(q => q.participant_id === p.id);
      const medQueue = pQueues.find(q => serviceMap[q.service_id]?.service_group === "MEDICAL");
      const eyeQueue = pQueues.find(q => serviceMap[q.service_id]?.service_group === "EYE_CHECK");

      // Auto-compute status
      let computedStatus = p.participant_status;
      if (computedStatus !== "CANCELLED") {
        const medDone = medQueue?.status === "DONE";
        const eyeDone = eyeQueue?.status === "DONE";
        if (medDone && eyeDone) computedStatus = "COMPLETED";
        else if (medDone || eyeDone) computedStatus = "PARTIALLY_COMPLETED";
        else computedStatus = "REGISTERED";
      }

      return { ...p, medQueue, eyeQueue, computedStatus };
    });
  }, [participants, queues, serviceMap]);

  // Filter
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return enriched.filter(p => {
      const matchSearch = !q ||
        p.full_name?.toLowerCase().includes(q) ||
        p.phone_number?.includes(q) ||
        p.unit_division?.toLowerCase().includes(q) ||
        p.registration_number?.toLowerCase().includes(q) ||
        p.medQueue?.queue_number?.toLowerCase().includes(q) ||
        p.eyeQueue?.queue_number?.toLowerCase().includes(q);

      const matchMedical = filterMedical === "all" || p.medical_service_id === filterMedical;
      const matchEye = filterEye === "all" || p.eye_service_id === filterEye;
      const matchSlot = filterSlot === "all" ||
        p.medical_slot_type === filterSlot ||
        p.eye_slot_type === filterSlot;
      const matchStatus = filterStatus === "all" || p.computedStatus === filterStatus;

      return matchSearch && matchMedical && matchEye && matchSlot && matchStatus;
    });
  }, [enriched, search, filterMedical, filterEye, filterSlot, filterStatus]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const resetFilters = () => {
    setSearch(""); setFilterMedical("all"); setFilterEye("all");
    setFilterSlot("all"); setFilterStatus("all"); setPage(1);
  };

  const deleteMutation = useMutation({
    mutationFn: async (p) => {
      const pQueues = queues.filter(q => q.participant_id === p.id);
      await Promise.all(pQueues.map(q => base44.entities.Queue.delete(q.id)));
      await base44.entities.Participant.delete(p.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["participants"] });
      queryClient.invalidateQueries({ queryKey: ["queues"] });
      setDeleteTarget(null);
    },
  });

  const handleReprint = (p) => {
    const pQueues = queues.filter(q => q.participant_id === p.id);
    const queue = pQueues[0];
    const service = serviceMap[queue?.service_id || p.service_id];
    if (!queue || !service) return;
    printCoupon({ participant: p, queue, service, eventSetting });
  };

  const handleExportCSV = () => {
    const headers = [
      "No. Reg", "Nama", "No. Telp", "Unit/Divisi",
      "Antrian Medis", "Layanan Medis", "Slot Medis",
      "Antrian Mata", "Layanan Mata", "Slot Mata",
      "Kategori Peserta", "Status", "Waktu Daftar"
    ];
    const rows = filtered.map(p => [
      p.registration_number,
      p.full_name,
      p.phone_number,
      p.unit_division,
      p.medQueue?.queue_number || "",
      serviceMap[p.medical_service_id]?.service_name || "",
      p.medical_slot_type || "",
      p.eyeQueue?.queue_number || "",
      serviceMap[p.eye_service_id]?.service_name || "",
      p.eye_slot_type || "",
      p.participant_category === "FREE_CHECK" ? "FREE CHECK" : "PAYMENT",
      PARTICIPANT_STATUS_LABELS[p.computedStatus] || p.computedStatus,
      p.registered_at
        ? format(new Date(p.registered_at), "dd/MM/yyyy HH:mm")
        : p.created_date
        ? format(new Date(p.created_date), "dd/MM/yyyy HH:mm")
        : ""
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `peserta-brilian-talks-${format(new Date(), "yyyyMMdd-HHmm")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const hasActiveFilters = search || filterMedical !== "all" || filterEye !== "all" || filterSlot !== "all" || filterStatus !== "all";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Data Peserta"
        subtitle="Manajemen data seluruh peserta terdaftar"
        icon={Users}
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ["participants"] })} className="gap-1.5">
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-1.5">
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
          </div>
        }
      />

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span className="text-sm font-medium">Filter & Pencarian</span>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={resetFilters} className="ml-auto text-xs h-7 px-2">
                  Reset Filter
                </Button>
              )}
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama, no. telepon, no. registrasi, no. antrian, unit..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                className="pl-9"
              />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <Select value={filterMedical} onValueChange={v => { setFilterMedical(v); setPage(1); }}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Layanan Medis" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Layanan Medis</SelectItem>
                  {medicalServices.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.service_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterEye} onValueChange={v => { setFilterEye(v); setPage(1); }}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Layanan Mata" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Layanan Mata</SelectItem>
                  {eyeServices.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.service_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterSlot} onValueChange={v => { setFilterSlot(v); setPage(1); }}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Tipe Slot" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Tipe Slot</SelectItem>
                  <SelectItem value="FREE">Gratis (FREE)</SelectItem>
                  <SelectItem value="PAID">Berbayar (PAID)</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={v => { setFilterStatus(v); setPage(1); }}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  {Object.entries(PARTICIPANT_STATUS_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Daftar Peserta
            <Badge variant="secondary" className="ml-1 text-xs">
              {filtered.length} dari {participants.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-y border-border">
                <tr>
                  <th className="hidden sm:table-cell text-left text-xs font-semibold text-muted-foreground py-2.5 px-2 sm:px-3 whitespace-nowrap">No. Reg</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground py-2.5 px-2 sm:px-3 whitespace-nowrap">Nama</th>
                  <th className="hidden md:table-cell text-left text-xs font-semibold text-muted-foreground py-2.5 px-2 sm:px-3 whitespace-nowrap">No. Telp</th>
                  <th className="hidden lg:table-cell text-left text-xs font-semibold text-muted-foreground py-2.5 px-2 sm:px-3 whitespace-nowrap">Unit/Divisi</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground py-2.5 px-2 sm:px-3 whitespace-nowrap">Medis</th>
                  <th className="hidden xl:table-cell text-left text-xs font-semibold text-muted-foreground py-2.5 px-2 sm:px-3 whitespace-nowrap">Layanan Medis</th>
                  <th className="hidden lg:table-cell text-left text-xs font-semibold text-muted-foreground py-2.5 px-2 sm:px-3 whitespace-nowrap">Slot</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground py-2.5 px-2 sm:px-3 whitespace-nowrap">Mata</th>
                  <th className="hidden xl:table-cell text-left text-xs font-semibold text-muted-foreground py-2.5 px-2 sm:px-3 whitespace-nowrap">Layanan Mata</th>
                  <th className="hidden lg:table-cell text-left text-xs font-semibold text-muted-foreground py-2.5 px-2 sm:px-3 whitespace-nowrap">Slot</th>
                  <th className="hidden md:table-cell text-left text-xs font-semibold text-muted-foreground py-2.5 px-2 sm:px-3 whitespace-nowrap">Kategori</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground py-2.5 px-2 sm:px-3 whitespace-nowrap">Status</th>
                  <th className="hidden md:table-cell text-left text-xs font-semibold text-muted-foreground py-2.5 px-2 sm:px-3 whitespace-nowrap">Waktu Daftar</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground py-2.5 px-2 sm:px-3 whitespace-nowrap">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={14} className="text-center py-12">
                    <div className="flex justify-center">
                      <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                    </div>
                  </td></tr>
                ) : paged.length === 0 ? (
                  <tr><td colSpan={14} className="text-center py-12 text-sm text-muted-foreground">
                    {hasActiveFilters ? "Tidak ada peserta yang cocok dengan filter." : "Belum ada peserta terdaftar."}
                  </td></tr>
                ) : (
                  paged.map(p => (
                    <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="hidden sm:table-cell py-2.5 px-2 sm:px-3">
                        <span className="text-xs font-mono text-muted-foreground">{p.registration_number}</span>
                      </td>
                      <td className="py-2.5 px-2 sm:px-3 font-medium whitespace-nowrap">{p.full_name}</td>
                      <td className="hidden md:table-cell py-2.5 px-2 sm:px-3 text-muted-foreground whitespace-nowrap">{p.phone_number}</td>
                      <td className="hidden lg:table-cell py-2.5 px-2 sm:px-3 text-muted-foreground whitespace-nowrap max-w-[120px] truncate">{p.unit_division}</td>
                      <td className="py-2.5 px-2 sm:px-3">
                        <span className="font-mono font-bold text-primary text-xs sm:text-sm">{p.medQueue?.queue_number || "—"}</span>
                      </td>
                      <td className="hidden xl:table-cell py-2.5 px-2 sm:px-3 text-xs text-muted-foreground whitespace-nowrap">
                        {serviceMap[p.medical_service_id]?.service_name || "—"}
                      </td>
                      <td className="hidden lg:table-cell py-2.5 px-2 sm:px-3">
                        {p.medical_slot_type && <SlotBadge type={p.medical_slot_type} />}
                      </td>
                      <td className="py-2.5 px-2 sm:px-3">
                        <span className="font-mono font-bold text-accent text-xs sm:text-sm">{p.eyeQueue?.queue_number || "—"}</span>
                      </td>
                      <td className="hidden xl:table-cell py-2.5 px-2 sm:px-3 text-xs text-muted-foreground whitespace-nowrap">
                        {serviceMap[p.eye_service_id]?.service_name || "—"}
                      </td>
                      <td className="hidden lg:table-cell py-2.5 px-2 sm:px-3">
                        {p.eye_slot_type && <SlotBadge type={p.eye_slot_type} />}
                      </td>
                      <td className="hidden md:table-cell py-2.5 px-2 sm:px-3">
                        <CategoryBadge category={p.participant_category} />
                      </td>
                      <td className="py-2.5 px-2 sm:px-3">
                        <StatusBadge status={p.computedStatus} />
                      </td>
                      <td className="hidden md:table-cell py-2.5 px-2 sm:px-3 text-xs text-muted-foreground whitespace-nowrap">
                        {p.registered_at
                          ? format(new Date(p.registered_at), "dd/MM/yy HH:mm")
                          : p.created_date
                          ? format(new Date(p.created_date), "dd/MM/yy HH:mm")
                          : "—"}
                      </td>
                      <td className="py-2.5 px-2 sm:px-3">
                        <div className="flex items-center gap-0.5 sm:gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 sm:h-7 sm:w-7 text-muted-foreground hover:text-primary"
                            title="Lihat Detail"
                            onClick={() => navigate(`/participants/detail?id=${p.id}`)}
                          >
                            <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="hidden sm:flex h-7 w-7 text-muted-foreground hover:text-primary"
                            title="Cetak Ulang Kupon"
                            onClick={() => handleReprint(p)}
                          >
                            <Printer className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 sm:h-7 sm:w-7 text-muted-foreground hover:text-destructive"
                            title="Hapus Peserta"
                            onClick={() => setDeleteTarget(p)}
                          >
                            <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {filtered.length > PAGE_SIZE && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <span className="text-xs text-muted-foreground">
                {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} dari {filtered.length} peserta
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
      <AlertDialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Peserta?</AlertDialogTitle>
            <AlertDialogDescription>
              Peserta <strong>{deleteTarget?.full_name}</strong> ({deleteTarget?.registration_number}) beserta seluruh data antriannya akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate(deleteTarget)}
            >
              {deleteMutation.isPending ? "Menghapus..." : "Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}