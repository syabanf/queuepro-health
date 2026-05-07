import React, { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Monitor, ChevronRight, PhoneCall, PlayCircle, CheckCircle2,
  SkipForward, XCircle, RotateCcw, Clock, Users, Hash,
  Stethoscope, Eye, ListChecks
} from "lucide-react";

const QUEUE_STATUS_CONFIG = {
  WAITING:   { label: "Menunggu",   color: "bg-slate-100 text-slate-600 border-slate-200" },
  CALLED:    { label: "Dipanggil", color: "bg-amber-100 text-amber-700 border-amber-200" },
  SERVING:   { label: "Dilayani",  color: "bg-purple-100 text-purple-700 border-purple-200" },
  DONE:      { label: "Selesai",   color: "bg-green-100 text-green-700 border-green-200" },
  SKIPPED:   { label: "Dilewati", color: "bg-orange-100 text-orange-700 border-orange-200" },
  CANCELLED: { label: "Batal",    color: "bg-red-100 text-red-700 border-red-200" },
};

async function logQueueEvent({ queue_id, event_type, previous_status, new_status, performed_by, notes }) {
  await base44.entities.QueueEvent.create({
    queue_id, event_type, previous_status, new_status,
    performed_by: performed_by || "",
    notes: notes || "",
    created_at: new Date().toISOString(),
  });
}

