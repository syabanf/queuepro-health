import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Users, Search, ChevronLeft, ChevronRight, Stethoscope, Eye } from "lucide-react";
import { format } from "date-fns";
import { PARTICIPANT_STATUS_LABELS, PARTICIPANT_STATUS_COLORS } from "@/lib/registrationUtils";

const PAGE_SIZE = 10;

export default function ParticipantTable({ participants, queues, services }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const serviceMap = Object.fromEntries(services.map(s => [s.id, s]));

  const enriched = participants.map(p => {
    const queue = queues.find(q => q.participant_id === p.id);
    return { ...p, queue };
  });

  const filtered = enriched.filter(p =>
    p.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    p.registration_number?.toLowerCase().includes(search.toLowerCase()) ||
    p.phone_number?.includes(search) ||
    p.unit_division?.toLowerCase().includes(search.toLowerCase()) ||
    p.queue?.queue_number?.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

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
                {["No. Reg", "Nama", "No. Telp", "Unit/Divisi", "No. Antrian", "Layanan", "Status", "Waktu Daftar"].map((col, i) => (
                  <th key={i} className="text-left text-xs font-semibold text-muted-foreground py-2.5 px-3 whitespace-nowrap">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-sm text-muted-foreground">
                    {search ? "Tidak ada hasil yang cocok" : "Belum ada peserta terdaftar"}
                  </td>
                </tr>
              ) : (
                paged.map(p => {
                  const svc = serviceMap[p.queue?.service_id || p.service_id];
                  const isMedical = svc?.service_group === "MEDICAL";
                  return (
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
                        {p.queue ? (
                          <span className={`font-mono font-bold text-sm ${isMedical ? "text-primary" : "text-accent"}`}>
                            {p.queue.queue_number}
                          </span>
                        ) : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="py-2.5 px-3">
                        {svc ? (
                          <div className="flex items-center gap-1.5">
                            {isMedical
                              ? <Stethoscope className="w-3 h-3 text-primary flex-shrink-0" />
                              : <Eye className="w-3 h-3 text-accent flex-shrink-0" />}
                            <span className="text-xs text-muted-foreground truncate max-w-[140px]">{svc.service_name}</span>
                          </div>
                        ) : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="py-2.5 px-3">
                        <Badge className={`text-xs font-medium border ${PARTICIPANT_STATUS_COLORS[p.participant_status] || "bg-gray-100 text-gray-700"}`}>
                          {PARTICIPANT_STATUS_LABELS[p.participant_status] || p.participant_status}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-xs text-muted-foreground whitespace-nowrap">
                        {p.registered_at
                          ? format(new Date(p.registered_at), "dd/MM HH:mm")
                          : p.created_date
                          ? format(new Date(p.created_date), "dd/MM HH:mm")
                          : "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <p className="text-xs text-muted-foreground">
              {filtered.length} peserta &bull; Halaman {page}/{totalPages}
            </p>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="h-7 w-7 p-0">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="h-7 w-7 p-0">
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
