import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Stethoscope, Eye } from "lucide-react";

function getQuotaStatus(service) {
  if (!service.is_active) return { label: "TIDAK AKTIF", color: "bg-gray-100 text-gray-500 border-gray-200" };
  const freeRem = (service.free_quota || 0) - (service.used_free_quota || 0);
  const paidRem = (service.paid_quota || 0) - (service.used_paid_quota || 0);
  const hasQuota = (service.free_quota || 0) + (service.paid_quota || 0) > 0;
  if (!hasQuota) return { label: "BELUM DISET", color: "bg-blue-50 text-blue-500 border-blue-200" };
  if (freeRem > 0) return { label: "FREE TERSEDIA", color: "bg-green-100 text-green-700 border-green-200" };
  if (freeRem <= 0 && paidRem > 0) return { label: "FREE HABIS · PAID TERSEDIA", color: "bg-blue-100 text-blue-700 border-blue-200" };
  return { label: "KUOTA HABIS", color: "bg-red-100 text-red-700 border-red-200" };
}

function ServiceRow({ service, onChange, errors }) {
  const status = getQuotaStatus(service);
  const isEye = service.service_group === "EYE_CHECK";
  const set = (field, value) => onChange({ ...service, [field]: value });

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
        <div className="flex items-center gap-2">
          <Badge className={`text-[10px] border whitespace-nowrap ${status.color}`}>{status.label}</Badge>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">{service.is_active ? "Aktif" : "Nonaktif"}</span>
            <Switch
              checked={!!service.is_active}
              onCheckedChange={v => set("is_active", v)}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Booth */}
        <div>
          <Label className="text-xs font-medium">No. Booth <span className="text-destructive">*</span></Label>
          <Input
            type="number"
            min={1}
            className={`mt-1 h-8 text-sm ${errors?.booth_number ? "border-destructive" : ""}`}
            value={service.booth_number || ""}
            onChange={e => set("booth_number", parseInt(e.target.value) || "")}
          />
          {errors?.booth_number && <p className="text-[10px] text-destructive mt-0.5">{errors.booth_number}</p>}
        </div>

        {/* Free Quota */}
        <div>
          <Label className="text-xs font-medium text-green-700">Kuota Gratis</Label>
          <Input
            type="number"
            min={service.used_free_quota || 0}
            className={`mt-1 h-8 text-sm ${errors?.free_quota ? "border-destructive" : ""}`}
            value={service.free_quota ?? 0}
            onChange={e => set("free_quota", parseInt(e.target.value) || 0)}
          />
          {errors?.free_quota
            ? <p className="text-[10px] text-destructive mt-0.5">{errors.free_quota}</p>
            : <p className="text-[10px] text-muted-foreground mt-0.5">Terpakai: {service.used_free_quota || 0}</p>
          }
        </div>

        {/* Paid Quota */}
        <div>
          <Label className="text-xs font-medium text-orange-600">Kuota Berbayar</Label>
          <Input
            type="number"
            min={service.used_paid_quota || 0}
            className={`mt-1 h-8 text-sm ${errors?.paid_quota ? "border-destructive" : ""}`}
            value={service.paid_quota ?? 0}
            onChange={e => set("paid_quota", parseInt(e.target.value) || 0)}
          />
          {errors?.paid_quota
            ? <p className="text-[10px] text-destructive mt-0.5">{errors.paid_quota}</p>
            : <p className="text-[10px] text-muted-foreground mt-0.5">Terpakai: {service.used_paid_quota || 0}</p>
          }
        </div>

        {/* Remaining (read-only) */}
        <div className="space-y-1">
          <Label className="text-xs font-medium text-muted-foreground">Sisa</Label>
          <div className="flex gap-2 mt-1">
            <div className="flex-1 h-8 rounded-md bg-green-50 border border-green-200 flex items-center justify-center">
              <span className="text-sm font-bold text-green-700">
                {Math.max(0, (service.free_quota || 0) - (service.used_free_quota || 0))}
              </span>
            </div>
            <div className="flex-1 h-8 rounded-md bg-orange-50 border border-orange-200 flex items-center justify-center">
              <span className="text-sm font-bold text-orange-600">
                {Math.max(0, (service.paid_quota || 0) - (service.used_paid_quota || 0))}
              </span>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground text-center">Gratis · Bayar</p>
        </div>
      </div>
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
      {/* Medical */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Stethoscope className="w-4 h-4 text-primary" /> Layanan Medis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {medical.map(s => (
            <ServiceRow
              key={s.id}
              service={s}
              onChange={handleChange}
              errors={serviceErrors?.[s.id]}
            />
          ))}
        </CardContent>
      </Card>

      {/* Eye */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Eye className="w-4 h-4 text-accent" /> Pemeriksaan Mata
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {eye.map(s => (
            <ServiceRow
              key={s.id}
              service={s}
              onChange={handleChange}
              errors={serviceErrors?.[s.id]}
            />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}