import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Save, RotateCcw, Loader2, RefreshCcw, Trash2,
  Stethoscope, Eye, Gift, CreditCard, Tag, BarChart3,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import PageHeader from "@/components/layout/PageHeader";

const UNLIMITED = 9999;
const isUnlimited = (val) => (val || 0) >= UNLIMITED;
const fmtQuota = (val) => isUnlimited(val) ? "∞" : String(val ?? 0);

// ── Quota type definitions ────────────────────────────────────────────────────
const QUOTA_TYPES = [
  {
    key: 'free',
    limitField: 'free_quota',
    usedField: 'used_free_quota',
    priceField: 'free_price',
    label: 'Free Tanpa Syarat',
    shortLabel: 'Free',
    icon: Gift,
    color: 'text-green-700',
    usedColor: 'text-green-600',
    bg: 'bg-green-50',
    border: 'border-green-200',
    barColor: 'bg-green-500',
    badgeCls: 'bg-green-100 text-green-700 border-green-200',
  },
  {
    key: 'rp1',
    limitField: 'rp1_quota',
    usedField: 'used_rp1_quota',
    priceField: 'rp1_price',
    label: 'Rp 1 BRI',
    shortLabel: 'Rp 1 BRI',
    icon: CreditCard,
    color: 'text-blue-700',
    usedColor: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    barColor: 'bg-blue-500',
    badgeCls: 'bg-blue-100 text-blue-700 border-blue-200',
  },
  {
    key: 'special',
    limitField: 'special_quota',
    usedField: 'used_special_quota',
    priceField: 'special_price',
    label: 'Special Price',
    shortLabel: 'Special',
    icon: Tag,
    color: 'text-purple-700',
    usedColor: 'text-purple-600',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    barColor: 'bg-purple-500',
    badgeCls: 'bg-purple-100 text-purple-700 border-purple-200',
  },
];

const fmtRupiah = (val) => {
  if (!val || val === 0) return "Gratis";
  return "Rp " + Number(val).toLocaleString("id-ID");
};

function getRemaining(svc, qt) {
  const limit = svc[qt.limitField] || 0;
  if (isUnlimited(limit)) return UNLIMITED;
  return Math.max(0, limit - (svc[qt.usedField] || 0));
}
function svcIsUnlimited(svc) {
  return QUOTA_TYPES.some(qt => isUnlimited(svc[qt.limitField]));
}
function getTotalRemaining(svc) {
  if (svcIsUnlimited(svc)) return UNLIMITED;
  return QUOTA_TYPES.reduce((sum, qt) => sum + getRemaining(svc, qt), 0);
}
function getTotalLimit(svc) {
  if (svcIsUnlimited(svc)) return UNLIMITED;
  return QUOTA_TYPES.reduce((sum, qt) => sum + (svc[qt.limitField] || 0), 0);
}
function getTotalUsed(svc) {
  return QUOTA_TYPES.reduce((sum, qt) => sum + (svc[qt.usedField] || 0), 0);
}

