import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowLeft, Save, Loader2, CheckCircle2, AlertCircle,
  Settings, Stethoscope, Eye, Star, RotateCcw, Calendar,
  MapPin, Users, Globe
} from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";

const STATUS_COLORS = {
  DRAFT: "bg-gray-100 text-gray-700 border-gray-200",
  ACTIVE: "bg-green-100 text-green-700 border-green-200",
  CLOSED: "bg-red-100 text-red-700 border-red-200",
};
const STATUS_LABELS = {
  DRAFT: "Draft — Pendaftaran belum dibuka",
  ACTIVE: "Active — Pendaftaran dibuka",
  CLOSED: "Closed — Pendaftaran ditutup",
};

function ServiceQuotaRow({ sq, onChange }) {
  const isEye = sq.service_group === "EYE_CHECK";
  const set = (field, val) => onChange({ ...sq, [field]: val });
  const total = (sq.full_free_quota || 0) + (sq.cc_rp1_quota || 0) + (sq.full_paid_quota || 0);

  return (
    <div className={`rounded-xl border-2 p-4 transition-all ${sq.is_active ? "border-border bg-card" : "border-dashed border-muted bg-muted/20"}`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-black flex-shrink-0
            ${isEye ? "bg-accent/10 text-accent" : "bg-primary/10 text-primary"}`}>
            {sq.service_code}
          </div>
          <div>
            <p className="font-semibold text-sm">{sq.service_name}</p>
            <p className="text-xs text-muted-foreground">{isEye ? "Pemeriksaan Mata" : "Layanan Medis"} · Booth {sq.booth_number || "—"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{sq.is_active ? "Aktif" : "Off"}</span>
          <Switch checked={!!sq.is_active} onCheckedChange={v => set("is_active", v)} />
        </div>
      </div>

      {sq.is_active && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
            <div>
              <Label className="text-xs font-medium">No. Booth</Label>
              <Input type="number" min={1} className="mt-1 h-8 text-sm"
                value={sq.booth_number || ""} onChange={e => set("booth_number", parseInt(e.target.value) || "")} />
            </div>
            <div className="flex flex-col justify-end pb-0.5">
              <Label className="text-xs font-medium mb-1">Unlimited</Label>
              <div className="flex items-center gap-2">
                <Switch checked={!!sq.is_unlimited} onCheckedChange={v => set("is_unlimited", v)} />
                <span className="text-xs text-muted-foreground">{sq.is_unlimited ? "Ya" : "Tidak"}</span>
              </div>
            </div>
          </div>

          {!sq.is_unlimited && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="bg-green-50/60 rounded-lg p-3 border border-green-100">
                  <Label className="text-xs font-semibold text-green-700">Tanpa Syarat (Free)</Label>
                  <Input type="number" min={0} className="mt-1 h-8 text-sm"
                    value={sq.full_free_quota ?? 0} onChange={e => set("full_free_quota", parseInt(e.target.value) || 0)} />
                </div>
                <div className="bg-blue-50/60 rounded-lg p-3 border border-blue-100">
                  <Label className="text-xs font-semibold text-blue-700">Dengan CC Rp 1</Label>
                  <Input type="number" min={0} className="mt-1 h-8 text-sm"
                    value={sq.cc_rp1_quota ?? 0} onChange={e => set("cc_rp1_quota", parseInt(e.target.value) || 0)} />
                </div>
                <div className="bg-orange-50/60 rounded-lg p-3 border border-orange-100">
                  <Label className="text-xs font-semibold text-orange-600">Berbayar Penuh</Label>
                  <Input type="number" min={0} className="mt-1 h-8 text-sm"
                    value={sq.full_paid_quota ?? 0} onChange={e => set("full_paid_quota", parseInt(e.target.value) || 0)} />
                </div>
              </div>
              <div className="mt-2 flex items-center gap-3 px-2 py-1.5 bg-muted/40 rounded-lg text-xs">
                <span className="text-muted-foreground">Total Slot:</span>
                <span className="font-bold">{total}</span>
              </div>
            </>
          )}
          {sq.is_unlimited && (
            <div className="mt-1 px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700 font-medium">
              ∞ Layanan ini memiliki kuota tidak terbatas (Unlimited)
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function EventDetail() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Get event ID from URL
  const eventId = window.location.pathname.split("/events/")[1];

  const { data: event, isLoading } = useQuery({
    queryKey: ["event", eventId],
    queryFn: () => base44.entities.Event.filter({ id: eventId }).then(r => r[0]),
    enabled: !!eventId,
  });

  const { data: services = [] } = useQuery({
    queryKey: ["services"],
    queryFn: () => base44.entities.Service.list(),
  });

  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [errors, setErrors] = useState({});

  // Initialize form from event + merge with current services
  useEffect(() => {
    if (event && services.length > 0) {
      const existingQuotas = event.service_quotas || [];
      // Merge: for each service, find existing quota config or create default
      const mergedQuotas = services.map(svc => {
        const existing = existingQuotas.find(sq => sq.service_id === svc.id);
        if (existing) return existing;
        return {
          service_id: svc.id,
          service_code: svc.service_code,
          service_name: svc.service_name,
          service_group: svc.service_group,
          booth_number: svc.booth_number || "",
          full_free_quota: 0,
          cc_rp1_quota: 0,
          full_paid_quota: 0,
          is_unlimited: false,
          is_active: true,
        };
      });
      setForm({ ...event, service_quotas: mergedQuotas });
      setIsDirty(false);
    }
  }, [event, services]);

  const handleEventChange = (field, value) => {
    setForm(p => ({ ...p, [field]: value }));
    setIsDirty(true);
    setSaved(false);
  };

  const handleQuotaChange = (updated) => {
    setForm(p => ({
      ...p,
      service_quotas: (p.service_quotas || []).map(sq =>
        sq.service_id === updated.service_id ? updated : sq
      ),
    }));
    setIsDirty(true);
    setSaved(false);
  };

  const validate = () => {
    const errs = {};
    if (!form.event_name?.trim()) errs.event_name = "Nama event wajib diisi.";
    if (!form.location?.trim()) errs.location = "Lokasi wajib diisi.";
    if (!form.event_date) errs.event_date = "Tanggal event wajib diisi.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    await base44.entities.Event.update(eventId, form);
    queryClient.invalidateQueries({ queryKey: ["event", eventId] });
    queryClient.invalidateQueries({ queryKey: ["events"] });
    setSaving(false);
    setSaved(true);
    setIsDirty(false);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleReset = () => {
    if (event && services.length > 0) {
      const existingQuotas = event.service_quotas || [];
      const mergedQuotas = services.map(svc => {
        const existing = existingQuotas.find(sq => sq.service_id === svc.id);
        return existing || {
          service_id: svc.id, service_code: svc.service_code, service_name: svc.service_name,
          service_group: svc.service_group, booth_number: svc.booth_number || "",
          full_free_quota: 0, cc_rp1_quota: 0, full_paid_quota: 0,
          is_unlimited: false, is_active: true,
        };
      });
      setForm({ ...event, service_quotas: mergedQuotas });
    }
    setErrors({});
    setIsDirty(false);
  };

  if (isLoading || !form) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const medicalQuotas = (form.service_quotas || []).filter(sq => sq.service_group === "MEDICAL");
  const eyeQuotas = (form.service_quotas || []).filter(sq => sq.service_group === "EYE_CHECK");

  return (
    <div className="space-y-6">
      <PageHeader
        title={form.event_name || "Detail Event"}
        subtitle="Konfigurasi lengkap event dan kuota layanan"
        icon={Settings}
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/settings")} className="gap-1.5">
              <ArrowLeft className="w-4 h-4" /> Kembali
            </Button>
            {isDirty && (
              <Button variant="outline" size="sm" onClick={handleReset} className="gap-1.5">
                <RotateCcw className="w-4 h-4" /> Reset
              </Button>
            )}
            <Button size="sm" onClick={handleSave} disabled={saving || !isDirty} className="gap-1.5">
              {saving ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...</>
              ) : saved ? (
                <><CheckCircle2 className="w-4 h-4" /> Tersimpan!</>
              ) : (
                <><Save className="w-4 h-4" /> Simpan</>
              )}
            </Button>
          </div>
        }
      />

      {form.is_active_event && (
        <div className="flex items-center gap-2 p-3 bg-primary/5 border border-primary/20 rounded-lg text-sm text-primary font-medium">
          <Star className="w-4 h-4 flex-shrink-0" />
          Event ini sedang aktif digunakan oleh sistem pendaftaran.
        </div>
      )}

      {saved && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> Konfigurasi berhasil disimpan.
        </div>
      )}

      {Object.keys(errors).length > 0 && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {Object.values(errors)[0]}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* LEFT: Event Config */}
        <div className="xl:col-span-1 space-y-4">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-primary" /> Informasi Event
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Status */}
              <div>
                <Label className="text-xs font-medium">Status Event</Label>
                <Select value={form.event_status || "DRAFT"} onValueChange={v => handleEventChange("event_status", v)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        <div className="flex items-center gap-2">
                          <Badge className={`text-[10px] border px-1.5 py-0 ${STATUS_COLORS[k]}`}>{k}</Badge>
                          <span className="text-xs">{v.split(" — ")[1]}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-medium">Nama Event <span className="text-destructive">*</span></Label>
                <Input className={`mt-1 ${errors.event_name ? "border-destructive" : ""}`}
                  value={form.event_name || ""} onChange={e => handleEventChange("event_name", e.target.value)} />
                {errors.event_name && <p className="text-xs text-destructive mt-1">{errors.event_name}</p>}
              </div>

              <div>
                <Label className="text-xs font-medium">Event Headline</Label>
                <Input className="mt-1" placeholder="Happy Physic: Strong Body, Strong Impact"
                  value={form.event_headline || ""} onChange={e => handleEventChange("event_headline", e.target.value)} />
              </div>

              <div>
                <Label className="text-xs font-medium">Event Tagline</Label>
                <Input className="mt-1" placeholder="Healthy People, Healthy Performance"
                  value={form.event_tagline || ""} onChange={e => handleEventChange("event_tagline", e.target.value)} />
              </div>

              <div>
                <Label className="text-xs font-medium">Lokasi <span className="text-destructive">*</span></Label>
                <Input className={`mt-1 ${errors.location ? "border-destructive" : ""}`}
                  value={form.location || ""} onChange={e => handleEventChange("location", e.target.value)} />
                {errors.location && <p className="text-xs text-destructive mt-1">{errors.location}</p>}
              </div>

              <div>
                <Label className="text-xs font-medium">Tanggal Event <span className="text-destructive">*</span></Label>
                <Input type="date" className={`mt-1 ${errors.event_date ? "border-destructive" : ""}`}
                  value={form.event_date || ""} onChange={e => handleEventChange("event_date", e.target.value)} />
                {errors.event_date && <p className="text-xs text-destructive mt-1">{errors.event_date}</p>}
              </div>

              <div>
                <Label className="text-xs font-medium">Maks. Peserta</Label>
                <Input type="number" min={1} className="mt-1"
                  value={form.max_participants || 200} onChange={e => handleEventChange("max_participants", parseInt(e.target.value) || 0)} />
              </div>

              <div className="border-t border-border pt-3 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">URL Monitor</p>
                <div>
                  <Label className="text-xs font-medium">URL LED Monitor</Label>
                  <Input className="mt-1 font-mono text-xs" placeholder="https://..."
                    value={form.queue_monitor_url || ""} onChange={e => handleEventChange("queue_monitor_url", e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs font-medium">URL Mobile Monitor</Label>
                  <Input className="mt-1 font-mono text-xs" placeholder="https://..."
                    value={form.mobile_monitor_url || ""} onChange={e => handleEventChange("mobile_monitor_url", e.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Preview mini */}
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
            <CardContent className="p-4">
              <div className="bg-primary rounded-xl p-4 text-primary-foreground text-center mb-3">
                <Badge className={`mb-2 text-[10px] border ${STATUS_COLORS[form.event_status || "DRAFT"]}`}>
                  {form.event_status || "DRAFT"}
                </Badge>
                <h3 className="font-black text-base leading-tight">{form.event_name || "Nama Event"}</h3>
                {form.event_headline && <p className="text-xs text-primary-foreground/80 mt-1">{form.event_headline}</p>}
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{form.location || "—"}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{form.event_date || "—"}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="w-3.5 h-3.5" />
                  <span>Kapasitas: {form.max_participants || 0} peserta</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT: Quota Config per Service */}
        <div className="xl:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Stethoscope className="w-4 h-4 text-primary" /> Kuota Layanan Medis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {medicalQuotas.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Tidak ada layanan medis terdaftar.</p>
              ) : medicalQuotas.map(sq => (
                <ServiceQuotaRow key={sq.service_id} sq={sq} onChange={handleQuotaChange} />
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Eye className="w-4 h-4 text-accent" /> Kuota Pemeriksaan Mata
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {eyeQuotas.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Tidak ada layanan mata terdaftar.</p>
              ) : eyeQuotas.map(sq => (
                <ServiceQuotaRow key={sq.service_id} sq={sq} onChange={handleQuotaChange} />
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}