import React, { useState, useEffect, useCallback, useRef } from "react";
import { base44 } from "@/api/client";
import { RefreshCw, Activity, Syringe, Eye, Clock } from "lucide-react";

function usePrev(val) {
  const ref = useRef(val);
  useEffect(() => { ref.current = val; });
  return ref.current;
}

const SERVICE_CONFIG = {
  'svc-a': { icon: Activity,  bgGrad: ['#003D79', '#005BAB'], label: 'MINI MCU' },
  'svc-b': { icon: Syringe,   bgGrad: ['#004D8C', '#0069C0'], label: 'VITAMIN C' },
  'svc-c': { icon: Syringe,   bgGrad: ['#005BAB', '#0077CC'], label: 'INFLUENZA' },
  'svc-d': { icon: Eye,       bgGrad: ['#004D8C', '#006BB3'], label: 'EYE AIRDOC' },
  'svc-e': { icon: Eye,       bgGrad: ['#003D79', '#005BAB'], label: 'EYE AUTOREF' },
};
const DEFAULT_CONFIG = { icon: Activity, bgGrad: ['#003D79', '#005BAB'], label: '' };

function ServiceCard({ service, queues }) {
  const sorted = [...queues].sort((a, b) => (a.queue_sequence || 0) - (b.queue_sequence || 0));
  const serving = sorted.find(q => ["SERVING", "QR_VERIFIED", "CALLED"].includes(q.status));
  const next = sorted.find(q => q.status === "WAITING");

  const prevServing = usePrev(serving?.queue_number);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (serving?.queue_number && serving.queue_number !== prevServing) {
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 1400);
      return () => clearTimeout(t);
    }
  }, [serving?.queue_number]);

  const cfg = SERVICE_CONFIG[service.id] || DEFAULT_CONFIG;
  const Icon = cfg.icon;
  const isMedical = service.service_group === "MEDICAL";
  const [fromColor, toColor] = cfg.bgGrad;

  return (
    <div
      className={`flex flex-col rounded-2xl overflow-hidden transition-all duration-300 ${flash ? "scale-[1.02] shadow-2xl shadow-white/20" : ""}`}
      style={{ background: `linear-gradient(160deg, ${fromColor} 0%, ${toColor} 100%)` }}
    >
      {/* Service name */}
      <div className="text-center px-4 pt-4 pb-1">
        <div className="flex items-center justify-center gap-2">
          <Icon className="w-5 h-5 text-white/50 flex-shrink-0" strokeWidth={1.5} />
          <h2 className="text-white font-black text-xl tracking-wide uppercase leading-tight">
            {service.service_name}
          </h2>
        </div>
        <p className="text-white/50 text-xs font-medium mt-1">
          by {isMedical ? "Primaya Hospital" : "Optik Melawai"}
        </p>
      </div>

      {/* Queue number focal point */}
      <div className={`flex-1 flex flex-col items-center justify-center py-6 px-4 transition-all duration-300 ${flash ? "bg-white/10" : ""}`}>
        <div className="px-5 py-1.5 mb-4 rounded-full bg-white text-[#003D79] text-sm font-black uppercase tracking-widest border border-white/80">
          NOMOR ANTRIAN
        </div>
        <p
          className={`font-black tracking-widest leading-none transition-all duration-500
            ${serving ? "text-white" : "text-white/15"}
            ${flash ? "scale-110" : ""}
          `}
          style={{ fontSize: serving ? '7rem' : '6rem' }}
        >
          {serving ? serving.queue_number : "—"}
        </p>
        {serving && (
          <div className={`mt-4 px-5 py-1.5 rounded-full text-sm font-bold border ${
            serving.status === "SERVING"
              ? "bg-green-400/25 text-green-200 border-green-400/40"
              : serving.status === "QR_VERIFIED"
              ? "bg-blue-300/25 text-blue-100 border-blue-300/40"
              : "bg-amber-400/25 text-amber-200 border-amber-400/40"
          }`}>
            {serving.status === "SERVING" ? "● SEDANG DILAYANI"
              : serving.status === "QR_VERIFIED" ? "● TERVERIFIKASI"
              : "● DIPANGGIL"}
          </div>
        )}
        {!serving && (
          <p className="text-white/25 text-sm mt-3 uppercase tracking-widest">Menunggu panggilan</p>
        )}
      </div>

      {/* BERIKUTNYA — secondary info at bottom */}
      <div className="border-t border-white/15 bg-black/15 py-5 text-center">
        <p className="text-white/40 text-xs font-bold uppercase tracking-[0.25em] mb-2">
          BERIKUTNYA
        </p>
        <p className={`font-black font-mono tracking-widest text-3xl leading-none ${next ? "text-white/75" : "text-white/20"}`}>
          {next ? next.queue_number : "—"}
        </p>
      </div>
    </div>
  );
}

