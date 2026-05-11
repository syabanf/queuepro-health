import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Ticket, Printer, CheckCircle2, Stethoscope, Eye } from "lucide-react";

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
  const isMedical = service?.service_group === "MEDICAL";
  const Icon = isMedical ? Stethoscope : Eye;

  return (
    <Card className="border-success/30 bg-success/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2 text-success">
          <CheckCircle2 className="w-4 h-4" />
          Registrasi Berhasil
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-3 rounded-lg bg-card border">
          <p className="text-xs text-muted-foreground mb-0.5">Nama Peserta</p>
          <p className="text-sm font-semibold">{participant.full_name}</p>
          <p className="text-xs text-muted-foreground mt-1 font-mono">{participant.registration_number}</p>
        </div>

        <div className={`rounded-xl border-2 p-4 flex flex-col items-center gap-2 ${isMedical ? "border-primary/20 bg-primary/5" : "border-accent/30 bg-accent/5"}`}>
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <Icon className={`w-4 h-4 ${isMedical ? "text-primary" : "text-accent"}`} />
            {isMedical ? "Layanan Medis" : "Pemeriksaan Mata"}
          </div>
          <div className={`text-5xl font-black tracking-widest ${isMedical ? "text-primary" : "text-accent"}`}>
            {queue.queue_number}
          </div>
          <p className="text-xs font-medium text-foreground text-center">{service?.service_name}</p>
          <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">GRATIS</Badge>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1 gap-1.5 text-xs" onClick={onPrint}>
            <Printer className="w-3.5 h-3.5" />
            Cetak Kupon
          </Button>
          <Button size="sm" className="flex-1 gap-1.5 text-xs" onClick={onReset}>
            Daftar Berikutnya
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
