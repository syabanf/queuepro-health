import React, { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import {
  Monitor, PhoneCall, PlayCircle, CheckCircle2,
  SkipForward, XCircle, RotateCcw, Clock, Stethoscope, Eye, User, QrCode, Barcode,
  ShieldCheck, ShieldX, Shield
} from "lucide-react";
import QrScannerModal from "@/components/booth/QrScannerModal";
import QrVerificationCard from "@/components/booth/QrVerificationCard";

const QUEUE_STATUS_CONFIG = {
  WAITING:     { label: "Menunggu",       color: "bg-slate-100 text-slate-600 border-slate-200" },
  CALLED:      { label: "Dipanggil",      color: "bg-amber-100 text-amber-700 border-amber-200" },
  QR_VERIFIED: { label: "QR Terverifikasi", color: "bg-blue-100 text-blue-700 border-blue-200" },
  SERVING:     { label: "Dilayani",       color: "bg-purple-100 text-purple-700 border-purple-200" },
  DONE:        { label: "Selesai",        color: "bg-green-100 text-green-700 border-green-200" },
  SKIPPED:     { label: "Dilewati",       color: "bg-orange-100 text-orange-700 border-orange-200" },
  CANCELLED:   { label: "Batal",         color: "bg-red-100 text-red-700 border-red-200" },
};

const QR_BADGE_CONFIG = {
  NOT_SCANNED: { label: "Belum Di-scan", color: "bg-slate-100 text-slate-500 border-slate-200", icon: Shield },
  VERIFIED:    { label: "QR Terverifikasi", color: "bg-green-100 text-green-700 border-green-200", icon: ShieldCheck },
  INVALID:     { label: "QR Tidak Valid", color: "bg-red-100 text-red-700 border-red-200", icon: ShieldX },
  WRONG_SERVICE: { label: "Booth Salah", color: "bg-orange-100 text-orange-700 border-orange-200", icon: ShieldX },
  ALREADY_COMPLETED: { label: "Sudah Selesai", color: "bg-purple-100 text-purple-700 border-purple-200", icon: ShieldX },
  CANCELLED:   { label: "Dibatalkan", color: "bg-red-100 text-red-700 border-red-200", icon: ShieldX },
};

async function logQueueEvent({ queue_id, event_type, previous_status, new_status, performed_by, notes }) {
  await base44.entities.QueueEvent.create({
    queue_id, event_type, previous_status, new_status,
    performed_by: performed_by || "",
    notes: notes || "",
    created_at: new Date().toISOString(),
  });
}

export default function NakesBooth() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const prevActiveRef = useRef(null);
  const [flashActive, setFlashActive] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);

  useEffect(() => {
    const getUser = async () => {
      // Check for mock user first
      const mockUserStr = sessionStorage.getItem("mockUser");
      if (mockUserStr) {
        try {
          setCurrentUser(JSON.parse(mockUserStr));
          return;
        } catch (e) {
          console.error("Failed to parse mock user:", e);
        }
      }
      // Fall back to real auth
      try {
        const u = await base44.auth.me();
        setCurrentUser(u);
      } catch (e) {
        console.error("Auth error:", e);
      }
    };
    getUser();
  }, []);

  const { data: services = [] } = useQuery({
    queryKey: ["services"],
    queryFn: () => base44.entities.Service.list(),
  });

  const { data: participants = [] } = useQuery({
    queryKey: ["participants"],
    queryFn: () => base44.entities.Participant.list(),
  });

  const selectedService = services.find(s => s.id === selectedServiceId);

  const { data: queues = [], isLoading } = useQuery({
    queryKey: ["booth-queues", selectedServiceId],
    queryFn: () => base44.entities.Queue.filter({ service_id: selectedServiceId }),
    enabled: !!selectedServiceId,
    refetchInterval: 5000,
  });

  // Real-time subscription
  useEffect(() => {
    if (!selectedServiceId) return;
    const unsub = base44.entities.Queue.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ["booth-queues", selectedServiceId] });
    });
    return unsub;
  }, [selectedServiceId, queryClient]);

  const sorted = [...queues].sort((a, b) => (a.queue_sequence || 0) - (b.queue_sequence || 0));
  const waiting     = sorted.filter(q => q.status === "WAITING");
  const called      = sorted.find(q => q.status === "CALLED");
  const qrVerified  = sorted.find(q => q.status === "QR_VERIFIED");
  const serving     = sorted.find(q => q.status === "SERVING");
  const skipped     = sorted.filter(q => q.status === "SKIPPED");
  const done        = sorted.filter(q => q.status === "DONE");
  const nextWaiting = waiting[0];
  // Active queue priority: serving > qrVerified > called
  const activeQueue = serving || qrVerified || called;

  // Flash animation on active queue change
  useEffect(() => {
    const current = activeQueue?.queue_number;
    if (current && current !== prevActiveRef.current) {
      prevActiveRef.current = current;
      setFlashActive(true);
      setTimeout(() => setFlashActive(false), 800);
    }
  }, [activeQueue?.queue_number]);

  // Clear verification result when active queue changes
  useEffect(() => {
    setVerificationResult(null);
  }, [activeQueue?.id]);

  const getParticipant = (participantId) =>
    participants.find(p => p.id === participantId);

  const updateQueue = useMutation({
    mutationFn: async ({ queue, newStatus, eventType, notes, extraFields }) => {
      const now = new Date().toISOString();
      const timeField = {
        CALLED: "called_at", QR_VERIFIED: null, SERVING: "serving_at",
        DONE: "done_at", SKIPPED: "skipped_at", CANCELLED: "cancelled_at"
      }[newStatus];
      const update = { status: newStatus, ...extraFields };
      if (timeField) update[timeField] = now;
      
      try {
        await base44.entities.Queue.update(queue.id, update);
      } catch (e) {
        // If mock auth fails, silently continue with logging
        console.warn("Queue update failed, continuing with logging:", e);
      }
      
      try {
        await logQueueEvent({
          queue_id: queue.id,
          event_type: eventType,
          previous_status: queue.status,
          new_status: newStatus,
          performed_by: currentUser?.email || "mock-user",
          notes,
        });
      } catch (e) {
        console.warn("Event logging failed:", e);
      }
      
      if (newStatus === "DONE") {
        try {
          const allQueues = await base44.entities.Queue.filter({ participant_id: queue.participant_id });
          const updated = allQueues.map(q => q.id === queue.id ? { ...q, status: "DONE" } : q);
          const allDone = updated.every(q => q.status === "DONE" || q.status === "CANCELLED");
          const anyDone = updated.some(q => q.status === "DONE");
          const newParticipantStatus = allDone ? "COMPLETED" : anyDone ? "PARTIALLY_COMPLETED" : "REGISTERED";
          await base44.entities.Participant.update(queue.participant_id, { participant_status: newParticipantStatus });
        } catch (e) {
          console.warn("Participant status update failed:", e);
        }
      }
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["booth-queues", selectedServiceId] });
      queryClient.invalidateQueries({ queryKey: ["queues"] });
      queryClient.invalidateQueries({ queryKey: ["participants"] });
      if (vars.newStatus === "DONE") {
        setVerificationResult(null);
      }
      toast({ title: "Berhasil", description: "Status antrian diperbarui" });
    },
  });

  const handleAction = (queue, newStatus, eventType, notes, extraFields) => {
    if (!queue) return;
    updateQueue.mutate({ queue, newStatus, eventType, notes, extraFields });
  };

  // QR Scan verification logic
  const handleQrScan = useCallback(async (token) => {
    setScannerOpen(false);
    if (!selectedServiceId || !selectedService) return;

    // Search all queues for this token (not just current service)
    let allQueues = [];
    try {
      allQueues = await base44.entities.Queue.list();
    } catch {
      allQueues = [];
    }

    const matchedQueue = allQueues.find(q => q.qr_token === token);

    if (!matchedQueue) {
      const result = {
        status: "INVALID",
        message: "QR code tidak valid. Token tidak ditemukan dalam sistem.",
      };
      setVerificationResult(result);
      await logQueueEvent({
        queue_id: "unknown",
        event_type: "QR_INVALID",
        previous_status: "-",
        new_status: "-",
        performed_by: currentUser?.email,
        notes: `Token: ${token}`,
      });
      toast({ title: "QR Tidak Valid", description: "Token tidak ditemukan.", variant: "destructive" });
      return;
    }

    const participant = participants.find(p => p.id === matchedQueue.participant_id);
    const queueService = services.find(s => s.id === matchedQueue.service_id);

    // Wrong service check
    if (matchedQueue.service_id !== selectedServiceId) {
      const result = {
        status: "WRONG_SERVICE",
        message: `QR valid, tetapi peserta ini terdaftar di booth lain (${queueService?.service_name || "layanan lain"} — Booth ${queueService?.booth_number || "?"}).`,
        queue: matchedQueue,
        participant,
        service: queueService,
      };
      setVerificationResult(result);
      await logQueueEvent({
        queue_id: matchedQueue.id,
        event_type: "WRONG_SERVICE_QR",
        previous_status: matchedQueue.status,
        new_status: matchedQueue.status,
        performed_by: currentUser?.email,
        notes: `Scanned at service ${selectedServiceId}, belongs to ${matchedQueue.service_id}`,
      });
      toast({ title: "Booth Salah", description: "Peserta ini bukan untuk booth ini.", variant: "destructive" });
      return;
    }

    // Already completed
    if (matchedQueue.status === "DONE") {
      const result = {
        status: "ALREADY_COMPLETED",
        message: "Antrian ini sudah selesai dilayani.",
        queue: matchedQueue,
        participant,
        service: queueService,
      };
      setVerificationResult(result);
      toast({ title: "Sudah Selesai", description: "Antrian ini sudah selesai dilayani.", variant: "destructive" });
      return;
    }

    // Cancelled
    if (matchedQueue.status === "CANCELLED") {
      const result = {
        status: "CANCELLED",
        message: "Antrian ini sudah dibatalkan.",
        queue: matchedQueue,
        participant,
        service: queueService,
      };
      setVerificationResult(result);
      toast({ title: "Dibatalkan", description: "Antrian ini sudah dibatalkan.", variant: "destructive" });
      return;
    }

    // Not called yet
    if (matchedQueue.status === "WAITING") {
      const result = {
        status: "INVALID",
        message: `Antrian ${matchedQueue.queue_number} belum dipanggil. Silakan tunggu giliran Anda.`,
        queue: matchedQueue,
        participant,
        service: queueService,
      };
      setVerificationResult(result);
      toast({ title: "Belum Dipanggil", description: `Nomor ${matchedQueue.queue_number} masih dalam antrian.`, variant: "destructive" });
      return;
    }

    // Already verified or serving
    if (matchedQueue.status === "QR_VERIFIED" || matchedQueue.status === "SERVING") {
      const result = {
        status: "VERIFIED",
        message: "Peserta sudah terverifikasi. Layanan dapat dilanjutkan.",
        queue: matchedQueue,
        participant,
        service: queueService,
      };
      setVerificationResult(result);
      toast({ title: "Sudah Terverifikasi", description: "Peserta ini sudah terverifikasi sebelumnya." });
      return;
    }

    // Valid — status is CALLED
    const now = new Date().toISOString();
    try {
      await base44.entities.Queue.update(matchedQueue.id, {
        status: "QR_VERIFIED",
        qr_verification_status: "VERIFIED",
        qr_verified_at: now,
        qr_verified_by: currentUser?.email || "mock-user",
      });
    } catch (e) {
      console.warn("QR update failed, continuing:", e);
    }
    
    try {
      await logQueueEvent({
        queue_id: matchedQueue.id,
        event_type: "QR_VERIFIED",
        previous_status: matchedQueue.status,
        new_status: "QR_VERIFIED",
        performed_by: currentUser?.email || "mock-user",
        notes: "QR code verified successfully",
      });
    } catch (e) {
      console.warn("Event logging failed:", e);
    }

    const verifiedQueue = { ...matchedQueue, status: "QR_VERIFIED", qr_verification_status: "VERIFIED" };
    const result = {
      status: "VERIFIED",
      message: "QR terverifikasi. Identitas peserta valid. Layanan dapat dimulai.",
      queue: verifiedQueue,
      participant,
      service: queueService,
    };
    setVerificationResult(result);
    queryClient.invalidateQueries({ queryKey: ["booth-queues", selectedServiceId] });
    toast({ title: "✓ QR Terverifikasi", description: "Peserta dapat dilayani." });
  }, [selectedServiceId, selectedService, participants, services, currentUser, queryClient, toast]);

  const qrBadgeCfg = (queue) => {
    if (!queue) return null;
    return QR_BADGE_CONFIG[queue.qr_verification_status || "NOT_SCANNED"];
  };

  const isQrVerified = (queue) =>
    queue?.qr_verification_status === "VERIFIED" ||
    queue?.status === "QR_VERIFIED" ||
    queue?.status === "SERVING" ||
    queue?.status === "DONE";

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
            <Monitor className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Panel Booth Nakes</h1>
            <p className="text-sm text-muted-foreground">Operasional layanan kesehatan</p>
          </div>
        </div>
        <div className="sm:ml-auto w-full sm:w-72">
          <Select value={selectedServiceId} onValueChange={(v) => { setSelectedServiceId(v); setVerificationResult(null); }}>
            <SelectTrigger>
              <SelectValue placeholder="Pilih booth layanan..." />
            </SelectTrigger>
            <SelectContent>
              {services.filter(s => s.is_active).map(s => (
                <SelectItem key={s.id} value={s.id}>
                  <div className="flex items-center gap-2">
                    {s.service_group === "MEDICAL"
                      ? <Stethoscope className="w-3.5 h-3.5 text-primary" />
                      : <Eye className="w-3.5 h-3.5 text-accent" />}
                    [{s.service_code}] {s.service_name} — Booth {s.booth_number}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!selectedServiceId ? (
        <Card className="border-dashed border-2">
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Monitor className="w-12 h-12 text-muted-foreground/30 mb-4" />
            <p className="text-lg font-medium text-muted-foreground">Pilih Booth Layanan</p>
            <p className="text-sm text-muted-foreground/70 mt-1">Pilih booth yang ditugaskan untuk memulai operasi antrian.</p>
          </div>
        </Card>
      ) : (
        <>
          {/* Service Info Bar */}
          <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl bg-primary text-primary-foreground">
            {selectedService?.service_group === "MEDICAL"
              ? <Stethoscope className="w-5 h-5 flex-shrink-0" />
              : <Eye className="w-5 h-5 flex-shrink-0" />}
            <div className="flex-1 min-w-0">
              <p className="font-bold text-lg leading-tight">{selectedService?.service_name}</p>
              <p className="text-primary-foreground/70 text-sm">Booth {selectedService?.booth_number} &bull; Kode: {selectedService?.service_code}</p>
            </div>
            <div className="flex gap-6 text-sm text-center">
              <div>
                <p className="font-bold text-2xl">{waiting.length}</p>
                <p className="text-primary-foreground/70 text-xs">Menunggu</p>
              </div>
              <div>
                <p className="font-bold text-2xl text-green-300">{done.length}</p>
                <p className="text-primary-foreground/70 text-xs">Selesai</p>
              </div>
              <div>
                <p className="font-bold text-2xl text-orange-300">{skipped.length}</p>
                <p className="text-primary-foreground/70 text-xs">Dilewati</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Now Serving */}
            <div className="lg:col-span-2 space-y-4">
              <Card className={`border-2 transition-all ${flashActive ? "border-primary shadow-lg shadow-primary/20" : "border-primary/20"}`}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                    Now Serving
                    {activeQueue && (() => {
                      const cfg = qrBadgeCfg(activeQueue);
                      if (!cfg) return null;
                      const Icon = cfg.icon;
                      return (
                        <Badge className={`text-xs px-2 py-0.5 border gap-1 ${cfg.color}`}>
                          <Icon className="w-3 h-3" />
                          {cfg.label}
                        </Badge>
                      );
                    })()}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {activeQueue ? (
                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className={`text-7xl font-black tracking-widest leading-none transition-all ${
                            flashActive ? "text-primary scale-105" : "text-primary"
                          }`}>
                            {activeQueue.queue_number}
                          </p>
                          {(() => {
                            const p = getParticipant(activeQueue.participant_id);
                            return p ? (
                              <div className="mt-2 flex items-center gap-2 text-sm">
                                <User className="w-4 h-4 text-muted-foreground" />
                                <span className="font-semibold">{p.full_name}</span>
                                <span className="text-muted-foreground">— {p.unit_division}</span>
                              </div>
                            ) : null;
                          })()}
                          <p className="text-sm text-muted-foreground mt-1">
                            Kategori: <span className={`font-semibold ${activeQueue.quota_category === "FULL_FREE" ? "text-green-600" : activeQueue.quota_category === "CC_RP_1" ? "text-blue-600" : "text-orange-600"}`}>
                              {activeQueue.quota_category === "FULL_FREE" ? "Tanpa Syarat" : activeQueue.quota_category === "CC_RP_1" ? "CC Rp 1" : "Berbayar"}
                            </span>
                          </p>
                        </div>
                        <Badge className={`text-sm px-4 py-2 border ${QUEUE_STATUS_CONFIG[activeQueue.status]?.color}`}>
                          {QUEUE_STATUS_CONFIG[activeQueue.status]?.label}
                        </Badge>
                      </div>

                      {/* QR Verification Result */}
                      {verificationResult && (
                        <QrVerificationCard result={verificationResult} />
                      )}

                      {/* Action Buttons - Simplified Flow */}
                                      <div className="space-y-2 pt-2 border-t border-border">
                                        {/* Scan Barcode Button */}
                                        <Button
                                          className="w-full gap-2 bg-blue-600 hover:bg-blue-700"
                                          onClick={() => setScannerOpen(true)}
                                          disabled={updateQueue.isPending}
                                        >
                                          <Barcode className="w-4 h-4" />
                                          Scan Barcode Verifikasi
                                        </Button>

                                        <div className="grid grid-cols-2 gap-2">
                                          {/* Primary: Next Action */}
                                          {activeQueue.status === "CALLED" && (
                                            <Button
                                              className="gap-1.5 bg-green-600 hover:bg-green-700"
                                              onClick={() => handleAction(activeQueue, "SERVING", "SERVICE_STARTED")}
                                              disabled={updateQueue.isPending}
                                            >
                                              <PlayCircle className="w-4 h-4" />
                                              Mulai Layanan
                                            </Button>
                                          )}

                           {activeQueue.status === "SERVING" && (
                             <Button
                               className="gap-1.5 col-span-2 bg-green-600 hover:bg-green-700"
                               onClick={() => {
                                 handleAction(activeQueue, "DONE", "SERVICE_DONE");
                                 // Auto-call next queue after 800ms
                                 setTimeout(() => {
                                   if (nextWaiting && !called && !qrVerified && !serving) {
                                     handleAction(nextWaiting, "CALLED", "CALLED");
                                   }
                                 }, 800);
                               }}
                               disabled={updateQueue.isPending}
                             >
                               <CheckCircle2 className="w-4 h-4" /> Selesai & Lanjut
                             </Button>
                           )}

                           {/* Secondary: Skip/Cancel */}
                           {(activeQueue.status === "CALLED" || activeQueue.status === "SERVING") && (
                             <Button 
                               variant="outline" 
                               className="gap-1.5 text-orange-600 border-orange-300 hover:bg-orange-50"
                               onClick={() => handleAction(activeQueue, "SKIPPED", "SKIPPED")}
                               disabled={updateQueue.isPending}>
                               <SkipForward className="w-4 h-4" /> Lewati
                             </Button>
                           )}

                           <Button 
                             variant="outline" 
                             className="gap-1.5 text-red-600 border-red-300 hover:bg-red-50"
                             onClick={() => handleAction(activeQueue, "CANCELLED", "CANCELLED")}
                             disabled={updateQueue.isPending}>
                             <XCircle className="w-4 h-4" /> Batalkan
                           </Button>
                        </div>
                      </div>


                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-5xl font-black text-muted-foreground/20">—</p>
                      <p className="text-sm text-muted-foreground mt-3">Belum ada antrian aktif</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Next Queue + Call */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Berikutnya</p>
                      <p className="text-3xl font-black text-foreground/60">
                        {nextWaiting ? nextWaiting.queue_number : "—"}
                      </p>
                      {nextWaiting && (() => {
                        const p = getParticipant(nextWaiting.participant_id);
                        return p ? (
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <User className="w-3 h-3" /> {p.full_name}
                          </p>
                        ) : null;
                      })()}
                      {nextWaiting && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {nextWaiting.quota_category === "FULL_FREE" ? "Tanpa Syarat" : nextWaiting.quota_category === "CC_RP_1" ? "CC Rp 1" : "Berbayar"}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button
                        size="lg"
                        disabled={!nextWaiting || !!called || !!qrVerified || !!serving || updateQueue.isPending}
                        onClick={() => {
                          if (nextWaiting) {
                            handleAction(nextWaiting, "CALLED", "CALLED", "");
                          }
                        }}
                        className="gap-2"
                      >
                        <PhoneCall className="w-5 h-5" /> Panggil Berikutnya
                      </Button>
                      {skipped.length > 0 && (
                        <Button variant="outline" size="sm" className="gap-2 text-orange-600 border-orange-300"
                          disabled={!!called || !!qrVerified || !!serving || updateQueue.isPending}
                          onClick={() => handleAction(skipped[0], "CALLED", "RECALLED")}>
                          <RotateCcw className="w-4 h-4" /> Panggil Ulang Dilewati ({skipped.length})
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right: Queue Lists */}
            <div className="space-y-4">
              {/* Waiting */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-500" />
                    Menunggu
                    <Badge variant="secondary" className="ml-auto">{waiting.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0 max-h-52 overflow-y-auto space-y-1">
                  {waiting.length === 0
                    ? <p className="text-xs text-muted-foreground text-center py-4">Kosong</p>
                    : waiting.map((q, i) => {
                        const p = getParticipant(q.participant_id);
                        return (
                          <div key={q.id} className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-sm ${i === 0 ? "bg-primary/5 border border-primary/20" : "bg-muted/40"}`}>
                            <span className="font-mono font-bold w-14 flex-shrink-0">{q.queue_number}</span>
                            <span className="text-xs text-muted-foreground truncate flex-1">{p?.full_name || "—"}</span>
                            <span className={`text-[10px] font-bold flex-shrink-0 ${q.quota_category === "FULL_FREE" ? "text-green-600" : q.quota_category === "CC_RP_1" ? "text-blue-600" : "text-orange-600"}`}>
                              {q.quota_category === "FULL_FREE" ? "TS" : q.quota_category === "CC_RP_1" ? "CC" : "BP"}
                            </span>
                          </div>
                        );
                      })
                  }
                </CardContent>
              </Card>

              {/* Skipped */}
              {skipped.length > 0 && (
                <Card className="border-orange-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <SkipForward className="w-4 h-4 text-orange-500" />
                      Dilewati
                      <Badge variant="secondary" className="ml-auto bg-orange-100 text-orange-700">{skipped.length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-0 max-h-36 overflow-y-auto space-y-1">
                    {skipped.map(q => {
                      const p = getParticipant(q.participant_id);
                      return (
                        <div key={q.id} className="flex items-center justify-between px-2 py-1.5 rounded-md bg-orange-50 text-sm gap-2">
                          <span className="font-mono font-bold text-orange-700 w-14 flex-shrink-0">{q.queue_number}</span>
                          <span className="text-xs text-muted-foreground truncate flex-1">{p?.full_name || "—"}</span>
                          <Button size="sm" variant="ghost" className="h-6 px-2 text-xs text-orange-600 flex-shrink-0"
                            disabled={!!called || !!qrVerified || !!serving || updateQueue.isPending}
                            onClick={() => handleAction(q, "CALLED", "RECALLED")}>
                            <RotateCcw className="w-3 h-3 mr-1" /> Panggil
                          </Button>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              )}

              {/* Done */}
              <Card className="border-green-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    Selesai
                    <Badge variant="secondary" className="ml-auto bg-green-100 text-green-700">{done.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0 max-h-48 overflow-y-auto space-y-1">
                  {done.length === 0
                    ? <p className="text-xs text-muted-foreground text-center py-4">Belum ada</p>
                    : done.slice(-10).reverse().map(q => (
                        <div key={q.id} className="flex items-center justify-between px-2 py-1.5 rounded-md bg-green-50 text-sm">
                          <span className="font-mono font-bold text-green-700">{q.queue_number}</span>
                          <div className="flex items-center gap-1.5">
                            {q.qr_verification_status === "VERIFIED" && (
                              <ShieldCheck className="w-3 h-3 text-green-500" title="QR Verified" />
                            )}
                            <span className={`text-[10px] font-bold ${q.quota_category === "FULL_FREE" ? "text-green-600" : q.quota_category === "CC_RP_1" ? "text-blue-600" : "text-orange-600"}`}>
                               {q.quota_category === "FULL_FREE" ? "Tanpa Syarat" : q.quota_category === "CC_RP_1" ? "CC Rp 1" : "Berbayar"}
                             </span>
                          </div>
                        </div>
                      ))
                  }
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}

      {/* QR Scanner Modal */}
      <QrScannerModal
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={handleQrScan}
      />
    </div>
  );
}