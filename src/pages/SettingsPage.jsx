import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Settings, Calendar, MapPin, Users, Stethoscope } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";

export default function SettingsPage() {
  const { data: eventSettings = [] } = useQuery({
    queryKey: ["eventSettings"],
    queryFn: () => base44.entities.EventSetting.list(),
  });

  const { data: services = [] } = useQuery({
    queryKey: ["services"],
    queryFn: () => base44.entities.Service.list(),
  });

  const event = eventSettings[0];

  return (
    <div>
      <PageHeader 
        title="Pengaturan" 
        subtitle="Konfigurasi event dan layanan"
        icon={Settings}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Event Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Informasi Event</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {event ? (
              <>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <Calendar className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">{event.event_name}</p>
                    <p className="text-xs text-muted-foreground">Nama Event</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <MapPin className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">{event.location}</p>
                    <p className="text-xs text-muted-foreground">Lokasi</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <Users className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">{event.max_participants} Peserta</p>
                    <p className="text-xs text-muted-foreground">Kapasitas Maksimum</p>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Loading...</p>
            )}
          </CardContent>
        </Card>

        {/* Services */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Stethoscope className="w-4 h-4" />
              Master Data Layanan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {services.map(service => (
                <div key={service.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <span className="text-xs font-bold text-primary">{service.service_code}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium">{service.service_name}</p>
                      <p className="text-xs text-muted-foreground">Booth {service.booth_number} · {service.service_group === "MEDICAL" ? "Medis" : "Mata"}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {service.quota_status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}