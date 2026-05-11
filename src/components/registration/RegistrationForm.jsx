import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Loader2, AlertCircle, Gift, CreditCard } from "lucide-react";
import { base44 } from "@/api/client";
import { getServicePrefix, formatQueueNumber, getNextQueueSequence, generateRegistrationNumber } from "@/lib/registrationUtils";
import { generateQrToken, buildQrCodeUrl } from "@/lib/qrUtils";

const PAYMENT_OPTIONS = [
  { value: "VERIFIED_OUTSIDE_SYSTEM", label: "Terverifikasi (Luar Sistem)" },
  { value: "PENDING_MANUAL_CONFIRMATION", label: "Menunggu Konfirmasi Manual" },
  { value: "NOT_REQUIRED", label: "Tidak Diperlukan" },
];

export default function RegistrationForm({ services, participants = [], eventSetting, onSuccess }) {
  const [form, setForm] = useState({
    full_name: "",
    phone_number: "",
    unit_division: "",
    participant_category: "",
    medical_service_id: "",
    eye_service_id: "",
    payment_status: "NOT_REQUIRED",
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const medicalServices = services.filter(s => s.service_group === "MEDICAL" && s.is_active && s.service_code && s.service_name);
  const eyeServices = services.filter(s => s.service_group === "EYE_CHECK" && s.is_active && s.service_code && s.service_name);
  const selectedMedical = services.find(s => s.id === form.medical_service_id);
  const selectedEye = services.find(s => s.id === form.eye_service_id);

  // Calculate total service quotas for each tier
  const totalFullFreeQuota = services.reduce((sum, s) => sum + (s.full_free_quota || 0), 0);
  const totalCcRp1Quota = services.reduce((sum, s) => sum + (s.cc_rp1_quota || 0), 0);
  const usedFullFree = participants.filter(p => p.participant_category === "FREE_CHECK").length;
  const usedCcRp1 = participants.filter(p => p.participant_category === "PAYMENT").length;
  const fullFreeFull = totalFullFreeQuota > 0 && usedFullFree >= totalFullFreeQuota;
  const ccRp1Full = totalCcRp1Quota > 0 && usedCcRp1 >= totalCcRp1Quota;

  // Map category to quota category (tiered)
  const getQuotaCategoryForCategory = (cat) => cat === "FREE_CHECK" ? "FULL_FREE" : "FULL_PAID";

  const isMedicalFull = (service) => {
    if (!service) return false;
    if (!form.participant_category) return false;
    const qcat = getQuotaCategoryForCategory(form.participant_category);
    if (qcat === "FULL_FREE") {
      const fq = service.full_free_quota || 0;
      return fq > 0 && (service.used_full_free || 0) >= fq;
    } else {
      const pq = service.full_paid_quota || 0;
      return pq > 0 && (service.used_full_paid || 0) >= pq;
    }
  };

  const isEyeFull = (service) => {
    if (!service) return false;
    if (!form.participant_category) return false;
    const qcat = getQuotaCategoryForCategory(form.participant_category);
    if (qcat === "FULL_FREE") {
      const fq = service.full_free_quota || 0;
      return fq > 0 && (service.used_full_free || 0) >= fq;
    } else {
      const pq = service.full_paid_quota || 0;
      return pq > 0 && (service.used_full_paid || 0) >= pq;
    }
  };

  const isServiceFull = (service) => {
    if (!service) return false;
    if (service.is_unlimited) return false;
    const totalUsed = (service.used_full_free || 0) + (service.used_cc_rp1 || 0) + (service.used_full_paid || 0);
    const totalSlot = service.total_slot || 0;
    return totalSlot > 0 && totalUsed >= totalSlot;
  };

  const validate = () => {
    const errs = {};
    if (!form.full_name.trim()) errs.full_name = "Nama lengkap wajib diisi.";
    if (!form.phone_number.trim()) errs.phone_number = "Nomor telepon wajib diisi.";
    if (!form.unit_division.trim()) errs.unit_division = "Unit / Divisi wajib diisi.";
    if (!form.participant_category) errs.participant_category = "Kategori peserta wajib dipilih.";
    if (!form.medical_service_id) errs.medical_service_id = "Layanan medis wajib dipilih.";
    if (!form.eye_service_id) errs.eye_service_id = "Layanan mata wajib dipilih.";

    // Event status check
    if (eventSetting?.event_status === "DRAFT") errs.global = "Event belum dibuka. Status masih DRAFT.";
    if (eventSetting?.event_status === "CLOSED") errs.global = "Event sudah ditutup. Pendaftaran tidak dapat dilakukan.";

    // Total capacity
    if (eventSetting?.max_participants && participants.length >= eventSetting.max_participants)
      errs.global = "Kuota total peserta sudah penuh.";

    // Category quota
    if (form.participant_category === "FREE_CHECK" && fullFreeFull)
      errs.participant_category = `Kuota Tanpa Syarat sudah penuh (${usedFullFree}/${totalFullFreeQuota}).`;
    if (form.participant_category === "PAYMENT" && ccRp1Full)
      errs.participant_category = `Kuota Dengan CC Rp 1 sudah penuh (${usedCcRp1}/${totalCcRp1Quota}).`;

    // Service slot quota
    if (form.medical_service_id && form.participant_category && isMedicalFull(selectedMedical)) {
      const qcat = getQuotaCategoryForCategory(form.participant_category);
      errs.medical_service_id = `Kuota ${qcat === "FULL_FREE" ? "Tanpa Syarat" : "Berbayar"} layanan medis ini sudah habis.`;
    }
    if (form.eye_service_id && form.participant_category && isEyeFull(selectedEye)) {
      const qcat = getQuotaCategoryForCategory(form.participant_category);
      errs.eye_service_id = `Kuota ${qcat === "FULL_FREE" ? "Tanpa Syarat" : "Berbayar"} layanan mata ini sudah habis.`;
    }

    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    setSubmitting(true);

    try {
      const quotaCategory = getQuotaCategoryForCategory(form.participant_category);
      const paymentDisplayStatus = form.participant_category === "FREE_CHECK" ? "FREE" : "PAID";
      
      const allParticipants = await base44.entities.Participant.list();
      const regNumber = generateRegistrationNumber(allParticipants.length + 1);

      const medSeq = await getNextQueueSequence(form.medical_service_id);
      const eyeSeq = await getNextQueueSequence(form.eye_service_id);
      const medPrefix = getServicePrefix(selectedMedical.service_name);
      const eyePrefix = getServicePrefix(selectedEye.service_name);
      const medQueueNum = formatQueueNumber(medPrefix, medSeq);
      const eyeQueueNum = formatQueueNumber(eyePrefix, eyeSeq);

      // Create participant
      const participant = await base44.entities.Participant.create({
        registration_number: regNumber,
        full_name: form.full_name.trim(),
        phone_number: form.phone_number.trim(),
        unit_division: form.unit_division.trim(),
        participant_category: form.participant_category,
        medical_service_id: form.medical_service_id,
        eye_service_id: form.eye_service_id,
        payment_status: form.participant_category === "PAYMENT"
          ? form.payment_status
          : "NOT_REQUIRED",
        participant_status: "REGISTERED",
        registered_by: (await base44.auth.me())?.email,
        registered_at: new Date().toISOString(),
      });

      // Generate QR tokens for each queue
      const medQrToken = generateQrToken();
      const eyeQrToken = generateQrToken();
      const medQrCodeUrl = buildQrCodeUrl(medQrToken, 120);
      const eyeQrCodeUrl = buildQrCodeUrl(eyeQrToken, 120);

      // Create queues with quota_category and payment_display_status
      const medicalQueue = await base44.entities.Queue.create({
        participant_id: participant.id,
        service_id: form.medical_service_id,
        queue_number: medQueueNum,
        queue_sequence: medSeq,
        quota_category: quotaCategory,
        payment_display_status: paymentDisplayStatus,
        status: "WAITING",
        qr_token: medQrToken,
        qr_code_url: medQrCodeUrl,
        qr_verification_status: "NOT_SCANNED",
      });
      const eyeQueue = await base44.entities.Queue.create({
        participant_id: participant.id,
        service_id: form.eye_service_id,
        queue_number: eyeQueueNum,
        queue_sequence: eyeSeq,
        quota_category: quotaCategory,
        payment_display_status: paymentDisplayStatus,
        status: "WAITING",
        qr_token: eyeQrToken,
        qr_code_url: eyeQrCodeUrl,
        qr_verification_status: "NOT_SCANNED",
      });

      // Deduct service quotas based on quota_category
      if (quotaCategory === "FULL_FREE") {
        await base44.entities.Service.update(form.medical_service_id, {
          used_full_free: (selectedMedical.used_full_free || 0) + 1,
          used_total: (selectedMedical.used_total || 0) + 1,
        });
        await base44.entities.Service.update(form.eye_service_id, {
          used_full_free: (selectedEye.used_full_free || 0) + 1,
          used_total: (selectedEye.used_total || 0) + 1,
        });
      } else {
        await base44.entities.Service.update(form.medical_service_id, {
          used_full_paid: (selectedMedical.used_full_paid || 0) + 1,
          used_total: (selectedMedical.used_total || 0) + 1,
        });
        await base44.entities.Service.update(form.eye_service_id, {
          used_full_paid: (selectedEye.used_full_paid || 0) + 1,
          used_total: (selectedEye.used_total || 0) + 1,
        });
      }

      onSuccess({ participant, medicalQueue, eyeQueue, medicalService: selectedMedical, eyeService: selectedEye });

      setForm({
        full_name: "",
        phone_number: "",
        unit_division: "",
        participant_category: "",
        medical_service_id: "",
        eye_service_id: "",
        payment_status: "NOT_REQUIRED",
      });
    } catch (err) {
      setErrors({ global: err.message || "Terjadi kesalahan. Silakan coba lagi." });
    } finally {
      setSubmitting(false);
    }
  };

  const CategoryCard = ({ value, label, icon: CatIcon, desc, fullFreeQuota, fullFreeUsed, ccRp1Quota, ccRp1Used, isFull }) => {
    const fullFreeRemaining = Math.max(0, fullFreeQuota - fullFreeUsed);
    const ccRp1Remaining = Math.max(0, ccRp1Quota - ccRp1Used);
    
    return (
      <div
        className={`flex items-start gap-3 px-4 py-3 rounded-xl border-2 cursor-pointer transition-all
          ${isFull ? "opacity-50 cursor-not-allowed border-border bg-muted/20" :
            form.participant_category === value
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/40 bg-card"}`}
        onClick={() => {
          if (isFull) return;
          setForm(p => ({ ...p, participant_category: value, medical_service_id: "", eye_service_id: "" }));
          setErrors(p => ({ ...p, participant_category: undefined }));
        }}
      >
        <RadioGroupItem value={value} id={`cat-${value}`} disabled={isFull} className="mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <CatIcon className="w-4 h-4 text-primary flex-shrink-0" />
            <Label htmlFor={`cat-${value}`} className={`text-sm font-semibold ${isFull ? "cursor-not-allowed" : "cursor-pointer"}`}>
              {label}
            </Label>
            {isFull && <Badge variant="outline" className="text-[10px]">Penuh</Badge>}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
        </div>
      </div>
    );
  };

  const isEventBlocked = eventSetting?.event_status === "DRAFT" || eventSetting?.event_status === "CLOSED";

  return (
    <Card>
      <CardHeader className="pb-4">
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

            {/* Category */}
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Kategori Peserta <span className="text-destructive">*</span>
              </h3>
              <RadioGroup value={form.participant_category}
                onValueChange={val => { setForm(p => ({ ...p, participant_category: val, medical_service_id: "", eye_service_id: "" })); setErrors(p => ({ ...p, participant_category: undefined })); }}
                className="space-y-2">
                <CategoryCard
                   value="FREE_CHECK"
                   label="FREE CHECK"
                   icon={Gift}
                   desc="Pemeriksaan gratis — tidak dipungut biaya"
                   fullFreeQuota={totalFullFreeQuota}
                   fullFreeUsed={usedFullFree}
                   ccRp1Quota={0}
                   ccRp1Used={0}
                   isFull={fullFreeFull}
                 />
                 <CategoryCard
                   value="PAYMENT"
                   label="PAYMENT"
                   icon={CreditCard}
                   desc="Pemeriksaan berbayar — diperlukan konfirmasi pembayaran"
                   fullFreeQuota={0}
                   fullFreeUsed={0}
                   ccRp1Quota={totalCcRp1Quota}
                   ccRp1Used={usedCcRp1}
                   isFull={ccRp1Full}
                 />
              </RadioGroup>
              {errors.participant_category && <p className="text-xs text-destructive mt-1">{errors.participant_category}</p>}
            </div>

            {form.participant_category && (
              <>
                <div className="border-t border-border" />

                {/* Medical Service */}
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Layanan Medis</h3>
                  <Label className="text-xs font-medium">Pilih Layanan Medis <span className="text-destructive">*</span></Label>
                  <Select value={form.medical_service_id}
                    onValueChange={val => { setForm(p => ({ ...p, medical_service_id: val })); setErrors(p => ({ ...p, medical_service_id: undefined })); }}>
                    <SelectTrigger className={`mt-1 ${errors.medical_service_id ? "border-destructive" : ""}`}>
                      <SelectValue placeholder="Pilih layanan medis..." />
                    </SelectTrigger>
                    <SelectContent>
                       <SelectItem value={null}>NONE</SelectItem>
                       {medicalServices.map(s => (
                         <SelectItem key={s.id} value={s.id} disabled={isServiceFull(s)}>
                           <div className="flex items-center gap-2">
                             <span className="w-5 h-5 rounded bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center">{s.service_code}</span>
                             <span>{s.service_name}</span>
                             {isServiceFull(s) && <Badge variant="outline" className="text-[10px] ml-1">Penuh</Badge>}
                           </div>
                         </SelectItem>
                       ))}
                     </SelectContent>
                  </Select>
                  {errors.medical_service_id && <p className="text-xs text-destructive mt-1">{errors.medical_service_id}</p>}
                </div>

                <div className="border-t border-border" />

                {/* Eye Service */}
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Pemeriksaan Mata</h3>
                  <Label className="text-xs font-medium">Pilih Layanan Mata <span className="text-destructive">*</span></Label>
                  <Select value={form.eye_service_id}
                    onValueChange={val => { setForm(p => ({ ...p, eye_service_id: val })); setErrors(p => ({ ...p, eye_service_id: undefined })); }}>
                    <SelectTrigger className={`mt-1 ${errors.eye_service_id ? "border-destructive" : ""}`}>
                      <SelectValue placeholder="Pilih layanan pemeriksaan mata..." />
                    </SelectTrigger>
                    <SelectContent>
                       <SelectItem value={null}>NONE</SelectItem>
                       {eyeServices.map(s => (
                         <SelectItem key={s.id} value={s.id} disabled={isServiceFull(s)}>
                           <div className="flex items-center gap-2">
                             <span className="w-5 h-5 rounded bg-accent/10 text-accent text-[10px] font-bold flex items-center justify-center">{s.service_code}</span>
                             <span>{s.service_name}</span>
                             {isServiceFull(s) && <Badge variant="outline" className="text-[10px] ml-1">Penuh</Badge>}
                           </div>
                         </SelectItem>
                       ))}
                     </SelectContent>
                  </Select>
                  {errors.eye_service_id && <p className="text-xs text-destructive mt-1">{errors.eye_service_id}</p>}
                </div>

                {/* Payment Note (only for PAYMENT category) */}
                {form.participant_category === "PAYMENT" && (
                  <>
                    <div className="border-t border-border" />
                    <div>
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Catatan Pembayaran</h3>
                      <Select value={form.payment_status} onValueChange={val => setForm(p => ({ ...p, payment_status: val }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {PAYMENT_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
              </>
            )}

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