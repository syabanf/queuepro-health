import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
// Note: RadioGroup removed — using custom radio indicator to avoid Radix double-fire bug
import {
  UserPlus, Loader2, AlertCircle, Stethoscope, Eye, Activity, Syringe,
  CheckCircle2, ArrowLeft, Users, MessageCircle,
} from "lucide-react";
import { formatQueueNumber, getNextQueueSequence, generateRegistrationNumber } from "@/lib/registrationUtils";
import { generateQrToken, buildQrCodeUrl } from "@/lib/qrUtils";

const MEDICAL_ICONS = [Activity, Syringe, Stethoscope];

function getServiceVisual(service, idx = 0) {
  const isEye = service?.service_group === 'EYE_CHECK';
  const grads = isEye
    ? [['#004D8C', '#006BB3'], ['#003D79', '#005BAB']]
    : [['#003D79', '#005BAB'], ['#004D8C', '#0069C0'], ['#005BAB', '#0077CC']];
  return {
    grad: grads[idx % grads.length],
    Icon: isEye ? Eye : (MEDICAL_ICONS[idx % MEDICAL_ICONS.length]),
    label: (service?.service_code || '').toUpperCase(),
    provider: (service?.provider || (isEye ? 'OPTIK MELAWAI' : 'PRIMAYA HOSPITAL')).toUpperCase(),
  };
}

