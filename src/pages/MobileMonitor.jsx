import React, { useState, useEffect, useCallback, useRef } from "react";
import { base44 } from "@/api/client";
import { RefreshCw, Stethoscope, Eye } from "lucide-react";

function usePrev(val) {
  const ref = useRef(val);
  useEffect(() => { ref.current = val; });
  return ref.current;
}

function MobileServiceCard({ service, queues, participants }) {
  const sorted = [...queues].sort((a, b) => (a.queue_sequence || 0) - (b.queue_sequence || 0));
  const serving = sorted.find(q => q.status === "SERVING" || q.status === "CALLED" || q.status === "QR_VERIFIED");
  const waiting = sorted.filter(q => q.status === "WAITING");
  const next = waiting[0];
  const doneCount = sorted.filter(q => q.status === "DONE").length;

  const prevServingNum = usePrev(serving?.queue_number);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (serving?.queue_number && serving.queue_number !== prevServingNum) {
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 1500);
      return () => clearTimeout(t);
    }
  }, [serving?.queue_number]);

  const isMedical = service.service_group === "MEDICAL";
  const Icon = isMedical ? Stethoscope : Eye;
  const participant = serving ? participants.find(p => p.id === serving.participant_id) : null;

  return (
    <div className={`rounded-2xl overflow-hidden border-2 transition-all duration-500 flex flex-col
      ${flash ? "border-white/60 shadow-xl shadow-white/10" : "border-white/15 bg-white/8 backdrop-blur-sm"}`}>
      {/* Header */}
      <div className={`flex items-center gap-2 px-4 py-2.5 ${isMedical ? "bg-blue-500/25" : "bg-cyan-500/25"}`}>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isMedical ? "bg-blue-400/30" : "bg-cyan-400/30"}`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-sm leading-tight truncate">{service.service_name}</p>
          <p className="text-white/50 text-xs">Booth {service.booth_number} &bull; Kode {service.service_code}</p>
        </div>
        <div className="flex gap-3 flex-shrink-0 text-xs text-right">
          <div>
            <p className="text-white font-bold text-base">{waiting.length}</p>
            <p className="text-white/40 text-[10px]">Tunggu</p>
          </div>
          <div>
            <p className="text-green-300 font-bold text-base">{doneCount}</p>
            <p className="text-white/40 text-[10px]">Selesai</p>
          </div>
        </div>
      </div>

      {/* Queue Info */}
      <div className="flex-1 grid grid-cols-2 divide-x divide-white/10">
        <div className={`flex flex-col items-center justify-center py-4 px-3 transition-all duration-300 ${flash ? "bg-white/10" : ""}`}>
          <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Now Serving</p>
          <p className={`font-black tracking-widest leading-none transition-all duration-300 ${serving ? "text-6xl text-white" : "text-4xl text-white/15"} ${flash ? "scale-110" : ""}`}>
            {serving ? serving.queue_number : "—"}
          </p>
          {serving && (
            <>
              <span className={`mt-2 px-3 py-0.5 rounded-full text-xs font-bold ${
                serving.status === "SERVING" ? "bg-green-400/20 text-green-300" : "bg-amber-400/20 text-amber-300"
              }`}>
                {serving.status === "SERVING" ? "Dilayani" : "Dipanggil"}
              </span>
              {participant && (
                <p className="text-white/40 text-[11px] mt-1 truncate max-w-full px-2 text-center">
                  {participant.full_name}
                </p>
              )}
            </>
          )}
          {!serving && <p className="text-white/25 text-xs mt-2">Belum ada</p>}
        </div>
        <div className="flex flex-col items-center justify-center py-4 px-3">
          <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Berikutnya</p>
          <p className={`font-black tracking-widest leading-none ${next ? "text-5xl text-white/60" : "text-4xl text-white/15"}`}>
            {next ? next.queue_number : "—"}
          </p>
          {!next && <p className="text-white/25 text-xs mt-2">Kosong</p>}
        </div>
      </div>
    </div>
  );
}

export default function MobileMonitor() {
  const [services, setServices] = useState([]);
  const [queues, setQueues] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [eventSetting, setEventSetting] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const fetchData = useCallback(async () => {
    setIsRefreshing(true);
    const [svcList, queueList, partList, settings] = await Promise.all([
      base44.entities.Service.list(),
      base44.entities.Queue.list(),
      base44.entities.Participant.list(),
      base44.entities.EventSetting.list(),
    ]);
    setServices(svcList.filter(s => s.is_active));
    setQueues(queueList);
    setParticipants(partList);
    if (settings.length > 0) setEventSetting(settings[0]);
    setLastUpdated(new Date());
    setIsRefreshing(false);
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    const unsubQ = base44.entities.Queue.subscribe(() => fetchData());
    const unsubP = base44.entities.Participant.subscribe(() => fetchData());
    return () => { clearInterval(interval); unsubQ(); unsubP(); };
  }, [fetchData]);

  const getQueuesForService = (serviceId) => queues.filter(q => q.service_id === serviceId);

  const totalDone    = queues.filter(q => q.status === "DONE").length;
  const totalWaiting = queues.filter(q => q.status === "WAITING").length;
  const totalServing = queues.filter(q => q.status === "SERVING" || q.status === "CALLED").length;

  const eventName = eventSetting?.event_name || "Brilian Talks Health Care";
  const eventTagline = eventSetting?.event_tagline || "Healthy People, Healthy Performance";

  return (
    <div className="h-screen overflow-hidden flex flex-col" style={{
      background: "linear-gradient(160deg, #003D79 0%, #005BAB 50%, #0077CC 100%)"
    }}>
      {/* Header */}
      <div className="px-4 pt-3 pb-2 backdrop-blur-md bg-black/20 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-cyan-300 text-xs font-bold uppercase tracking-widest">{eventName}</p>
            <h1 className="text-white font-black text-lg leading-tight">Monitor Antrian</h1>
          </div>
          <button onClick={fetchData} className="flex items-center gap-1.5 text-white/50 text-xs active:scale-95">
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
            {lastUpdated.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="flex-shrink-0 grid grid-cols-3 gap-2 px-4 pt-3 pb-2">
        <div className="rounded-xl bg-white/8 border border-white/10 p-2.5 text-center">
          <p className="text-white font-black text-2xl">{totalWaiting}</p>
          <p className="text-white/50 text-xs mt-0.5">Menunggu</p>
        </div>
        <div className="rounded-xl bg-white/8 border border-white/10 p-2.5 text-center">
          <p className="text-amber-300 font-black text-2xl">{totalServing}</p>
          <p className="text-white/50 text-xs mt-0.5">Dilayani</p>
        </div>
        <div className="rounded-xl bg-white/8 border border-white/10 p-2.5 text-center">
          <p className="text-green-300 font-black text-2xl">{totalDone}</p>
          <p className="text-white/50 text-xs mt-0.5">Selesai</p>
        </div>
      </div>

      {/* Service Cards — fill remaining height */}
      <div className="flex-1 px-4 pb-3 flex flex-col gap-3 min-h-0">
        {services.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <RefreshCw className="w-8 h-8 text-white/20 animate-spin mx-auto mb-3" />
              <p className="text-white/40 text-sm">Memuat data antrian...</p>
            </div>
          </div>
        ) : (
          services.map(service => (
            <div key={service.id} className="flex-1 min-h-0">
              <MobileServiceCard
                service={service}
                queues={getQueuesForService(service.id)}
                participants={participants}
              />
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 px-4 pb-3">
        <p className="text-center text-white/30 text-[10px] uppercase tracking-widest">{eventTagline}</p>
      </div>
    </div>
  );
}
