import React, { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/client";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Printer, User, Phone, Building2,
  Hash, Clock, CheckCircle2, AlertCircle, SkipForward,
  XCircle, Stethoscope, Eye, CalendarDays, UserCheck, Barcode, ShieldCheck, ShieldX
} from "lucide-react";
import { format } from "date-fns";
import { printCoupon } from "@/lib/couponPrinter";
import { PARTICIPANT_STATUS_LABELS, PARTICIPANT_STATUS_COLORS, SLOT_TYPE_COLORS } from "@/lib/registrationUtils";
import QrScannerModal from "@/components/booth/QrScannerModal";
import { useToast } from "@/components/ui/use-toast";

const QUEUE_STATUS_CONFIG = {
  WAITING:   { label: "Menunggu",      color: "bg-blue-100 text-blue-700 border-blue-200",   icon: Clock },
  CALLED:    { label: "Dipanggil",     color: "bg-amber-100 text-amber-700 border-amber-200", icon: AlertCircle },
  SERVING:   { label: "Dilayani",      color: "bg-purple-100 text-purple-700 border-purple-200", icon: UserCheck },
  DONE:      { label: "Selesai",       color: "bg-green-100 text-green-700 border-green-200", icon: CheckCircle2 },
  SKIPPED:   { label: "Dilewati",      color: "bg-orange-100 text-orange-700 border-orange-200", icon: SkipForward },
  CANCELLED: { label: "Dibatalkan",    color: "bg-red-100 text-red-700 border-red-200",       icon: XCircle },
};

