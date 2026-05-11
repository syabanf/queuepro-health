import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Ticket, Printer, CheckCircle2, Activity, Syringe, Eye } from "lucide-react";

const SERVICE_VISUAL = {
  'svc-a': { grad: ['#003D79', '#005BAB'], Icon: Activity,  label: 'MINI MCU',          provider: 'PRIMAYA HOSPITAL' },
  'svc-b': { grad: ['#004D8C', '#0069C0'], Icon: Syringe,   label: 'VITAMIN C',          provider: 'PRIMAYA HOSPITAL' },
  'svc-c': { grad: ['#005BAB', '#0077CC'], Icon: Syringe,   label: 'VAKSIN INFLUENZA',   provider: 'PRIMAYA HOSPITAL' },
  'svc-d': { grad: ['#004D8C', '#006BB3'], Icon: Eye,       label: 'AIRDOC',             provider: 'OPTIK MELAWAI' },
  'svc-e': { grad: ['#003D79', '#005BAB'], Icon: Eye,       label: 'AUTOREF',            provider: 'OPTIK MELAWAI' },
};

export default function QueuePreviewCard({ result, onPrint, onReset }) {
  if (!result) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 px-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-primary/5 flex items-center justify-center mb-4">
            <Ticket className="w-7 h-7 text-primary/30" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">Preview Nomor Antrian</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Akan muncul setelah registrasi berhasil</p>
        </CardContent>
      </Card>
    );
  }

  const { participant, queue, service } = result;
  const vis = SERVICE_VISUAL[service?.id] || SERVICE_VISUAL['svc-a'];
  const { grad: [c1, c2], Icon, label, provider } = vis;

  return (
    <Card className="overflow-hidden border-green-200 shadow-md">
      {/* Success header */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-green-50 border-b border-green-100">
        <CheckCircle2 className="w-4 h-4 text-green-600" />
        <span className="text-sm font-semibold text-green-700">Registrasi Berhasil</span>
      </div>

      {/* Participant info */}
      <div className="px-4 py-3 bg-white border-b">
        <p className="text-xs text-muted-foreground">Peserta</p>
        <p className="text-sm font-bold">{participant.full_name}</p>
        <p className="text-xs font-mono text-muted-foreground">{participant.registration_number}</p>
      </div>

      {/* Key visual banner */}
      <div
        className="px-4 pt-3 pb-4"
        style={{ background: `linear-gradient(160deg, ${c1} 0%, ${c2} 100%)` }}
      >
        {/* BRI + Provider */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-white font-black text-xs tracking-widest">BRI</span>
          <span className="text-white/70 text-[10px] font-bold tracking-wider">{provider}</span>
        </div>

        {/* Service name */}
        <p className="text-white font-black text-sm text-center uppercase tracking-wide mb-3">
          {service?.service_name}
        </p>

        {/* Code badge + icon + queue number */}
        <div className="flex items-center justify-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-white/20 border border-white/30 flex flex-col items-center justify-center flex-shrink-0">
            <span className="text-white font-black text-xl leading-none">{service?.service_code}</span>
            <span className="text-white/50 text-[8px] uppercase tracking-wide">{label}</span>
          </div>
          <Icon className="w-7 h-7 text-white/40 flex-shrink-0" strokeWidth={1.5} />
          <span className="text-white font-black tracking-widest" style={{ fontSize: '3.5rem', lineHeight: 1 }}>
            {queue.queue_number}
          </span>
        </div>

        <p className="text-center text-white/50 text-[9px] font-bold uppercase tracking-[0.2em] mt-3 pt-2 border-t border-white/15">
          SILAKAN MENUNGGU PANGGILAN DI LAYAR
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-2 p-3 bg-white">
        <Button variant="outline" size="sm" className="flex-1 gap-1.5 text-xs" onClick={onPrint}>
          <Printer className="w-3.5 h-3.5" />
          Cetak Kupon
        </Button>
        <Button size="sm" className="flex-1 text-xs" onClick={onReset}>
          Daftar Berikutnya
        </Button>
      </div>
    </Card>
  );
}
