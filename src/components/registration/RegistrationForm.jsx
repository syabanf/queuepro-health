import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Loader2, AlertCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { getServicePrefix, formatQueueNumber, getNextQueueSequence, generateRegistrationNumber, SLOT_TYPE_COLORS } from "@/lib/registrationUtils";
import QuotaWarning from "./QuotaWarning";

const PAYMENT_OPTIONS = [
  { value: "VERIFIED_OUTSIDE_SYSTEM", label: "Terverifikasi (Luar Sistem)" },
  { value: "PENDING_MANUAL_CONFIRMATION", label: "Menunggu Konfirmasi Manual" },
  { value: "NOT_REQUIRED", label: "Tidak Diperlukan" },
];

export default function RegistrationForm({ services, totalParticipants, onSuccess }) {
  const [form, setForm] = useState({
    full_name: "",
    phone_number: "",
    unit_division: "",
    medical_service_id: "",
    medical_slot_type: "",
    eye_service_id: "",
    eye_slot_type: "",
    payment_status: "NOT_REQUIRED",
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const medicalServices = services.filter(s => s.service_group === "MEDICAL" && s.is_active);
  const eyeServices = services.filter(s => s.service_group === "EYE_CHECK" && s.is_active);

  const selectedMedical = services.find(s => s.id === form.medical_service_id);
  const selectedEye = services.find(s => s.id === form.eye_service_id);

  const getMedicalFreeRemaining = () => selectedMedical ? (selectedMedical.free_quota || 0) - (selectedMedical.used_free_quota || 0) : 0;
  const getMedicalPaidRemaining = () => selectedMedical ? (selectedMedical.paid_quota || 0) - (selectedMedical.used_paid_quota || 0) : 0;
  const getEyeFreeRemaining = () => selectedEye ? (selectedEye.free_quota || 0) - (selectedEye.used_free_quota || 0) : 0;
  const getEyePaidRemaining = () => selectedEye ? (selectedEye.paid_quota || 0) - (selectedEye.used_paid_quota || 0) : 0;

  // If quota is 0/unset, treat as unlimited (not disabled)
  const hasQuotaSet = (service) => service && ((service.free_quota || 0) + (service.paid_quota || 0)) > 0;

  const isMedicalSlotDisabled = (slotType) => {
    if (!selectedMedical || !hasQuotaSet(selectedMedical)) return false;
    if (slotType === "FREE") return (selectedMedical.free_quota || 0) > 0 && getMedicalFreeRemaining() <= 0;
    if (slotType === "PAID") return (selectedMedical.paid_quota || 0) > 0 && getMedicalPaidRemaining() <= 0;
    return false;
  };

  const isEyeSlotDisabled = (slotType) => {
    if (!selectedEye || !hasQuotaSet(selectedEye)) return false;
    if (slotType === "FREE") return (selectedEye.free_quota || 0) > 0 && getEyeFreeRemaining() <= 0;
    if (slotType === "PAID") return (selectedEye.paid_quota || 0) > 0 && getEyePaidRemaining() <= 0;
    return false;
  };

  const isServiceFull = (service) => {
    if (!service || !hasQuotaSet(service)) return false;
    return (service.free_quota || 0) - (service.used_free_quota || 0) <= 0 &&
           (service.paid_quota || 0) - (service.used_paid_quota || 0) <= 0;
  };

  const validate = () => {
    const errs = {};
    if (!form.full_name.trim()) errs.full_name = "Nama lengkap wajib diisi.";
    if (!form.phone_number.trim()) errs.phone_number = "Nomor telepon wajib diisi.";
    if (!form.unit_division.trim()) errs.unit_division = "Unit / Divisi wajib diisi.";
    if (!form.medical_service_id) errs.medical_service_id = "Layanan medis wajib dipilih.";
    if (!form.medical_slot_type) errs.medical_slot_type = "Tipe slot medis wajib dipilih.";
    if (!form.eye_service_id) errs.eye_service_id = "Layanan mata wajib dipilih.";
    if (!form.eye_slot_type) errs.eye_slot_type = "Tipe slot mata wajib dipilih.";
    if (totalParticipants >= 200) errs.global = "Kuota maksimal 200 peserta sudah tercapai.";

    if (form.medical_service_id && form.medical_slot_type && selectedMedical && hasQuotaSet(selectedMedical)) {
      if (form.medical_slot_type === "FREE" && (selectedMedical.free_quota || 0) > 0 && getMedicalFreeRemaining() <= 0)
        errs.medical_slot_type = "Kuota gratis layanan medis ini sudah habis.";
      if (form.medical_slot_type === "PAID" && (selectedMedical.paid_quota || 0) > 0 && getMedicalPaidRemaining() <= 0)
        errs.medical_slot_type = "Kuota berbayar layanan medis ini sudah habis.";
    }

    if (form.eye_service_id && form.eye_slot_type && selectedEye && hasQuotaSet(selectedEye)) {
      if (form.eye_slot_type === "FREE" && (selectedEye.free_quota || 0) > 0 && getEyeFreeRemaining() <= 0)
        errs.eye_slot_type = "Kuota gratis layanan mata ini sudah habis.";
      if (form.eye_slot_type === "PAID" && (selectedEye.paid_quota || 0) > 0 && getEyePaidRemaining() <= 0)
        errs.eye_slot_type = "Kuota berbayar layanan mata ini sudah habis.";
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
      // Get current participant count for reg number
      const allParticipants = await base44.entities.Participant.list();
      const regNumber = generateRegistrationNumber(allParticipants.length + 1);

      // Get queue sequences
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
        medical_service_id: form.medical_service_id,
        medical_slot_type: form.medical_slot_type,
        eye_service_id: form.eye_service_id,
        eye_slot_type: form.eye_slot_type,
        payment_status: form.payment_status,
        participant_status: "REGISTERED",
        registered_by: (await base44.auth.me())?.email,
        registered_at: new Date().toISOString(),
      });

      // Create medical queue
      const medicalQueue = await base44.entities.Queue.create({
        participant_id: participant.id,
        service_id: form.medical_service_id,
        queue_number: medQueueNum,
        queue_sequence: medSeq,
        slot_type: form.medical_slot_type,
        status: "WAITING",
      });

      // Create eye queue
      const eyeQueue = await base44.entities.Queue.create({
        participant_id: participant.id,
        service_id: form.eye_service_id,
        queue_number: eyeQueueNum,
        queue_sequence: eyeSeq,
        slot_type: form.eye_slot_type,
        status: "WAITING",
      });

      // Deduct quotas
      const medUpdate = form.medical_slot_type === "FREE"
        ? { used_free_quota: (selectedMedical.used_free_quota || 0) + 1 }
        : { used_paid_quota: (selectedMedical.used_paid_quota || 0) + 1 };
      await base44.entities.Service.update(form.medical_service_id, medUpdate);

      const eyeUpdate = form.eye_slot_type === "FREE"
        ? { used_free_quota: (selectedEye.used_free_quota || 0) + 1 }
        : { used_paid_quota: (selectedEye.used_paid_quota || 0) + 1 };
      await base44.entities.Service.update(form.eye_service_id, eyeUpdate);

      onSuccess({
        participant,
        medicalQueue,
        eyeQueue,
        medicalService: selectedMedical,
        eyeService: selectedEye,
      });

      // Reset form
      setForm({
        full_name: "",
        phone_number: "",
        unit_division: "",
        medical_service_id: "",
        medical_slot_type: "",
        eye_service_id: "",
        eye_slot_type: "",
        payment_status: "NOT_REQUIRED",
      });
    } catch (err) {
      setErrors({ global: err.message || "Terjadi kesalahan. Silakan coba lagi." });
    } finally {
      setSubmitting(false);
    }
  };

  const handleMedicalServiceChange = (val) => {
    setForm(prev => ({ ...prev, medical_service_id: val, medical_slot_type: "" }));
    setErrors(prev => ({ ...prev, medical_service_id: undefined, medical_slot_type: undefined }));
  };

  const handleEyeServiceChange = (val) => {
    setForm(prev => ({ ...prev, eye_service_id: val, eye_slot_type: "" }));
    setErrors(prev => ({ ...prev, eye_service_id: undefined, eye_slot_type: undefined }));
  };

  const SlotRadio = ({ value, label, disabled, selected }) => (
    <div className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border-2 cursor-pointer transition-all
      ${disabled ? "opacity-40 cursor-not-allowed border-border bg-muted/30" : 
        selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 bg-card"}`}
    >
      <RadioGroupItem value={value} id={`slot-${value}-${label}`} disabled={disabled} />
      <Label htmlFor={`slot-${value}-${label}`} className={`text-sm font-medium cursor-pointer ${disabled ? "cursor-not-allowed" : ""}`}>
        {label}
      </Label>
      {disabled && <Badge variant="outline" className="ml-auto text-[10px]">Penuh</Badge>}
    </div>
  );

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

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Participant Data */}
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Data Peserta</h3>
            <div className="space-y-3">
              <div>
                <Label htmlFor="full_name" className="text-xs font-medium">Nama Lengkap <span className="text-destructive">*</span></Label>
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
                <Label htmlFor="phone" className="text-xs font-medium">Nomor Telepon <span className="text-destructive">*</span></Label>
                <Input
                  id="phone"
                  placeholder="Contoh: 08123456789"
                  value={form.phone_number}
                  onChange={e => setForm(p => ({ ...p, phone_number: e.target.value }))}
                  className={`mt-1 ${errors.phone_number ? "border-destructive" : ""}`}
                />
                {errors.phone_number && <p className="text-xs text-destructive mt-1">{errors.phone_number}</p>}
              </div>
              <div>
                <Label htmlFor="unit" className="text-xs font-medium">Unit / Divisi <span className="text-destructive">*</span></Label>
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

          {/* Medical Service */}
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Layanan Medis</h3>
            <div className="space-y-3">
              <div>
                <Label className="text-xs font-medium">Pilih Layanan Medis <span className="text-destructive">*</span></Label>
                <Select value={form.medical_service_id} onValueChange={handleMedicalServiceChange}>
                  <SelectTrigger className={`mt-1 ${errors.medical_service_id ? "border-destructive" : ""}`}>
                    <SelectValue placeholder="Pilih layanan medis..." />
                  </SelectTrigger>
                  <SelectContent>
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
              {form.medical_service_id && (
                <div>
                  <Label className="text-xs font-medium">Tipe Slot Medis <span className="text-destructive">*</span></Label>
                  <RadioGroup
                    value={form.medical_slot_type}
                    onValueChange={val => setForm(p => ({ ...p, medical_slot_type: val }))}
                    className="grid grid-cols-2 gap-2 mt-1"
                  >
                    <SlotRadio value="FREE" label="Gratis (FREE)" disabled={isMedicalSlotDisabled("FREE")} selected={form.medical_slot_type === "FREE"} />
                    <SlotRadio value="PAID" label="Berbayar (PAID)" disabled={isMedicalSlotDisabled("PAID")} selected={form.medical_slot_type === "PAID"} />
                  </RadioGroup>
                  {errors.medical_slot_type && <p className="text-xs text-destructive mt-1">{errors.medical_slot_type}</p>}
                  <QuotaWarning service={selectedMedical} slotType={form.medical_slot_type} />
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-border" />

          {/* Eye Check Service */}
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Pemeriksaan Mata</h3>
            <div className="space-y-3">
              <div>
                <Label className="text-xs font-medium">Pilih Layanan Mata <span className="text-destructive">*</span></Label>
                <Select value={form.eye_service_id} onValueChange={handleEyeServiceChange}>
                  <SelectTrigger className={`mt-1 ${errors.eye_service_id ? "border-destructive" : ""}`}>
                    <SelectValue placeholder="Pilih layanan pemeriksaan mata..." />
                  </SelectTrigger>
                  <SelectContent>
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
              {form.eye_service_id && (
                <div>
                  <Label className="text-xs font-medium">Tipe Slot Mata <span className="text-destructive">*</span></Label>
                  <RadioGroup
                    value={form.eye_slot_type}
                    onValueChange={val => setForm(p => ({ ...p, eye_slot_type: val }))}
                    className="grid grid-cols-2 gap-2 mt-1"
                  >
                    <SlotRadio value="FREE" label="Gratis (FREE)" disabled={isEyeSlotDisabled("FREE")} selected={form.eye_slot_type === "FREE"} />
                    <SlotRadio value="PAID" label="Berbayar (PAID)" disabled={isEyeSlotDisabled("PAID")} selected={form.eye_slot_type === "PAID"} />
                  </RadioGroup>
                  {errors.eye_slot_type && <p className="text-xs text-destructive mt-1">{errors.eye_slot_type}</p>}
                  <QuotaWarning service={selectedEye} slotType={form.eye_slot_type} />
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-border" />

          {/* Payment Note */}
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Catatan Pembayaran</h3>
            <Select value={form.payment_status} onValueChange={val => setForm(p => ({ ...p, payment_status: val }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_OPTIONS.map(o => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Memproses...</>
            ) : (
              <><UserPlus className="w-4 h-4 mr-2" /> Daftarkan Peserta</>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}