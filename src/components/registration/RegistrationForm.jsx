import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Loader2, AlertCircle, Stethoscope, Eye, Activity, Syringe } from "lucide-react";
import { base44 } from "@/api/client";
import { formatQueueNumber, getNextQueueSequence, generateRegistrationNumber } from "@/lib/registrationUtils";
import { generateQrToken, buildQrCodeUrl } from "@/lib/qrUtils";

const SERVICE_ICONS = {
  'svc-a': Activity,
  'svc-b': Syringe,
  'svc-c': Syringe,
  'svc-d': Eye,
  'svc-e': Eye,
};

const SERVICE_COLORS = {
  'svc-a': { bg: 'bg-[#003D79]', text: 'text-white', light: 'bg-[#003D79]/10 text-[#003D79]' },
  'svc-b': { bg: 'bg-[#005BAB]', text: 'text-white', light: 'bg-[#005BAB]/10 text-[#005BAB]' },
  'svc-c': { bg: 'bg-[#0077CC]', text: 'text-white', light: 'bg-[#0077CC]/10 text-[#0077CC]' },
  'svc-d': { bg: 'bg-[#005BAB]', text: 'text-white', light: 'bg-[#005BAB]/10 text-[#005BAB]' },
  'svc-e': { bg: 'bg-[#0095E8]', text: 'text-white', light: 'bg-[#0095E8]/10 text-[#0095E8]' },
};