export default function NakesBooth() {
  const queryClient = useQueryClient();
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(u => setCurrentUser(u)).catch(() => {});
  }, []);

  const { data: services = [] } = useQuery({
    queryKey: ["services"],
    queryFn: () => base44.entities.Service.list(),
  });

  const selectedService = services.find(s => s.id === selectedServiceId);

  const { data: queues = [], isLoading } = useQuery({
    queryKey: ["booth-queues", selectedServiceId],
    queryFn: () => base44.entities.Queue.filter({ service_id: selectedServiceId }),
    enabled: !!selectedServiceId,
    refetchInterval: 5000,
  });

  const sorted = [...queues].sort((a, b) => (a.queue_sequence || 0) - (b.queue_sequence || 0));
  const waiting = sorted.filter(q => q.status === "WAITING");
  const called = sorted.find(q => q.status === "CALLED");
  const serving = sorted.find(q => q.status === "SERVING");
  const skipped = sorted.filter(q => q.status === "SKIPPED");
  const done = sorted.filter(q => q.status === "DONE");
  const nextWaiting = waiting[0];

  const updateQueue = useMutation({
    mutationFn: async ({ queue, newStatus, eventType, notes }) => {
      const now = new Date().toISOString();
      const timeField = {
        CALLED: "called_at", SERVING: "serving_at", DONE: "done_at",
        SKIPPED: "skipped_at", CANCELLED: "cancelled_at"
      }[newStatus];
      const update = { status: newStatus };
      if (timeField) update[timeField] = now;
      await base44.entities.Queue.update(queue.id, update);
      await logQueueEvent({
        queue_id: queue.id,
        event_type: eventType,
        previous_status: queue.status,
        new_status: newStatus,
        performed_by: currentUser?.email,
        notes,
      });
      // If DONE, update participant status
      if (newStatus === "DONE") {
        const allQueues = await base44.entities.Queue.filter({ participant_id: queue.participant_id });
        const updated = allQueues.map(q => q.id === queue.id ? { ...q, status: "DONE" } : q);
        const allDone = updated.every(q => q.status === "DONE");
        const anyDone = updated.some(q => q.status === "DONE");
        const newParticipantStatus = allDone ? "COMPLETED" : anyDone ? "PARTIALLY_COMPLETED" : "REGISTERED";
        await base44.entities.Participant.update(queue.participant_id, { participant_status: newParticipantStatus });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["booth-queues", selectedServiceId] });
      queryClient.invalidateQueries({ queryKey: ["queues"] });
      queryClient.invalidateQueries({ queryKey: ["participants"] });
    },
  });

  const handleAction = (queue, newStatus, eventType, notes) => {
    updateQueue.mutate({ queue, newStatus, eventType, notes });
  };

  const activeQueue = serving || called;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
            <Monitor className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Panel Booth Nakes</h1>
            <p className="text-sm text-muted-foreground">Operasional layanan kesehatan</p>
          </div>
        </div>
        <div className="sm:ml-auto w-full sm:w-64">
          <Select value={selectedServiceId} onValueChange={setSelectedServiceId}>
            <SelectTrigger>
              <SelectValue placeholder="Pilih booth layanan..." />
            </SelectTrigger>
            <SelectContent>
              {services.map(s => (
                <SelectItem key={s.id} value={s.id}>
                  [{s.service_code}] {s.service_name} — Booth {s.booth_number}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!selectedServiceId ? (
        <Card className="border-dashed border-2">
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Monitor className="w-12 h-12 text-muted-foreground/30 mb-4" />
            <p className="text-lg font-medium text-muted-foreground">Pilih Booth Layanan</p>
            <p className="text-sm text-muted-foreground/70 mt-1">Pilih booth yang ditugaskan untuk memulai operasi antrian.</p>
          </div>
        </Card>
      ) : (
        <>
          {/* Service Info Bar */}
          <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl bg-primary text-primary-foreground">
            {selectedService?.service_group === "MEDICAL"
              ? <Stethoscope className="w-5 h-5 flex-shrink-0" />
              : <Eye className="w-5 h-5 flex-shrink-0" />}
            <div className="flex-1 min-w-0">
              <p className="font-bold text-lg leading-tight">{selectedService?.service_name}</p>
              <p className="text-primary-foreground/70 text-sm">Booth {selectedService?.booth_number} &bull; Kode: {selectedService?.service_code}</p>
            </div>
            <div className="flex gap-4 text-sm">
              <div className="text-center">
                <p className="font-bold text-2xl">{waiting.length}</p>
                <p className="text-primary-foreground/70">Menunggu</p>
              </div>
              <div className="text-center">
                <p className="font-bold text-2xl">{done.length}</p>
                <p className="text-primary-foreground/70">Selesai</p>
              </div>
              <div className="text-center">
                <p className="font-bold text-2xl">{skipped.length}</p>
                <p className="text-primary-foreground/70">Dilewati</p>
              </div>
            </div>
          </div>

          {/* Main Panel */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Now Serving Card */}
            <div className="lg:col-span-2 space-y-4">
              <Card className="border-2 border-primary/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-muted-foreground uppercase tracking-wider">Now Serving</CardTitle>
                </CardHeader>
                <CardContent>
                  {activeQueue ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-7xl font-black text-primary tracking-widest leading-none">
                            {activeQueue.queue_number}
                          </p>
                          <p className="text-sm text-muted-foreground mt-2">
                            Slot: <span className="font-semibold">{activeQueue.slot_type === "FREE" ? "Gratis" : "Berbayar"}</span>
                          </p>
                        </div>
                        <Badge className={`text-sm px-4 py-2 border ${QUEUE_STATUS_CONFIG[activeQueue.status]?.color}`}>
                          {QUEUE_STATUS_CONFIG[activeQueue.status]?.label}
                        </Badge>
                      </div>
                      {/* Action Buttons */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-border">
                        {activeQueue.status === "CALLED" && (
                          <Button className="gap-2" onClick={() => handleAction(activeQueue, "SERVING", "SERVING")}>
                            <PlayCircle className="w-4 h-4" /> Mulai Layanan
                          </Button>
                        )}
                        {activeQueue.status === "SERVING" && (
                          <Button className="gap-2 bg-green-600 hover:bg-green-700" onClick={() => handleAction(activeQueue, "DONE", "DONE")}>
                            <CheckCircle2 className="w-4 h-4" /> Selesai
                          </Button>
                        )}
                        {(activeQueue.status === "CALLED" || activeQueue.status === "SERVING") && (
                          <Button variant="outline" className="gap-2 text-orange-600 border-orange-300 hover:bg-orange-50"
                            onClick={() => handleAction(activeQueue, "SKIPPED", "SKIPPED")}>
                            <SkipForward className="w-4 h-4" /> Lewati
                          </Button>
                        )}
                        <Button variant="outline" className="gap-2 text-red-600 border-red-300 hover:bg-red-50"
                          onClick={() => handleAction(activeQueue, "CANCELLED", "CANCELLED")}>
                          <XCircle className="w-4 h-4" /> Batalkan
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-5xl font-black text-muted-foreground/20">—</p>
                      <p className="text-sm text-muted-foreground mt-3">Belum ada antrian aktif</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Next Queue + Call Next */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Berikutnya</p>
                      <p className="text-3xl font-black text-foreground/60">
                        {nextWaiting ? nextWaiting.queue_number : "—"}
                      </p>
                      {nextWaiting && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {nextWaiting.slot_type === "FREE" ? "Gratis" : "Berbayar"}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button
                        size="lg"
                        disabled={!nextWaiting || !!called || !!serving || updateQueue.isPending}
                        onClick={() => handleAction(nextWaiting, "CALLED", "CALLED")}
                        className="gap-2"
                      >
                        <PhoneCall className="w-5 h-5" /> Panggil Berikutnya
                      </Button>
                      {skipped.length > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2 text-orange-600 border-orange-300"
                          disabled={!!called || !!serving || updateQueue.isPending}
                          onClick={() => handleAction(skipped[0], "CALLED", "RECALLED")}
                        >
                          <RotateCcw className="w-4 h-4" /> Panggil Ulang Dilewati
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Queue Lists */}
            <div className="space-y-4">
              {/* Waiting */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-500" />
                    Menunggu
                    <Badge variant="secondary" className="ml-auto">{waiting.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0 max-h-48 overflow-y-auto space-y-1">
                  {waiting.length === 0
                    ? <p className="text-xs text-muted-foreground text-center py-4">Kosong</p>
                    : waiting.map(q => (
                      <div key={q.id} className="flex items-center justify-between px-2 py-1.5 rounded-md bg-muted/40 text-sm">
                        <span className="font-mono font-bold">{q.queue_number}</span>
                        <span className="text-xs text-muted-foreground">{q.slot_type === "FREE" ? "Gratis" : "Bayar"}</span>
                      </div>
                    ))
                  }
                </CardContent>
              </Card>

              {/* Skipped */}
              {skipped.length > 0 && (
                <Card className="border-orange-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <SkipForward className="w-4 h-4 text-orange-500" />
                      Dilewati
                      <Badge variant="secondary" className="ml-auto bg-orange-100 text-orange-700">{skipped.length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-0 max-h-36 overflow-y-auto space-y-1">
                    {skipped.map(q => (
                      <div key={q.id} className="flex items-center justify-between px-2 py-1.5 rounded-md bg-orange-50 text-sm">
                        <span className="font-mono font-bold text-orange-700">{q.queue_number}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 text-xs text-orange-600"
                          disabled={!!called || !!serving || updateQueue.isPending}
                          onClick={() => handleAction(q, "CALLED", "RECALLED")}
                        >
                          <RotateCcw className="w-3 h-3 mr-1" /> Panggil
                        </Button>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Done */}
              <Card className="border-green-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    Selesai Dilayani
                    <Badge variant="secondary" className="ml-auto bg-green-100 text-green-700">{done.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0 max-h-48 overflow-y-auto space-y-1">
                  {done.length === 0
                    ? <p className="text-xs text-muted-foreground text-center py-4">Belum ada</p>
                    : done.slice(-10).reverse().map(q => (
                      <div key={q.id} className="flex items-center justify-between px-2 py-1.5 rounded-md bg-green-50 text-sm">
                        <span className="font-mono font-bold text-green-700">{q.queue_number}</span>
                        <span className="text-xs text-muted-foreground">{q.slot_type === "FREE" ? "Gratis" : "Bayar"}</span>
                      </div>
                    ))
                  }
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}