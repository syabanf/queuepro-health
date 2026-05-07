import React, { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { UserPlus, Users, AlertCircle } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import RegistrationForm from "@/components/registration/RegistrationForm";
import QueuePreviewCard from "@/components/registration/QueuePreviewCard";
import QuotaTable from "@/components/registration/QuotaTable";
import ParticipantTable from "@/components/registration/ParticipantTable";
import PrintCoupon from "@/components/registration/PrintCoupon";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function Registration() {
  const [lastResult, setLastResult] = useState(null);
  const queryClient = useQueryClient();

  const { data: services = [], isLoading: loadingServices } = useQuery({
    queryKey: ["services"],
    queryFn: () => base44.entities.Service.list(),
    refetchInterval: 10000,
  });

  const { data: participants = [], isLoading: loadingParticipants } = useQuery({
    queryKey: ["participants"],
    queryFn: () => base44.entities.Participant.list("-created_date"),
    refetchInterval: 15000,
  });

  const { data: queues = [] } = useQuery({
    queryKey: ["queues"],
    queryFn: () => base44.entities.Queue.list(),
    refetchInterval: 15000,
  });

  const { data: eventSettings = [] } = useQuery({
    queryKey: ["eventSettings"],
    queryFn: () => base44.entities.EventSetting.list(),
  });

  const event = eventSettings[0];
  const maxParticipants = event?.max_participants || 200;
  const usedSlots = participants.length;
  const remainingSlots = maxParticipants - usedSlots;
  const fillPct = Math.min(100, Math.round((usedSlots / maxParticipants) * 100));

  const handleSuccess = useCallback((result) => {
    setLastResult(result);
    queryClient.invalidateQueries({ queryKey: ["participants"] });
    queryClient.invalidateQueries({ queryKey: ["queues"] });
    queryClient.invalidateQueries({ queryKey: ["services"] });
  }, [queryClient]);

  const handleReset = useCallback(() => {
    setLastResult(null);
  }, []);

  const handlePrint = useCallback(() => {
    if (!lastResult) return;
    const coupon = PrintCoupon({ result: lastResult });
    coupon?.handlePrint();
  }, [lastResult]);

  if (loadingServices) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Registrasi Peserta"
        subtitle="Pendaftaran peserta Brilian Talks Health Care"
        icon={UserPlus}
      />

      {/* Capacity bar */}
      <Card className="border-border">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-3 flex-1">
              <Users className="w-5 h-5 text-primary flex-shrink-0" />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium">Kapasitas Peserta</p>
                  <p className="text-sm font-bold">{usedSlots} / {maxParticipants}</p>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      fillPct >= 100 ? "bg-destructive" : fillPct >= 80 ? "bg-warning" : "bg-success"
                    }`}
                    style={{ width: `${fillPct}%` }}
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {remainingSlots <= 0 ? (
                <Badge className="bg-red-100 text-red-700 border-red-200">
                  <AlertCircle className="w-3 h-3 mr-1" /> Penuh
                </Badge>
              ) : (
                <Badge className="bg-green-100 text-green-700 border-green-200">
                  Sisa: {remainingSlots} slot
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Grid: Form + Preview */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-6">
        {/* Left: Form */}
        <div className="min-w-0">
          <RegistrationForm
            services={services}
            totalParticipants={usedSlots}
            onSuccess={handleSuccess}
          />
        </div>

        {/* Right: Preview + Quota */}
        <div className="space-y-4">
          <QueuePreviewCard
            result={lastResult}
            onPrint={handlePrint}
            onReset={handleReset}
          />
          <QuotaTable services={services} />
        </div>
      </div>

      {/* Bottom: Participant Table */}
      <ParticipantTable
        participants={participants}
        queues={queues}
        services={services}
      />
    </div>
  );
}