function ServiceOption({ service, selected, onSelect, getRemainingSlots, isServiceFull }) {
  const remaining = getRemainingSlots(service);
  const full = isServiceFull(service);

  return (
    <div
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 transition-all select-none
        ${full
          ? "opacity-50 cursor-not-allowed border-border bg-muted/20"
          : selected
          ? "border-primary bg-primary/5 shadow-sm cursor-pointer"
          : "border-border hover:border-primary/40 bg-card cursor-pointer"}`}
      onClick={() => { if (!full) onSelect(selected ? "" : service.id); }}
    >
      {/* Custom radio indicator — no Radix, no double-fire */}
      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all
        ${selected ? "border-primary bg-primary" : "border-muted-foreground/40 bg-white"}`}>
        {selected && <div className="w-2 h-2 rounded-full bg-white" />}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-sm font-bold ${full ? "text-muted-foreground" : "text-foreground"}`}>
            {service.service_name}
          </span>
          {full && <Badge variant="outline" className="text-[10px]">Penuh</Badge>}
        </div>
        <p className="text-xs text-muted-foreground">
          Booth {service.booth_number} &bull; Kode {service.service_code}
        </p>
      </div>

    </div>
  );
}

function QueueTicket({ queue, service, idx = 0 }) {
  const { grad: [c1, c2], Icon, label, provider } = getServiceVisual(service, idx);

  return (
    <Card className="overflow-hidden shadow-lg border-0">
      <div className="px-4 py-2.5 bg-white border-b">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{provider}</p>
        <p className="text-sm font-bold">{service?.service_name}</p>
      </div>
      <div className="px-4 pt-4 pb-5" style={{ background: `linear-gradient(160deg, ${c1} 0%, ${c2} 100%)` }}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-white font-black text-xs tracking-widest">BRI</span>
          <span className="text-white/70 text-[10px] font-bold tracking-wider">{provider}</span>
        </div>
        <div className="flex items-center justify-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-white/20 border border-white/30 flex flex-col items-center justify-center">
            <span className="text-white font-black text-xl leading-none">{service?.service_code}</span>
            <span className="text-white/50 text-[8px] uppercase tracking-wide">{label}</span>
          </div>
          <Icon className="w-7 h-7 text-white/40" strokeWidth={1.5} />
          <span className="text-white font-black tracking-widest" style={{ fontSize: '3.5rem', lineHeight: 1 }}>
            {queue.queue_number}
          </span>
        </div>
        <p className="text-center text-white/50 text-[9px] font-bold uppercase tracking-[0.2em] mt-4 pt-3 border-t border-white/15">
          SILAKAN MENUNGGU PANGGILAN DI LAYAR
        </p>
      </div>
      <div className="px-4 py-2 bg-white text-center">
        <p className="text-xs text-muted-foreground">
          Booth <span className="font-bold text-foreground">{service?.booth_number}</span>
        </p>
      </div>
    </Card>
  );
}

export default function PublicRegistration() {
  const [form, setForm] = useState({ full_name: "", phone_number: "", unit_division: "", service_id: "" });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const queryClient = useQueryClient();

  const { data: services = [], isLoading: loadingServices } = useQuery({
    queryKey: ["pub-services"],
    queryFn: () => base44.entities.Service.list(),
    refetchInterval: 30000,
  });

  const { data: participants = [] } = useQuery({
    queryKey: ["pub-participants"],
    queryFn: () => base44.entities.Participant.list(),
    refetchInterval: 30000,
  });

  const { data: eventSettings = [] } = useQuery({
    queryKey: ["pub-eventSettings"],
    queryFn: () => base44.entities.EventSetting.list(),
    refetchInterval: 60000,
  });

  useEffect(() => {
    const unsubServices = base44.entities.Service.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ["pub-services"] });
    });
    const unsubParticipants = base44.entities.Participant.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ["pub-participants"] });
    });
    const unsubEvent = base44.entities.EventSetting.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ["pub-eventSettings"] });
    });
    return () => { unsubServices(); unsubParticipants(); unsubEvent(); };
  }, [queryClient]);

  const event = eventSettings[0];
  const activeServices = services.filter(s => s.is_active && s.service_code && s.service_name);
  const medicalServices = activeServices.filter(s => s.service_group === "MEDICAL");
  const eyeServices = activeServices.filter(s => s.service_group === "EYE_CHECK");
  const selectedService = services.find(s => s.id === form.service_id);

  const getRemainingSlots = (s) =>
    Math.max(0, (s.free_quota    || 0) - (s.used_free_quota    || 0)) +
    Math.max(0, (s.rp1_quota     || 0) - (s.used_rp1_quota     || 0)) +
    Math.max(0, (s.special_quota || 0) - (s.used_special_quota || 0));
  const isServiceFull = (s) => getRemainingSlots(s) <= 0;

  const totalQuota = services.reduce((sum, s) => sum + (s.free_quota || 0) + (s.paid_quota || 0), 0)
    || event?.max_participants || 200;
  const fillPct = Math.min(100, Math.round((participants.length / totalQuota) * 100));
  const isEventBlocked = event?.event_status === "DRAFT" || event?.event_status === "CLOSED";

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Sync validation
    const errs = {};
    if (!form.full_name.trim()) errs.full_name = "Nama lengkap wajib diisi.";
    if (!form.phone_number.trim()) errs.phone_number = "Nomor telepon wajib diisi.";
    if (!form.unit_division.trim()) errs.unit_division = "Unit / Divisi wajib diisi.";
    if (!form.service_id) errs.service_id = "Pilih salah satu layanan.";
    if (event?.event_status === "DRAFT") errs.global = "Event belum dibuka.";
    if (event?.event_status === "CLOSED") errs.global = "Event sudah ditutup.";
    if (form.service_id && selectedService && isServiceFull(selectedService))
      errs.service_id = "Kuota layanan ini sudah penuh.";
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setErrors({});
    setSubmitting(true);

    try {
      // Phone + provider duplicate check
      const selectedGroup = selectedService?.service_group;
      const groupLabel = selectedGroup === "MEDICAL" ? "Primaya Hospital" : "Optik Melawai";

      const allParticipants = await base44.entities.Participant.list();
      const samePhone = allParticipants.filter(
        p => (p.phone_number || '').trim() === form.phone_number.trim()
      );

      if (samePhone.length > 0) {
        const allQueues = await base44.entities.Queue.list();
        for (const p of samePhone) {
          const activeQueues = allQueues.filter(
            q => q.participant_id === p.id && q.status !== "CANCELLED"
          );
          for (const q of activeQueues) {
            const qSvc = services.find(s => s.id === q.service_id);
            if (qSvc?.service_group === selectedGroup) {
              setErrors({
                phone_number: `Nomor ini sudah terdaftar untuk layanan ${groupLabel}. Setiap nomor hanya bisa mendaftar 1 kali per provider.`,
              });
              setSubmitting(false);
              return;
            }
          }
        }
      }

      // Create participant + queue
      const regNumber = generateRegistrationNumber(allParticipants.length + 1);
      const seq = await getNextQueueSequence(form.service_id);
      const queueNum = formatQueueNumber(selectedService.service_code, seq);
      const qrToken = generateQrToken();
      const qrCodeUrl = buildQrCodeUrl(qrToken, 120);

      const participant = await base44.entities.Participant.create({
        registration_number: regNumber,
        full_name: form.full_name.trim(),
        phone_number: form.phone_number.trim(),
        unit_division: form.unit_division.trim(),
        participant_category: "FREE_CHECK",
        service_id: form.service_id,
        payment_status: "NOT_REQUIRED",
        participant_status: "REGISTERED",
        registered_by: "self",
        registered_at: new Date().toISOString(),
      });

      const queue = await base44.entities.Queue.create({
        participant_id: participant.id,
        service_id: form.service_id,
        queue_number: queueNum,
        queue_sequence: seq,
        quota_category: "FULL_FREE",
        payment_display_status: "FREE",
        status: "WAITING",
        qr_token: qrToken,
        qr_code_url: qrCodeUrl,
        qr_verification_status: "NOT_SCANNED",
      });

      setResult({ participant, queue, service: selectedService });
      queryClient.invalidateQueries({ queryKey: ["pub-services"] });
      queryClient.invalidateQueries({ queryKey: ["pub-participants"] });
    } catch (err) {
      setErrors({ global: err.message || "Terjadi kesalahan. Silakan coba lagi." });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegisterAnother = () => {
    setResult(null);
    setForm({ full_name: "", phone_number: "", unit_division: "", service_id: "" });
    window.scrollTo(0, 0);
  };

  // ---- Success screen ----
  if (result) {
    const { participant, queue, service } = result;
    return (
      <div className="min-h-screen bg-muted/30 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-4">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-xl font-black text-foreground">Pendaftaran Berhasil!</h1>
            <p className="text-sm text-muted-foreground mt-1">Simpan nomor antrian Anda</p>
          </div>

          <Card>
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">Peserta</p>
              <p className="text-base font-bold">{participant.full_name}</p>
              <p className="text-xs font-mono text-muted-foreground">
                {participant.registration_number} &bull; {participant.unit_division}
              </p>
            </CardContent>
          </Card>

          <QueueTicket queue={queue} service={service} idx={0} />

          {/* WhatsApp button */}
          {participant.phone_number && (() => {
            const raw = participant.phone_number.replace(/\D/g, "");
            const phone = raw.startsWith("0") ? "62" + raw.slice(1) : raw.startsWith("62") ? raw : "62" + raw;
            const message =
              `Halo *${participant.full_name}*,\n\n` +
              `Pendaftaran Anda berhasil! 🎉\n\n` +
              `📋 No. Registrasi: *${participant.registration_number}*\n` +
              `🎟️ Nomor Antrian: *${queue.queue_number}*\n` +
              `🏥 Layanan: *${service?.service_name}* (Booth ${service?.booth_number})\n\n` +
              `Pantau status antrian real-time di:\n` +
              `https://queuepro-health.vercel.app/mobile-monitor`;
            return (
              <Button
                className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white"
                onClick={() => window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank")}
              >
                <MessageCircle className="w-4 h-4" /> Kirim via WhatsApp
              </Button>
            );
          })()}

          <Button className="w-full" variant="outline" onClick={handleRegisterAnother}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Daftarkan Peserta Lain
          </Button>
        </div>
      </div>
    );
  }

  // ---- Loading ----
  if (loadingServices) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Memuat data...</p>
        </div>
      </div>
    );
  }

  // ---- Registration form ----
  return (
    <div className="min-h-screen bg-muted/30">
      <div className="px-4 py-3" style={{ background: '#003D79' }}>
        <div className="max-w-lg mx-auto flex items-center justify-between gap-3">
          <div className="bg-white rounded-xl px-2.5 py-1.5 flex items-center justify-center flex-shrink-0 flex-1">
            <img src="/logo-danantara.png" alt="Danantara Indonesia" className="h-8 object-contain"
              onError={e => e.target.style.display='none'} />
          </div>
          <div className="bg-white rounded-xl px-2.5 py-1.5 flex items-center justify-center flex-shrink-0 flex-1">
            <img src="/logo-bri-full.svg" alt="BRI" className="h-8 object-contain"
              onError={e => e.target.style.display='none'} />
          </div>
          <div className="bg-white rounded-xl px-2.5 py-1.5 flex items-center justify-center flex-shrink-0 flex-1">
            <img src="/logo-brilian-talks.png" alt="BRILian Talks" className="h-8 object-contain"
              onError={e => e.target.style.display='none'} />
          </div>
        </div>
        <p className="text-center text-white/50 text-[10px] mt-2">Registrasi Peserta Online</p>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {event && (
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Kapasitas Peserta</span>
                </div>
                <span className="text-sm font-bold">{participants.length} / {totalQuota}</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    fillPct >= 100 ? "bg-destructive" : fillPct >= 80 ? "bg-amber-400" : "bg-green-500"
                  }`}
                  style={{ width: `${fillPct}%` }}
                />
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="p-4">
            <h2 className="text-base font-bold flex items-center gap-2 mb-4">
              <UserPlus className="w-5 h-5 text-primary" /> Form Registrasi Peserta
            </h2>

            {isEventBlocked ? (
              <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
                <AlertCircle className="w-10 h-10 text-muted-foreground" />
                <p className="text-base font-semibold text-muted-foreground">
                  {event?.event_status === "DRAFT" ? "Event belum dibuka" : "Event sudah ditutup"}
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {errors.global && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" /> {errors.global}
                  </div>
                )}

                {/* Participant fields */}
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Data Peserta
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="full_name" className="text-xs font-medium">
                        Nama Lengkap <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="full_name"
                        placeholder="Masukkan nama lengkap"
                        value={form.full_name}
                        onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))}
                        className={`mt-1 ${errors.full_name ? "border-destructive" : ""}`}
                      />
                      {errors.full_name && <p className="text-xs text-destructive mt-1">{errors.full_name}</p>}
                    </div>
                    <div>
                      <Label htmlFor="phone" className="text-xs font-medium">
                        Nomor Telepon <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="Contoh: 08123456789"
                        value={form.phone_number}
                        onChange={e => setForm(p => ({ ...p, phone_number: e.target.value }))}
                        className={`mt-1 ${errors.phone_number ? "border-destructive" : ""}`}
                      />
                      {errors.phone_number && <p className="text-xs text-destructive mt-1">{errors.phone_number}</p>}
                    </div>
                    <div>
                      <Label htmlFor="unit" className="text-xs font-medium">
                        Unit / Divisi <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="unit"
                        placeholder="Contoh: Divisi IT"
                        value={form.unit_division}
                        onChange={e => setForm(p => ({ ...p, unit_division: e.target.value }))}
                        className={`mt-1 ${errors.unit_division ? "border-destructive" : ""}`}
                      />
                      {errors.unit_division && <p className="text-xs text-destructive mt-1">{errors.unit_division}</p>}
                    </div>
                  </div>
                </div>

                <div className="border-t border-border" />

                {/* Service selection — single choice across both providers */}
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                    Pilih Layanan <span className="text-destructive">*</span>
                  </h3>

                  <div className="space-y-3">
                    {medicalServices.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-2 px-2 py-1.5 rounded-lg" style={{ background: '#003D79' + '15' }}>
                          <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: '#003D79' }}>
                            <Stethoscope className="w-3 h-3 text-white" />
                          </div>
                          <span className="text-xs font-bold text-[#003D79] uppercase tracking-wide">Primaya Hospital</span>
                        </div>
                        <div className="space-y-1.5 pl-1">
                          {medicalServices.map(s => (
                            <ServiceOption
                              key={s.id} service={s}
                              selected={form.service_id === s.id}
                              onSelect={val => setForm(p => ({ ...p, service_id: val }))}
                              getRemainingSlots={getRemainingSlots}
                              isServiceFull={isServiceFull}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {eyeServices.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-2 px-2 py-1.5 rounded-lg bg-red-50">
                          <div className="w-5 h-5 rounded bg-red-600 flex items-center justify-center">
                            <Eye className="w-3 h-3 text-white" />
                          </div>
                          <span className="text-xs font-bold text-red-700 uppercase tracking-wide">Optik Melawai</span>
                        </div>
                        <div className="space-y-1.5 pl-1">
                          {eyeServices.map(s => (
                            <ServiceOption
                              key={s.id} service={s}
                              selected={form.service_id === s.id}
                              onSelect={val => setForm(p => ({ ...p, service_id: val }))}
                              getRemainingSlots={getRemainingSlots}
                              isServiceFull={isServiceFull}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {errors.service_id && (
                    <p className="text-xs text-destructive mt-2">{errors.service_id}</p>
                  )}
                </div>

                <Button type="submit" disabled={submitting} className="w-full">
                  {submitting
                    ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Memproses...</>
                    : <><UserPlus className="w-4 h-4 mr-2" /> Daftarkan Saya</>}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <div className="flex items-center justify-center gap-3 pb-6">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-50 border border-blue-100">
            <img src="/logo-primaya.png" alt="Primaya" className="h-4 object-contain" onError={e => e.target.style.display = 'none'} />
            <span className="text-[10px] font-bold text-blue-800">PRIMAYA HOSPITAL</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-50 border border-red-100">
            <img src="/logo-optik-melawai.png" alt="Optik Melawai" className="h-4 object-contain" onError={e => e.target.style.display = 'none'} />
            <span className="text-[10px] font-bold text-red-700">OPTIK MELAWAI</span>
          </div>
        </div>
      </div>
    </div>
  );
}