function QueueStatusBadge({ status }) {
  const cfg = QUEUE_STATUS_CONFIG[status] || { label: status, color: "bg-gray-100 text-gray-700", icon: Clock };
  const Icon = cfg.icon;
  return (
    <Badge className={`text-xs font-medium border gap-1 ${cfg.color}`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </Badge>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-border last:border-0">
      <Icon className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground mt-0.5 break-words">{value || "—"}</p>
      </div>
    </div>
  );
}

export default function ParticipantDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const participantId = urlParams.get("id");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanningFor, setScanningFor] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  const { data: participant, isLoading: loadingP } = useQuery({
    queryKey: ["participant", participantId],
    queryFn: () => base44.entities.Participant.get(participantId),
    enabled: !!participantId,
  });

  const { data: allQueues = [] } = useQuery({
    queryKey: ["participant-queues", participantId],
    queryFn: () => base44.entities.Queue.filter({ participant_id: participantId }),
    enabled: !!participantId,
  });

  const { data: services = [] } = useQuery({
    queryKey: ["services"],
    queryFn: () => base44.entities.Service.list(),
  });

  const { data: eventSettings = [] } = useQuery({
    queryKey: ["eventSettings"],
    queryFn: () => base44.entities.EventSetting.list(),
  });

  const cancelMutation = useMutation({
    mutationFn: () => base44.entities.Participant.update(participantId, { participant_status: "CANCELLED" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["participant", participantId] }),
  });

  const updateQueueVerification = useMutation({
    mutationFn: async ({ queueId, status }) => {
      const now = new Date().toISOString();
      await base44.entities.Queue.update(queueId, {
        qr_verification_status: status,
        qr_verified_at: status === "VERIFIED" ? now : undefined,
        qr_verified_by: status === "VERIFIED" ? currentUser?.email : undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["participant-queues", participantId] });
    },
  });

  React.useEffect(() => {
    base44.auth.me().then(u => setCurrentUser(u)).catch(() => {});
  }, []);

  const handleQrScan = async (token) => {
    setScannerOpen(false);
    if (!scanningFor || !token) return;

    try {
      const allQueues = await base44.entities.Queue.list();
      const matchedQueue = allQueues.find(q => q.qr_token === token);

      if (!matchedQueue) {
        toast({ title: "QR Tidak Valid", description: "Token tidak ditemukan.", variant: "destructive" });
        return;
      }

      if (matchedQueue.id !== scanningFor) {
        toast({ title: "QR Salah", description: "QR code ini bukan untuk antrian ini.", variant: "destructive" });
        return;
      }

      updateQueueVerification.mutate({ queueId: scanningFor, status: "VERIFIED" });
      toast({ title: "✓ Terverifikasi", description: "Status pemeriksaan sudah diperbarui." });
    } catch (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setScanningFor(null);
    }
  };

  if (!participantId) {
    navigate("/participants");
    return null;
  }

  if (loadingP) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!participant) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Peserta tidak ditemukan.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/participants")}>
          Kembali
        </Button>
      </div>
    );
  }

  const serviceMap = Object.fromEntries(services.map(s => [s.id, s]));
  const medicalService = serviceMap[participant.medical_service_id];
  const eyeService = serviceMap[participant.eye_service_id];
  const medicalQueue = allQueues.find(q => q.service_id === participant.medical_service_id);
  const eyeQueue = allQueues.find(q => q.service_id === participant.eye_service_id);
  const eventSetting = eventSettings[0];

  const handleReprint = () => {
    if (!medicalQueue || !eyeQueue || !medicalService || !eyeService) return;
    printCoupon({ participant, medicalQueue, eyeQueue, medicalService, eyeService, eventSetting });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/participants")} className="flex-shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold truncate">{participant.full_name}</h1>
          <p className="text-sm text-muted-foreground font-mono">{participant.registration_number}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Badge className={`text-xs border ${PARTICIPANT_STATUS_COLORS[participant.participant_status]}`}>
            {PARTICIPANT_STATUS_LABELS[participant.participant_status]}
          </Badge>
          <Button size="sm" variant="outline" onClick={handleReprint} className="gap-1.5">
            <Printer className="w-4 h-4" />
            Cetak Ulang
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <User className="w-4 h-4 text-primary" />
              Profil Peserta
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <InfoRow icon={User} label="Nama Lengkap" value={participant.full_name} />
            <InfoRow icon={Phone} label="Nomor Telepon" value={participant.phone_number} />
            <InfoRow icon={Building2} label="Unit / Divisi" value={participant.unit_division} />
            <InfoRow icon={Hash} label="No. Registrasi" value={participant.registration_number} />
            <InfoRow
              icon={CalendarDays}
              label="Waktu Registrasi"
              value={participant.registered_at
                ? format(new Date(participant.registered_at), "dd MMMM yyyy, HH:mm")
                : participant.created_date
                ? format(new Date(participant.created_date), "dd MMMM yyyy, HH:mm")
                : "—"}
            />
            <InfoRow icon={UserCheck} label="Didaftarkan oleh" value={participant.registered_by || "—"} />
          </CardContent>
        </Card>

        {/* Payment */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              Status Pembayaran
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            <div className="p-3 rounded-lg bg-muted/40">
              <p className="text-xs text-muted-foreground mb-1">Catatan Pembayaran</p>
              <p className="text-sm font-medium">
                {participant.payment_status === "VERIFIED_OUTSIDE_SYSTEM" && "Terverifikasi (Luar Sistem)"}
                {participant.payment_status === "PENDING_MANUAL_CONFIRMATION" && "Menunggu Konfirmasi Manual"}
                {participant.payment_status === "NOT_REQUIRED" && "Tidak Diperlukan"}
              </p>
            </div>

            <div className="p-3 rounded-lg bg-muted/40">
              <p className="text-xs text-muted-foreground mb-1">Status Peserta</p>
              <Badge className={`text-xs border ${PARTICIPANT_STATUS_COLORS[participant.participant_status]}`}>
                {PARTICIPANT_STATUS_LABELS[participant.participant_status]}
              </Badge>
            </div>

            {participant.participant_status !== "CANCELLED" && (
              <Button
                variant="destructive"
                size="sm"
                className="w-full"
                onClick={() => { if (window.confirm("Batalkan registrasi peserta ini?")) cancelMutation.mutate(); }}
              >
                <XCircle className="w-4 h-4 mr-2" />
                Batalkan Registrasi
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Queue Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Medical Queue */}
          <Card className="border-primary/20">
            <div className="h-1 bg-primary rounded-t-lg" />
            <CardHeader className="pb-3 pt-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-primary" />
                Antrian Layanan Medis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-center py-3">
                <div className="text-5xl font-black text-primary tracking-widest">
                  {medicalQueue?.queue_number || "—"}
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Layanan</span>
                  <span className="font-medium">{medicalService?.service_name || "—"}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Booth</span>
                  <span className="font-medium">Booth {medicalService?.booth_number || "—"}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Slot</span>
                  <Badge className={`text-xs border ${SLOT_TYPE_COLORS[participant.medical_slot_type]}`}>
                    {participant.medical_slot_type === "FREE" ? "Gratis" : "Berbayar"}
                  </Badge>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Status</span>
                  {medicalQueue ? <QueueStatusBadge status={medicalQueue.status} /> : <span className="text-muted-foreground">—</span>}
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Verifikasi</span>
                  <div className="flex items-center gap-1">
                    {medicalQueue?.qr_verification_status === "VERIFIED" ? (
                      <Badge className="text-xs border bg-green-100 text-green-700 border-green-200 gap-1">
                        <ShieldCheck className="w-3 h-3" /> Terverifikasi
                      </Badge>
                    ) : (
                      <Badge className="text-xs border bg-slate-100 text-slate-600 border-slate-200 gap-1">
                        <ShieldX className="w-3 h-3" /> Belum Verifikasi
                      </Badge>
                    )}
                  </div>
                </div>
                {medicalQueue?.called_at && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Dipanggil</span>
                    <span className="text-xs">{format(new Date(medicalQueue.called_at), "HH:mm")}</span>
                  </div>
                )}
                {medicalQueue?.done_at && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Selesai</span>
                    <span className="text-xs">{format(new Date(medicalQueue.done_at), "HH:mm")}</span>
                  </div>
                )}
              </div>
              {medicalQueue && (
                <Button
                  className="w-full gap-2 bg-blue-600 hover:bg-blue-700 mt-2"
                  onClick={() => { setScanningFor(medicalQueue.id); setScannerOpen(true); }}
                  disabled={updateQueueVerification.isPending}
                >
                  <Barcode className="w-4 h-4" />
                  Scan Verifikasi
                </Button>
              )}
            </CardContent>
          </Card>

        {/* Eye Queue */}
        <Card className="border-accent/30">
          <div className="h-1 bg-accent rounded-t-lg" />
          <CardHeader className="pb-3 pt-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <Eye className="w-4 h-4 text-accent" />
              Antrian Pemeriksaan Mata
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-center py-3">
              <div className="text-5xl font-black text-accent tracking-widest">
                {eyeQueue?.queue_number || "—"}
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Layanan</span>
                <span className="font-medium">{eyeService?.service_name || "—"}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Booth</span>
                <span className="font-medium">Booth {eyeService?.booth_number || "—"}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Slot</span>
                <Badge className={`text-xs border ${SLOT_TYPE_COLORS[participant.eye_slot_type]}`}>
                  {participant.eye_slot_type === "FREE" ? "Gratis" : "Berbayar"}
                </Badge>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Status</span>
                {eyeQueue ? <QueueStatusBadge status={eyeQueue.status} /> : <span className="text-muted-foreground">—</span>}
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Verifikasi</span>
                <div className="flex items-center gap-1">
                  {eyeQueue?.qr_verification_status === "VERIFIED" ? (
                    <Badge className="text-xs border bg-green-100 text-green-700 border-green-200 gap-1">
                      <ShieldCheck className="w-3 h-3" /> Terverifikasi
                    </Badge>
                  ) : (
                    <Badge className="text-xs border bg-slate-100 text-slate-600 border-slate-200 gap-1">
                      <ShieldX className="w-3 h-3" /> Belum Verifikasi
                    </Badge>
                  )}
                </div>
              </div>
              {eyeQueue?.called_at && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Dipanggil</span>
                  <span className="text-xs">{format(new Date(eyeQueue.called_at), "HH:mm")}</span>
                </div>
              )}
              {eyeQueue?.done_at && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Selesai</span>
                  <span className="text-xs">{format(new Date(eyeQueue.done_at), "HH:mm")}</span>
                </div>
              )}
            </div>
            {eyeQueue && (
              <Button
                className="w-full gap-2 bg-blue-600 hover:bg-blue-700 mt-2"
                onClick={() => { setScanningFor(eyeQueue.id); setScannerOpen(true); }}
                disabled={updateQueueVerification.isPending}
              >
                <Barcode className="w-4 h-4" />
                Scan Verifikasi
              </Button>
            )}
          </CardContent>
        </Card>
        </div>

        {/* QR Scanner Modal */}
        <QrScannerModal
        open={scannerOpen}
        onClose={() => { setScannerOpen(false); setScanningFor(null); }}
        onScan={handleQrScan}
        />
        </div>
        );
        }