import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/client";
import { Button } from "@/components/ui/button";
import {
  Settings, Save, RotateCcw, Loader2, CheckCircle2, AlertCircle,
  RefreshCcw, Trash2, BarChart3,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import PageHeader from "@/components/layout/PageHeader";
import EventConfigForm from "@/components/settings/EventConfigForm";
import EventPreviewCard from "@/components/settings/EventPreviewCard";
import ServiceQuotaConfig from "@/components/settings/ServiceQuotaConfig";

const DEFAULT_EVENT = {
  event_name: "Brilian Talks Health Care",
  event_headline: "Happy Physic: Strong Body, Strong Impact",
  event_tagline: "Healthy People, Healthy Performance",
  location: "BRI Pusat Cabang Benhil",
  event_date: "",
  queue_monitor_url: "",
  mobile_monitor_url: "",
  event_status: "ACTIVE",
  logo_bri_url: "",
  logo_primaya_url: "",
  logo_optik_melawai_url: "",
};

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: eventSettings = [], isLoading: loadingEvent } = useQuery({
    queryKey: ["eventSettings"],
    queryFn: () => base44.entities.EventSetting.list(),
  });

  const { data: services = [], isLoading: loadingServices } = useQuery({
    queryKey: ["services"],
    queryFn: () => base44.entities.Service.list(),
  });

  const { data: participants = [] } = useQuery({
    queryKey: ["participants"],
    queryFn: () => base44.entities.Participant.list(),
  });

  // ── Event form state ──────────────────────────────────────────────────────
  const [eventForm, setEventForm] = useState(DEFAULT_EVENT);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (eventSettings.length > 0) {
      setEventForm({ ...DEFAULT_EVENT, ...eventSettings[0] });
    }
  }, [eventSettings]);

  const handleEventChange = (updated) => {
    setEventForm(updated);
    setIsDirty(true);
    setSaved(false);
  };

  const validate = () => {
    const errs = {};
    if (!eventForm.event_name?.trim()) errs.event_name = "Nama event wajib diisi.";
    if (!eventForm.location?.trim()) errs.location = "Lokasi wajib diisi.";
    if (!eventForm.event_date) errs.event_date = "Tanggal event wajib diisi.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSaveEvent = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      if (eventSettings.length > 0) {
        await base44.entities.EventSetting.update(eventSettings[0].id, eventForm);
      } else {
        await base44.entities.EventSetting.create(eventForm);
      }
      queryClient.invalidateQueries({ queryKey: ["eventSettings"] });
      setIsDirty(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      toast({ title: "Konfigurasi berhasil disimpan!" });
    } catch (err) {
      setErrors({ global: err.message || "Gagal menyimpan. Coba lagi." });
    } finally {
      setSaving(false);
    }
  };

  const handleResetEvent = () => {
    if (eventSettings.length > 0) setEventForm({ ...DEFAULT_EVENT, ...eventSettings[0] });
    else setEventForm(DEFAULT_EVENT);
    setErrors({});
    setIsDirty(false);
  };

  // ── Service quota state ───────────────────────────────────────────────────
  const [servicesForm, setServicesForm] = useState([]);
  const [servicesDirty, setServicesDirty] = useState(false);
  const [savingServices, setSavingServices] = useState(false);
  const [serviceErrors, setServiceErrors] = useState({});

  useEffect(() => {
    if (services.length > 0) {
      setServicesForm(services);
    }
  }, [services]);

  const handleServicesChange = (updated) => {
    setServicesForm(updated);
    setServicesDirty(true);
  };

  const validateServices = () => {
    const errs = {};
    for (const s of servicesForm) {
      const sErrs = {};
      if (!s.booth_number) sErrs.booth_number = "Wajib diisi";
      if ((s.free_quota || 0) < (s.used_free_quota || 0))
        sErrs.free_quota = `Min ${s.used_free_quota}`;
      if ((s.paid_quota || 0) < (s.used_paid_quota || 0))
        sErrs.paid_quota = `Min ${s.used_paid_quota}`;
      if (Object.keys(sErrs).length > 0) errs[s.id] = sErrs;
    }
    setServiceErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSaveServices = async () => {
    if (!validateServices()) return;
    setSavingServices(true);
    try {
      for (const svc of servicesForm) {
        await base44.entities.Service.update(svc.id, svc);
      }
      queryClient.invalidateQueries({ queryKey: ["services"] });
      setServicesDirty(false);
      toast({ title: "Kuota layanan berhasil disimpan!" });
    } catch (err) {
      toast({ title: "Gagal menyimpan kuota", description: err.message, variant: "destructive" });
    } finally {
      setSavingServices(false);
    }
  };

  const handleResetServicesForm = () => {
    setServicesForm(services);
    setServicesDirty(false);
    setServiceErrors({});
  };

  // ── Reset usage ───────────────────────────────────────────────────────────
  const [resettingUsage, setResettingUsage] = useState(false);

  const handleResetUsage = async () => {
    const confirmed = window.confirm(
      "Reset usage kuota?\n\nIni akan mengembalikan used_free_quota dan used_paid_quota semua layanan ke 0.\nData antrian dan peserta TIDAK dihapus."
    );
    if (!confirmed) return;
    setResettingUsage(true);
    try {
      for (const svc of services) {
        await base44.entities.Service.update(svc.id, {
          used_free_quota: 0,
          used_rp1_quota: 0,
          used_special_quota: 0,
        });
      }
      queryClient.invalidateQueries({ queryKey: ["services"] });
      // Refresh servicesForm
      const freshServices = await base44.entities.Service.list();
      setServicesForm(freshServices);
      toast({ title: "Usage kuota berhasil direset ke 0!" });
    } catch (err) {
      toast({ title: "Gagal reset usage", description: err.message, variant: "destructive" });
    } finally {
      setResettingUsage(false);
    }
  };

  // ── Clear all data ────────────────────────────────────────────────────────
  const [clearingData, setClearingData] = useState(false);

  const handleClearAllData = async () => {
    const confirmed = window.confirm(
      "⚠️ HAPUS SEMUA DATA?\n\nIni akan menghapus:\n• Semua peserta\n• Semua antrian\n• Reset semua usage kuota ke 0\n\nTindakan ini TIDAK BISA dibatalkan!"
    );
    if (!confirmed) return;
    setClearingData(true);
    try {
      const allQueues = await base44.entities.Queue.list();
      for (const q of allQueues) await base44.entities.Queue.delete(q.id);
      const allParticipants = await base44.entities.Participant.list();
      for (const p of allParticipants) await base44.entities.Participant.delete(p.id);
      for (const svc of services) {
        await base44.entities.Service.update(svc.id, { used_free_quota: 0, used_rp1_quota: 0, used_special_quota: 0 });
      }
      queryClient.invalidateQueries();
      const freshServices = await base44.entities.Service.list();
      setServicesForm(freshServices);
      toast({ title: "Semua data berhasil dihapus dan quota direset!" });
    } catch (err) {
      toast({ title: "Gagal menghapus data", description: err.message, variant: "destructive" });
    } finally {
      setClearingData(false);
    }
  };

  const isLoading = loadingEvent || loadingServices;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* ── Event Config ─────────────────────────────────────────────────────── */}
      <div>
        <PageHeader
          title="Konfigurasi Event"
          subtitle="Pengaturan event, logo, dan URL monitor"
          icon={Settings}
          action={
            <div className="flex items-center gap-2">
              {isDirty && (
                <Button variant="outline" size="sm" className="gap-1.5" onClick={handleResetEvent}>
                  <RotateCcw className="w-4 h-4" /> Reset
                </Button>
              )}
              <Button size="sm" className="gap-1.5" onClick={handleSaveEvent} disabled={saving || !isDirty}>
                {saving ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...</>
                ) : saved ? (
                  <><CheckCircle2 className="w-4 h-4" /> Tersimpan!</>
                ) : (
                  <><Save className="w-4 h-4" /> Simpan Konfigurasi</>
                )}
              </Button>
            </div>
          }
        />

        {errors.global && (
          <div className="flex items-center gap-2 p-3 mt-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {errors.global}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          <div className="lg:col-span-1">
            <EventConfigForm
              form={eventForm}
              onChange={handleEventChange}
              errors={errors}
              totalParticipants={participants.length}
            />
          </div>
          <div className="lg:col-span-2">
            <EventPreviewCard
              form={eventForm}
              totalParticipants={participants.length}
            />
          </div>
        </div>
      </div>

      {/* ── Quota CRUD ───────────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" /> Master Kuota Layanan
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Atur kuota, booth, dan status setiap layanan
            </p>
          </div>
          <div className="flex items-center gap-2">
            {servicesDirty && (
              <Button variant="outline" size="sm" className="gap-1.5" onClick={handleResetServicesForm}>
                <RotateCcw className="w-4 h-4" /> Batalkan
              </Button>
            )}
            <Button
              size="sm"
              className="gap-1.5"
              onClick={handleSaveServices}
              disabled={savingServices || !servicesDirty}
            >
              {savingServices
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...</>
                : <><Save className="w-4 h-4" /> Simpan Kuota</>}
            </Button>
          </div>
        </div>

        <ServiceQuotaConfig
          services={servicesForm}
          onChange={handleServicesChange}
          serviceErrors={serviceErrors}
        />
      </div>

      {/* ── Danger Zone: Reset & Clear ───────────────────────────────────────── */}
      <div className="border border-border rounded-xl p-5">
        <h3 className="text-sm font-bold text-foreground mb-1">Zona Reset</h3>
        <p className="text-xs text-muted-foreground mb-4">
          Operasi di bawah mempengaruhi data usage dan peserta. Lakukan dengan hati-hati.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 border-amber-300 text-amber-700 hover:bg-amber-50"
            onClick={handleResetUsage}
            disabled={resettingUsage}
          >
            {resettingUsage
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Mereset...</>
              : <><RefreshCcw className="w-4 h-4" /> Reset Usage Kuota</>}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 border-destructive text-destructive hover:bg-red-50"
            onClick={handleClearAllData}
            disabled={clearingData}
          >
            {clearingData
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Menghapus...</>
              : <><Trash2 className="w-4 h-4" /> Hapus Semua Data Peserta</>}
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground mt-3">
          <strong>Reset Usage Kuota</strong>: hanya mengembalikan counter used_free_quota ke 0, data peserta/antrian tetap ada.<br />
          <strong>Hapus Semua Data Peserta</strong>: menghapus semua peserta, antrian, dan mereset semua counter.
        </p>
      </div>
    </div>
  );
}