// ── Progress bar ─────────────────────────────────────────────────────────────
function QuotaBar({ used, total, barColor }) {
  if (!total || isUnlimited(total)) return <div className="h-1.5 bg-muted rounded-full" />;
  const pct = Math.min(100, Math.round((used / total) * 100));
  return (
    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all ${pct >= 100 ? "bg-destructive" : pct >= 80 ? "bg-amber-500" : barColor}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ── Single service quota card ─────────────────────────────────────────────────
function ServiceQuotaCard({ service, onChange }) {
  const isEye = service.service_group === "EYE_CHECK";
  const Icon = isEye ? Eye : Stethoscope;
  const totalLimit = getTotalLimit(service);
  const totalUsed = getTotalUsed(service);
  const totalRem = getTotalRemaining(service);
  const fillPct = totalLimit > 0 ? Math.min(100, Math.round((totalUsed / totalLimit) * 100)) : 0;

  const set = (field, val) => onChange({ ...service, [field]: val });

  return (
    <div className={`rounded-xl border-2 p-4 transition-all ${service.is_active ? "border-border bg-card" : "border-dashed border-muted bg-muted/20"}`}>
      {/* Service header */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0
            ${isEye ? "bg-accent/10 text-accent" : "bg-primary/10 text-primary"}`}>
            {service.service_code}
          </div>
          <div>
            <p className="font-bold text-sm">{service.service_name}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Icon className={`w-3 h-3 ${isEye ? "text-accent" : "text-primary"}`} />
              <span className="text-xs text-muted-foreground">
                {isEye ? "Optik Melawai" : "Primaya Hospital"} &bull; Booth {service.booth_number}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Overall status badge */}
          {isUnlimited(totalLimit) ? (
            <Badge className="text-[10px] border bg-cyan-100 text-cyan-700 border-cyan-200">∞ Unlimited</Badge>
          ) : totalRem <= 0 && totalLimit > 0 ? (
            <Badge className="text-[10px] border bg-red-100 text-red-700 border-red-200">Penuh</Badge>
          ) : totalLimit === 0 ? (
            <Badge className="text-[10px] border bg-gray-100 text-gray-600 border-gray-200">Belum diset</Badge>
          ) : (
            <Badge className="text-[10px] border bg-green-100 text-green-700 border-green-200">
              Sisa {totalRem}/{totalLimit}
            </Badge>
          )}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">{service.is_active ? "Aktif" : "Nonaktif"}</span>
            <Switch checked={!!service.is_active} onCheckedChange={v => set("is_active", v)} />
          </div>
        </div>
      </div>

      {/* Overall progress */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
          <span>Total terpakai</span>
          <span className="font-mono font-medium">{totalUsed} / {fmtQuota(totalLimit)}</span>
        </div>
        <QuotaBar used={totalUsed} total={totalLimit} barColor="bg-primary" />
      </div>

      {/* Three quota type columns */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {QUOTA_TYPES.map(qt => {
          const QtIcon = qt.icon;
          const limit = service[qt.limitField] || 0;
          const used = service[qt.usedField] || 0;
          const price = service[qt.priceField] ?? 0;
          const rem = getRemaining(service, qt);

          return (
            <div key={qt.key} className={`rounded-lg border p-3 ${qt.bg} ${qt.border}`}>
              <div className="flex items-center justify-between gap-1.5 mb-2">
                <div className="flex items-center gap-1.5">
                  <QtIcon className={`w-3.5 h-3.5 ${qt.color}`} />
                  <span className={`text-xs font-bold ${qt.color}`}>{qt.shortLabel}</span>
                </div>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${qt.bg} ${qt.color} border ${qt.border}`}>
                  {fmtRupiah(price)}
                </span>
              </div>

              <div className="mb-2">
                <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Limit</label>
                <Input
                  type="number"
                  min={used}
                  className="h-7 mt-0.5 text-sm font-mono bg-white"
                  value={limit}
                  onChange={e => set(qt.limitField, parseInt(e.target.value) || 0)}
                />
              </div>

              <div className="mb-2">
                <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Harga (Rp)</label>
                <Input
                  type="number"
                  min={0}
                  className="h-7 mt-0.5 text-sm font-mono bg-white"
                  value={price}
                  onChange={e => set(qt.priceField, parseInt(e.target.value) || 0)}
                />
              </div>

              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-muted-foreground">Terpakai</span>
                <span className={`font-mono font-bold ${qt.usedColor}`}>{used}</span>
              </div>

              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-muted-foreground">Sisa</span>
                <span className={`font-mono font-bold ${isUnlimited(rem) ? "text-cyan-600" : rem <= 0 && limit > 0 ? "text-destructive" : rem <= 10 && limit > 0 ? "text-amber-600" : "text-foreground"}`}>
                  {fmtQuota(rem)}
                </span>
              </div>

              <QuotaBar used={used} total={limit} barColor={qt.barColor} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Summary row ───────────────────────────────────────────────────────────────
function SummaryCard({ services }) {
  const allActive = services.filter(s => s.is_active);

  return (
    <div className="space-y-3">
      {/* Aggregate totals */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-black text-foreground">
              {allActive.some(s => svcIsUnlimited(s))
                ? "∞"
                : allActive.reduce((sum, s) => sum + getTotalLimit(s), 0)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Total Kuota</p>
          </CardContent>
        </Card>
        {QUOTA_TYPES.map(qt => {
          const QtIcon = qt.icon;
          const hasUnlimited = allActive.some(s => isUnlimited(s[qt.limitField]));
          const total = hasUnlimited ? UNLIMITED : allActive.reduce((sum, s) => sum + (s[qt.limitField] || 0), 0);
          const used = allActive.reduce((sum, s) => sum + (s[qt.usedField] || 0), 0);
          return (
            <Card key={qt.key}>
              <CardContent className="p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <QtIcon className={`w-3.5 h-3.5 ${qt.color}`} />
                  <span className={`text-xs font-bold ${qt.color}`}>{qt.shortLabel}</span>
                </div>
                <p className="text-xl font-black text-foreground">
                  {hasUnlimited ? "∞" : total - used}
                  {" "}<span className="text-sm font-normal text-muted-foreground">/ {fmtQuota(total)}</span>
                </p>
                <QuotaBar used={used} total={total} barColor={qt.barColor} />
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Per-service table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 bg-muted/30">
                  <th className="text-left text-xs font-semibold text-muted-foreground py-2.5 px-4 w-8">Kode</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground py-2.5 px-4">Layanan</th>
                  {QUOTA_TYPES.map(qt => (
                    <th key={qt.key} className="text-center text-xs font-semibold py-2.5 px-3">
                      <span className={qt.color}>{qt.shortLabel}</span>
                      <span className="text-muted-foreground font-normal block text-[9px]">sisa / limit</span>
                    </th>
                  ))}
                  <th className="text-center text-xs font-semibold text-muted-foreground py-2.5 px-3">
                    Total
                    <span className="text-muted-foreground font-normal block text-[9px]">sisa / limit</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {allActive.map(s => {
                  const isEye = s.service_group === "EYE_CHECK";
                  const totalLimit = getTotalLimit(s);
                  const totalUsed = getTotalUsed(s);
                  const totalRem = getTotalRemaining(s);
                  const fillPct = isUnlimited(totalLimit) ? 0 : totalLimit > 0 ? Math.min(100, Math.round((totalUsed / totalLimit) * 100)) : 0;

                  return (
                    <tr key={s.id} className="border-b border-border/30 last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="py-2.5 px-4">
                        <div className={`w-7 h-7 rounded-md flex items-center justify-center text-[11px] font-black
                          ${isEye ? "bg-accent/10 text-accent" : "bg-primary/10 text-primary"}`}>
                          {s.service_code}
                        </div>
                      </td>
                      <td className="py-2.5 px-4">
                        <p className="font-medium text-sm text-foreground leading-tight">{s.service_name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <div className="w-20 h-1 bg-muted rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${fillPct >= 100 ? "bg-destructive" : fillPct >= 80 ? "bg-amber-400" : isEye ? "bg-accent" : "bg-primary"}`}
                              style={{ width: isUnlimited(totalLimit) ? "0%" : `${fillPct}%` }} />
                          </div>
                          <span className="text-[10px] text-muted-foreground">{fillPct}%</span>
                        </div>
                      </td>
                      {QUOTA_TYPES.map(qt => {
                        const limit = s[qt.limitField] || 0;
                        const used = s[qt.usedField] || 0;
                        const rem = getRemaining(s, qt);
                        const hasLimit = limit > 0;
                        return (
                          <td key={qt.key} className="py-2.5 px-3 text-center">
                            {hasLimit ? (
                              <div>
                                <span className={`font-mono font-bold text-sm ${isUnlimited(rem) ? "text-cyan-600" : rem <= 0 ? "text-destructive" : rem <= 10 ? "text-amber-600" : qt.color}`}>
                                  {fmtQuota(rem)}
                                </span>
                                <span className="text-muted-foreground text-xs"> / {fmtQuota(limit)}</span>
                                <div className="mt-0.5 mx-auto w-12 h-1 bg-muted rounded-full overflow-hidden">
                                  <div className={`h-full rounded-full ${qt.barColor}`}
                                    style={{ width: isUnlimited(limit) ? "0%" : `${Math.min(100, Math.round((used / limit) * 100))}%` }} />
                                </div>
                              </div>
                            ) : (
                              <span className="text-muted-foreground/30 text-xs">—</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="py-2.5 px-3 text-center">
                        <span className={`font-mono font-bold text-sm ${isUnlimited(totalLimit) ? "text-cyan-600" : totalRem <= 0 && totalLimit > 0 ? "text-destructive" : "text-foreground"}`}>
                          {fmtQuota(totalRem)}
                        </span>
                        <span className="text-muted-foreground text-xs"> / {fmtQuota(totalLimit)}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function QuotaMaster() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: services = [], isLoading } = useQuery({
    queryKey: ["services"],
    queryFn: () => base44.entities.Service.list(),
    refetchInterval: 15000,
  });

  const [servicesForm, setServicesForm] = useState([]);
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    if (services.length > 0) setServicesForm(services);
  }, [services]);

  const handleChange = (updated) => {
    setServicesForm(prev => prev.map(s => s.id === updated.id ? updated : s));
    setIsDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const svc of servicesForm) {
        await base44.entities.Service.update(svc.id, svc);
      }
      queryClient.invalidateQueries({ queryKey: ["services"] });
      setIsDirty(false);
      toast({ title: "Kuota berhasil disimpan!" });
    } catch (err) {
      toast({ title: "Gagal menyimpan", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    setServicesForm(services);
    setIsDirty(false);
  };

  const handleResetUsage = async () => {
    const ok = window.confirm(
      "Reset semua usage kuota ke 0?\n\nHanya counter usage yang direset. Data peserta & antrian tidak berubah."
    );
    if (!ok) return;
    setResetting(true);
    try {
      for (const svc of services) {
        await base44.entities.Service.update(svc.id, {
          used_free_quota: 0,
          used_rp1_quota: 0,
          used_special_quota: 0,
        });
      }
      queryClient.invalidateQueries({ queryKey: ["services"] });
      const fresh = await base44.entities.Service.list();
      setServicesForm(fresh);
      setIsDirty(false);
      toast({ title: "Usage kuota berhasil direset ke 0!" });
    } catch (err) {
      toast({ title: "Gagal reset", description: err.message, variant: "destructive" });
    } finally {
      setResetting(false);
    }
  };

  const medicalServices = servicesForm.filter(s => s.service_group === "MEDICAL");
  const eyeServices = servicesForm.filter(s => s.service_group === "EYE_CHECK");

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
        title="Master Kuota"
        subtitle="Kelola limit kuota per tipe untuk setiap layanan"
        icon={BarChart3}
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 border-amber-300 text-amber-700 hover:bg-amber-50"
              onClick={handleResetUsage}
              disabled={resetting}
            >
              {resetting
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Mereset...</>
                : <><RefreshCcw className="w-4 h-4" /> Reset Usage</>}
            </Button>
            {isDirty && (
              <Button variant="outline" size="sm" className="gap-1.5" onClick={handleDiscard}>
                <RotateCcw className="w-4 h-4" /> Batalkan
              </Button>
            )}
            <Button size="sm" className="gap-1.5" onClick={handleSave} disabled={saving || !isDirty}>
              {saving
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...</>
                : <><Save className="w-4 h-4" /> Simpan Kuota</>}
            </Button>
          </div>
        }
      />

      {/* Legend */}
      <div className="flex flex-wrap gap-2">
        {QUOTA_TYPES.map(qt => {
          const QtIcon = qt.icon;
          return (
            <div key={qt.key} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${qt.bg} ${qt.border} ${qt.color}`}>
              <QtIcon className="w-3 h-3" /> {qt.label}
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <SummaryCard services={servicesForm} />

      {/* Layanan Medis */}
      {medicalServices.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Stethoscope className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wide">Layanan Medis — Primaya Hospital</h2>
          </div>
          <div className="space-y-3">
            {medicalServices.map(s => (
              <ServiceQuotaCard key={s.id} service={s} onChange={handleChange} />
            ))}
          </div>
        </div>
      )}

      {/* Pemeriksaan Mata */}
      {eyeServices.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Eye className="w-4 h-4 text-accent" />
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wide">Pemeriksaan Mata — Optik Melawai</h2>
          </div>
          <div className="space-y-3">
            {eyeServices.map(s => (
              <ServiceQuotaCard key={s.id} service={s} onChange={handleChange} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
