import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/layout/PageHeader";
import { Monitor, Smartphone, ExternalLink, Tv2, QrCode, Copy, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";

export default function QueueMonitor() {
  const [eventSetting, setEventSetting] = useState(null);
  const [copiedLED, setCopiedLED] = useState(false);
  const [copiedMobile, setCopiedMobile] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    base44.entities.EventSetting.list().then(list => {
      if (list.length > 0) setEventSetting(list[0]);
    });
  }, []);

  const base = window.location.origin;
  const ledDefault = `${base}/led-monitor`;
  const mobileDefault = `${base}/mobile-monitor`;

  const ledUrl = eventSetting?.queue_monitor_url || ledDefault;
  const mobileUrl = eventSetting?.mobile_monitor_url || mobileDefault;

  const openURL = (url) => window.open(url, "_blank");

  const copyURL = async (url, type) => {
    await navigator.clipboard.writeText(url);
    if (type === "led") {
      setCopiedLED(true);
      setTimeout(() => setCopiedLED(false), 2000);
    } else {
      setCopiedMobile(true);
      setTimeout(() => setCopiedMobile(false), 2000);
    }
    toast({ title: "URL disalin!", description: url });
  };

  const MonitorCard = ({ title, desc, icon: Icon, url, defaultUrl, type, color, copied }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${color}`}>
            <Icon className="w-7 h-7 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-base">{title}</h3>
              <Badge variant="secondary" className="text-[10px]">Realtime</Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-3">{desc}</p>
            <div className="bg-muted rounded-lg px-3 py-2 flex items-center gap-2 mb-4">
              <code className="text-xs font-mono text-foreground/80 truncate flex-1">{url}</code>
              {url !== defaultUrl && (
                <Badge variant="outline" className="text-[10px] flex-shrink-0">custom</Badge>
              )}
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button className="gap-2" onClick={() => openURL(url)}>
                <ExternalLink className="w-4 h-4" /> Buka Monitor
              </Button>
              <Button variant="outline" size="sm" className="gap-2" onClick={() => copyURL(url, type)}>
                {copied
                  ? <><CheckCircle2 className="w-4 h-4 text-green-600" /> Disalin!</>
                  : <><Copy className="w-4 h-4" /> Salin URL</>
                }
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Monitor Antrian"
        subtitle="Akses tampilan antrian real-time untuk LED dan mobile"
        icon={Monitor}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <MonitorCard
          title="LED Monitor"
          desc="Tampilan fullscreen untuk layar LED/proyektor di area tunggu. Menampilkan antrian semua booth secara simultan."
          icon={Tv2}
          url={ledUrl}
          defaultUrl={ledDefault}
          type="led"
          color="bg-primary"
          copied={copiedLED}
        />
        <MonitorCard
          title="Mobile Monitor"
          desc="Tampilan mobile-friendly untuk peserta memantau antrian dari smartphone. Ada QR code di kupon untuk akses langsung."
          icon={Smartphone}
          url={mobileUrl}
          defaultUrl={mobileDefault}
          type="mobile"
          color="bg-accent"
          copied={copiedMobile}
        />
      </div>

      {/* Info */}
      <Card className="border-dashed bg-muted/20">
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <QrCode className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
            <div className="text-sm text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">Cara Kerja Monitor Realtime</p>
              <ul className="space-y-1 list-disc list-inside text-xs">
                <li>Monitor diperbarui otomatis setiap 5 detik + real-time subscription saat ada perubahan antrian.</li>
                <li>Booth operator memanggil antrian di <strong className="text-foreground">Panel Booth</strong>, perubahan langsung muncul di LED dan Mobile Monitor.</li>
                <li>Kupon peserta menyertakan QR Code yang mengarah ke Mobile Monitor.</li>
                <li>URL custom dapat diatur di halaman <strong className="text-foreground">Konfigurasi Event</strong>.</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}