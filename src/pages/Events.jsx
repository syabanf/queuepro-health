import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar, MapPin, Users, Plus, Settings2, Trash2,
  CheckCircle2, Loader2, AlertCircle, Star
} from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import {
  AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader,
  AlertDialogTitle, AlertDialogDescription, AlertDialogFooter,
  AlertDialogCancel, AlertDialogAction
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { id } from "date-fns/locale";

const STATUS_COLORS = {
  DRAFT: "bg-gray-100 text-gray-600 border-gray-200",
  ACTIVE: "bg-green-100 text-green-700 border-green-200",
  CLOSED: "bg-red-100 text-red-600 border-red-200",
};

const STATUS_LABELS = { DRAFT: "Draft", ACTIVE: "Aktif", CLOSED: "Selesai" };

export default function Events() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [creatingNew, setCreatingNew] = useState(false);
  const [settingActive, setSettingActive] = useState(null);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["events"],
    queryFn: () => base44.entities.Event.list("-created_date"),
  });

  const handleCreateNew = async () => {
    setCreatingNew(true);
    const newEvent = await base44.entities.Event.create({
      event_name: "Event Baru",
      location: "",
      event_status: "DRAFT",
      is_active_event: false,
      max_participants: 200,
      service_quotas: [],
    });
    queryClient.invalidateQueries({ queryKey: ["events"] });
    setCreatingNew(false);
    navigate(`/events/${newEvent.id}`);
  };

  const handleSetActive = async (event) => {
    setSettingActive(event.id);
    // Deactivate all, then activate this one
    await Promise.all(events.map(e =>
      base44.entities.Event.update(e.id, { is_active_event: e.id === event.id })
    ));
    queryClient.invalidateQueries({ queryKey: ["events"] });
    setSettingActive(null);
  };

  const handleDelete = async (eventId) => {
    await base44.entities.Event.delete(eventId);
    queryClient.invalidateQueries({ queryKey: ["events"] });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Daftar Event"
        subtitle="Kelola semua event dan konfigurasi kuotanya"
        icon={Calendar}
        action={
          <Button size="sm" onClick={handleCreateNew} disabled={creatingNew} className="gap-1.5">
            {creatingNew ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Buat Event Baru
          </Button>
        }
      />

      {events.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
            <Calendar className="w-12 h-12 text-muted-foreground/40" />
            <p className="text-muted-foreground text-sm">Belum ada event. Buat event pertama Anda.</p>
            <Button onClick={handleCreateNew} disabled={creatingNew}>
              {creatingNew ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              Buat Event Baru
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {events.map(event => (
            <EventCard
              key={event.id}
              event={event}
              onConfigure={() => navigate(`/events/${event.id}`)}
              onSetActive={() => handleSetActive(event)}
              onDelete={() => handleDelete(event.id)}
              isSettingActive={settingActive === event.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function EventCard({ event, onConfigure, onSetActive, onDelete, isSettingActive }) {
  const totalQuotaSlots = (event.service_quotas || []).reduce((acc, sq) => {
    if (sq.is_unlimited) return acc;
    return acc + (sq.full_free_quota || 0) + (sq.cc_rp1_quota || 0) + (sq.full_paid_quota || 0);
  }, 0);

  const activeServices = (event.service_quotas || []).filter(sq => sq.is_active).length;

  return (
    <Card className={`relative transition-all hover:shadow-md ${event.is_active_event ? "border-primary/60 ring-2 ring-primary/20" : ""}`}>
      {event.is_active_event && (
        <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-[10px] font-bold flex items-center gap-1 shadow">
          <Star className="w-3 h-3" /> AKTIF
        </div>
      )}
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-sm leading-tight truncate">{event.event_name}</h3>
            {event.event_headline && (
              <p className="text-xs text-muted-foreground truncate mt-0.5">{event.event_headline}</p>
            )}
          </div>
          <Badge className={`text-[10px] border flex-shrink-0 ${STATUS_COLORS[event.event_status || "DRAFT"]}`}>
            {STATUS_LABELS[event.event_status || "DRAFT"]}
          </Badge>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">{event.location || "—"}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
            <span>
              {event.event_date
                ? (() => { try { return format(new Date(event.event_date), "dd MMM yyyy", { locale: id }); } catch { return event.event_date; } })()
                : "Tanggal belum diset"}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Users className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Kapasitas: {event.max_participants || 0} peserta</span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs bg-muted/40 rounded-lg px-3 py-2">
          <div className="text-center">
            <p className="font-bold text-sm">{activeServices}</p>
            <p className="text-muted-foreground">Layanan</p>
          </div>
          <div className="w-px h-6 bg-border" />
          <div className="text-center">
            <p className="font-bold text-sm">{totalQuotaSlots > 0 ? totalQuotaSlots : "—"}</p>
            <p className="text-muted-foreground">Total Slot</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="flex-1 gap-1.5 text-xs" onClick={onConfigure}>
            <Settings2 className="w-3.5 h-3.5" /> Konfigurasi
          </Button>

          {!event.is_active_event && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs border-primary text-primary hover:bg-primary hover:text-primary-foreground"
              onClick={onSetActive}
              disabled={isSettingActive}
            >
              {isSettingActive ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              Aktifkan
            </Button>
          )}

          {!event.is_active_event && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="outline" className="text-destructive hover:bg-destructive hover:text-destructive-foreground px-2.5">
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Hapus Event?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Event "<strong>{event.event_name}</strong>" akan dihapus permanen. Aksi ini tidak bisa dibatalkan.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Batal</AlertDialogCancel>
                  <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Hapus
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </CardContent>
    </Card>
  );
}