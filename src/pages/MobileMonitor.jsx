import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { RefreshCw, Stethoscope, Eye, Clock, CheckCircle2, Users } from "lucide-react";

function MobileServiceCard({ service, queues }) {
  const sorted = [...queues].sort((a, b) => (a.queue_sequence || 0) - (b.queue_sequence || 0));
  const serving = sorted.find(q => q.status === "SERVING" || q.status === "CALLED");
  const next = sorted.filter(q => q.status === "WAITING")[0];
  const doneCount = sorted.filter(q => q.status === "DONE").length;
  const waitingCount = sorted.filter(q => q.status === "WAITING").length;

  const isMedical = service.service_group === "MEDICAL";
  const Icon = isMedical ? Stethoscope : Eye;

  return (
    <div className="rounded-2xl overflow-hidden border border-white/15 bg-white/8 backdrop-blur-sm mb-3">
      {/* Header */}
      <div className={`flex items-center gap-3 px-4 py-3 ${isMedical ? "bg-blue-500/25" : "bg-cyan-500/25"}`}>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isMedical ? "bg-blue-400/30" : "bg-cyan-400/30"}`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white/50 text-xs font-bold uppercase tracking-wider">Kode {service.service_code} &bull; Booth {service.booth_number}</p>
          <p className="text-white font-bold text-sm leading-tight">{service.service_name}</p>
        </div>
        <div className="flex gap-3 flex-shrink-0 text-xs text-right">
          <div>
            <p className="text-white font-bold">{waitingCount}</p>
            <p className="text-white/40">Tunggu</p>
          </div>
          <div>
            <p className="text-green-300 font-bold">{doneCount}</p>
            <p className="text-white/40">Selesai</p>
          </div>
        </div>
      </div>

      {/* Queue Info */}
      <div className="grid grid-cols-2 divide-x divide-white/10">
        <div className="flex flex-col items-center justify-center py-5 px-3">
          <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Now Serving</p>
          <p className={`font-black tracking-widest leading-none ${serving ? "text-5xl text-white" : "text-3xl text-white/15"}`}>
            {serving ? serving.queue_number : "—"}
          </p>
          {serving && (
            <span className={`mt-2 px-2 py-0.5 rounded-full text-xs font-bold ${
              serving.status === "SERVING"
                ? "bg-green-400/20 text-green-300"
                : "bg-amber-400/20 text-amber-300"
            }`}>
              {serving.status === "SERVING" ? "Dilayani" : "Dipanggil"}
            </span>
          )}
          {!serving && (
            <p className="text-white/25 text-xs mt-2">Belum ada</p>
          )}
        </div>
        <div className="flex flex-col items-center justify-center py-5 px-3">
          <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Berikutnya</p>
          <p className={`font-black tracking-widest leading-none ${next ? "text-4xl text-white/60" : "text-3xl text-white/15"}`}>
            {next ? next.queue_number : "—"}
          </p>
          {!next && (
            <p className="text-white/25 text-xs mt-2">Kosong</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MobileMonitor() {
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
    const unsubQ = base44.entities.Queue.subscribe(() => fetchData());
    return () => {
      clearInterval(interval);
      unsubQ();
    };
  }, [fetchData]);

  const getQueuesForService = (serviceId) => queues.filter(q => q.service_id === serviceId);

  const totalDone = queues.filter(q => q.status === "DONE").length;
  const totalWaiting = queues.filter(q => q.status === "WAITING").length;

  return (
    <div className="min-h-screen" style={{
      background: "linear-gradient(160deg, #003D79 0%, #005BAB 50%, #0077CC 100%)"
    }}>
      {/* Header */}
      <div className="sticky top-0 z-10 px-4 pt-safe pt-4 pb-3 backdrop-blur-md bg-black/20 border-b border-white/10">
        <div className="max-w-lg mx-auto">
          <p className="text-cyan-300 text-xs font-bold uppercase tracking-widest">Brilian Talks Health Care</p>
          <div className="flex items-center justify-between mt-0.5">
            <h1 className="text-white font-black text-lg leading-tight">Monitor Antrian</h1>
            <button
              onClick={fetchData}
              className="flex items-center gap-1.5 text-white/50 text-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
              {lastUpdated.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-4 pb-8">
        {/* Summary */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="rounded-xl bg-white/8 border border-white/10 p-3 text-center">
            <p className="text-white font-black text-2xl">{totalWaiting}</p>
            <p className="text-white/50 text-xs mt-0.5">Menunggu</p>
          </div>
          <div className="rounded-xl bg-white/8 border border-white/10 p-3 text-center">
            <p className="text-green-300 font-black text-2xl">{totalDone}</p>
            <p className="text-white/50 text-xs mt-0.5">Selesai</p>
          </div>
        </div>

        {/* Service Cards */}
        {services.length === 0 ? (
          <div className="text-center py-20">
            <RefreshCw className="w-8 h-8 text-white/20 animate-spin mx-auto mb-3" />
            <p className="text-white/40 text-sm">Memuat data antrian...</p>
          </div>
        ) : (
          services.map(service => (
            <MobileServiceCard
              key={service.id}
              service={service}
              queues={getQueuesForService(service.id)}
            />
          ))
        )}

        {/* Instructions */}
        <div className="mt-4 rounded-xl bg-black/20 border border-white/10 p-4 space-y-2">
          <p className="text-white/60 text-xs leading-relaxed">
            📋 Silakan duduk dengan nyaman dan perhatikan nomor antrian pada layar LED.
          </p>
          <p className="text-white/60 text-xs leading-relaxed">
            🔔 Nomor akan dipanggil melalui layar LED.
          </p>
          <p className="text-white/60 text-xs leading-relaxed">
            🏥 Harap menuju booth saat nomor Anda dipanggil sebagai <strong className="text-white/80">Now Serving</strong>.
          </p>
        </div>

        <p className="text-center text-white/20 text-xs mt-5 uppercase tracking-widest">
          Healthy People, Healthy Performance
        </p>
      </div>
    </div>
  );
}