import React from "react";
import { Monitor, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/layout/PageHeader";

export default function QueueMonitor() {
  return (
    <div>
      <PageHeader
        title="Monitor Antrian"
        subtitle="Akses monitor antrian LED dan mobile"
        icon={Monitor}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => window.open("/led-monitor", "_blank")}>
          <CardContent className="p-6 flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Monitor className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-lg">LED Monitor</h3>
              <p className="text-sm text-muted-foreground mt-1">Layar antrian fullscreen untuk ditampilkan di layar LED/TV publik.</p>
            </div>
            <Button className="w-full gap-2" onClick={e => { e.stopPropagation(); window.open("/led-monitor", "_blank"); }}>
              <ExternalLink className="w-4 h-4" /> Buka LED Monitor
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => window.open("/mobile-monitor", "_blank")}>
          <CardContent className="p-6 flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center">
              <Monitor className="w-8 h-8 text-accent" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Mobile Monitor</h3>
              <p className="text-sm text-muted-foreground mt-1">Akses antrian via QR code di smartphone peserta. Tanpa login.</p>
            </div>
            <Button variant="outline" className="w-full gap-2" onClick={e => { e.stopPropagation(); window.open("/mobile-monitor", "_blank"); }}>
              <ExternalLink className="w-4 h-4" /> Buka Mobile Monitor
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}