export default function RegistrationForm({ services, participants = [], eventSetting, onSuccess }) {
  const [form, setForm] = useState({ full_name: "", phone_number: "", unit_division: "", service_id: "" });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const activeServices = services.filter(s => s.is_active && s.service_code && s.service_name);
  const selectedService = services.find(s => s.id === form.service_id);

  const medicalServices = activeServices.filter(s => s.service_group === "MEDICAL");
  const eyeServices = activeServices.filter(s => s.service_group === "EYE_CHECK");

  const getRemainingSlots = (service) => Math.max(0, (service.free_quota || 0) - (service.used_free_quota || 0));
  const isServiceFull = (service) => getRemainingSlots(service) <= 0;

  const validate = () => {
    const errs = {};
    if (!form.full_name.trim()) errs.full_name = "Nama lengkap wajib diisi.";
    if (!form.phone_number.trim()) errs.phone_number = "Nomor telepon wajib diisi.";
    if (!form.unit_division.trim()) errs.unit_division = "Unit / Divisi wajib diisi.";
    if (!form.service_id) errs.service_id = "Pilih salah satu layanan.";
    if (eventSetting?.event_status === "DRAFT") errs.global = "Event belum dibuka.";
    if (eventSetting?.event_status === "CLOSED") errs.global = "Event sudah ditutup.";
    if (eventSetting?.max_participants && participants.length >= eventSetting.max_participants)
      errs.global = "Kuota total peserta sudah penuh.";
    if (form.service_id && selectedService && isServiceFull(selectedService))
      errs.service_id = "Kuota layanan ini sudah penuh.";
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
      const seq = await getNextQueueSequence(form.service_id);
      const queueNum = formatQueueNumber(selectedService.service_code, seq);

      const participant = await base44.entities.Participant.create({
        registration_number: regNumber,
        full_name: form.full_name.trim(),
        phone_number: form.phone_number.trim(),
        unit_division: form.unit_division.trim(),
        participant_category: "FREE_CHECK",
        service_id: form.service_id,
        payment_status: "NOT_REQUIRED",
        participant_status: "REGISTERED",
        registered_by: (await base44.auth.me())?.email,
        registered_at: new Date().toISOString(),
      });

      const qrToken = generateQrToken();
      const qrCodeUrl = buildQrCodeUrl(qrToken, 120);

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

      onSuccess({ participant, queue, service: selectedService });
      setForm({ full_name: "", phone_number: "", unit_division: "", service_id: "" });
    } catch (err) {
      setErrors({ global: err.message || "Terjadi kesalahan. Silakan coba lagi." });
    } finally {
      setSubmitting(false);
    }
  };

  const isEventBlocked = eventSetting?.event_status === "DRAFT" || eventSetting?.event_status === "CLOSED";

  const ServiceOption = ({ service }) => {
    const remaining = getRemainingSlots(service);
    const full = isServiceFull(service);
    const Icon = SERVICE_ICONS[service.id] || Stethoscope;
    const colors = SERVICE_COLORS[service.id] || SERVICE_COLORS['svc-a'];
    const selected = form.service_id === service.id;

    return (
      <div
        className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 cursor-pointer transition-all
          ${full ? "opacity-50 cursor-not-allowed border-border bg-muted/20" :
            selected ? "border-primary bg-primary/5 shadow-sm" :
            "border-border hover:border-primary/40 bg-card"}`}
        onClick={() => {
          if (full) return;
          setForm(p => ({ ...p, service_id: service.id }));
          setErrors(p => ({ ...p, service_id: undefined }));
        }}
      >
        <RadioGroupItem value={service.id} id={`svc-${service.id}`} disabled={full} className="flex-shrink-0" />
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${selected ? colors.bg : colors.bg + '/10'}`}>
          <Icon className={`w-5 h-5 ${selected ? 'text-white' : colors.text.replace('text-white', 'text-' + colors.bg.replace('bg-[','').replace(']',''))}`}
            style={{ color: selected ? 'white' : undefined }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Label htmlFor={`svc-${service.id}`} className={`text-sm font-bold ${full ? "cursor-not-allowed" : "cursor-pointer"}`}>
              {service.service_name}
            </Label>
            {full && <Badge variant="outline" className="text-[10px]">Penuh</Badge>}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">Booth {service.booth_number} &bull; Kode {service.service_code}</p>
        </div>
        <div className="flex-shrink-0 text-right">
          <p className={`text-xs font-bold ${remaining <= 10 ? "text-amber-600" : "text-green-600"}`}>
            Sisa: {remaining}
          </p>
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        {/* Logos */}
        <div className="flex items-center gap-3 mb-4 pb-4 border-b border-border flex-wrap">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg flex-shrink-0" style={{ background: '#003D79' }}>
            <img src="/logo-bri.png" alt="BRI" className="h-6 object-contain" onError={e => e.target.style.display='none'} />
            <span className="font-black text-sm tracking-wider text-white">BRI</span>
          </div>
          <div className="w-px h-6 bg-border flex-shrink-0" />
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-50 border border-blue-100 flex-shrink-0">
            <img src="/logo-primaya.png" alt="Primaya" className="h-5 object-contain" onError={e => e.target.style.display='none'} />
            <span className="text-[11px] font-bold text-blue-800">PRIMAYA HOSPITAL</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-50 border border-red-100 flex-shrink-0">
            <img src="/logo-optik-melawai.png" alt="Optik Melawai" className="h-5 object-contain" onError={e => e.target.style.display='none'} />
            <span className="text-[11px] font-bold text-red-700">OPTIK MELAWAI</span>
          </div>
          <p className="text-xs text-muted-foreground ml-auto hidden sm:block">Brilian Talks Health Care 2025</p>
        </div>
        <CardTitle className="text-base flex items-center gap-2">
          <UserPlus className="w-5 h-5 text-primary" />
          Form Registrasi Peserta
        </CardTitle>
      </CardHeader>
      <CardContent>
        {errors.global && (
          <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {errors.global}
          </div>
        )}

        {isEventBlocked ? (
          <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
            <AlertCircle className="w-10 h-10 text-muted-foreground" />
            <p className="text-base font-semibold text-muted-foreground">
              {eventSetting?.event_status === "DRAFT" ? "Event belum dibuka" : "Event sudah ditutup"}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Data Peserta */}
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Data Peserta</h3>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="full_name" className="text-xs font-medium">Nama Lengkap <span className="text-destructive">*</span></Label>
                  <Input id="full_name" placeholder="Masukkan nama lengkap" value={form.full_name}
                    onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))}
                    className={`mt-1 ${errors.full_name ? "border-destructive" : ""}`} />
                  {errors.full_name && <p className="text-xs text-destructive mt-1">{errors.full_name}</p>}
                </div>
                <div>
                  <Label htmlFor="phone" className="text-xs font-medium">Nomor Telepon <span className="text-destructive">*</span></Label>
                  <Input id="phone" placeholder="Contoh: 08123456789" value={form.phone_number}
                    onChange={e => setForm(p => ({ ...p, phone_number: e.target.value }))}
                    className={`mt-1 ${errors.phone_number ? "border-destructive" : ""}`} />
                  {errors.phone_number && <p className="text-xs text-destructive mt-1">{errors.phone_number}</p>}
                </div>
                <div>
                  <Label htmlFor="unit" className="text-xs font-medium">Unit / Divisi <span className="text-destructive">*</span></Label>
                  <Input id="unit" placeholder="Contoh: Divisi IT" value={form.unit_division}
                    onChange={e => setForm(p => ({ ...p, unit_division: e.target.value }))}
                    className={`mt-1 ${errors.unit_division ? "border-destructive" : ""}`} />
                  {errors.unit_division && <p className="text-xs text-destructive mt-1">{errors.unit_division}</p>}
                </div>
              </div>
            </div>

            <div className="border-t border-border" />

            {/* Service Selection */}
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Pilih Layanan <span className="text-destructive">*</span>
              </h3>
              <RadioGroup
                value={form.service_id}
                onValueChange={val => { setForm(p => ({ ...p, service_id: val })); setErrors(p => ({ ...p, service_id: undefined })); }}
                className="space-y-3"
              >
                {/* Primaya Hospital group */}
                {medicalServices.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: '#003D79' }}>
                        <Stethoscope className="w-3 h-3 text-white" />
                      </div>
                      <span className="text-xs font-bold text-[#003D79] uppercase tracking-wide">Primaya Hospital</span>
                    </div>
                    <div className="space-y-1.5 pl-2">
                      {medicalServices.map(s => <ServiceOption key={s.id} service={s} />)}
                    </div>
                  </div>
                )}

                {/* Optik Melawai group */}
                {eyeServices.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2 mt-2">
                      <div className="w-5 h-5 rounded flex items-center justify-center bg-red-600">
                        <Eye className="w-3 h-3 text-white" />
                      </div>
                      <span className="text-xs font-bold text-red-700 uppercase tracking-wide">Optik Melawai</span>
                    </div>
                    <div className="space-y-1.5 pl-2">
                      {eyeServices.map(s => <ServiceOption key={s.id} service={s} />)}
                    </div>
                  </div>
                )}
              </RadioGroup>
              {errors.service_id && <p className="text-xs text-destructive mt-1">{errors.service_id}</p>}
            </div>

            <Button type="submit" disabled={submitting} className="w-full">
              {submitting
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Memproses...</>
                : <><UserPlus className="w-4 h-4 mr-2" /> Daftarkan Peserta</>}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
