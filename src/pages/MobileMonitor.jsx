import React, { useState, useEffect, useCallback, useRef } from "react";
import { base44 } from "@/api/client";
import { RefreshCw, Stethoscope, Eye, Clock, CheckCircle2, Users, AlertCircle } from "lucide-react";

function usePrev(val) {
  const ref = useRef(val);
  useEffect(() => { ref.current = val; });
  return ref.current;
}

function MobileServiceCard({ service, queues, participants }) {
  const sorted = [...queues].sort((a, b) => (a.queue_sequence || 0) - (b.queue_sequence || 0));
  const serving = sorted.find(q => q.status === "SERVING" || q.status === "CALLED");
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
    <div className={`rounded-2xl overflow-hidden border mb-3 transition-all duration-500
      ${flash ? "border-white/50 shadow-lg shadow-white/10" : "border-white/15 bg-white/8 backdrop-blur-sm"}`}>
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
            <p className="text-white font-bold">{waiting.length}</p>
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
        <div className={`flex flex-col items-center justify-center py-5 px-3 transition-all duration-300 ${flash ? "bg-white/10" : ""}`}>
          <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Now Serving</p>
          <p className={`font-black tracking-widest leading-none transition-all duration-300 ${serving ? "text-5xl text-white" : "text-3xl text-white/15"} ${flash ? "scale-110" : ""}`}>
            {serving ? serving.queue_number : "—"}
          </p>
          {serving && (
            <>
              <span className={`mt-2 px-2 py-0.5 rounded-full text-xs font-bold ${
                serving.status === "SERVING" ? "bg-green-400/20 text-green-300" : "bg-amber-400/20 text-amber-300"
              }`}>
                {serving.status === "SERVING" ? "Dilayani" : "Dipanggil"}
              </span>
              {participant && (
                <p className="text-white/40 text-[10px] mt-1 truncate max-w-full px-2 text-center">
                  {participant.full_name}
                </p>
              )}
            </>
          )}
          {!serving && <p className="text-white/25 text-xs mt-2">Belum ada</p>}
        </div>
        <div className="flex flex-col items-center justify-center py-5 px-3">
          <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Berikutnya</p>
          <p className={`font-black tracking-widest leading-none ${next ? "text-4xl text-white/60" : "text-3xl text-white/15"}`}>
            {next ? next.queue_number : "—"}
          </p>
          {!next && <p className="text-white/25 text-xs mt-2">Kosong</p>}
        </div>
      </div>

      {/* Waiting list mini */}
      {waiting.length > 1 && (
        <div className="border-t border-white/10 px-4 py-2">
          <p className="text-white/30 text-[10px] uppercase tracking-wider mb-1">Antrian selanjutnya</p>
          <div className="flex flex-wrap gap-1.5">
            {waiting.slice(1, 8).map(q => (
              <span key={q.id} className="text-[11px] font-mono font-bold text-white/40 bg-white/5 px-2 py-0.5 rounded">
                {q.queue_number}
              </span>
            ))}
            {waiting.length > 8 && (
              <span className="text-[11px] text-white/30 px-2 py-0.5">+{waiting.length - 8} lagi</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function MobileMonitor() {
  const [services, setServices] = useState([]);
  const [queues, setQueues] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [eventSetting, setEventSetting] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

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
    return () => {
      clearInterval(interval);
      unsubQ();
      unsubP();
    };
  }, [fetchData]);

  const getQueuesForService = (serviceId) => queues.filter(q => q.service_id === serviceId);

  const totalDone    = queues.filter(q => q.status === "DONE").length;
  const totalWaiting = queues.filter(q => q.status === "WAITING").length;
  const totalServing = queues.filter(q => q.status === "SERVING" || q.status === "CALLED").length;

  const eventName = eventSetting?.event_name || "Brilian Talks Health Care";
  const eventTagline = eventSetting?.event_tagline || "Healthy People, Healthy Performance";

  return (
    <div className="min-h-screen" style={{
      background: "linear-gradient(160deg, #003D79 0%, #005BAB 50%, #0077CC 100%)"
    }}>
      {/* Header */}
      <div className="sticky top-0 z-10 px-4 pt-4 pb-3 backdrop-blur-md bg-black/20 border-b border-white/10">
        <div className="max-w-lg mx-auto">
          <p className="text-cyan-300 text-xs font-bold uppercase tracking-widest">{eventName}</p>
          <div className="flex items-center justify-between mt-0.5">
            <h1 className="text-white font-black text-lg leading-tight">Monitor Antrian</h1>
            <button onClick={fetchData} className="flex items-center gap-1.5 text-white/50 text-xs active:scale-95">
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
              {lastUpdated.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-4 pb-8">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-2 mb-5">
          <div className="rounded-xl bg-white/8 border border-white/10 p-3 text-center">
            <p className="text-white font-black text-2xl">{totalWaiting}</p>
            <p className="text-white/50 text-xs mt-0.5">Menunggu</p>
          </div>
          <div className="rounded-xl bg-white/8 border border-white/10 p-3 text-center">
            <p className="text-amber-300 font-black text-2xl">{totalServing}</p>
            <p className="text-white/50 text-xs mt-0.5">Dilayani</p>
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
              participants={participants}
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

        <p className="text-center text-white/20 text-xs mt-5 uppercase tracking-widest">{eventTagline}</p>
      </div>
    </div>
  );
}