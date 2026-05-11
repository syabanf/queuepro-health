import React, { useState, useEffect, useCallback, useRef } from "react";
import { base44 } from "@/api/client";
import { RefreshCw, Monitor, Eye, Stethoscope, Volume2, Users, Clock } from "lucide-react";

function usePrev(val) {
  const ref = useRef(val);
  useEffect(() => { ref.current = val; });
  return ref.current;
}

function ServiceCard({ service, queues, participants }) {
  const sorted = [...queues].sort((a, b) => (a.queue_sequence || 0) - (b.queue_sequence || 0));
  const serving = sorted.find(q => q.status === "SERVING" || q.status === "QR_VERIFIED" || q.status === "CALLED");
  const waiting = sorted.filter(q => q.status === "WAITING");
  const next = waiting[0];
  const doneCount = sorted.filter(q => q.status === "DONE").length;

  const prevServing = usePrev(serving?.queue_number);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (serving?.queue_number && serving.queue_number !== prevServing) {
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 1200);
      return () => clearTimeout(t);
    }
  }, [serving?.queue_number]);

  const isMedical = service.service_group === "MEDICAL";
  const Icon = isMedical ? Stethoscope : Eye;
  const participant = serving ? participants.find(p => p.id === serving.participant_id) : null;

  return (
    <div className={`flex flex-col rounded-3xl overflow-hidden border-2 transition-all duration-300
      ${flash ? "border-white/80 shadow-2xl shadow-white/30 scale-[1.01]" : "border-white/15 bg-white/5 backdrop-blur-sm"}`}>
      {/* Card Header */}
      <div className={`flex items-center gap-3 px-6 py-4 ${isMedical ? "bg-blue-500/30" : "bg-cyan-500/30"}`}>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${isMedical ? "bg-blue-400/40" : "bg-cyan-400/40"}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white/60 text-sm font-bold uppercase tracking-widest">Kode {service.service_code}</p>
          <p className="text-white font-bold text-xl leading-tight truncate">{service.service_name}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-white/50 text-sm">Booth</p>
          <p className="text-white font-black text-3xl leading-none">{service.booth_number}</p>
        </div>
      </div>

      {/* Now Serving */}
      <div className={`flex-1 flex flex-col items-center justify-center py-8 px-4 transition-all duration-300
        ${flash ? "bg-white/15" : "bg-white/5"}`}>
        <p className="text-white/50 text-base uppercase tracking-[0.3em] mb-3">Now Serving</p>
        <p className={`font-black tracking-widest leading-none transition-all duration-300
          ${serving ? "text-[7rem] text-white" : "text-7xl text-white/20"}
          ${flash ? "scale-110" : ""}`}>
          {serving ? serving.queue_number : "—"}
        </p>
        {serving && (
          <>
            <div className={`mt-4 px-5 py-1.5 rounded-full text-base font-bold ${
              serving.status === "SERVING" ? "bg-green-400/20 text-green-300 border border-green-400/30"
              : serving.status === "QR_VERIFIED" ? "bg-blue-400/20 text-blue-300 border border-blue-400/30"
              : "bg-amber-400/20 text-amber-300 border border-amber-400/30"
            }`}>
              {serving.status === "SERVING" ? "● DILAYANI" : serving.status === "QR_VERIFIED" ? "● TERVERIFIKASI" : "● DIPANGGIL"}
            </div>
            {participant && (
              <p className="text-white/60 text-lg mt-3 font-semibold truncate max-w-full px-4 text-center">
                {participant.full_name}
              </p>
            )}
          </>
        )}
        {!serving && <p className="text-white/25 text-lg mt-4">Belum ada antrian aktif</p>}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 border-t-2 border-white/10">
        <div className="flex flex-col items-center justify-center py-4 px-3 border-r-2 border-white/10">
          <p className="text-white/40 text-sm uppercase tracking-wider">Berikutnya</p>
          <p className={`font-black font-mono text-3xl mt-1 ${next ? "text-white/80" : "text-white/20"}`}>
            {next ? next.queue_number : "—"}
          </p>
        </div>
        <div className="flex flex-col items-center justify-center py-4 px-3 border-r-2 border-white/10">
          <p className="text-white/40 text-sm uppercase tracking-wider">Menunggu</p>
          <p className="font-black text-white text-3xl mt-1">{waiting.length}</p>
        </div>
        <div className="flex flex-col items-center justify-center py-4 px-3">
          <p className="text-white/40 text-sm uppercase tracking-wider">Selesai</p>
          <p className="font-black text-green-300 text-3xl mt-1">{doneCount}</p>
        </div>
      </div>
    </div>
  );
}

