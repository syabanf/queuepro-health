import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import {
  Monitor, PhoneCall, PlayCircle, CheckCircle2,
  SkipForward, XCircle, RotateCcw, Clock, Stethoscope, Eye, User, Barcode,
  ShieldCheck, ShieldX, Shield, MessageCircle
} from "lucide-react";
import QrScannerModal from "@/components/booth/QrScannerModal";
import QrVerificationCard from "@/components/booth/QrVerificationCard";

const QUEUE_STATUS_CONFIG = {
  WAITING:     { label: "Menunggu",         color: "bg-slate-100 text-slate-600 border-slate-200" },
  CALLED:      { label: "Dipanggil",        color: "bg-amber-100 text-amber-700 border-amber-200" },
  QR_VERIFIED: { label: "QR Terverifikasi", color: "bg-blue-100 text-blue-700 border-blue-200" },
  SERVING:     { label: "Dilayani",         color: "bg-purple-100 text-purple-700 border-purple-200" },
  DONE:        { label: "Selesai",          color: "bg-green-100 text-green-700 border-green-200" },
  SKIPPED:     { label: "Dilewati",         color: "bg-orange-100 text-orange-700 border-orange-200" },
  CANCELLED:   { label: "Batal",            color: "bg-red-100 text-red-700 border-red-200" },
};

const QR_BADGE_CONFIG = {
  NOT_SCANNED:        { label: "Belum Di-scan",     color: "bg-slate-100 text-slate-500 border-slate-200",   icon: Shield },
  VERIFIED:           { label: "QR Terverifikasi",  color: "bg-green-100 text-green-700 border-green-200",   icon: ShieldCheck },
  INVALID:            { label: "QR Tidak Valid",    color: "bg-red-100 text-red-700 border-red-200",         icon: ShieldX },
  WRONG_SERVICE:      { label: "Booth Salah",       color: "bg-orange-100 text-orange-700 border-orange-200",icon: ShieldX },
  ALREADY_COMPLETED:  { label: "Sudah Selesai",     color: "bg-purple-100 text-purple-700 border-purple-200",icon: ShieldX },
  CANCELLED:          { label: "Dibatalkan",         color: "bg-red-100 text-red-700 border-red-200",         icon: ShieldX },
};

const QUOTA_OPTIONS = [
  { value: "FREE",          label: "Free / Gratis",  color: "text-green-700",  limitField: "free_quota",    usedField: "used_free_quota"    },
  { value: "RP1_BRI",      label: "Rp 1 BRI",       color: "text-blue-700",   limitField: "rp1_quota",     usedField: "used_rp1_quota"     },
  { value: "SPECIAL_PRICE",label: "Special Price",   color: "text-purple-700", limitField: "special_quota", usedField: "used_special_quota" },
];



function quotaLabel(val) {
  return QUOTA_OPTIONS.find(o => o.value === val)?.label || val;
}
function quotaColor(val) {
  return QUOTA_OPTIONS.find(o => o.value === val)?.color || "text-muted-foreground";
}
function quotaShort(val) {
  const s = val || "FREE";
  if (s === "RP1_BRI") return { label: "RP1", cls: "text-blue-600" };
  if (s === "SPECIAL_PRICE") return { label: "SPL", cls: "text-purple-600" };
  return { label: "GRS", cls: "text-green-600" };
}
// Only SERVING and DONE count as a consumed quota slot
const OCCUPYING_STATUSES = new Set(["SERVING", "DONE"]);

// Count used slots from queue records (same logic as AdminDashboard ServiceQuotaCard)
// null quota_status treated as FREE (registration default)
function usedByType(queues, val) {
  return val === "FREE"
    ? queues.filter(q => OCCUPYING_STATUSES.has(q.status) && (!q.quota_status || q.quota_status === "FREE")).length
    : queues.filter(q => OCCUPYING_STATUSES.has(q.status) && q.quota_status === val).length;
}
function isQuotaFull(svc, val, queues) {
  const opt = QUOTA_OPTIONS.find(o => o.value === val);
  if (!opt) return false;
  const limit = svc[opt.limitField] || 0;
  if (limit === 0) return false;
  return usedByType(queues, val) >= limit;
}
function quotaRemaining(svc, val, queues) {
  const opt = QUOTA_OPTIONS.find(o => o.value === val);
  if (!opt) return null;
  const limit = svc[opt.limitField] || 0;
  if (limit === 0) return null;
  return Math.max(0, limit - usedByType(queues, val));
}

async function logQueueEvent({ queue_id, event_type, previous_status, new_status, performed_by, notes }) {
  await base44.entities.QueueEvent.create({
    queue_id, event_type, previous_status, new_status,
    performed_by: performed_by || "",
    notes: notes || "",
    created_at: new Date().toISOString(),
  });
}

