import React, { useState, useEffect, useCallback, useRef } from "react";
import { base44 } from "@/api/client";
import { RefreshCw, Activity, Syringe, Eye, Clock } from "lucide-react";

function usePrev(val) {
  const ref = useRef(val);
  useEffect(() => { ref.current = val; });
  return ref.current;
}

// Per-service visual config matching the key visual
const SERVICE_CONFIG = {
  'svc-a': { icon: Activity,  bgGrad: ['#003D79', '#005BAB'], label: 'MINI MCU' },
  'svc-b': { icon: Syringe,   bgGrad: ['#004D8C', '#0069C0'], label: 'VITAMIN C INJECTION' },
  'svc-c': { icon: Syringe,   bgGrad: ['#005BAB', '#0077CC'], label: 'INFLUENZA VACCINE' },
  'svc-d': { icon: Eye,       bgGrad: ['#004D8C', '#006BB3'], label: 'EYE CHECK (AIRDOC)' },
  'svc-e': { icon: Eye,       bgGrad: ['#003D79', '#005BAB'], label: 'EYE CHECK (AUTOREF)' },
};

const DEFAULT_CONFIG = { icon: Activity, bgGrad: ['#003D79', '#005BAB'], label: '' };

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

  const cfg = SERVICE_CONFIG[service.id] || DEFAULT_CONFIG;
  const Icon = cfg.icon;
  const isMedical = service.service_group === "MEDICAL";
  const participant = serving ? participants.find(p => p.id === serving.participant_id) : null;
  const [fromColor, toColor] = cfg.bgGrad;

  return (
    <div
      className={`flex flex-col rounded-2xl overflow-hidden transition-all duration-300 ${flash ? "scale-[1.02] shadow-2xl shadow-white/20" : ""}`}
      style={{ background: `linear-gradient(160deg, ${fromColor} 0%, ${toColor} 100%)` }}
    >
      {/* Top: BRI logo + Provider */}
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <div className="flex items-center gap-1.5">
          <img src="/logo-bri.png" alt="BRI" className="h-6 object-contain brightness-0 invert" onError={e => e.target.style.display='none'} />
          <span className="text-white font-black text-sm tracking-widest">BRI</span>
        </div>
        <div className="flex items-center gap-1.5">
          {isMedical ? (
            <>
              <img src="/logo-primaya.png" alt="Primaya" className="h-6 object-contain brightness-0 invert" onError={e => e.target.style.display='none'} />
              <span className="text-white/80 text-xs font-bold tracking-wider">PRIMAYA HOSPITAL</span>
            </>
          ) : (
            <>
              <img src="/logo-optik-melawai.png" alt="Optik Melawai" className="h-6 object-contain brightness-0 invert" onError={e => e.target.style.display='none'} />
              <span className="text-white/80 text-xs font-bold tracking-wider">OPTIK MELAWAI</span>
            </>
          )}
        </div>
      </div>

      {/* Service Name */}
      <div className="text-center px-4 py-2">
        <h2 className="text-white font-black text-2xl tracking-wide uppercase leading-tight">
          {service.service_name}
        </h2>
      </div>

      {/* Code badge + Icon + Queue Number */}
      <div className={`flex-1 flex items-center justify-center gap-5 px-6 py-4 transition-all duration-300 ${flash ? "bg-white/10" : "bg-transparent"}`}>
        {/* Code Badge */}
        <div className="flex flex-col items-center flex-shrink-0">
          <div className="w-16 h-16 rounded-xl bg-white/20 backdrop-blur-sm border border-white/30 flex flex-col items-center justify-center">
            <span className="text-white font-black text-3xl leading-none">{service.service_code}</span>
          </div>
          <span className="text-white/50 text-[10px] mt-1 uppercase tracking-widest font-bold">{service.service_name.split(' ')[0]}</span>
        </div>

        {/* Icon */}
        <Icon className="w-12 h-12 text-white/40 flex-shrink-0" strokeWidth={1.5} />

        {/* Queue Number */}
        <div className="text-center">
          <p className={`font-black tracking-widest leading-none transition-all duration-300
            ${serving ? "text-white" : "text-white/20"}
            ${flash ? "scale-110" : ""}
          `} style={{ fontSize: serving ? '5.5rem' : '4rem' }}>
            {serving ? serving.queue_number : "—"}
          </p>
          {serving && (
            <div className={`mt-2 inline-block px-4 py-1 rounded-full text-sm font-bold ${
              serving.status === "SERVING" ? "bg-green-400/30 text-green-200 border border-green-400/40"
              : serving.status === "QR_VERIFIED" ? "bg-blue-300/30 text-blue-100 border border-blue-300/40"
              : "bg-amber-400/30 text-amber-200 border border-amber-400/40"
            }`}>
              {serving.status === "SERVING" ? "● DILAYANI" : serving.status === "QR_VERIFIED" ? "● TERVERIFIKASI" : "● DIPANGGIL"}
            </div>
          )}
          {participant && (
            <p className="text-white/50 text-sm mt-1 truncate max-w-[200px]">{participant.full_name}</p>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 border-t border-white/10 bg-black/10">
        <div className="text-center py-3 border-r border-white/10">
          <p className="text-white/40 text-xs uppercase tracking-wider">Berikutnya</p>
          <p className={`font-black font-mono text-xl mt-0.5 ${next ? "text-white/80" : "text-white/20"}`}>
            {next ? next.queue_number : "—"}
          </p>
        </div>
        <div className="text-center py-3 border-r border-white/10">
          <p className="text-white/40 text-xs uppercase tracking-wider">Menunggu</p>
          <p className="font-black text-white text-xl mt-0.5">{waiting.length}</p>
        </div>
        <div className="text-center py-3">
          <p className="text-white/40 text-xs uppercase tracking-wider">Selesai</p>
          <p className="font-black text-green-300 text-xl mt-0.5">{doneCount}</p>
        </div>
      </div>

      {/* Instruction */}
      <div className="text-center py-3 bg-black/20">
        <p className="text-white/60 text-xs font-bold uppercase tracking-[0.2em]">
          SILAKAN MENUNGGU PANGGILAN DI LAYAR
        </p>
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
    const clockInterval = setInterval(() => setTick(t => t + 1), 1000);
    const unsubQ = base44.entities.Queue.subscribe(() => fetchData());
    const unsubP = base44.entities.Participant.subscribe(() => fetchData());
    return () => { clearInterval(interval); clearInterval(clockInterval); unsubQ(); unsubP(); };
  }, [fetchData]);

  const getQueuesForService = (serviceId) => queues.filter(q => q.service_id === serviceId);

  const totalServed  = queues.filter(q => q.status === "DONE").length;
  const totalWaiting = queues.filter(q => q.status === "WAITING").length;

  const now = new Date();
  const timeStr = now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const dateStr = now.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  const eventName = eventSetting?.event_name || "Brilian Talks Health Care";
  const eventTagline = eventSetting?.event_tagline || "Healthy People, Healthy Performance";

  // Split into rows: medical (up to 3) and eye (up to 2)
  const medicalServices = services.filter(s => s.service_group === "MEDICAL");
  const eyeServices     = services.filter(s => s.service_group === "EYE_CHECK");

  return (
    <div className="fixed inset-0 overflow-hidden" style={{
      background: "linear-gradient(135deg, #001A3A 0%, #003D79 40%, #005BAB 100%)"
    }}>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-white/3 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-cyan-400/5 blur-3xl" />
      </div>

      <div className="relative h-full flex flex-col px-5 pt-4 pb-4 gap-3">
        {/* Top Bar */}
        <div className="flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <img src="/logo-bri.png" alt="BRI" className="h-8 object-contain brightness-0 invert" onError={e => e.target.style.display='none'} />
              <span className="text-white font-black text-xl tracking-widest">BRI</span>
            </div>
            <div className="w-px h-6 bg-white/20" />
            <div>
              <p className="text-cyan-300 text-xs font-bold uppercase tracking-[0.25em]">{eventTagline}</p>
              <h1 className="text-white font-black text-xl leading-tight">{eventName}</h1>
            </div>
          </div>
          <div className="flex items-center gap-8 text-white/60">
            <div className="text-center">
              <p className="text-white font-black text-3xl">{totalWaiting}</p>
              <p className="text-xs">Menunggu</p>
            </div>
            <div className="text-center">
              <p className="text-green-300 font-black text-3xl">{totalServed}</p>
              <p className="text-xs">Selesai</p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1.5 justify-end">
                <Clock className="w-4 h-4" />
                <span className="font-mono font-black text-white text-2xl">{timeStr}</span>
                <RefreshCw className={`w-3.5 h-3.5 ml-1 ${isRefreshing ? "animate-spin" : ""}`} />
              </div>
              <p className="text-[11px] text-white/40">{dateStr}</p>
            </div>
          </div>
        </div>

        {/* Medical row */}
        {medicalServices.length > 0 && (
          <div className="flex-1 grid gap-3 min-h-0" style={{
            gridTemplateColumns: `repeat(${medicalServices.length}, 1fr)`
          }}>
            {medicalServices.map(service => (
              <ServiceCard key={service.id} service={service} queues={getQueuesForService(service.id)} participants={participants} />
            ))}
          </div>
        )}

        {/* Eye row */}
        {eyeServices.length > 0 && (
          <div className="flex-1 grid gap-3 min-h-0" style={{
            gridTemplateColumns: `repeat(${eyeServices.length}, 1fr)`,
            maxWidth: eyeServices.length < medicalServices.length ? `${(eyeServices.length / Math.max(medicalServices.length, 1)) * 100}%` : '100%',
            margin: '0 auto',
            width: '100%',
          }}>
            {eyeServices.map(service => (
              <ServiceCard key={service.id} service={service} queues={getQueuesForService(service.id)} participants={participants} />
            ))}
          </div>
        )}

        {services.length === 0 && (
          <div className="flex-1 flex items-center justify-center text-white/30">
            <div className="text-center">
              <RefreshCw className="w-16 h-16 mx-auto mb-4 opacity-30 animate-spin" />
              <p className="text-xl">Memuat data layanan...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
