import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Settings, Save, RotateCcw, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import EventConfigForm from "@/components/settings/EventConfigForm";
import EventPreviewCard from "@/components/settings/EventPreviewCard";

const DEFAULT_EVENT = {
  event_name: "Brilian Talks Health Care",
  event_headline: "Happy Physic: Strong Body, Strong Impact",
  event_tagline: "Healthy People, Healthy Performance",
  location: "BRI Pusat Cabang Benhil",
  event_date: "",
  queue_monitor_url: "",
  mobile_monitor_url: "",
  event_status: "ACTIVE",
};

export default function SettingsPage() {
  const queryClient = useQueryClient();

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

  const [eventForm, setEventForm] = useState(DEFAULT_EVENT);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Seed form from DB once loaded
  useEffect(() => {
    if (eventSettings.length > 0) {
      const e = eventSettings[0];
      setEventForm({ ...DEFAULT_EVENT, ...e });
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

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      // Save event setting
      if (eventSettings.length > 0) {
        await base44.entities.EventSetting.update(eventSettings[0].id, eventForm);
      } else {
        await base44.entities.EventSetting.create(eventForm);
      }

      queryClient.invalidateQueries({ queryKey: ["eventSettings"] });
      setIsDirty(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setErrors({ global: err.message || "Gagal menyimpan. Coba lagi." });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (eventSettings.length > 0) setEventForm({ ...DEFAULT_EVENT, ...eventSettings[0] });
    else setEventForm(DEFAULT_EVENT);
    setErrors({});
    setIsDirty(false);
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
    <div className="space-y-6">
      <PageHeader
        title="Konfigurasi Event"
        subtitle="Pengaturan event dan kuota layanan"
        icon={Settings}
        action={
          <div className="flex items-center gap-2">
            {isDirty && (
              <Button variant="outline" size="sm" className="gap-1.5" onClick={handleReset}>
                <RotateCcw className="w-4 h-4" /> Reset
              </Button>
            )}
            <Button
              size="sm"
              className="gap-1.5"
              onClick={handleSave}
              disabled={saving || !isDirty}
            >
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
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {errors.global}
        </div>
      )}

      {saved && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          Konfigurasi berhasil disimpan.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
  );
}