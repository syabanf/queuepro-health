import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Monitor, Calendar, MapPin, Users } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";

const STATUS_COLORS = {
  DRAFT: "bg-gray-100 text-gray-700 border-gray-200",
  ACTIVE: "bg-green-100 text-green-700 border-green-200",
  CLOSED: "bg-red-100 text-red-700 border-red-200",
};

export default function EventPreviewCard({ form, totalParticipants = 0 }) {
  const freeCheckUsed = 0; // placeholder — registration page will compute
  const paymentUsed = 0;
  const fillPct = form.max_participants > 0
    ? Math.min(100, Math.round((totalParticipants / form.max_participants) * 100))
    : 0;

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-accent/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Monitor className="w-4 h-4 text-primary" /> Preview Tampilan Event
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Display */}
        <div className="bg-primary rounded-xl p-5 text-primary-foreground text-center">
          <Badge className={`mb-3 text-xs border ${STATUS_COLORS[form.event_status || "ACTIVE"]}`}>
            {form.event_status || "ACTIVE"}
          </Badge>
          <h2 className="text-xl font-black leading-tight">
            {form.event_name || "Nama Event"}
          </h2>
          {form.event_headline && (
            <p className="text-sm text-primary-foreground/80 mt-1 font-medium">{form.event_headline}</p>
          )}
          {form.event_tagline && (
            <p className="text-xs text-primary-foreground/60 mt-1 italic">{form.event_tagline}</p>
          )}
        </div>

        {/* Details */}
        <div className="grid grid-cols-1 gap-2">
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
            <span className="text-muted-foreground">Lokasi:</span>
            <span className="font-medium">{form.location || "—"}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-primary flex-shrink-0" />
            <span className="text-muted-foreground">Tanggal:</span>
            <span className="font-medium">
              {form.event_date
                ? (() => { try { return format(new Date(form.event_date), "EEEE, dd MMMM yyyy", { locale: id }); } catch { return form.event_date; } })()
                : "—"}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Users className="w-4 h-4 text-primary flex-shrink-0" />
            <span className="text-muted-foreground">Kapasitas:</span>
            <span className="font-medium">{form.max_participants || 0} peserta</span>
          </div>
        </div>

        {/* Category Quota */}
        <div className="border-t border-border pt-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Kuota Kategori</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-center">
              <p className="text-lg font-black text-green-700">{form.free_check_quota ?? 100}</p>
              <p className="text-xs text-green-600 font-medium">FREE CHECK</p>
            </div>
            <div className="rounded-lg bg-orange-50 border border-orange-200 p-3 text-center">
              <p className="text-lg font-black text-orange-600">{form.payment_quota ?? 100}</p>
              <p className="text-xs text-orange-600 font-medium">PAYMENT</p>
            </div>
          </div>
        </div>

        {/* Capacity bar */}
        <div className="border-t border-border pt-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-muted-foreground">Kapasitas Terisi</span>
            <span className="text-xs font-bold">{totalParticipants} / {form.max_participants || 0}</span>
          </div>
          <div className="h-2.5 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${fillPct >= 100 ? "bg-destructive" : fillPct >= 80 ? "bg-warning" : "bg-success"}`}
              style={{ width: `${fillPct}%` }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1 text-right">{fillPct}% terisi</p>
        </div>
      </CardContent>
    </Card>
  );
}