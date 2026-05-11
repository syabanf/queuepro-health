import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Stethoscope, Eye, Gift, CreditCard, Tag } from "lucide-react";

const QUOTA_TYPES = [
  { limitField: 'free_quota',    usedField: 'used_free_quota',    label: 'Free Tanpa Syarat', color: 'text-green-700',  bg: 'bg-green-50',  border: 'border-green-200',  icon: Gift },
  { limitField: 'rp1_quota',     usedField: 'used_rp1_quota',     label: 'Rp 1 BRI',          color: 'text-blue-700',   bg: 'bg-blue-50',   border: 'border-blue-200',   icon: CreditCard },
  { limitField: 'special_quota', usedField: 'used_special_quota', label: 'Special Price',      color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200', icon: Tag },
];

function getStatus(service) {
  if (!service.is_active) return { label: "TIDAK AKTIF", color: "bg-gray-100 text-gray-500 border-gray-200" };
  const totalLimit = QUOTA_TYPES.reduce((s, qt) => s + (service[qt.limitField] || 0), 0);
  const totalUsed  = QUOTA_TYPES.reduce((s, qt) => s + (service[qt.usedField]  || 0), 0);
  if (totalLimit === 0) return { label: "BELUM DISET", color: "bg-blue-50 text-blue-500 border-blue-200" };
  if (totalUsed >= totalLimit) return { label: "KUOTA HABIS", color: "bg-red-100 text-red-700 border-red-200" };
  return { label: "TERSEDIA", color: "bg-green-100 text-green-700 border-green-200" };
}

function ServiceRow({ service, onChange, errors }) {
  const status = getStatus(service);
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
            <p className="text-xs text-muted-foreground">{isEye ? "Optik Melawai" : "Primaya Hospital"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={`text-[10px] border whitespace-nowrap ${status.color}`}>{status.label}</Badge>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">{service.is_active ? "Aktif" : "Nonaktif"}</span>
            <Switch checked={!!service.is_active} onCheckedChange={v => set("is_active", v)} />
          </div>
        </div>
      </div>

      {/* Booth */}
      <div className="mb-3">
        <Label className="text-xs font-medium">No. Booth <span className="text-destructive">*</span></Label>
        <Input
          type="number"
          min={1}
          className={`mt-1 h-8 text-sm w-24 ${errors?.booth_number ? "border-destructive" : ""}`}
          value={service.booth_number || ""}
          onChange={e => set("booth_number", parseInt(e.target.value) || "")}
        />
      </div>

      {/* 3 quota types */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {QUOTA_TYPES.map(qt => {
          const QtIcon = qt.icon;
          const limit = service[qt.limitField] || 0;
          const used  = service[qt.usedField]  || 0;
          const rem   = Math.max(0, limit - used);
          return (
            <div key={qt.limitField} className={`rounded-lg border p-3 ${qt.bg} ${qt.border}`}>
              <div className="flex items-center gap-1.5 mb-2">
                <QtIcon className={`w-3.5 h-3.5 ${qt.color}`} />
                <span className={`text-[11px] font-bold ${qt.color}`}>{qt.label}</span>
              </div>
              <div className="space-y-1">
                <div>
                  <Label className="text-[10px] text-muted-foreground">Kuota</Label>
                  <Input
                    type="number"
                    min={used}
                    className="h-7 mt-0.5 text-sm bg-white"
                    value={limit}
                    onChange={e => set(qt.limitField, parseInt(e.target.value) || 0)}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground pt-0.5">
                  <span>Terpakai: <span className="font-mono font-medium">{used}</span></span>
                  <span>Sisa: <span className={`font-mono font-medium ${rem <= 0 && limit > 0 ? "text-destructive" : "text-foreground"}`}>{rem}</span></span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function ServiceQuotaConfig({ services, onChange, serviceErrors }) {
  const medical = services.filter(s => s.service_group === "MEDICAL");
  const eye     = services.filter(s => s.service_group === "EYE_CHECK");

  const handleChange = (updated) => {
    onChange(services.map(s => s.id === updated.id ? updated : s));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Stethoscope className="w-4 h-4 text-primary" /> Layanan Medis — Primaya Hospital
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
            <Eye className="w-4 h-4 text-accent" /> Pemeriksaan Mata — Optik Melawai
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