// ── Single-service booth panel (used both standalone and in merged grid) ──────

function BoothPanel({ service, participants, services, currentUser, compact = false }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const prevActiveRef = useRef(null);
  const [flashActive, setFlashActive] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);

  const { data: queues = [] } = useQuery({
    queryKey: ["booth-queues", service.id],
    queryFn: () => base44.entities.Queue.filter({ service_id: service.id }),
    refetchInterval: 5000,
  });

  useEffect(() => {
    const unsub = base44.entities.Queue.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ["booth-queues", service.id] });
    });
    return unsub;
  }, [service.id, queryClient]);

  const sorted = [...queues].sort((a, b) => (a.queue_sequence || 0) - (b.queue_sequence || 0));
  const waiting    = sorted.filter(q => q.status === "WAITING");
  const called     = sorted.find(q => q.status === "CALLED");
  const qrVerified = sorted.find(q => q.status === "QR_VERIFIED");
  const serving    = sorted.find(q => q.status === "SERVING");
  const skipped    = sorted.filter(q => q.status === "SKIPPED");
  const done       = sorted.filter(q => q.status === "DONE");
  const nextWaiting = waiting[0];
  const activeQueue = serving || qrVerified || called;

  useEffect(() => {
    const current = activeQueue?.queue_number;
    if (current && current !== prevActiveRef.current) {
      prevActiveRef.current = current;
      setFlashActive(true);
      setTimeout(() => setFlashActive(false), 800);
    }
  }, [activeQueue?.queue_number]);

  useEffect(() => { setVerificationResult(null); }, [activeQueue?.id]);

  const updateQueue = useMutation({
    mutationFn: async ({ queue, newStatus, eventType, notes, extraFields }) => {
      const now = new Date().toISOString();
      const timeField = {
        CALLED: "called_at", SERVING: "serving_at",
        DONE: "done_at", SKIPPED: "skipped_at", CANCELLED: "cancelled_at",
      }[newStatus];
      const update = { status: newStatus, ...extraFields };
      if (timeField) update[timeField] = now;
      await base44.entities.Queue.update(queue.id, update).catch(e => console.warn(e));
      await logQueueEvent({
        queue_id: queue.id, event_type: eventType,
        previous_status: queue.status, new_status: newStatus,
        performed_by: currentUser?.email || "mock-user", notes,
      }).catch(e => console.warn(e));
      if (newStatus === "DONE") {
        const freshSvc = await base44.entities.Service.get(queue.service_id).catch(() => services.find(s => s.id === queue.service_id));
        if (freshSvc) {
          const qt = queue.quota_status || "FREE";
          const quotaIncrement =
            qt === "RP1_BRI"       ? { used_rp1_quota:     (freshSvc.used_rp1_quota     || 0) + 1 }
            : qt === "SPECIAL_PRICE" ? { used_special_quota: (freshSvc.used_special_quota || 0) + 1 }
            :                         { used_free_quota:    (freshSvc.used_free_quota    || 0) + 1 };
          await base44.entities.Service.update(freshSvc.id, quotaIncrement).catch(e => console.warn(e));
        }
        await base44.entities.Participant.update(queue.participant_id, { participant_status: "COMPLETED" }).catch(e => console.warn(e));
        setVerificationResult(null);

        // Auto-call next: fetch fresh queue data to avoid stale closure
        const freshQueues = await base44.entities.Queue.filter({ service_id: queue.service_id }).catch(() => []);
        const sortedFresh = [...freshQueues].sort((a, b) => (a.queue_sequence || 0) - (b.queue_sequence || 0));
        const hasActive = sortedFresh.some(q => ["CALLED", "QR_VERIFIED", "SERVING"].includes(q.status) && q.id !== queue.id);
        const nextUp = sortedFresh.find(q => q.status === "WAITING");
        if (!hasActive && nextUp) {
          await base44.entities.Queue.update(nextUp.id, { status: "CALLED", called_at: new Date().toISOString() }).catch(e => console.warn(e));
          await logQueueEvent({ queue_id: nextUp.id, event_type: "CALLED", previous_status: "WAITING", new_status: "CALLED", performed_by: currentUser?.email || "mock-user", notes: "Auto-called after previous completed" }).catch(e => console.warn(e));
          return { autoCalledNumber: nextUp.queue_number };
        }
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["booth-queues", service.id] });
      queryClient.invalidateQueries({ queryKey: ["queues"] });
      queryClient.invalidateQueries({ queryKey: ["participants"] });
      if (data?.autoCalledNumber) {
        toast({ title: "Selesai — Antrian Berikutnya Dipanggil", description: `Nomor ${data.autoCalledNumber} dipanggil otomatis` });
      } else {
        toast({ title: "Berhasil", description: "Status antrian diperbarui" });
      }
    },
  });

  const handleAction = (queue, newStatus, eventType, notes = "", extraFields = {}) => {
    if (!queue) return;
    updateQueue.mutate({ queue, newStatus, eventType, notes, extraFields });
  };

  const handleQrScan = useCallback(async (token) => {
    setScannerOpen(false);
    let allQueues = [];
    try { allQueues = await base44.entities.Queue.list(); } catch {}
    const matchedQueue = allQueues.find(q => q.qr_token === token);

    if (!matchedQueue) {
      setVerificationResult({ status: "INVALID", message: "QR code tidak valid. Token tidak ditemukan dalam sistem." });
      toast({ title: "QR Tidak Valid", description: "Token tidak ditemukan.", variant: "destructive" });
      return;
    }

    const participant = participants.find(p => p.id === matchedQueue.participant_id);
    const queueService = services.find(s => s.id === matchedQueue.service_id);

    if (matchedQueue.service_id !== service.id) {
      setVerificationResult({ status: "WRONG_SERVICE", message: `QR valid, tetapi peserta ini terdaftar di booth lain (${queueService?.service_name || "layanan lain"} — Booth ${queueService?.booth_number || "?"}).`, queue: matchedQueue, participant, service: queueService });
      toast({ title: "Booth Salah", description: "Peserta ini bukan untuk booth ini.", variant: "destructive" });
      return;
    }
    if (matchedQueue.status === "DONE") {
      setVerificationResult({ status: "ALREADY_COMPLETED", message: "Antrian ini sudah selesai dilayani.", queue: matchedQueue, participant, service: queueService });
      toast({ title: "Sudah Selesai", variant: "destructive" });
      return;
    }
    if (matchedQueue.status === "CANCELLED") {
      setVerificationResult({ status: "CANCELLED", message: "Antrian ini sudah dibatalkan.", queue: matchedQueue, participant, service: queueService });
      toast({ title: "Dibatalkan", variant: "destructive" });
      return;
    }
    if (matchedQueue.status === "WAITING") {
      setVerificationResult({ status: "INVALID", message: `Antrian ${matchedQueue.queue_number} belum dipanggil.`, queue: matchedQueue, participant, service: queueService });
      toast({ title: "Belum Dipanggil", variant: "destructive" });
      return;
    }
    if (matchedQueue.status === "QR_VERIFIED" || matchedQueue.status === "SERVING") {
      setVerificationResult({ status: "VERIFIED", message: "Peserta sudah terverifikasi.", queue: matchedQueue, participant, service: queueService });
      toast({ title: "Sudah Terverifikasi" });
      return;
    }

    const now = new Date().toISOString();
    await base44.entities.Queue.update(matchedQueue.id, { status: "QR_VERIFIED", qr_verification_status: "VERIFIED", qr_verified_at: now, qr_verified_by: currentUser?.email || "mock-user" }).catch(e => console.warn(e));
    await logQueueEvent({ queue_id: matchedQueue.id, event_type: "QR_VERIFIED", previous_status: matchedQueue.status, new_status: "QR_VERIFIED", performed_by: currentUser?.email || "mock-user", notes: "QR code verified successfully" }).catch(e => console.warn(e));

    const verifiedQueue = { ...matchedQueue, status: "QR_VERIFIED", qr_verification_status: "VERIFIED" };
    setVerificationResult({ status: "VERIFIED", message: "QR terverifikasi. Identitas peserta valid.", queue: verifiedQueue, participant, service: queueService });
    queryClient.invalidateQueries({ queryKey: ["booth-queues", service.id] });
    toast({ title: "✓ QR Terverifikasi", description: "Peserta dapat dilayani." });
  }, [service.id, participants, services, currentUser, queryClient, toast]);

  const getParticipant = (id) => participants.find(p => p.id === id);

  const sendWhatsApp = (queue) => {
    const p = getParticipant(queue.participant_id);
    if (!p?.phone_number) return;
    const raw = p.phone_number.replace(/\D/g, "");
    const phone = raw.startsWith("0") ? "62" + raw.slice(1) : raw.startsWith("62") ? raw : "62" + raw;
    const message =
      `Halo *${p.full_name}*,\n\n` +
      `📢 Nomor antrian Anda *${queue.queue_number}* sedang *DIPANGGIL*!\n\n` +
      `Silakan segera menuju:\n` +
      `🏥 *${service.service_name}*\n` +
      `📍 Booth ${service.booth_number}\n\n` +
      `Pantau antrian real-time:\nhttps://queuepro-health.vercel.app/mobile-monitor`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank");
  };

  const isMedical = service.service_group === "MEDICAL";
  const Icon = isMedical ? Stethoscope : Eye;
  const qrBadgeCfg = activeQueue ? QR_BADGE_CONFIG[activeQueue.qr_verification_status || "NOT_SCANNED"] : null;

  // ── Compact layout (used in merged grid) ────────────────────────────────────
  if (compact) {
    return (
      <>
        <Card className={`border-2 transition-all flex flex-col ${flashActive ? "border-primary shadow-lg shadow-primary/20" : "border-border"}`}>
          {/* Service header */}
          <div className={`flex items-center justify-between px-4 py-2.5 rounded-t-xl text-white ${isMedical ? "bg-primary" : "bg-[#005BAB]"}`}>
            <div className="flex items-center gap-2 min-w-0">
              <Icon className="w-4 h-4 flex-shrink-0" />
              <div className="min-w-0">
                <p className="font-bold text-sm leading-tight truncate">{service.service_name}</p>
                <p className="text-white/60 text-[11px]">Booth {service.booth_number} · Kode {service.service_code}</p>
              </div>
            </div>
            <div className="flex gap-3 text-center flex-shrink-0 ml-2">
              <div>
                <p className="font-bold text-lg leading-none">{waiting.length}</p>
                <p className="text-white/60 text-[10px]">Tunggu</p>
              </div>
              <div>
                <p className="font-bold text-lg leading-none text-green-300">{done.length}</p>
                <p className="text-white/60 text-[10px]">Selesai</p>
              </div>
              <div>
                <p className="font-bold text-lg leading-none text-orange-300">{skipped.length}</p>
                <p className="text-white/60 text-[10px]">Lewati</p>
              </div>
            </div>
          </div>

          <CardContent className="p-3 space-y-3 flex-1">
            {/* Nomor Antrian */}
            <div className={`p-3 rounded-lg border-2 transition-all ${flashActive ? "border-primary bg-primary/5" : "border-border"}`}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="px-2.5 py-0.5 rounded-full bg-primary text-white text-[10px] font-black uppercase tracking-widest">
                  NOMOR ANTRIAN
                </span>
                {qrBadgeCfg && activeQueue && (
                  <Badge className={`text-[10px] px-1.5 py-0.5 border gap-1 ${qrBadgeCfg.color}`}>
                    <qrBadgeCfg.icon className="w-2.5 h-2.5" />
                    {qrBadgeCfg.label}
                  </Badge>
                )}
              </div>

              {activeQueue ? (
                <>
                  <p className={`text-4xl font-black tracking-widest leading-none text-primary ${flashActive ? "scale-105" : ""} transition-all`}>
                    {activeQueue.queue_number}
                  </p>
                  {(() => {
                    const p = getParticipant(activeQueue.participant_id);
                    return p ? (
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1 truncate">
                        <User className="w-3 h-3 flex-shrink-0" /> {p.full_name}
                      </p>
                    ) : null;
                  })()}
                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    <Badge className={`text-[10px] border ${QUEUE_STATUS_CONFIG[activeQueue.status]?.color}`}>
                      {QUEUE_STATUS_CONFIG[activeQueue.status]?.label}
                    </Badge>
                    <span className={`text-[10px] font-semibold ${quotaColor(activeQueue.quota_status)}`}>
                      {quotaLabel(activeQueue.quota_status)}
                    </span>
                  </div>

                  {verificationResult && <div className="mt-2"><QrVerificationCard result={verificationResult} /></div>}

                  {/* Actions */}
                  <div className="mt-2.5 space-y-1.5 pt-2.5 border-t border-border">
                    {/* Quota category dropdown */}
                    <Select
                      value={activeQueue.quota_status || "FREE"}
                      onValueChange={async (val) => {
                        const paymentDisplay = val === "FREE" ? "FREE" : val === "RP1_BRI" ? "RP1 BRI" : "SPECIAL PRICE";
                        await base44.entities.Queue.update(activeQueue.id, {
                          quota_status: val,
                          payment_display_status: paymentDisplay,
                          quota_category: val === "FREE" ? "FULL_FREE" : "PAID",
                        });
                        queryClient.invalidateQueries({ queryKey: ["booth-queues", service.id] });
                        queryClient.invalidateQueries({ queryKey: ["queues"] });
                        queryClient.invalidateQueries({ queryKey: ["services"] });
                      }}
                      disabled={updateQueue.isPending}
                    >
                      <SelectTrigger className="h-7 text-xs w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {QUOTA_OPTIONS.filter(opt => (service[opt.limitField] || 0) > 0).map(opt => {
                          const full = isQuotaFull(service, opt.value, queues);
                          const rem = quotaRemaining(service, opt.value, queues);
                          return (
                            <SelectItem key={opt.value} value={opt.value} disabled={full && activeQueue.quota_status !== opt.value}>
                              <span className={opt.color}>{opt.label}</span>
                              {rem !== null && <span className="text-muted-foreground ml-1 text-[10px]">({full ? "Penuh" : `${rem} sisa`})</span>}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>

                    <Button
                      size="sm"
                      className="w-full gap-1.5 text-xs h-7 bg-blue-600 hover:bg-blue-700"
                      onClick={() => setScannerOpen(true)}
                      disabled={updateQueue.isPending}
                    >
                      <Barcode className="w-3.5 h-3.5" /> Scan Barcode
                    </Button>

                    {/* WhatsApp notify — shown when CALLED */}
                    {activeQueue.status === "CALLED" && getParticipant(activeQueue.participant_id)?.phone_number && (
                      <Button
                        size="sm"
                        className="w-full gap-1.5 text-xs h-7 bg-green-600 hover:bg-green-700"
                        onClick={() => sendWhatsApp(activeQueue)}
                      >
                        <MessageCircle className="w-3.5 h-3.5" /> Kirim WhatsApp
                      </Button>
                    )}

                    {(activeQueue.status === "CALLED" || activeQueue.status === "QR_VERIFIED") && (
                      <Button
                        size="sm"
                        className="w-full gap-1.5 text-xs h-7 bg-green-600 hover:bg-green-700"
                        onClick={() => handleAction(activeQueue, "SERVING", "SERVICE_STARTED")}
                        disabled={updateQueue.isPending}
                      >
                        <PlayCircle className="w-3.5 h-3.5" /> Mulai Layanan
                      </Button>
                    )}

                    {activeQueue.status === "SERVING" && (
                      <Button
                        size="sm"
                        className="w-full gap-1.5 text-xs h-7 bg-green-600 hover:bg-green-700"
                        onClick={() => handleAction(activeQueue, "DONE", "SERVICE_DONE")}
                        disabled={updateQueue.isPending}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Selesai
                      </Button>
                    )}

                    <div className="grid grid-cols-2 gap-1.5">
                      {(activeQueue.status === "CALLED" || activeQueue.status === "QR_VERIFIED" || activeQueue.status === "SERVING") && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1 text-[11px] h-7 text-orange-600 border-orange-300 hover:bg-orange-50"
                          onClick={() => handleAction(activeQueue, "SKIPPED", "SKIPPED")}
                          disabled={updateQueue.isPending}
                        >
                          <SkipForward className="w-3 h-3" /> Lewati
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1 text-[11px] h-7 text-red-600 border-red-300 hover:bg-red-50"
                        onClick={() => handleAction(activeQueue, "CANCELLED", "CANCELLED")}
                        disabled={updateQueue.isPending}
                      >
                        <XCircle className="w-3 h-3" /> Batalkan
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="py-4 text-center">
                  <p className="text-3xl font-black text-muted-foreground/20">—</p>
                  <p className="text-xs text-muted-foreground mt-1">Belum ada antrian aktif</p>
                </div>
              )}
            </div>

            {/* Next Queue */}
            <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-muted/40">
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Berikutnya</p>
                <p className="text-xl font-black text-foreground/60 leading-none">{nextWaiting ? nextWaiting.queue_number : "—"}</p>
                {nextWaiting && (() => {
                  const p = getParticipant(nextWaiting.participant_id);
                  return p ? <p className="text-[10px] text-muted-foreground truncate">{p.full_name}</p> : null;
                })()}
              </div>
              <Button
                size="sm"
                className="gap-1 text-xs flex-shrink-0 h-8"
                disabled={!nextWaiting || !!called || !!qrVerified || !!serving || updateQueue.isPending}
                onClick={() => nextWaiting && handleAction(nextWaiting, "CALLED", "CALLED")}
              >
                <PhoneCall className="w-3.5 h-3.5" /> Panggil
              </Button>
            </div>

            {/* Waiting list */}
            {waiting.length > 0 && (
              <div className="space-y-1 max-h-36 overflow-y-auto">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider px-1">Antrian ({waiting.length})</p>
                {waiting.map((q, i) => {
                  const p = getParticipant(q.participant_id);
                  return (
                    <div key={q.id} className={`flex items-center gap-2 px-2 py-1 rounded text-xs ${i === 0 ? "bg-primary/5 border border-primary/20" : "bg-muted/40"}`}>
                      <span className="font-mono font-bold w-12 flex-shrink-0">{q.queue_number}</span>
                      <span className="text-muted-foreground truncate flex-1">{p?.full_name || "—"}</span>
                      {(() => { const s = quotaShort(q.quota_status); return <span className={`text-[10px] font-bold flex-shrink-0 ${s.cls}`}>{s.label}</span>; })()}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Skipped */}
            {skipped.length > 0 && (
              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider px-1">Dilewati ({skipped.length})</p>
                {skipped.map(q => {
                  const p = getParticipant(q.participant_id);
                  return (
                    <div key={q.id} className="flex items-center gap-2 px-2 py-1 rounded bg-orange-50 text-xs">
                      <span className="font-mono font-bold text-orange-700 w-12 flex-shrink-0">{q.queue_number}</span>
                      <span className="text-muted-foreground truncate flex-1">{p?.full_name || "—"}</span>
                      {p?.phone_number && (
                        <Button size="sm" variant="ghost" className="h-5 px-1.5 text-[10px] text-green-600 flex-shrink-0"
                          onClick={() => sendWhatsApp(q)}>
                          <MessageCircle className="w-2.5 h-2.5" />
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" className="h-5 px-1.5 text-[10px] text-orange-600 flex-shrink-0"
                        disabled={!!called || !!qrVerified || !!serving || updateQueue.isPending}
                        onClick={() => handleAction(q, "CALLED", "RECALLED")}>
                        <RotateCcw className="w-2.5 h-2.5 mr-0.5" /> Panggil
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Done */}
            {done.length > 0 && (
              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider px-1">Selesai ({done.length})</p>
                <div className="max-h-24 overflow-y-auto space-y-1">
                  {done.slice(-6).reverse().map(q => (
                    <div key={q.id} className="flex items-center justify-between px-2 py-1 rounded bg-green-50 text-xs">
                      <span className="font-mono font-bold text-green-700">{q.queue_number}</span>
                      <span className={`text-[10px] font-bold ${quotaColor(q.quota_status)}`}>{quotaLabel(q.quota_status)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <QrScannerModal open={scannerOpen} onClose={() => setScannerOpen(false)} onScan={handleQrScan} />
      </>
    );
  }

  // ── Full layout (standalone single-service view) ────────────────────────────
  return (
    <>
      {/* Service Info Bar */}
      <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl bg-primary text-primary-foreground">
        {isMedical ? <Stethoscope className="w-5 h-5 flex-shrink-0" /> : <Eye className="w-5 h-5 flex-shrink-0" />}
        <div className="flex-1 min-w-0">
          <p className="font-bold text-lg leading-tight">{service.service_name}</p>
          <p className="text-primary-foreground/70 text-sm">Booth {service.booth_number} · Kode: {service.service_code}</p>
        </div>
        <div className="flex gap-6 text-sm text-center">
          <div><p className="font-bold text-2xl">{waiting.length}</p><p className="text-primary-foreground/70 text-xs">Menunggu</p></div>
          <div><p className="font-bold text-2xl text-green-300">{done.length}</p><p className="text-primary-foreground/70 text-xs">Selesai</p></div>
          <div><p className="font-bold text-2xl text-orange-300">{skipped.length}</p><p className="text-primary-foreground/70 text-xs">Dilewati</p></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Nomor Antrian */}
        <div className="lg:col-span-2 space-y-4">
          <Card className={`border-2 transition-all ${flashActive ? "border-primary shadow-lg shadow-primary/20" : "border-primary/20"}`}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-full bg-primary text-white text-xs font-black uppercase tracking-widest">
                  NOMOR ANTRIAN
                </span>
                {activeQueue && qrBadgeCfg && (
                  <Badge className={`text-xs px-2 py-0.5 border gap-1 ${qrBadgeCfg.color}`}>
                    <qrBadgeCfg.icon className="w-3 h-3" />
                    {qrBadgeCfg.label}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activeQueue ? (
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className={`text-7xl font-black tracking-widest leading-none transition-all text-primary ${flashActive ? "scale-105" : ""}`}>
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
                        Kuota: <span className={`font-semibold ${quotaColor(activeQueue.quota_status)}`}>
                          {quotaLabel(activeQueue.quota_status)}
                        </span>
                      </p>
                    </div>
                    <Badge className={`text-sm px-4 py-2 border ${QUEUE_STATUS_CONFIG[activeQueue.status]?.color}`}>
                      {QUEUE_STATUS_CONFIG[activeQueue.status]?.label}
                    </Badge>
                  </div>

                  {verificationResult && <QrVerificationCard result={verificationResult} />}

                  <div className="space-y-2 pt-2 border-t border-border">
                    {/* Quota category dropdown (full layout) */}
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Kategori Kuota</p>
                      <Select
                        value={activeQueue.quota_status || "FREE"}
                        onValueChange={async (val) => {
                          const paymentDisplay = val === "FREE" ? "FREE" : val === "RP1_BRI" ? "RP1 BRI" : "SPECIAL PRICE";
                          await base44.entities.Queue.update(activeQueue.id, {
                            quota_status: val,
                            payment_display_status: paymentDisplay,
                            quota_category: val === "FREE" ? "FULL_FREE" : "PAID",
                          });
                          queryClient.invalidateQueries({ queryKey: ["booth-queues", service.id] });
                          queryClient.invalidateQueries({ queryKey: ["queues"] });
                          queryClient.invalidateQueries({ queryKey: ["services"] });
                        }}
                        disabled={updateQueue.isPending}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {QUOTA_OPTIONS.filter(opt => (service[opt.limitField] || 0) > 0).map(opt => {
                            const full = isQuotaFull(service, opt.value, queues);
                            const rem = quotaRemaining(service, opt.value, queues);
                            return (
                              <SelectItem key={opt.value} value={opt.value} disabled={full && activeQueue.quota_status !== opt.value}>
                                <span className={opt.color}>{opt.label}</span>
                                {rem !== null && <span className="text-muted-foreground ml-1 text-xs">({full ? "Penuh" : `${rem} sisa`})</span>}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>

                    <Button className="w-full gap-2 bg-blue-600 hover:bg-blue-700" onClick={() => setScannerOpen(true)} disabled={updateQueue.isPending}>
                      <Barcode className="w-4 h-4" /> Scan Barcode Verifikasi
                    </Button>

                    {/* WhatsApp notify — shown when CALLED */}
                    {activeQueue.status === "CALLED" && getParticipant(activeQueue.participant_id)?.phone_number && (
                      <Button className="w-full gap-2 bg-green-600 hover:bg-green-700" onClick={() => sendWhatsApp(activeQueue)}>
                        <MessageCircle className="w-4 h-4" /> Kirim Notifikasi WhatsApp
                      </Button>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      {(activeQueue.status === "CALLED" || activeQueue.status === "QR_VERIFIED") && (
                        <Button className="gap-1.5 bg-green-600 hover:bg-green-700" onClick={() => handleAction(activeQueue, "SERVING", "SERVICE_STARTED")} disabled={updateQueue.isPending}>
                          <PlayCircle className="w-4 h-4" /> Mulai Layanan
                        </Button>
                      )}
                      {activeQueue.status === "SERVING" && (
                        <Button className="gap-1.5 col-span-2 bg-green-600 hover:bg-green-700"
                          onClick={() => handleAction(activeQueue, "DONE", "SERVICE_DONE")}
                          disabled={updateQueue.isPending}>
                          <CheckCircle2 className="w-4 h-4" /> Selesai
                        </Button>
                      )}
                      {(activeQueue.status === "CALLED" || activeQueue.status === "QR_VERIFIED" || activeQueue.status === "SERVING") && (
                        <Button variant="outline" className="gap-1.5 text-orange-600 border-orange-300 hover:bg-orange-50"
                          onClick={() => handleAction(activeQueue, "SKIPPED", "SKIPPED")} disabled={updateQueue.isPending}>
                          <SkipForward className="w-4 h-4" /> Lewati
                        </Button>
                      )}
                      <Button variant="outline" className="gap-1.5 text-red-600 border-red-300 hover:bg-red-50"
                        onClick={() => handleAction(activeQueue, "CANCELLED", "CANCELLED")} disabled={updateQueue.isPending}>
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

          {/* Next Queue */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Berikutnya</p>
                  <p className="text-3xl font-black text-foreground/60">{nextWaiting ? nextWaiting.queue_number : "—"}</p>
                  {nextWaiting && (() => {
                    const p = getParticipant(nextWaiting.participant_id);
                    return p ? <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><User className="w-3 h-3" /> {p.full_name}</p> : null;
                  })()}
                  {nextWaiting && (
                    <p className="text-xs mt-0.5"><span className={`text-xs font-semibold ${quotaColor(nextWaiting.quota_status)}`}>{quotaLabel(nextWaiting.quota_status)}</span></p>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <Button size="lg" disabled={!nextWaiting || !!called || !!qrVerified || !!serving || updateQueue.isPending}
                    onClick={() => nextWaiting && handleAction(nextWaiting, "CALLED", "CALLED")} className="gap-2">
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
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-500" />Menunggu
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
                        {(() => { const s = quotaShort(q.quota_status); return <span className={`text-[10px] font-bold flex-shrink-0 ${s.cls}`}>{s.label}</span>; })()}
                      </div>
                    );
                  })
              }
            </CardContent>
          </Card>

          {skipped.length > 0 && (
            <Card className="border-orange-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <SkipForward className="w-4 h-4 text-orange-500" />Dilewati
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
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {p?.phone_number && (
                          <Button size="sm" variant="ghost" className="h-6 px-2 text-xs text-green-600 flex-shrink-0"
                            title="Kirim WhatsApp"
                            onClick={() => sendWhatsApp(q)}>
                            <MessageCircle className="w-3 h-3" />
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" className="h-6 px-2 text-xs text-orange-600 flex-shrink-0"
                          disabled={!!called || !!qrVerified || !!serving || updateQueue.isPending}
                          onClick={() => handleAction(q, "CALLED", "RECALLED")}>
                          <RotateCcw className="w-3 h-3 mr-1" /> Panggil
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          <Card className="border-green-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />Selesai
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
                        {q.qr_verification_status === "VERIFIED" && <ShieldCheck className="w-3 h-3 text-green-500" />}
                        <span className={`text-[10px] font-bold ${quotaColor(q.quota_status)}`}>{quotaLabel(q.quota_status)}</span>
                      </div>
                    </div>
                  ))
              }
            </CardContent>
          </Card>
        </div>
      </div>

      <QrScannerModal open={scannerOpen} onClose={() => setScannerOpen(false)} onScan={handleQrScan} />
    </>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function NakesBooth() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const getUser = async () => {
      const mockUserStr = sessionStorage.getItem("mockUser");
      if (mockUserStr) {
        try { setCurrentUser(JSON.parse(mockUserStr)); return; } catch {}
      }
      try { setCurrentUser(await base44.auth.me()); } catch {}
    };
    getUser();
  }, []);

  const { data: services = [] } = useQuery({
    queryKey: ["services"],
    queryFn: () => base44.entities.Service.list(),
    refetchInterval: 5000,
  });

  // Keep service quota fields (used_*_quota) in sync via realtime subscription
  useEffect(() => {
    const unsub = base44.entities.Service.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
    });
    return () => unsub();
  }, [queryClient]);

  const { data: participants = [] } = useQuery({
    queryKey: ["participants"],
    queryFn: () => base44.entities.Participant.list(),
    refetchInterval: 5000,
  });

  const isMergedMedical = selectedServiceId === "merged-medical";
  const isMergedEye     = selectedServiceId === "merged-eye";
  const isMerged        = isMergedMedical || isMergedEye;

  const selectedService = isMerged ? null : services.find(s => s.id === selectedServiceId);

  const mergedServices = useMemo(() => {
    if (isMergedMedical) return services.filter(s => s.service_group === "MEDICAL" && s.is_active);
    if (isMergedEye)     return services.filter(s => s.service_group === "EYE_CHECK" && s.is_active);
    return [];
  }, [isMergedMedical, isMergedEye, services]);

  const sharedProps = { participants, services, currentUser };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
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
        <div className="sm:ml-auto w-full sm:w-80">
          <Select value={selectedServiceId} onValueChange={setSelectedServiceId}>
            <SelectTrigger>
              <SelectValue placeholder="Pilih booth layanan..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="merged-medical">
                <div className="flex items-center gap-2 font-semibold">
                  <Stethoscope className="w-3.5 h-3.5 text-primary" />
                  Primaya Hospital — Semua Medis (A+B+C)
                </div>
              </SelectItem>
              <SelectItem value="merged-eye">
                <div className="flex items-center gap-2 font-semibold">
                  <Eye className="w-3.5 h-3.5 text-accent" />
                  Optik Melawai — Semua Mata (D+E)
                </div>
              </SelectItem>
              {services.filter(s => s.is_active).map(s => (
                <SelectItem key={s.id} value={s.id}>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    {s.service_group === "MEDICAL" ? <Stethoscope className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
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
      ) : isMerged ? (
        /* Merged view: grid of individual booth panels */
        <div className={`grid gap-4 items-start ${isMergedMedical ? "grid-cols-1 md:grid-cols-3" : "grid-cols-1 md:grid-cols-2"}`}>
          {mergedServices.map(service => (
            <BoothPanel key={service.id} service={service} compact {...sharedProps} />
          ))}
        </div>
      ) : selectedService ? (
        /* Single service view: full layout */
        <BoothPanel service={selectedService} {...sharedProps} />
      ) : null}
    </div>
  );
}
