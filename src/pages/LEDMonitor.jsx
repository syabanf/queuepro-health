import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { RefreshCw, Monitor, Eye, Stethoscope, Volume2, Users, Clock } from "lucide-react";

function ServiceCard({ service, queues }) {
  const sorted = [...queues].sort((a, b) => (a.queue_sequence || 0) - (b.queue_sequence || 0));
  const serving = sorted.find(q => q.status === "SERVING" || q.status === "CALLED");
  const next = sorted.filter(q => q.status === "WAITING")[0];

  const isMedical = service.service_group === "MEDICAL";
  const Icon = isMedical ? Stethoscope : Eye;

  return (
    <div className="flex flex-col rounded-2xl overflow-hidden border border-white/10 bg-white/5 backdrop-blur-sm">
      {/* Card Header */}
      <div className={`flex items-center gap-2 px-4 py-3 ${isMedical ? "bg-blue-500/30" : "bg-cyan-500/30"}`}>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isMedical ? "bg-blue-400/40" : "bg-cyan-400/40"}`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white/60 text-xs font-bold uppercase tracking-widest">Kode {service.service_code}</p>
          <p className="text-white font-bold text-sm leading-tight truncate">{service.service_name}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-white/50 text-xs">Booth</p>
          <p className="text-white font-bold text-lg leading-none">{service.booth_number}</p>
        </div>
      </div>

      {/* Now Serving */}
      <div className="flex-1 flex flex-col items-center justify-center py-5 px-3 bg-white/5">
        <p className="text-white/40 text-xs uppercase tracking-[0.2em] mb-1">Now Serving</p>
        <p className={`font-black tracking-widest leading-none ${serving ? "text-6xl text-white" : "text-4xl text-white/20"}`}>
          {serving ? serving.queue_number : "—"}
        </p>
        {serving && (
          <div className={`mt-2 px-3 py-0.5 rounded-full text-xs font-bold ${
            serving.status === "SERVING" ? "bg-green-400/20 text-green-300 border border-green-400/30" : "bg-amber-400/20 text-amber-300 border border-amber-400/30"
          }`}>
            {serving.status === "SERVING" ? "● DILAYANI" : "● DIPANGGIL"}
          </div>
        )}
      </div>

      {/* Next */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-white/10 bg-black/20">
        <p className="text-white/40 text-xs uppercase tracking-wider">Berikutnya</p>
        <p className={`font-bold font-mono text-xl ${next ? "text-white/70" : "text-white/20"}`}>
          {next ? next.queue_number : "—"}
        </p>
      </div>
    </div>
  );
}

export default function LEDMonitor() {
  const [services, setServices] = useState([]);
  const [queues, setQueues] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    setIsRefreshing(true);
    const [svcList, queueList] = await Promise.all([
      base44.entities.Service.list(),
      base44.entities.Queue.list(),
    ]);
    setServices(svcList.filter(s => s.is_active));
    setQueues(queueList);
    setLastUpdated(new Date());
    setIsRefreshing(false);
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 4000);

    // Real-time subscriptions
    const unsubQ = base44.entities.Queue.subscribe(() => fetchData());
    const unsubP = base44.entities.Participant.subscribe(() => fetchData());

    return () => {
      clearInterval(interval);
      unsubQ();
      unsubP();
    };
  }, [fetchData]);

  const getQueuesForService = (serviceId) => queues.filter(q => q.service_id === serviceId);

  const totalServed = queues.filter(q => q.status === "DONE").length;
  const totalWaiting = queues.filter(q => q.status === "WAITING").length;
  const totalServing = queues.filter(q => q.status === "SERVING" || q.status === "CALLED").length;

  const now = new Date();
  const timeStr = now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  return (
    <div className="fixed inset-0 overflow-hidden" style={{
      background: "linear-gradient(135deg, #003D79 0%, #005BAB 40%, #0077CC 70%, #0095E8 100%)"
    }}>
      {/* Decorative background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-blue-600/20 blur-3xl" />
      </div>

      <div className="relative h-full flex flex-col px-6 pt-4 pb-4">
        {/* Top Bar */}
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <div>
            <p className="text-cyan-300 text-xs font-bold uppercase tracking-[0.3em]">
              Happy Physic: Strong Body, Strong Impact
            </p>
            <h1 className="text-white font-black text-2xl leading-tight tracking-wide">
              Brilian Talks Health Care
            </h1>
          </div>
          <div className="flex items-center gap-6 text-white/60 text-sm">
            <div className="text-center">
              <p className="text-white font-bold text-xl">{totalWaiting}</p>
              <p className="text-xs">Menunggu</p>
            </div>
            <div className="text-center">
              <p className="text-green-300 font-bold text-xl">{totalServed}</p>
              <p className="text-xs">Selesai</p>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span className="font-mono font-bold text-white">{timeStr}</span>
              <RefreshCw className={`w-3 h-3 ml-1 ${isRefreshing ? "animate-spin" : ""}`} />
            </div>
          </div>
        </div>

        {/* Service Cards */}
        <div className="flex-1 grid gap-4 min-h-0" style={{
          gridTemplateColumns: `repeat(${Math.min(services.length, 5)}, 1fr)`
        }}>
          {services.map(service => (
            <ServiceCard
              key={service.id}
              service={service}
              queues={getQueuesForService(service.id)}
            />
          ))}
          {services.length === 0 && (
            <div className="col-span-5 flex items-center justify-center text-white/30">
              <div className="text-center">
                <Monitor className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p className="text-xl">Memuat data layanan...</p>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Instruction Bar */}
        <div className="flex-shrink-0 mt-4 rounded-xl bg-black/20 border border-white/10 px-6 py-3">
          <div className="flex items-center justify-center gap-8 flex-wrap">
            <div className="flex items-center gap-2 text-white/70 text-xs">
              <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">
                <Users className="w-3.5 h-3.5 text-white" />
              </div>
              <span>Silakan duduk dengan nyaman dan perhatikan nomor antrian pada layar LED.</span>
            </div>
            <div className="w-px h-4 bg-white/20 hidden sm:block" />
            <div className="flex items-center gap-2 text-white/70 text-xs">
              <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">
                <Volume2 className="w-3.5 h-3.5 text-white" />
              </div>
              <span>Nomor akan dipanggil melalui layar LED.</span>
            </div>
            <div className="w-px h-4 bg-white/20 hidden sm:block" />
            <div className="flex items-center gap-2 text-white/70 text-xs">
              <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">
                <Monitor className="w-3.5 h-3.5 text-white" />
              </div>
              <span>Harap menuju booth saat nomor Anda dipanggil.</span>
            </div>
          </div>
          <p className="text-center text-white/30 text-xs mt-2 tracking-widest uppercase">
            Healthy People, Healthy Performance
          </p>
        </div>
      </div>
    </div>
  );
}