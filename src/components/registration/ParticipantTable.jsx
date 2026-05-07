import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { PARTICIPANT_STATUS_LABELS, PARTICIPANT_STATUS_COLORS, SLOT_TYPE_COLORS } from "@/lib/registrationUtils";

const PAGE_SIZE = 10;

export default function ParticipantTable({ participants, queues, services }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const serviceMap = Object.fromEntries(services.map(s => [s.id, s]));

  // Build enriched participant rows
  const enriched = participants.map(p => {
    const medQueue = queues.find(q => q.participant_id === p.id && serviceMap[q.service_id]?.service_group === "MEDICAL");
    const eyeQueue = queues.find(q => q.participant_id === p.id && serviceMap[q.service_id]?.service_group === "EYE_CHECK");
    return { ...p, medQueue, eyeQueue };
  });

  const filtered = enriched.filter(p =>
    p.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    p.registration_number?.toLowerCase().includes(search.toLowerCase()) ||
    p.phone_number?.includes(search) ||
    p.unit_division?.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const StatusBadge = ({ status }) => (
    <Badge className={`text-xs font-medium border ${PARTICIPANT_STATUS_COLORS[status] || "bg-gray-100 text-gray-700"}`}>
      {PARTICIPANT_STATUS_LABELS[status] || status}
    </Badge>
  );

  const SlotBadge = ({ type }) => (
    <Badge className={`text-xs border ${SLOT_TYPE_COLORS[type] || ""}`}>
      {type === "FREE" ? "Gratis" : type === "PAID" ? "Bayar" : "—"}
    </Badge>
  );

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <CardTitle className="text-base flex items-center gap-2 flex-1">
            <Users className="w-5 h-5 text-primary" />
            Peserta Terdaftar
            <Badge variant="secondary" className="ml-1 text-xs">{participants.length}</Badge>
          </CardTitle>
          <div className="relative w-full sm:w-60">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Cari nama, no. reg..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="pl-8 h-8 text-sm"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-y border-border">
              <tr>
                {["No. Reg", "Nama", "No. Telp", "Unit/Divisi", "Antrian Medis", "Slot", "Antrian Mata", "Slot", "Status", "Waktu Daftar", ""].map((col, i) => (
                  <th key={i} className="text-left text-xs font-semibold text-muted-foreground py-2.5 px-3 whitespace-nowrap">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-center py-12 text-sm text-muted-foreground">
                    {search ? "Tidak ada hasil yang cocok" : "Belum ada peserta terdaftar"}
                  </td>
                </tr>
              ) : (
                paged.map(p => (
                  <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="py-2.5 px-3">
                      <span className="text-xs font-mono text-muted-foreground">{p.registration_number}</span>
                    </td>
                    <td className="py-2.5 px-3">
                      <p className="font-medium text-foreground whitespace-nowrap">{p.full_name}</p>
                    </td>
                    <td className="py-2.5 px-3 text-muted-foreground whitespace-nowrap">{p.phone_number}</td>
                    <td className="py-2.5 px-3 text-muted-foreground whitespace-nowrap">{p.unit_division}</td>
                    <td className="py-2.5 px-3">
                      {p.medQueue ? (
                        <div className="flex items-center gap-1">
                          <span className="font-mono font-bold text-primary text-sm">{p.medQueue.queue_number}</span>
                          <span className="text-xs text-muted-foreground hidden xl:block">· {serviceMap[p.medQueue.service_id]?.service_name}</span>
                        </div>
                      ) : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="py-2.5 px-3">
                      {p.medical_slot_type && <SlotBadge type={p.medical_slot_type} />}
                    </td>
                    <td className="py-2.5 px-3">
                      {p.eyeQueue ? (
                        <div className="flex items-center gap-1">
                          <span className="font-mono font-bold text-accent text-sm">{p.eyeQueue.queue_number}</span>
                          <span className="text-xs text-muted-foreground hidden xl:block">· {serviceMap[p.eyeQueue.service_id]?.service_name}</span>
                        </div>
                      ) : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="py-2.5 px-3">
                      {p.eye_slot_type && <SlotBadge type={p.eye_slot_type} />}
                    </td>
                    <td className="py-2.5 px-3">
                      <StatusBadge status={p.participant_status} />
                    </td>
                    <td className="py-2.5 px-3 text-xs text-muted-foreground whitespace-nowrap">
                      {p.registered_at
                        ? format(new Date(p.registered_at), "dd MMM, HH:mm")
                        : p.created_date
                        ? format(new Date(p.created_date), "dd MMM, HH:mm")
                        : "—"}
                    </td>
                    <td className="py-2.5 px-3">
                      <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground hover:text-foreground">
                        Detail
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filtered.length > PAGE_SIZE && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <span className="text-xs text-muted-foreground">
              {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} dari {filtered.length} peserta
            </span>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-xs font-medium px-2">{page} / {totalPages}</span>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}