export default function LEDMonitor() {
  const [services, setServices] = useState([]);
  const [queues, setQueues] = useState([]);
  const [eventSetting, setEventSetting] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [tick, setTick] = useState(0);

  const fetchData = useCallback(async () => {
    setIsRefreshing(true);
    const [svcList, queueList, settings] = await Promise.all([
      base44.entities.Service.list(),
      base44.entities.Queue.list(),
      base44.entities.EventSetting.list(),
    ]);
    setServices(svcList.filter(s => s.is_active));
    setQueues(queueList);
    if (settings.length > 0) setEventSetting(settings[0]);
    setLastUpdated(new Date());
    setIsRefreshing(false);
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    const clockInterval = setInterval(() => setTick(t => t + 1), 1000);
    const unsubQ = base44.entities.Queue.subscribe(() => fetchData());
    return () => { clearInterval(interval); clearInterval(clockInterval); unsubQ(); };
  }, [fetchData]);

  const getQueuesForService = (serviceId) => queues.filter(q => q.service_id === serviceId);

  const now = new Date();
  const timeStr = now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const dateStr = now.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  const eventName = eventSetting?.event_name || "Brilian Talks Health Care";
  const eventTagline = eventSetting?.event_tagline || "Healthy People, Healthy Performance";

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
          {/* Logos + Event Name */}
          <div className="flex items-center gap-4">
            {/* Danantara Logo */}
            <div className="bg-white rounded-xl px-3 py-1.5 flex items-center justify-center flex-shrink-0">
              <img
                src="/logo-danantara.png"
                alt="Danantara Indonesia"
                className="h-8 object-contain"
                onError={e => e.target.style.display='none'}
              />
            </div>

            <div className="w-px h-8 bg-white/20 flex-shrink-0" />

            {/* BRI Logo */}
            <div className="bg-white rounded-xl px-3 py-1.5 flex items-center justify-center flex-shrink-0">
              <img
                src="/logo-bri-full.svg"
                alt="BRI"
                className="h-8 object-contain"
                onError={e => e.target.style.display='none'}
              />
            </div>

            <div className="w-px h-8 bg-white/20 flex-shrink-0" />

            {/* BRILian Talks Logo */}
            <div className="bg-white rounded-xl px-3 py-1.5 flex items-center justify-center flex-shrink-0">
              <img
                src="/logo-brilian-talks.png"
                alt="BRILian Talks"
                className="h-8 object-contain"
                onError={e => e.target.style.display='none'}
              />
            </div>
          </div>

          {/* Clock */}
          <div className="flex items-center gap-2 text-white/60">
            <Clock className="w-4 h-4" />
            <span className="font-mono font-black text-white text-2xl">{timeStr}</span>
            <RefreshCw className={`w-3.5 h-3.5 ml-1 ${isRefreshing ? "animate-spin" : ""}`} />
          </div>
        </div>

        {/* Medical row */}
        {medicalServices.length > 0 && (
          <div className="flex-1 grid gap-3 min-h-0" style={{
            gridTemplateColumns: `repeat(${medicalServices.length}, 1fr)`
          }}>
            {medicalServices.map(service => (
              <ServiceCard key={service.id} service={service} queues={getQueuesForService(service.id)} />
            ))}
          </div>
        )}

        {/* Eye row */}
        {eyeServices.length > 0 && (
          <div className="flex-1 grid gap-3 min-h-0" style={{
            gridTemplateColumns: `repeat(${eyeServices.length}, 1fr)`,
            maxWidth: eyeServices.length < medicalServices.length
              ? `${(eyeServices.length / Math.max(medicalServices.length, 1)) * 100}%`
              : '100%',
            margin: '0 auto',
            width: '100%',
          }}>
            {eyeServices.map(service => (
              <ServiceCard key={service.id} service={service} queues={getQueuesForService(service.id)} />
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

        {/* Date footer */}
        <p className="text-center text-white/25 text-xs flex-shrink-0">{dateStr}</p>
      </div>
    </div>
  );
}
