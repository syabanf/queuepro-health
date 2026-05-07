import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Ticket, Printer, CheckCircle2 } from "lucide-react";
import { SLOT_TYPE_COLORS } from "@/lib/registrationUtils";

function QueueNumberBig({ number, serviceName, slotType, group }) {
  const isEye = group === "EYE_CHECK";
  return (
    <div className={`rounded-xl border-2 p-4 flex flex-col items-center gap-2 ${isEye ? "border-accent/30 bg-accent/5" : "border-primary/20 bg-primary/5"}`}>
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{isEye ? "Pemeriksaan Mata" : "Layanan Medis"}</p>
      <div className={`text-4xl font-black tracking-widest ${isEye ? "text-accent" : "text-primary"}`}>
        {number}
      </div>
      <p className="text-xs font-medium text-foreground">{serviceName}</p>
      <Badge className={`text-xs ${SLOT_TYPE_COLORS[slotType]}`}>
        {slotType === "FREE" ? "Gratis" : "Berbayar"}
      </Badge>
    </div>
  );
}

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
          <p className="text-sm font-semibold">{result.participant.full_name}</p>
          <p className="text-xs text-muted-foreground mt-1">{result.participant.registration_number}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <QueueNumberBig
            number={result.medicalQueue.queue_number}
            serviceName={result.medicalService.service_name}
            slotType={result.medicalQueue.slot_type}
            group="MEDICAL"
          />
          <QueueNumberBig
            number={result.eyeQueue.queue_number}
            serviceName={result.eyeService.service_name}
            slotType={result.eyeQueue.slot_type}
            group="EYE_CHECK"
          />
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-1.5 text-xs"
            onClick={onPrint}
          >
            <Printer className="w-3.5 h-3.5" />
            Cetak Kupon
          </Button>
          <Button
            size="sm"
            className="flex-1 gap-1.5 text-xs"
            onClick={onReset}
          >
            Daftar Berikutnya
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}