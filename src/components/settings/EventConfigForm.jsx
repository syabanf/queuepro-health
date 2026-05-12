import React, { useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar, Image, Upload, X } from "lucide-react";

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

// ── Logo uploader ─────────────────────────────────────────────────────────────
function LogoUploader({ label, value, onChange, previewBg = "bg-white" }) {
  const inputRef = useRef(null);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => onChange(evt.target.result);
    reader.readAsDataURL(file);
    // reset so same file can be re-selected
    e.target.value = "";
  };

  const isBase64 = value?.startsWith("data:");
  const hasValue = !!value;

  return (
    <div>
      <Label className="text-xs font-medium">{label}</Label>
      <div className="mt-1.5 flex items-stretch gap-3">
        {/* Preview box */}
        <div
          className={`w-24 h-14 rounded-xl border-2 flex items-center justify-center flex-shrink-0 transition-all
            ${hasValue ? "border-border" : "border-dashed border-muted"} ${previewBg}`}
        >
          {hasValue ? (
            <img
              src={value}
              alt={label}
              className="w-full h-full object-contain p-1.5 rounded-xl"
              onError={e => { e.target.style.opacity = "0.3"; }}
            />
          ) : (
            <Image className="w-5 h-5 text-muted-foreground/30" />
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-1.5 flex-1 justify-center">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5 w-full"
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="w-3.5 h-3.5" />
            {hasValue ? "Ganti Logo" : "Browse File"}
          </Button>
          {hasValue && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gap-1 w-full text-xs text-muted-foreground hover:text-destructive"
              onClick={() => onChange("")}
            >
              <X className="w-3 h-3" /> Hapus
            </Button>
          )}
        </div>
      </div>

      {/* Status line */}
      {isBase64 && (
        <p className="text-[10px] text-green-600 mt-1.5">✓ Logo diunggah dari file lokal</p>
      )}
      {hasValue && !isBase64 && (
        <p className="text-[10px] text-muted-foreground mt-1.5 font-mono truncate">{value}</p>
      )}
      {!hasValue && (
        <p className="text-[10px] text-muted-foreground mt-1.5">Menggunakan logo default</p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  );
}

// ── Main form ─────────────────────────────────────────────────────────────────
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

        {/* Core info */}
        <div className="space-y-3">
          <div>
            <Label className="text-xs font-medium">Nama Event <span className="text-destructive">*</span></Label>
            <Input
              className={`mt-1 ${errors?.event_name ? "border-destructive" : ""}`}
              placeholder="Queue System"
              value={form.event_name || ""}
              onChange={e => set("event_name", e.target.value)}
            />
            {errors?.event_name && <p className="text-xs text-destructive mt-1">{errors.event_name}</p>}
          </div>
          <div>
            <Label className="text-xs font-medium">Event Headline</Label>
            <Input
              className="mt-1"
              placeholder="Happy Physic: Strong Body, Strong Impact"
              value={form.event_headline || ""}
              onChange={e => set("event_headline", e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs font-medium">Event Tagline</Label>
            <Input
              className="mt-1"
              placeholder="Healthy People, Healthy Performance"
              value={form.event_tagline || ""}
              onChange={e => set("event_tagline", e.target.value)}
            />
          </div>
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

        {/* Monitor URLs */}
        <div className="border-t border-border pt-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">URL Monitor</p>
          <div className="space-y-3">
            <div>
              <Label className="text-xs font-medium">URL LED Monitor</Label>
              <Input
                className="mt-1 font-mono text-xs"
                placeholder={`${window.location.origin}/led-monitor`}
                value={form.queue_monitor_url || ""}
                onChange={e => set("queue_monitor_url", e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs font-medium">URL Mobile Monitor</Label>
              <Input
                className="mt-1 font-mono text-xs"
                placeholder={`${window.location.origin}/mobile-monitor`}
                value={form.mobile_monitor_url || ""}
                onChange={e => set("mobile_monitor_url", e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Logo upload */}
        <div className="border-t border-border pt-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-1.5">
            <Image className="w-3.5 h-3.5" /> Logo Acara
          </p>
          <p className="text-[11px] text-muted-foreground mb-4">
            Unggah file gambar (PNG/JPG/SVG) untuk mengganti logo. Kosongkan untuk pakai logo default.
          </p>
          <div className="space-y-4">
            <LogoUploader
              label="Logo BRI"
              value={form.logo_bri_url || ""}
              onChange={v => set("logo_bri_url", v)}
              previewBg="bg-[#003D79]"
            />
            <LogoUploader
              label="Logo Primaya Hospital"
              value={form.logo_primaya_url || ""}
              onChange={v => set("logo_primaya_url", v)}
              previewBg="bg-white"
            />
            <LogoUploader
              label="Logo Optik Melawai"
              value={form.logo_optik_melawai_url || ""}
              onChange={v => set("logo_optik_melawai_url", v)}
              previewBg="bg-white"
            />
          </div>
        </div>

      </CardContent>
    </Card>
  );
}
