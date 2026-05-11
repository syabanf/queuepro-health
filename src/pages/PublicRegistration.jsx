import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import {
  UserPlus, Loader2, AlertCircle, Stethoscope, Eye, Activity, Syringe,
  CheckCircle2, ArrowLeft, Users,
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

function ServiceOption({ service, selected, onSelect, getRemainingSlots, isServiceFull, groupKey }) {
  const remaining = getRemainingSlots(service);
  const full = isServiceFull(service);

  return (
    <div
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 cursor-pointer transition-all
        ${full
          ? "opacity-50 cursor-not-allowed border-border bg-muted/20"
          : selected
          ? "border-primary bg-primary/5 shadow-sm"
          : "border-border hover:border-primary/40 bg-card"}`}
      onClick={() => { if (!full) onSelect(service.id); }}
    >
      <RadioGroupItem
        value={service.id}
        id={`pub-${groupKey}-${service.id}`}
        disabled={full}
        className="flex-shrink-0"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Label
            htmlFor={`pub-${groupKey}-${service.id}`}
            className={`text-sm font-bold ${full ? "cursor-not-allowed" : "cursor-pointer"}`}
          >
            {service.service_name}
          </Label>
          {full && <Badge variant="outline" className="text-[10px]">Penuh</Badge>}
        </div>
        <p className="text-xs text-muted-foreground">
          Booth {service.booth_number} &bull; Kode {service.service_code}
        </p>
      </div>
      <div className="flex-shrink-0 text-right">
        <p className={`text-xs font-bold ${remaining <= 10 ? "text-amber-600" : "text-green-600"}`}>
          Sisa: {remaining}
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
  const [form, setForm] = useState({
    full_name: "",
    phone_number: "",
    unit_division: "",
    medical_service_id: "",
    eye_service_id: "",
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null); // { participant, queues: [{queue, service}] }
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

  // Realtime push: invalidate on any write without page reload
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

  const getRemainingSlots = (s) => Math.max(0, (s.free_quota || 0) - (s.used_free_quota || 0));
  const isServiceFull = (s) => getRemainingSlots(s) <= 0;

  const totalQuota = services.reduce((sum, s) => sum + (s.free_quota || 0) + (s.paid_quota || 0), 0)
    || event?.max_participants || 200;
  const fillPct = Math.min(100, Math.round((participants.length / totalQuota) * 100));
  const isEventBlocked = event?.event_status === "DRAFT" || event?.event_status === "CLOSED";

  const validate = () => {
    const errs = {};
    if (!form.full_name.trim()) errs.full_name = "Nama lengkap wajib diisi.";
    if (!form.phone_number.trim()) errs.phone_number = "Nomor telepon wajib diisi.";
    if (!form.unit_division.trim()) errs.unit_division = "Unit / Divisi wajib diisi.";
    if (!form.medical_service_id && !form.eye_service_id)
      errs.service = "Pilih minimal satu layanan.";
    if (event?.event_status === "DRAFT") errs.global = "Event belum dibuka.";
    if (event?.event_status === "CLOSED") errs.global = "Event sudah ditutup.";

    const checkFull = (svcId) => {
      const svc = services.find(s => s.id === svcId);
      return svc && isServiceFull(svc);
    };
    if (form.medical_service_id && checkFull(form.medical_service_id))
      errs.medical = "Kuota layanan ini sudah penuh.";
    if (form.eye_service_id && checkFull(form.eye_service_id))
      errs.eye = "Kuota layanan ini sudah penuh.";

    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    setSubmitting(true);

    try {
      const allParticipants = await base44.entities.Participant.list();
      const regNumber = generateRegistrationNumber(allParticipants.length + 1);

      // Primary service = medical if selected, else eye
      const primaryServiceId = form.medical_service_id || form.eye_service_id;

      const participant = await base44.entities.Participant.create({
        registration_number: regNumber,
        full_name: form.full_name.trim(),
        phone_number: form.phone_number.trim(),
        unit_division: form.unit_division.trim(),
        participant_category: "FREE_CHECK",
        service_id: primaryServiceId,
        payment_status: "NOT_REQUIRED",
        participant_status: "REGISTERED",
        registered_by: "self",
        registered_at: new Date().toISOString(),
      });

      // Create a queue for each selected service
      const selectedServiceIds = [form.medical_service_id, form.eye_service_id].filter(Boolean);
      const queues = [];

      for (const svcId of selectedServiceIds) {
        const svc = services.find(s => s.id === svcId);
        const seq = await getNextQueueSequence(svcId);
        const queueNum = formatQueueNumber(svc.service_code, seq);
        const qrToken = generateQrToken();
        const qrCodeUrl = buildQrCodeUrl(qrToken, 120);

        const queue = await base44.entities.Queue.create({
          participant_id: participant.id,
          service_id: svcId,
          queue_number: queueNum,
          queue_sequence: seq,
          quota_category: "FULL_FREE",
          payment_display_status: "FREE",
          status: "WAITING",
          qr_token: qrToken,
          qr_code_url: qrCodeUrl,
          qr_verification_status: "NOT_SCANNED",
        });
        queues.push({ queue, service: svc });
      }

      setResult({ participant, queues });
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
    setForm({ full_name: "", phone_number: "", unit_division: "", medical_service_id: "", eye_service_id: "" });
    window.scrollTo(0, 0);
  };

  // ---- Success screen ----
  if (result) {
    const { participant, queues } = result;
    return (
      <div className="min-h-screen bg-muted/30 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-4">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-xl font-black text-foreground">Pendaftaran Berhasil!</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {queues.length > 1 ? "Anda terdaftar di 2 layanan" : "Simpan nomor antrian Anda"}
            </p>
          </div>

          {/* Participant strip */}
          <Card>
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">Peserta</p>
              <p className="text-base font-bold">{participant.full_name}</p>
              <p className="text-xs font-mono text-muted-foreground">
                {participant.registration_number} &bull; {participant.unit_division}
              </p>
            </CardContent>
          </Card>

          {/* Queue tickets */}
          {queues.map(({ queue, service }, idx) => (
            <QueueTicket key={queue.id} queue={queue} service={service} idx={idx} />
          ))}

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
      {/* Branded header */}
      <div className="px-4 py-4" style={{ background: '#003D79' }}>
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-white font-black text-lg tracking-wider">BRI</span>
            <span className="text-white/40 mx-1">×</span>
            <span className="text-white/80 text-sm font-semibold">Brilian Talks Health Care 2025</span>
          </div>
          <p className="text-white/50 text-xs">Registrasi Peserta Online</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Capacity bar */}
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

        {/* Form card */}
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

                {/* Service selection — two independent groups */}
                <div className="space-y-4">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Pilih Layanan <span className="text-muted-foreground/60 normal-case font-normal">(pilih minimal 1)</span>
                  </h3>
                  {errors.service && (
                    <p className="text-xs text-destructive -mt-2">{errors.service}</p>
                  )}

                  {/* Primaya Hospital */}
                  {medicalServices.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2 p-2 rounded-lg" style={{ background: '#003D79' + '15' }}>
                        <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: '#003D79' }}>
                          <Stethoscope className="w-3 h-3 text-white" />
                        </div>
                        <span className="text-xs font-bold text-[#003D79] uppercase tracking-wide">Primaya Hospital</span>
                        <span className="text-[10px] text-muted-foreground ml-auto">Pilih 1</span>
                      </div>
                      <RadioGroup
                        value={form.medical_service_id}
                        onValueChange={val => {
                          setForm(p => ({ ...p, medical_service_id: val }));
                          setErrors(p => ({ ...p, service: undefined, medical: undefined }));
                        }}
                        className="space-y-1.5"
                      >
                        {medicalServices.map(s => (
                          <ServiceOption
                            key={s.id}
                            service={s}
                            selected={form.medical_service_id === s.id}
                            onSelect={val => {
                              setForm(p => ({ ...p, medical_service_id: val }));
                              setErrors(p => ({ ...p, service: undefined, medical: undefined }));
                            }}
                            getRemainingSlots={getRemainingSlots}
                            isServiceFull={isServiceFull}
                            groupKey="medical"
                          />
                        ))}
                      </RadioGroup>
                      {errors.medical && <p className="text-xs text-destructive mt-1">{errors.medical}</p>}
                    </div>
                  )}

                  {/* Optik Melawai */}
                  {eyeServices.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2 p-2 rounded-lg bg-red-50">
                        <div className="w-5 h-5 rounded bg-red-600 flex items-center justify-center">
                          <Eye className="w-3 h-3 text-white" />
                        </div>
                        <span className="text-xs font-bold text-red-700 uppercase tracking-wide">Optik Melawai</span>
                        <span className="text-[10px] text-muted-foreground ml-auto">Pilih 1</span>
                      </div>
                      <RadioGroup
                        value={form.eye_service_id}
                        onValueChange={val => {
                          setForm(p => ({ ...p, eye_service_id: val }));
                          setErrors(p => ({ ...p, service: undefined, eye: undefined }));
                        }}
                        className="space-y-1.5"
                      >
                        {eyeServices.map(s => (
                          <ServiceOption
                            key={s.id}
                            service={s}
                            selected={form.eye_service_id === s.id}
                            onSelect={val => {
                              setForm(p => ({ ...p, eye_service_id: val }));
                              setErrors(p => ({ ...p, service: undefined, eye: undefined }));
                            }}
                            getRemainingSlots={getRemainingSlots}
                            isServiceFull={isServiceFull}
                            groupKey="eye"
                          />
                        ))}
                      </RadioGroup>
                      {errors.eye && <p className="text-xs text-destructive mt-1">{errors.eye}</p>}
                    </div>
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

        {/* Provider logos */}
        <div className="flex items-center justify-center gap-3 pb-6">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-50 border border-blue-100">
            <img
              src="/logo-primaya.png" alt="Primaya"
              className="h-4 object-contain"
              onError={e => e.target.style.display = 'none'}
            />
            <span className="text-[10px] font-bold text-blue-800">PRIMAYA HOSPITAL</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-50 border border-red-100">
            <img
              src="/logo-optik-melawai.png" alt="Optik Melawai"
              className="h-4 object-contain"
              onError={e => e.target.style.display = 'none'}
            />
            <span className="text-[10px] font-bold text-red-700">OPTIK MELAWAI</span>
          </div>
        </div>
      </div>
    </div>
  );
}
