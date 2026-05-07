import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Loader2, AlertCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import {
  getServicePrefix, formatQueueNumber, getNextQueueSequence, generateRegistrationNumber,
  determineQuotaCategory, isServiceFull, QUOTA_CATEGORY_FULL_LABELS, QUOTA_CATEGORY_COLORS
} from "@/lib/registrationUtils";
import { generateQrToken, buildQrCodeUrl } from "@/lib/qrUtils";

export default function RegistrationForm({ services, participants = [], eventSetting, onSuccess }) {
  const [form, setForm] = useState({
    full_name: "",
    phone_number: "",
    unit_division: "",
    medical_service_id: "",
    eye_service_id: "",
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const medicalServices = services.filter(s => s.service_group === "MEDICAL" && s.is_active);
  const eyeServices = services.filter(s => s.service_group === "EYE_CHECK" && s.is_active);
  const selectedMedical = services.find(s => s.id === form.medical_service_id);
  const selectedEye = services.find(s => s.id === form.eye_service_id);

  const validate = () => {
    const errs = {};
    if (!form.full_name.trim()) errs.full_name = "Nama lengkap wajib diisi.";
    if (!form.phone_number.trim()) errs.phone_number = "Nomor telepon wajib diisi.";
    if (!form.unit_division.trim()) errs.unit_division = "Unit / Divisi wajib diisi.";
    if (!form.medical_service_id) errs.medical_service_id = "Layanan medis wajib dipilih.";
    if (!form.eye_service_id) errs.eye_service_id = "Layanan mata wajib dipilih.";

    if (eventSetting?.event_status === "DRAFT") errs.global = "Event belum dibuka. Status masih DRAFT.";
    if (eventSetting?.event_status === "CLOSED") errs.global = "Event sudah ditutup. Pendaftaran tidak dapat dilakukan.";

    if (eventSetting?.max_participants && participants.length >= eventSetting.max_participants)
      errs.global = "Kuota total peserta sudah penuh.";

    if (form.medical_service_id && selectedMedical && isServiceFull(selectedMedical))
      errs.medical_service_id = "Kuota layanan medis ini sudah habis.";
    if (form.eye_service_id && selectedEye && isServiceFull(selectedEye))
      errs.eye_service_id = "Kuota layanan mata ini sudah habis.";

    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    setSubmitting(true);

    try {
      // Get next sequences
      const medSeq = await getNextQueueSequence(form.medical_service_id);
      const eyeSeq = await getNextQueueSequence(form.eye_service_id);

      // Determine quota categories
      const medCategory = determineQuotaCategory(selectedMedical, medSeq);
      const eyeCategory = determineQuotaCategory(selectedEye, eyeSeq);

      if (!medCategory) {
        setErrors({ medical_service_id: "Kuota layanan medis ini sudah habis." });
        setSubmitting(false);
        return;
      }
      if (!eyeCategory) {
        setErrors({ eye_service_id: "Kuota layanan mata ini sudah habis." });
        setSubmitting(false);
        return;
      }

      const medPrefix = getServicePrefix(selectedMedical);
      const eyePrefix = getServicePrefix(selectedEye);
      const medQueueNum = formatQueueNumber(medPrefix, medSeq);
      const eyeQueueNum = formatQueueNumber(eyePrefix, eyeSeq);

      // Registration number
      const allParticipants = await base44.entities.Participant.list();
      const regNumber = generateRegistrationNumber(allParticipants.length + 1);

      // Create participant
      const participant = await base44.entities.Participant.create({
        registration_number: regNumber,
        full_name: form.full_name.trim(),
        phone_number: form.phone_number.trim(),
        unit_division: form.unit_division.trim(),
        participant_category: medCategory.displayStatus === "FREE" ? "FREE_CHECK" : "PAYMENT",
        medical_service_id: form.medical_service_id,
        eye_service_id: form.eye_service_id,
        payment_status: "NOT_REQUIRED",
        participant_status: "REGISTERED",
        registered_by: (await base44.auth.me())?.email,
        registered_at: new Date().toISOString(),
      });

      // Generate QR tokens
      const medQrToken = generateQrToken();
      const eyeQrToken = generateQrToken();
      const medQrCodeUrl = buildQrCodeUrl(medQrToken, 120);
      const eyeQrCodeUrl = buildQrCodeUrl(eyeQrToken, 120);

      // Create queues
      const medicalQueue = await base44.entities.Queue.create({
        participant_id: participant.id,
        service_id: form.medical_service_id,
        queue_number: medQueueNum,
        queue_sequence: medSeq,
        quota_category: medCategory.category,
        payment_display_status: medCategory.displayStatus,
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
        quota_category: eyeCategory.category,
        payment_display_status: eyeCategory.displayStatus,
        status: "WAITING",
        qr_token: eyeQrToken,
        qr_code_url: eyeQrCodeUrl,
        qr_verification_status: "NOT_SCANNED",
      });

      // Update service quota counters
      const medUpdate = {
        used_total: (selectedMedical.used_total || 0) + 1,
      };
      if (medCategory.category === "FULL_FREE") medUpdate.used_full_free = (selectedMedical.used_full_free || 0) + 1;
      else if (medCategory.category === "CC_RP_1") medUpdate.used_cc_rp1 = (selectedMedical.used_cc_rp1 || 0) + 1;
      else if (medCategory.category === "FULL_PAID") medUpdate.used_full_paid = (selectedMedical.used_full_paid || 0) + 1;
      await base44.entities.Service.update(form.medical_service_id, medUpdate);

      if (!selectedEye.is_unlimited) {
        const eyeUpdate = {
          used_total: (selectedEye.used_total || 0) + 1,
        };
        if (eyeCategory.category === "FULL_FREE") eyeUpdate.used_full_free = (selectedEye.used_full_free || 0) + 1;
        else if (eyeCategory.category === "CC_RP_1") eyeUpdate.used_cc_rp1 = (selectedEye.used_cc_rp1 || 0) + 1;
        else if (eyeCategory.category === "FULL_PAID") eyeUpdate.used_full_paid = (selectedEye.used_full_paid || 0) + 1;
        await base44.entities.Service.update(form.eye_service_id, eyeUpdate);
      }

      onSuccess({ participant, medicalQueue, eyeQueue, medicalService: selectedMedical, eyeService: selectedEye });

      setForm({
        full_name: "",
        phone_number: "",
        unit_division: "",
        medical_service_id: "",
        eye_service_id: "",
      });
    } catch (err) {
      setErrors({ global: err.message || "Terjadi kesalahan. Silakan coba lagi." });
    } finally {
      setSubmitting(false);
    }
  };

  const isEventBlocked = eventSetting?.event_status === "DRAFT" || eventSetting?.event_status === "CLOSED";

  // Preview quota category for selected services
  const getPreviewCategory = (service, existingSeq) => {
    if (!service) return null;
    const nextSeq = (existingSeq || service.used_total || 0) + 1;
    return determineQuotaCategory(service, nextSeq);
  };

  const medPreview = form.medical_service_id && selectedMedical
    ? getPreviewCategory(selectedMedical, selectedMedical.used_total)
    : null;
  const eyePreview = form.eye_service_id && selectedEye
    ? getPreviewCategory(selectedEye, selectedEye.used_total)
    : null;

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
                  {medicalServices.map(s => {
                    const full = isServiceFull(s);
                    return (
                      <SelectItem key={s.id} value={s.id} disabled={full}>
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center">{s.service_code}</span>
                          <span>{s.service_name}</span>
                          {full && <Badge variant="outline" className="text-[10px] ml-1">Penuh</Badge>}
                          {!full && (
                            <span className="text-[10px] text-muted-foreground ml-1">
                              Sisa: {s.is_unlimited ? "∞" : Math.max(0, (s.full_free_quota || 0) + (s.cc_rp1_quota || 0) + (s.full_paid_quota || 0) - (s.used_total || 0))}
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {errors.medical_service_id && <p className="text-xs text-destructive mt-1">{errors.medical_service_id}</p>}
              {medPreview && !isServiceFull(selectedMedical) && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Kategori akan diterima:</span>
                  <Badge className={`text-[10px] border ${QUOTA_CATEGORY_COLORS[medPreview.category]}`}>
                    {QUOTA_CATEGORY_FULL_LABELS[medPreview.category]}
                  </Badge>
                </div>
              )}
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
                  {eyeServices.map(s => {
                    const full = isServiceFull(s);
                    return (
                      <SelectItem key={s.id} value={s.id} disabled={full}>
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded bg-accent/10 text-accent text-[10px] font-bold flex items-center justify-center">{s.service_code}</span>
                          <span>{s.service_name}</span>
                          {full && <Badge variant="outline" className="text-[10px] ml-1">Penuh</Badge>}
                          {!full && (
                            <span className="text-[10px] text-muted-foreground ml-1">
                              Sisa: {s.is_unlimited ? "∞" : Math.max(0, (s.full_free_quota || 0) + (s.cc_rp1_quota || 0) + (s.full_paid_quota || 0) - (s.used_total || 0))}
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {errors.eye_service_id && <p className="text-xs text-destructive mt-1">{errors.eye_service_id}</p>}
              {eyePreview && !isServiceFull(selectedEye) && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Kategori akan diterima:</span>
                  <Badge className={`text-[10px] border ${QUOTA_CATEGORY_COLORS[eyePreview.category]}`}>
                    {QUOTA_CATEGORY_FULL_LABELS[eyePreview.category]}
                  </Badge>
                </div>
              )}
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