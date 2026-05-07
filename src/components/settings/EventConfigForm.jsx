import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Users, Globe, Tag, FileText } from "lucide-react";

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

export default function EventConfigForm({ form, onChange, errors, totalParticipants = 0 }) {
  const set = (field, value) => onChange({ ...form, [field]: value });

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <Calendar className="w-5 h-5 text-primary" />
          Konfigurasi Event
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Event Status */}
        <div>
          <Label className="text-xs font-medium">Status Event <span className="text-destructive">*</span></Label>
          <Select value={form.event_status || "ACTIVE"} onValueChange={v => set("event_status", v)}>
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
          {form.event_status === "DRAFT" && (
            <p className="text-xs text-amber-600 mt-1">⚠ Status DRAFT — pendaftaran tidak dapat dimulai.</p>
          )}
          {form.event_status === "CLOSED" && (
            <p className="text-xs text-red-600 mt-1">⛔ Status CLOSED — pendaftaran dinonaktifkan.</p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3">
          {/* Event Name */}
          <div>
            <Label className="text-xs font-medium">Nama Event <span className="text-destructive">*</span></Label>
            <Input
              className={`mt-1 ${errors?.event_name ? "border-destructive" : ""}`}
              placeholder="Brilian Talks Health Care"
              value={form.event_name || ""}
              onChange={e => set("event_name", e.target.value)}
            />
            {errors?.event_name && <p className="text-xs text-destructive mt-1">{errors.event_name}</p>}
          </div>

          {/* Headline */}
          <div>
            <Label className="text-xs font-medium">Event Headline</Label>
            <Input
              className="mt-1"
              placeholder="Happy Physic: Strong Body, Strong Impact"
              value={form.event_headline || ""}
              onChange={e => set("event_headline", e.target.value)}
            />
          </div>

          {/* Tagline */}
          <div>
            <Label className="text-xs font-medium">Event Tagline</Label>
            <Input
              className="mt-1"
              placeholder="Healthy People, Healthy Performance"
              value={form.event_tagline || ""}
              onChange={e => set("event_tagline", e.target.value)}
            />
          </div>

          {/* Location */}
          <div>
            <Label className="text-xs font-medium">Lokasi Event <span className="text-destructive">*</span></Label>
            <Input
              className={`mt-1 ${errors?.location ? "border-destructive" : ""}`}
              placeholder="BRI Pusat Cabang Benhil"
              value={form.location || ""}
              onChange={e => set("location", e.target.value)}
            />
            {errors?.location && <p className="text-xs text-destructive mt-1">{errors.location}</p>}
          </div>

          {/* Event Date */}
          <div>
            <Label className="text-xs font-medium">Tanggal Event <span className="text-destructive">*</span></Label>
            <Input
              type="date"
              className={`mt-1 ${errors?.event_date ? "border-destructive" : ""}`}
              value={form.event_date || ""}
              onChange={e => set("event_date", e.target.value)}
            />
            {errors?.event_date && <p className="text-xs text-destructive mt-1">{errors.event_date}</p>}
          </div>
        </div>

        <div className="border-t border-border pt-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Kuota Peserta</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs font-medium">Maks. Total Peserta <span className="text-destructive">*</span></Label>
              <Input
                type="number"
                min={totalParticipants}
                className={`mt-1 ${errors?.max_participants ? "border-destructive" : ""}`}
                value={form.max_participants || 200}
                onChange={e => set("max_participants", parseInt(e.target.value) || 0)}
              />
              {errors?.max_participants && <p className="text-xs text-destructive mt-1">{errors.max_participants}</p>}
              <p className="text-[10px] text-muted-foreground mt-1">Terdaftar: {totalParticipants}</p>
            </div>
            <div>
              <Label className="text-xs font-medium">Kuota FREE CHECK</Label>
              <Input
                type="number"
                min={0}
                className="mt-1"
                value={form.free_check_quota ?? 100}
                onChange={e => set("free_check_quota", parseInt(e.target.value) || 0)}
              />
              <p className="text-[10px] text-muted-foreground mt-1">Kategori gratis</p>
            </div>
            <div>
              <Label className="text-xs font-medium">Kuota PAYMENT</Label>
              <Input
                type="number"
                min={0}
                className="mt-1"
                value={form.payment_quota ?? 100}
                onChange={e => set("payment_quota", parseInt(e.target.value) || 0)}
              />
              <p className="text-[10px] text-muted-foreground mt-1">Kategori berbayar</p>
            </div>
          </div>
        </div>

        <div className="border-t border-border pt-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">URL Monitor</p>
          <div className="space-y-3">
            <div>
              <Label className="text-xs font-medium">URL LED Monitor</Label>
              <Input
                className="mt-1 font-mono text-xs"
                placeholder="https://app.base44.app/led-monitor"
                value={form.queue_monitor_url || ""}
                onChange={e => set("queue_monitor_url", e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs font-medium">URL Mobile Monitor</Label>
              <Input
                className="mt-1 font-mono text-xs"
                placeholder="https://app.base44.app/mobile-monitor"
                value={form.mobile_monitor_url || ""}
                onChange={e => set("mobile_monitor_url", e.target.value)}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}