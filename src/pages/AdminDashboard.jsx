import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Users, Activity, Monitor, CheckCircle2, 
  Clock, Stethoscope, Eye
} from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";

function StatCard({ title, value, icon: Icon, color, subtitle }) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold mt-2 text-foreground">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminDashboard() {
  const { data: services = [] } = useQuery({
    queryKey: ["services"],
    queryFn: () => base44.entities.Service.list(),
    refetchInterval: 15000,
  });

  const { data: eventSettings = [] } = useQuery({
    queryKey: ["eventSettings"],
    queryFn: () => base44.entities.EventSetting.list(),
  });

  const { data: participants = [] } = useQuery({
    queryKey: ["participants"],
    queryFn: () => base44.entities.Participant.list(),
    refetchInterval: 15000,
  });

  const { data: queues = [] } = useQuery({
    queryKey: ["queues"],
    queryFn: () => base44.entities.Queue.list(),
    refetchInterval: 15000,
  });

  const event = eventSettings[0];
  const medicalServices = services.filter(s => s.service_group === "MEDICAL");
  const eyeServices = services.filter(s => s.service_group === "EYE_CHECK");
  const waitingQueues = queues.filter(q => q.status === "WAITING").length;
  const servingQueues = queues.filter(q => q.status === "SERVING" || q.status === "CALLED").length;
  const doneQueues = queues.filter(q => q.status === "DONE").length;

  return (
    <div>
      <PageHeader 
        title="Dashboard" 
        subtitle={event ? `${event.event_name} — ${event.location}` : "Loading..."}
        icon={Activity}
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard 
          title="Peserta Terdaftar" 
          value={participants.length} 
          icon={Users} 
          color="bg-primary/10 text-primary" 
          subtitle={`Maks. ${event?.max_participants || 200} peserta`}
        />
        <StatCard 
          title="Dalam Antrian" 
          value={waitingQueues} 
          icon={Clock} 
          color="bg-accent/10 text-accent"
          subtitle="Menunggu dipanggil"
        />
        <StatCard 
          title="Sedang Dilayani" 
          value={servingQueues} 
          icon={Monitor} 
          color="bg-warning/10 text-warning"
          subtitle="Di semua booth"
        />
        <StatCard 
          title="Selesai" 
          value={doneQueues} 
          icon={CheckCircle2} 
          color="bg-success/10 text-success"
          subtitle="Hari ini"
        />
      </div>

      {/* Service Booths */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Medical Services */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Stethoscope className="w-5 h-5 text-primary" />
              Layanan Medis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {medicalServices.map(service => (
              <div key={service.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <span className="text-sm font-bold text-primary">{service.service_code}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">{service.service_name}</p>
                    <p className="text-xs text-muted-foreground">Booth {service.booth_number}</p>
                  </div>
                </div>
                <Badge variant={service.is_active ? "default" : "secondary"} className={service.is_active ? "bg-success text-success-foreground" : ""}>
                  {service.is_active ? "Aktif" : "Nonaktif"}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Eye Check Services */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Eye className="w-5 h-5 text-accent" />
              Pemeriksaan Mata
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {eyeServices.map(service => (
              <div key={service.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                    <span className="text-sm font-bold text-accent">{service.service_code}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">{service.service_name}</p>
                    <p className="text-xs text-muted-foreground">Booth {service.booth_number}</p>
                  </div>
                </div>
                <Badge variant={service.is_active ? "default" : "secondary"} className={service.is_active ? "bg-success text-success-foreground" : ""}>
                  {service.is_active ? "Aktif" : "Nonaktif"}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}