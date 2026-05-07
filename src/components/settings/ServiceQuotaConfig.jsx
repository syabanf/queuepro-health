import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Stethoscope, Eye } from "lucide-react";

function getQuotaStatus(service) {
  if (!service.is_active) return { label: "TIDAK AKTIF", color: "bg-gray-100 text-gray-500 border-gray-200" };
  if (service.is_unlimited) return { label: "UNLIMITED", color: "bg-blue-100 text-blue-700 border-blue-200" };
  const total = (service.full_free_quota || 0) + (service.cc_rp1_quota || 0) + (service.full_paid_quota || 0);
  const used = service.used_total || 0;
  if (total === 0) return { label: "BELUM DISET", color: "bg-blue-50 text-blue-500 border-blue-200" };
  if (used >= total) return { label: "KUOTA HABIS", color: "bg-red-100 text-red-700 border-red-200" };
  const pct = used / total;
  if (pct >= 0.9) return { label: "HAMPIR PENUH", color: "bg-orange-100 text-orange-700 border-orange-200" };
  return { label: "TERSEDIA", color: "bg-green-100 text-green-700 border-green-200" };
}

function ServiceRow({ service, onChange, errors }) {
  const status = getQuotaStatus(service);
  const isEye = service.service_group === "EYE_CHECK";
  const set = (field, value) => onChange({ ...service, [field]: value });

  const totalSlot = (service.full_free_quota || 0) + (service.cc_rp1_quota || 0) + (service.full_paid_quota || 0);

  return (
    <div className={`rounded-xl border-2 p-4 transition-all ${service.is_active ? "border-border bg-card" : "border-dashed border-muted bg-muted/20"}`}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black flex-shrink-0
            ${isEye ? "bg-accent/10 text-accent" : "bg-primary/10 text-primary"}`}>
            {service.service_code}
          </div>
          <div>
            <p className="font-semibold text-sm">{service.service_name}</p>
            <p className="text-xs text-muted-foreground">{isEye ? "Pemeriksaan Mata" : "Layanan Medis"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <Badge className={`text-[10px] border whitespace-nowrap ${status.color}`}>{status.label}</Badge>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">{service.is_active ? "Aktif" : "Nonaktif"}</span>
            <Switch checked={!!service.is_active} onCheckedChange={v => set("is_active", v)} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
        {/* Booth */}
        <div>
          <Label className="text-xs font-medium">No. Booth <span className="text-destructive">*</span></Label>
          <Input
            type="number" min={1}
            className={`mt-1 h-8 text-sm ${errors?.booth_number ? "border-destructive" : ""}`}
            value={service.booth_number || ""}
            onChange={e => set("booth_number", parseInt(e.target.value) || "")}
          />
          {errors?.booth_number && <p className="text-[10px] text-destructive mt-0.5">{errors.booth_number}</p>}
        </div>

        {/* Unlimited toggle for eye check autoref */}
        <div className="flex flex-col justify-center gap-1">
          <Label className="text-xs font-medium">Unlimited</Label>
          <div className="flex items-center gap-2 mt-1">
            <Switch checked={!!service.is_unlimited} onCheckedChange={v => set("is_unlimited", v)} />
            <span className="text-xs text-muted-foreground">{service.is_unlimited ? "Ya" : "Tidak"}</span>
          </div>
        </div>
      </div>

      {!service.is_unlimited && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Full Free Quota */}
          <div className="bg-green-50/50 rounded-lg p-3 border border-green-100">
            <Label className="text-xs font-semibold text-green-700">Tanpa Syarat (Full Free)</Label>
            <Input
              type="number" min={0}
              className="mt-1 h-8 text-sm"
              value={service.full_free_quota ?? 0}
              onChange={e => set("full_free_quota", parseInt(e.target.value) || 0)}
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              Terpakai: <span className="font-semibold text-green-700">{service.used_full_free || 0}</span>
              {" · "}Sisa: <span className="font-semibold">{Math.max(0, (service.full_free_quota || 0) - (service.used_full_free || 0))}</span>
            </p>
          </div>

          {/* CC Rp 1 Quota */}
          <div className="bg-blue-50/50 rounded-lg p-3 border border-blue-100">
            <Label className="text-xs font-semibold text-blue-700">Dengan CC Rp 1</Label>
            <Input
              type="number" min={0}
              className="mt-1 h-8 text-sm"
              value={service.cc_rp1_quota ?? 0}
              onChange={e => set("cc_rp1_quota", parseInt(e.target.value) || 0)}
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              Terpakai: <span className="font-semibold text-blue-700">{service.used_cc_rp1 || 0}</span>
              {" · "}Sisa: <span className="font-semibold">{Math.max(0, (service.cc_rp1_quota || 0) - (service.used_cc_rp1 || 0))}</span>
            </p>
          </div>

          {/* Full Paid Quota */}
          <div className="bg-orange-50/50 rounded-lg p-3 border border-orange-100">
            <Label className="text-xs font-semibold text-orange-600">Berbayar Penuh (Full Paid)</Label>
            <Input
              type="number" min={0}
              className="mt-1 h-8 text-sm"
              value={service.full_paid_quota ?? 0}
              onChange={e => set("full_paid_quota", parseInt(e.target.value) || 0)}
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              Terpakai: <span className="font-semibold text-orange-600">{service.used_full_paid || 0}</span>
              {" · "}Sisa: <span className="font-semibold">{Math.max(0, (service.full_paid_quota || 0) - (service.used_full_paid || 0))}</span>
            </p>
          </div>
        </div>
      )}

      {!service.is_unlimited && (
        <div className="mt-3 flex items-center gap-2 p-2 bg-muted/40 rounded-lg">
          <span className="text-xs text-muted-foreground">Total Slot:</span>
          <span className="text-sm font-bold">{totalSlot}</span>
          <span className="text-xs text-muted-foreground ml-4">Terpakai:</span>
          <span className="text-sm font-bold">{service.used_total || 0}</span>
          <span className="text-xs text-muted-foreground ml-4">Sisa:</span>
          <span className={`text-sm font-bold ${Math.max(0, totalSlot - (service.used_total || 0)) <= 0 ? "text-destructive" : "text-green-600"}`}>
            {Math.max(0, totalSlot - (service.used_total || 0))}
          </span>
        </div>
      )}
    </div>
  );
}

export default function ServiceQuotaConfig({ services, onChange, serviceErrors }) {
  const medical = services.filter(s => s.service_group === "MEDICAL");
  const eye = services.filter(s => s.service_group === "EYE_CHECK");

  const handleChange = (updated) => {
    onChange(services.map(s => s.id === updated.id ? updated : s));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Stethoscope className="w-4 h-4 text-primary" /> Layanan Medis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {medical.map(s => (
            <ServiceRow key={s.id} service={s} onChange={handleChange} errors={serviceErrors?.[s.id]} />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Eye className="w-4 h-4 text-accent" /> Pemeriksaan Mata
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {eye.map(s => (
            <ServiceRow key={s.id} service={s} onChange={handleChange} errors={serviceErrors?.[s.id]} />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}