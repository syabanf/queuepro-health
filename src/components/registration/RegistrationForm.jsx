import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Loader2, AlertCircle, Stethoscope, Eye } from "lucide-react";
import { base44 } from "@/api/client";
import { formatQueueNumber, getNextQueueSequence, generateRegistrationNumber } from "@/lib/registrationUtils";
import { generateQrToken, buildQrCodeUrl } from "@/lib/qrUtils";

export default function RegistrationForm({ services, participants = [], eventSetting, onSuccess }) {
  const [form, setForm] = useState({
    full_name: "",
    phone_number: "",
    unit_division: "",
    service_id: "",
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const activeServices = services.filter(s => s.is_active && s.service_code && s.service_name);
  const selectedService = services.find(s => s.id === form.service_id);

  const getRemainingSlots = (service) => {
    const total = service.free_quota || 0;
    const used = service.used_free_quota || 0;
    return Math.max(0, total - used);
  };

  const isServiceFull = (service) => getRemainingSlots(service) <= 0;

  const validate = () => {
    const errs = {};
    if (!form.full_name.trim()) errs.full_name = "Nama lengkap wajib diisi.";
    if (!form.phone_number.trim()) errs.phone_number = "Nomor telepon wajib diisi.";
    if (!form.unit_division.trim()) errs.unit_division = "Unit / Divisi wajib diisi.";
    if (!form.service_id) errs.service_id = "Pilih salah satu layanan.";

    if (eventSetting?.event_status === "DRAFT") errs.global = "Event belum dibuka. Status masih DRAFT.";
    if (eventSetting?.event_status === "CLOSED") errs.global = "Event sudah ditutup. Pendaftaran tidak dapat dilakukan.";

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
      const prefix = selectedService.service_code;
      const queueNum = formatQueueNumber(prefix, seq);

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

  return (
    <Card>
      <CardHeader className="pb-4">
        {/* Logos BRI & Danantara */}
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-border">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#003D79] text-white">
            <img src="/logo-bri.png" alt="BRI" className="h-7 object-contain" onError={e => e.target.style.display='none'} />
            <span className="font-black text-sm tracking-wider">BRI</span>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground font-medium">Brilian Talks Health Care 2025</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#1B5E20] text-white">
            <img src="/logo-danantara.png" alt="Danantara" className="h-7 object-contain" onError={e => e.target.style.display='none'} />
            <span className="font-black text-sm tracking-wider">Danantara</span>
          </div>
        </div>
        <CardTitle className="text-base flex items-center gap-2">
          <UserPlus className="w-5 h-5 text-primary" />
          Form Registrasi Peserta
        </CardTitle>
      </CardHeader>
      <CardContent>
        {errors.global && (
          <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {errors.global}
          </div>
        )}

        {isEventBlocked ? (
          <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
            <AlertCircle className="w-10 h-10 text-muted-foreground" />
            <p className="text-base font-semibold text-muted-foreground">
              {eventSetting?.event_status === "DRAFT" ? "Event belum dibuka" : "Event sudah ditutup"}
            </p>
            <p className="text-sm text-muted-foreground">
              {eventSetting?.event_status === "DRAFT"
                ? "Status event masih DRAFT. Ubah ke ACTIVE di halaman Konfigurasi."
                : "Status event CLOSED. Pendaftaran tidak dapat dilakukan."}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Participant Data */}
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
                className="space-y-2"
              >
                {activeServices.map(service => {
                  const remaining = getRemainingSlots(service);
                  const full = isServiceFull(service);
                  const isMedical = service.service_group === "MEDICAL";
                  const Icon = isMedical ? Stethoscope : Eye;
                  return (
                    <div
                      key={service.id}
                      className={`flex items-start gap-3 px-4 py-3 rounded-xl border-2 cursor-pointer transition-all
                        ${full ? "opacity-50 cursor-not-allowed border-border bg-muted/20" :
                          form.service_id === service.id
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/40 bg-card"}`}
                      onClick={() => {
                        if (full) return;
                        setForm(p => ({ ...p, service_id: service.id }));
                        setErrors(p => ({ ...p, service_id: undefined }));
                      }}
                    >
                      <RadioGroupItem value={service.id} id={`svc-${service.id}`} disabled={full} className="mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Icon className={`w-4 h-4 flex-shrink-0 ${isMedical ? "text-primary" : "text-accent"}`} />
                          <Label htmlFor={`svc-${service.id}`} className={`text-sm font-semibold ${full ? "cursor-not-allowed" : "cursor-pointer"}`}>
                            {service.service_name}
                          </Label>
                          {full && <Badge variant="outline" className="text-[10px]">Penuh</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Booth {service.booth_number} &bull; Kode {service.service_code}
                        </p>
                        <p className={`text-xs font-semibold mt-1 ${remaining <= 10 ? "text-amber-600" : "text-green-600"}`}>
                          Sisa slot gratis: {remaining}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </RadioGroup>
              {errors.service_id && <p className="text-xs text-destructive mt-1">{errors.service_id}</p>}
            </div>

            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Memproses...</>
              ) : (
                <><UserPlus className="w-4 h-4 mr-2" /> Daftarkan Peserta</>
              )}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
