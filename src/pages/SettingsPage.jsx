import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/client";
import { Button } from "@/components/ui/button";
import {
  Settings, Save, RotateCcw, Loader2, CheckCircle2, AlertCircle,
  RefreshCcw, Trash2,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import PageHeader from "@/components/layout/PageHeader";
import EventConfigForm from "@/components/settings/EventConfigForm";
import EventPreviewCard from "@/components/settings/EventPreviewCard";
import * as XLSX from "xlsx";

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

  // ── Export to Excel (used before reset) ──────────────────────────────────
  const exportToExcel = async () => {
    const [allParticipants, allQueues, allServices, allSettings] = await Promise.all([
      base44.entities.Participant.list(),
      base44.entities.Queue.list(),
      base44.entities.Service.list(),
      base44.entities.EventSetting.list(),
    ]);

    const svcMap = Object.fromEntries(allServices.map(s => [s.id, s]));
    const event = allSettings[0];

    const QUOTA_LABELS = {
      FREE: "Free Tanpa Syarat",
      RP1_BRI: "Rp 1 BRI",
      SPECIAL_PRICE: "Special Price",
    };
    const STATUS_LABELS = {
      WAITING: "Menunggu",
      CALLED: "Dipanggil",
      QR_VERIFIED: "Terverifikasi",
      SERVING: "Dilayani",
      DONE: "Selesai",
      SKIPPED: "Dilewati",
      CANCELLED: "Dibatalkan",
    };
    const PARTICIPANT_STATUS_LABELS = {
      REGISTERED: "Terdaftar",
      PARTIALLY_COMPLETED: "Sebagian Selesai",
      COMPLETED: "Selesai",
      CANCELLED: "Dibatalkan",
    };

    // Sheet 1: Participant list
    const participantRows = allParticipants.map((p, idx) => {
      const queue = allQueues.find(q => q.participant_id === p.id);
      const svc = svcMap[p.service_id] || svcMap[queue?.service_id] || {};
      return {
        "No.": idx + 1,
        "No. Reg": p.registration_number || "",
        "Nama": p.full_name || "",
        "No. Telp": p.phone_number || "",
        "Unit/Divisi": p.unit_division || "",
        "Layanan": svc.service_name || "",
        "Booth": svc.booth_number || "",
        "Status Kuota": QUOTA_LABELS[p.quota_status] || p.quota_status || "",
        "No. Antrian": queue?.queue_number || "",
        "Status Antrian": STATUS_LABELS[queue?.status] || queue?.status || "",
        "Status Peserta": PARTICIPANT_STATUS_LABELS[p.participant_status] || p.participant_status || "",
        "Waktu Daftar": p.registered_at
          ? new Date(p.registered_at).toLocaleString("id-ID")
          : "",
      };
    });

    // Sheet 2: Quota summary per service
    const quotaRows = allServices.map(svc => ({
      "Kode": svc.service_code || "",
      "Nama Layanan": svc.service_name || "",
      "Booth": svc.booth_number || "",
      "Limit Free": svc.free_quota || 0,
      "Terpakai Free": svc.used_free_quota || 0,
      "Sisa Free": Math.max(0, (svc.free_quota || 0) - (svc.used_free_quota || 0)),
      "Limit Rp1 BRI": svc.rp1_quota || 0,
      "Terpakai Rp1 BRI": svc.used_rp1_quota || 0,
      "Sisa Rp1 BRI": Math.max(0, (svc.rp1_quota || 0) - (svc.used_rp1_quota || 0)),
      "Limit Special": svc.special_quota || 0,
      "Terpakai Special": svc.used_special_quota || 0,
      "Sisa Special": Math.max(0, (svc.special_quota || 0) - (svc.used_special_quota || 0)),
    }));

    const wb = XLSX.utils.book_new();

    const ws1 = XLSX.utils.json_to_sheet(participantRows);
    ws1["!cols"] = [
      { wch: 5 }, { wch: 12 }, { wch: 28 }, { wch: 16 }, { wch: 22 },
      { wch: 22 }, { wch: 8 }, { wch: 20 }, { wch: 12 }, { wch: 16 },
      { wch: 20 }, { wch: 20 },
    ];
    XLSX.utils.book_append_sheet(wb, ws1, "Data Peserta");

    const ws2 = XLSX.utils.json_to_sheet(quotaRows);
    ws2["!cols"] = [
      { wch: 8 }, { wch: 24 }, { wch: 8 },
      { wch: 12 }, { wch: 14 }, { wch: 10 },
      { wch: 14 }, { wch: 16 }, { wch: 12 },
      { wch: 14 }, { wch: 16 }, { wch: 12 },
    ];
    XLSX.utils.book_append_sheet(wb, ws2, "Rekap Kuota");

    const eventName = event?.event_name?.replace(/\s+/g, "-") || "brilian-talks";
    const ts = new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" }).replace(/\//g, "");
    XLSX.writeFile(wb, `laporan-${eventName}-${ts}.xlsx`);
  };

  // ── Reset usage ───────────────────────────────────────────────────────────
  const [resettingUsage, setResettingUsage] = useState(false);

  const handleResetUsage = async () => {
    const confirmed = window.confirm(
      "Reset usage kuota?\n\nSebelum reset, data peserta akan diekspor otomatis ke Excel.\nCounter usage akan dikembalikan ke 0. Data antrian dan peserta TIDAK dihapus."
    );
    if (!confirmed) return;
    setResettingUsage(true);
    try {
      await exportToExcel();
      for (const svc of services) {
        await base44.entities.Service.update(svc.id, {
          used_free_quota: 0,
          used_rp1_quota: 0,
          used_special_quota: 0,
        });
      }
      queryClient.invalidateQueries({ queryKey: ["services"] });
      toast({ title: "Data diekspor & usage kuota direset ke 0!" });
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
        await base44.entities.Service.update(svc.id, {
          used_free_quota: 0,
          used_rp1_quota: 0,
          used_special_quota: 0,
        });
      }
      queryClient.invalidateQueries();
      toast({ title: "Semua data berhasil dihapus dan quota direset!" });
    } catch (err) {
      toast({ title: "Gagal menghapus data", description: err.message, variant: "destructive" });
    } finally {
      setClearingData(false);
    }
  };

  if (loadingEvent || loadingServices) {
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

      {/* ── Danger Zone ──────────────────────────────────────────────────────── */}
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
          <strong>Reset Usage Kuota</strong>: hanya mengembalikan counter usage ke 0, data peserta/antrian tetap ada.<br />
          <strong>Hapus Semua Data Peserta</strong>: menghapus semua peserta, antrian, dan mereset semua counter.
        </p>
      </div>
    </div>
  );
}