export default function LEDMonitor() {
  const [services, setServices] = useState([]);
  const [queues, setQueues] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [eventSetting, setEventSetting] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [tick, setTick] = useState(0);

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
    // Clock tick every second
    const clockInterval = setInterval(() => setTick(t => t + 1), 1000);
    const unsubQ = base44.entities.Queue.subscribe(() => fetchData());
    const unsubP = base44.entities.Participant.subscribe(() => fetchData());
    return () => {
      clearInterval(interval);
      clearInterval(clockInterval);
      unsubQ();
      unsubP();
    };
  }, [fetchData]);

  const getQueuesForService = (serviceId) => queues.filter(q => q.service_id === serviceId);

  const totalServed  = queues.filter(q => q.status === "DONE").length;
  const totalWaiting = queues.filter(q => q.status === "WAITING").length;

  const now = new Date();
  const timeStr = now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const dateStr = now.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  const eventName = eventSetting?.event_name || "Brilian Talks Health Care";
  const eventHeadline = eventSetting?.event_headline || "Happy Physic: Strong Body, Strong Impact";
  const eventTagline = eventSetting?.event_tagline || "Healthy People, Healthy Performance";

  return (
    <div className="fixed inset-0 overflow-hidden" style={{
      background: "linear-gradient(135deg, #003D79 0%, #005BAB 40%, #0077CC 70%, #0095E8 100%)"
    }}>
      {/* Decorative blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-blue-600/20 blur-3xl" />
      </div>

      <div className="relative h-full flex flex-col px-6 pt-4 pb-4">
        {/* Top Bar */}
        <div className="flex items-center justify-between mb-5 flex-shrink-0 gap-4">
          <div className="min-w-0">
            <p className="text-cyan-300 text-sm font-bold uppercase tracking-[0.3em] truncate">{eventHeadline}</p>
            <h1 className="text-white font-black text-3xl leading-tight tracking-wide">{eventName}</h1>
          </div>
          <div className="flex items-center gap-8 text-white/60 flex-shrink-0">
            <div className="text-center">
              <p className="text-white font-black text-3xl">{totalWaiting}</p>
              <p className="text-sm">Menunggu</p>
            </div>
            <div className="text-center">
              <p className="text-green-300 font-black text-3xl">{totalServed}</p>
              <p className="text-sm">Selesai</p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1.5 justify-end">
                <Clock className="w-4 h-4" />
                <span className="font-mono font-black text-white text-2xl">{timeStr}</span>
                <RefreshCw className={`w-4 h-4 ml-1 ${isRefreshing ? "animate-spin" : ""}`} />
              </div>
              <p className="text-xs text-white/40 mt-0.5">{dateStr}</p>
            </div>
          </div>
        </div>

        {/* Service Cards */}
        <div className="flex-1 grid gap-6 min-h-0" style={{
          gridTemplateColumns: `repeat(${Math.min(services.length || 1, 3)}, 1fr)`
        }}>
          {services.map(service => (
            <ServiceCard
              key={service.id}
              service={service}
              queues={getQueuesForService(service.id)}
              participants={participants}
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

        {/* Bottom Bar */}
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
          <p className="text-center text-white/30 text-xs mt-2 tracking-widest uppercase">{eventTagline}</p>
        </div>
      </div>
    </div>
  );
}